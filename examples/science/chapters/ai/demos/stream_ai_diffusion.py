"""Live Python animation: a toy diffusion model destroys a picture into noise, then generates a new one from the noise.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...], x and y in [-2, 2] (the PyStream canvas maps that to its
width and height; this demo expects a 1280 x 720 canvas and `:groups="[2800, 2704, 100, 100]"`). The points are, in order:
  group 0  the 2,800 points of the picture (all the same colour, they are one cloud);
  group 1  the arrows, 104 arrows of 26 dots: what the network says each place should do next (minus its noise guess);
  group 2  a track of 100 dots (the time axis, picture on the left, pure noise on the right);
  group 3  the part of the track already travelled.
Unused points are parked off the canvas (x = 9), so the counts never change.

The cycle is 9 seconds at 60 frames per second: a short hold on the picture, the forward process (noise is mixed in, in closed
form), the reverse process (a new picture is generated from pure noise by the trained network, one step at a time, the arrows
are the network's answer at each step), a hold on the result. The reverse trajectory is computed in a worker thread while the
forward process plays, so one step of the reverse is one real evaluation of the network, never a replay.

The client sends JSON {"steps", "schedule", "guidance", "prompt"} (extra sliders): the number of reverse steps (4 to 120),
the noise schedule (0 linear, 1 cosine), the guidance strength (0 to 6) and the prompt (0 anything, 1 smiley, 2 spiral,
3 AI). A change restarts the cycle at once. `n`, `dt` and `g` are ignored.

Lockstep (`nimbledeck record`): see docs/WRITING.md. Every random number is seeded, so the same ticks give the same frames.
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from aitoy import diffusion as D
from aitoy.shapes import shape
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 19600
ORIGINS = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]
FRAME_S = 1 / 60
W, H = 1280, 720
CX, CY, SC = 790.0, 332.0, 205.0      # the picture: centre on the slide (px) and pixels per data unit
N = 2800
GX, GY = np.meshgrid(np.linspace(-1.6, 1.6, 13), np.linspace(-1.1, 1.1, 8))
GRID = np.c_[GX.ravel(), GY.ravel()]
NA, DOTS = len(GRID), 26
BAR = 100
BAR_X0, BAR_X1, BAR_Y = 560.0, 1010.0, 44.0
HOLD0, FWD, REV, HOLD1 = 30, 108, 330, 72
DEFAULT = {"steps": 40, "schedule": 1, "guidance": 2.0, "prompt": 1}
LIMITS = {"steps": (4, 120), "schedule": (0, 1), "guidance": (0.0, 6.0), "prompt": (0, 3)}
MAX_MESSAGE = 1024


def abar(s, schedule):
    """Signal left at time s (0 = picture, 1 = pure noise). Linear: beta grows linearly with time (Ho et al. 2020, in
    continuous time); cosine: Nichol and Dhariwal 2021."""
    s = np.asarray(s, float)
    if schedule == 0:
        a = np.exp(-(0.1 * s + 9.95 * s ** 2))
    else:
        a = np.cos((s + 0.008) / 1.008 * np.pi / 2) ** 2 / np.cos(0.008 / 1.008 * np.pi / 2) ** 2
    return np.clip(a, 1e-5, 1.0)


def guided_eps(x, ab, prompt, g):
    """The network's noise estimate, with classifier-free guidance: e_u + g (e_c - e_u). Without a prompt, e_u."""
    if prompt == 0:
        return D.eps(x, ab, 0)
    both = D.eps(np.concatenate([x, x]), ab, np.r_[np.zeros(len(x), int), np.full(len(x), prompt)])
    eu, ec = both[: len(x)], both[len(x):]
    return eu + g * (ec - eu)


class Cycle:
    """One run: a picture, the noise that destroys it, and (computed in a thread) the generation from that noise."""

    def __init__(self, params, seed):
        self.p, self.seed = dict(params), seed
        rng = np.random.default_rng(seed)
        self.x0 = shape(int(self.p["prompt"]), N, rng)
        self.e0 = rng.normal(size=(N, 2))
        self.traj = self.field = None

    def compute(self):
        steps, sched, g, prompt = int(self.p["steps"]), int(self.p["schedule"]), float(self.p["guidance"]), int(self.p["prompt"])
        rng = np.random.default_rng(self.seed + 7919)
        ab = abar(np.linspace(1, 0, steps + 1), sched)
        x = math.sqrt(ab[0]) * self.x0 + math.sqrt(1 - ab[0]) * self.e0
        traj, field = [x], []
        for k in range(steps):
            t, s = ab[k], ab[k + 1]
            eps = guided_eps(np.concatenate([x, GRID]), t, prompt, g)     # the grid rides along: the arrows are the same network
            field.append(-eps[N:])
            alpha = t / s
            mean = (x - (1 - alpha) / math.sqrt(1 - t) * eps[:N]) / math.sqrt(alpha)
            x = mean + math.sqrt((1 - s) / (1 - t) * (1 - alpha)) * rng.normal(size=x.shape)
            traj.append(x)
        field.append(field[-1] * 0)
        self.traj, self.field = np.array(traj, np.float32), np.array(field, np.float32)


def units(px, py):
    return (px - W / 2) / (0.25 * W), (py - H / 2) / (0.25 * H)


def cloud(x):
    ux, uy = units(CX + SC * x[:, 0], CY - SC * x[:, 1])
    return np.c_[ux, uy]


def arrows(vec, scale):
    """104 arrows of 26 dots centred on the grid; vec is what each place should do next, in noise units."""
    px, py = CX + SC * GRID[:, 0], CY - SC * GRID[:, 1]
    v = np.c_[vec[:, 0], -vec[:, 1]] * 42.0
    length = np.hypot(v[:, 0], v[:, 1])
    v = v * (np.minimum(length, 66.0) / np.maximum(length, 1e-6))[:, None] * scale
    length = np.hypot(v[:, 0], v[:, 1])
    tail = np.c_[px, py] - v / 2
    head = np.c_[px, py] + v / 2
    t = np.linspace(0, 1, 16)[None, :, None]
    body = tail[:, None, :] + t * v[:, None, :]
    u = v / np.maximum(length, 1e-6)[:, None]
    bl = np.maximum(0.38 * length, 5.0 * scale)
    barbs = []
    for ang in (math.radians(28), -math.radians(28)):
        c, s = math.cos(ang), math.sin(ang)
        back = -np.c_[u[:, 0] * c - u[:, 1] * s, u[:, 0] * s + u[:, 1] * c] * bl[:, None]
        barbs.append(head[:, None, :] + np.linspace(0.2, 1.0, 5)[None, :, None] * back[:, None, :])
    dots = np.concatenate([body, *barbs], 1).reshape(-1, 2)
    ux, uy = units(dots[:, 0], dots[:, 1])
    return np.c_[ux, uy]


TRACK = np.c_[np.linspace(BAR_X0, BAR_X1, BAR), np.full(BAR, BAR_Y)]
TRACK_U = np.c_[units(TRACK[:, 0], TRACK[:, 1])]
PARK = np.full((1, 2), 9.0)


def frame(c, i):
    """The points of frame i of cycle c, as (n, 2) float32, and the time (0 picture, 1 noise) for the track."""
    steps = int(c.p["steps"])
    if i < HOLD0:
        x, s, field, sc = c.x0, 0.0, None, 0.0
    elif i < HOLD0 + FWD:
        s = (i - HOLD0 + 1) / FWD
        a = float(abar(s, int(c.p["schedule"])))
        x, field, sc = math.sqrt(a) * c.x0 + math.sqrt(1 - a) * c.e0, None, 0.0
    elif i < HOLD0 + FWD + REV:
        j = i - HOLD0 - FWD
        kf = j / REV * steps
        k = min(int(kf), steps - 1)
        fr = kf - k
        if REV / steps >= 10:
            fr = fr * fr * (3 - 2 * fr)             # a few big steps glide, many small ones run straight
        x = c.traj[k] + fr * (c.traj[k + 1] - c.traj[k])
        field = c.field[k] + fr * (c.field[k + 1] - c.field[k])
        s = 1 - kf / steps
        sc = min(1.0, (j + 1) / 24, (REV - j) / 30)
    else:
        x, s, field, sc = c.traj[-1], 0.0, None, 0.0
    done = int(round(s * BAR))
    arr = arrows(field, sc) if field is not None and sc > 0.02 else np.tile(PARK, (NA * DOTS, 1))
    bar_done = np.vstack([TRACK_U[:done], np.tile(PARK, (BAR - done, 1))])
    return np.vstack([cloud(x), arr, TRACK_U, bar_done]).astype(np.float32)


def parse_params(raw):
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(msg, dict):
        return {}
    out = {}
    for key, (lo, hi) in LIMITS.items():
        v = msg.get(key)
        if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
            out[key] = min(max(v, lo), hi)
    if "steps" in out:
        out["steps"] = int(out["steps"])
    if "schedule" in out:
        out["schedule"] = int(round(out["schedule"]))
    if "prompt" in out:
        out["prompt"] = int(round(out["prompt"]))
    return out


def parse_control(raw):
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return False
    return isinstance(msg, dict) and msg.get("lockstep") is True


def parse_tick(raw):
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return False
    return isinstance(msg, dict) and isinstance(msg.get("tick"), int) and not isinstance(msg.get("tick"), bool)


class Sim:
    def __init__(self):
        self.params = dict(DEFAULT)
        self.seed = 0
        self.cur = Cycle(self.params, self.seed)
        self.job = asyncio.create_task(asyncio.to_thread(self.cur.compute))
        self.nxt = None
        self.i = 0

    def restart(self, params):
        self.params = params
        self.seed += 1
        self.cur = Cycle(params, self.seed)
        self.job = asyncio.create_task(asyncio.to_thread(self.cur.compute))
        self.nxt = None
        self.i = HOLD0 - 12

    async def step(self):
        """The next frame. Waits for the reverse process only if it is not ready when it is needed."""
        i = self.i
        if i >= HOLD0 + FWD and not self.job.done():
            await self.job                                     # not ready: hold (the clock stops)
        if self.nxt is None and i >= HOLD0:
            n = Cycle(self.params, self.seed + 1)
            self.nxt = (n, asyncio.create_task(asyncio.to_thread(n.compute)))   # the next picture is prepared while this one plays
        pts = await asyncio.to_thread(frame, self.cur, i)
        self.i += 1
        if self.i >= HOLD0 + FWD + REV + HOLD1:
            self.seed += 1
            self.cur, self.job = self.nxt if self.nxt else (Cycle(self.params, self.seed), None)
            if self.job is None:
                self.job = asyncio.create_task(asyncio.to_thread(self.cur.compute))
            self.nxt, self.i = None, 0
        return pts


async def handler(ws):
    sim = Sim()
    pending = {}
    ticks = asyncio.Queue()
    lock = {"asked": False, "on": False}

    async def recv():
        try:
            async for msg in ws:
                pending.update(parse_params(msg))
                if parse_control(msg):
                    lock["asked"] = True
                elif lock["on"] and parse_tick(msg):
                    ticks.put_nowait(1)
        finally:
            ticks.put_nowait(None)

    task = asyncio.create_task(recv())
    try:
        while True:
            t0 = time.perf_counter()
            if lock["asked"] and not lock["on"]:
                lock["on"] = True
                sim = Sim()
                await ws.send("lockstep")
            if lock["on"]:
                if await ticks.get() is None:
                    return
                t0 = time.perf_counter()
            if pending:
                m = {**sim.params, **pending}
                pending.clear()
                if m != sim.params:
                    sim.restart(m)
            pts = await sim.step()
            ms = (time.perf_counter() - t0) * 1000
            await ws.send(np.array([ms, len(pts)], dtype=np.float32).tobytes() + pts.tobytes())
            if not lock["on"]:
                await asyncio.sleep(max(0, FRAME_S - (time.perf_counter() - t0)))
    except ConnectionClosed:
        pass
    finally:
        task.cancel()


async def main():
    D.load()
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, max_size=MAX_MESSAGE):
        print(f"stream ai-diffusion on ws://127.0.0.1:{PORT}", flush=True)
        await asyncio.Future()


asyncio.run(main())
