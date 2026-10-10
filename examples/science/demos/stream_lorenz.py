"""Live Python animation: the Lorenz system, integrated for an ensemble of trajectories that start almost on top of each other.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...], x and y in [-2, 2] (the PyStream canvas maps that to
its width and height; this demo expects a 1280 x 720 canvas). The points are ordered by trajectory, with `SUB`
consecutive points per trajectory (the sub-steps of one frame, so a fast trajectory still draws a continuous line).
The page colours the points by their position in the list, so a trajectory keeps its colour for its whole life.

The client sends JSON {"n", "dt", "g"}, which this demo reads as: n = trajectories, dt = Lorenz time per frame, and
g = the number of decimal digits the first and the last trajectory share at the start (difference = 10 ** -g).
It also reads sigma, rho and beta, the three parameters of the equations (the slide shows them next to the stream).
Each connection owns its simulation, and the numpy step runs in a worker thread. The ensemble restarts when it has
spread over the whole attractor.
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 18870
ORIGINS = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]
FRAME_S = 1 / 60
N_MIN, N_MAX = 20, 600
SIGMA, RHO, BETA = 10.0, 28.0, 8.0 / 3.0
W, H = 1280, 720      # logical canvas of <PyStream w="1280" h="720">; one Lorenz unit is PX pixels in both directions
PX = 11.5
OFFSET_X = 0.55       # shifts the attractor to the right, leaving the left for words
SUB = 8               # integration sub-steps drawn per frame
RESTART_AT = 42.0     # Lorenz time units after which the ensemble starts over
MAX_MESSAGE = 1024


def rhs(s, p):
    """dx/dt = sigma (y - x), dy/dt = x (rho - z) - y, dz/dt = x y - beta z (Lorenz 1963)."""
    sigma, rho, beta = p
    x, y, z = s[:, 0], s[:, 1], s[:, 2]
    return np.stack([sigma * (y - x), x * (rho - z) - y, x * y - beta * z], 1)


def rk4(s, h, p=(SIGMA, RHO, BETA)):
    k1 = rhs(s, p)
    k2 = rhs(s + 0.5 * h * k1, p)
    k3 = rhs(s + 0.5 * h * k2, p)
    k4 = rhs(s + h * k3, p)
    return s + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def on_attractor():
    # one point run for a while, so the copies start on the attractor and there is no inward spiral to watch
    s = np.array([[1.0, 1.0, 1.0]])
    for _ in range(1500):
        s = rk4(s, 0.01)
    return s


START = on_attractor()


class Lorenz:
    def __init__(self, n=200, dt=0.04, g=5.0):
        self.dt, self.g = dt, g
        self.p = (SIGMA, RHO, BETA)
        self.reset(n)

    def reset(self, n):
        # n copies on a short line along x: the first and the last differ by 10 ** -g
        self.s = START + np.outer(np.linspace(0, 10.0 ** -self.g, n), [1.0, 0.0, 0.0])
        self.t = 0.0

    def step(self):
        h = self.dt / SUB
        pts = np.empty((len(self.s), SUB, 2), np.float32)
        for k in range(SUB):
            self.s = rk4(self.s, h, self.p)
            pts[:, k, 0] = OFFSET_X + self.s[:, 0] * PX / (0.25 * W)             # x in about [-20, 20]
            pts[:, k, 1] = -(self.s[:, 2] - 25.0) * PX / (0.25 * H)              # z in about [0, 50], up on the page
        self.t += self.dt
        if self.t > RESTART_AT:
            self.reset(len(self.s))
        return pts.reshape(-1, 2)


def parse_params(raw):
    """Valid parameters from one client message, or {} for anything malformed."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(msg, dict):
        return {}
    out = {}
    for key in ("n", "dt", "g"):
        v = msg.get(key)
        if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
            out[key] = v
    if "n" in out:
        out["n"] = min(max(int(out["n"]), N_MIN), N_MAX)
    if "dt" in out:
        out["dt"] = min(max(out["dt"], 0.005), 0.06)
    if "g" in out:
        out["g"] = min(max(out["g"], 1.0), 9.0)
    for key, lo, hi in (("sigma", 0.0, 30.0), ("rho", 0.0, 60.0), ("beta", 0.1, 8.0)):
        v = msg.get(key)
        if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
            out[key] = min(max(float(v), lo), hi)
    return out


def parse_control(raw):
    """True when a client message asks for lockstep (`{"lockstep": true}`, sent by `nimbledeck record`)."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return False
    return isinstance(msg, dict) and msg.get("lockstep") is True


def parse_tick(raw):
    """True for a lockstep tick (`{"tick": n}`): the client wants exactly one more frame."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return False
    return isinstance(msg, dict) and isinstance(msg.get("tick"), int) and not isinstance(msg.get("tick"), bool)


async def handler(ws):
    sim = Lorenz()
    pending = {}
    ticks = asyncio.Queue()   # lockstep: one entry per tick, None when the client has gone
    lock = {"asked": False, "on": False}

    async def recv():
        try:
            async for msg in ws:
                pending.update(parse_params(msg))   # applied between steps, never mid-step
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
                # `nimbledeck record` films in lockstep: start again from the seeded state, say so in a text frame, and from now on
                # compute exactly one frame per {"tick": n} message, so the recording does not depend on the speed of this machine
                lock["on"] = True
                sim = Lorenz()
                await ws.send("lockstep")
            if lock["on"]:
                if await ticks.get() is None:
                    return
                t0 = time.perf_counter()
            if pending:
                m = dict(pending); pending.clear()
                sim.dt = float(m.get("dt", sim.dt))
                sim.p = tuple(float(m.get(k, v)) for k, v in zip(("sigma", "rho", "beta"), sim.p))
                if "g" in m: sim.g = float(m["g"])
                if "n" in m or "g" in m: sim.reset(int(m.get("n", len(sim.s))))
            pts = await asyncio.to_thread(sim.step)
            ms = (time.perf_counter() - t0) * 1000
            await ws.send(np.array([ms, len(pts)], dtype=np.float32).tobytes() + pts.tobytes())
            if not lock["on"]:
                await asyncio.sleep(max(0, FRAME_S - (time.perf_counter() - t0)))
    except ConnectionClosed:
        pass
    finally:
        task.cancel()


async def main():
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, max_size=MAX_MESSAGE):
        print(f"stream lorenz on ws://127.0.0.1:{PORT}", flush=True)
        await asyncio.Future()


asyncio.run(main())
