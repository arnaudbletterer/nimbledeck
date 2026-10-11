"""Live Python animation: a toy atmosphere (Lorenz-96, 40 variables on a latitude circle), a truth run, an ensemble of
forecasts, and an ensemble Kalman filter that can pull the ensemble back to noisy observations. Simulated, not a forecast.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...] with x and y in [-2, 2], then an optional raster block
(see docs/WRITING.md): [count, (x, y, w, h, iw, ih) * count] and the RGBA bytes of the images. The page draws the images
first, then the points. This demo expects a 1180 x 540 canvas (LW x LH):

    <PyStream name="climate-l96" :w="1180" :h="540" :fade="1" :size="1.9" :colors="COLORS" ... />

Five groups of G = 4096 points, one colour per group in this order (the page cuts the list into equal consecutive groups,
so a group that has fewer points is padded with points off the canvas):
    0 frames, gridlines and ticks (white, faint)       2 observations (chart-4, drawn over the truth image)
    1 the sweep head and the climate line (white)      3 RMSE of the ensemble mean (chart-1)
                                                       4 ensemble spread (chart-2)
Images: the truth and the ensemble mean as longitude (40 rows) against time (SWEEP_STEPS columns), one column per six hours.

The client sends JSON: n = ensemble size, dt = observation noise (sigma_o), g = observation interval in steps (a
step is six hours), and the extras F (forcing) and assim (0 free forecast, 1 assimilate). Each connection owns its
simulation. The sweep runs left to right; a free forecast starts again at the left when it is full, an assimilating run
overwrites its oldest columns. Everything is seeded, so a lockstep recording is the same clip every time.
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

import l96

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 19200
ORIGINS = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]
STEP_RATE = 20.0                 # model steps (six hours each) per second of wall-clock time: five model days a second
LW, LH = 1180, 540               # logical canvas of the <PyStream>
X0, PW = 96, 1060                # the panels: left edge and width
SWEEP = 200                      # columns: 50 model days
TRUTH_Y, MEAN_Y, PH = 12, 140, 120
CURVE_Y, CURVE_H = 292, 168      # log10 axis from 0.01 to 10
LOG_LO, LOG_HI = -2.0, 1.0
G = 4096                         # points per colour group
OFF = 10.0                       # a point this far away is off the canvas
N_MIN, N_MAX = 4, 40
SIGMA0 = 0.02                    # initial forecast error of a free forecast
INFLATION, RADIUS = 1.1, 4.0
OBS_IDX = np.arange(0, l96.K, 2)  # the instruments sit on every second variable
CLIM_STD = 3.6                   # standard deviation of one variable over a long run with F = 8
MAX_MESSAGE = 1024


def lut():
    """256 colours from deep blue through cyan to white: one scale for the truth and the forecast, so they compare."""
    stops = [(0.00, "#050a24"), (0.17, "#0c2a6b"), (0.34, "#1558b0"), (0.50, "#2f8fd0"), (0.67, "#6cc4e0"), (0.84, "#b9ebf0"), (1.00, "#ffffff")]
    t = np.linspace(0, 1, 256)
    pos = [s[0] for s in stops]
    rgb = np.array([[int(s[1][i:i + 2], 16) for i in (1, 3, 5)] for s in stops], float)
    out = np.stack([np.interp(t, pos, rgb[:, c]) for c in range(3)], 1)
    return np.concatenate([out, np.full((256, 1), 255.0)], 1).astype(np.uint8)


LUT = lut()
CENTRE, HALF, GAMMA = 2.3, 11.7, 2.0   # the colour scale is flat near the climate mean (the same for both panels), so a
                                       # forecast that has lost its structure, an ensemble mean near the mean, looks flat


def to_xy(px, py):
    """Canvas pixels to the [-2, 2] coordinates of the frame format."""
    return (np.asarray(px) / LW - 0.5) * 4, (np.asarray(py) / LH - 0.5) * 4


def curve_y(v):
    lv = np.clip(np.log10(np.maximum(v, 1e-9)), LOG_LO, LOG_HI)
    return CURVE_Y + CURVE_H * (1 - (lv - LOG_LO) / (LOG_HI - LOG_LO))


def polyline(px, py, valid):
    """Dense points (about 1.3 px apart) along the runs of consecutive valid samples."""
    out = []
    i = 0
    n = len(px)
    while i < n:
        if not valid[i]:
            i += 1
            continue
        j = i
        while j + 1 < n and valid[j + 1]:
            j += 1
        rx, ry = px[i:j + 1], py[i:j + 1]
        if len(rx) == 1:
            out.append(np.stack([rx, ry], 1))
        else:
            s = np.concatenate([[0], np.cumsum(np.hypot(np.diff(rx), np.diff(ry)))])
            t = np.arange(0, s[-1], 1.3)
            out.append(np.stack([np.interp(t, s, rx), np.interp(t, s, ry)], 1))
        i = j + 1
    return np.concatenate(out) if out else np.zeros((0, 2))


def dotted(x0, y0, x1, y1, gap):
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / gap))
    return np.stack([np.linspace(x0, x1, n), np.linspace(y0, y1, n)], 1)


def group(pts):
    """Exactly G points: the extra ones are dropped evenly, the missing ones are off the canvas."""
    pts = np.asarray(pts, float).reshape(-1, 2)
    if len(pts) > G:
        pts = pts[np.linspace(0, len(pts) - 1, G).astype(int)]
    x, y = to_xy(pts[:, 0], pts[:, 1])
    out = np.full((G, 2), OFF, np.float32)
    out[:len(pts), 0], out[:len(pts), 1] = x, y
    return out


def static_points():
    """Frames, gridlines and ticks: the same on every frame."""
    p = []
    for y in (TRUTH_Y, MEAN_Y):
        p.append(dotted(X0 - 6, y, X0 - 6, y + PH, 2.0))
    for e in (-2, -1, 0, 1):
        y = curve_y(10.0 ** e)
        p.append(dotted(X0 - 6, y, X0 + PW, y, 6.0))
    p.append(dotted(X0 - 6, CURVE_Y, X0 - 6, CURVE_Y + CURVE_H, 2.0))
    for d in range(0, 51, 10):
        x = X0 + PW * d / 50
        p.append(dotted(x, CURVE_Y + CURVE_H, x, CURVE_Y + CURVE_H + 7, 2.0))
    return np.concatenate(p)


STATIC = group(static_points())


class Climate:
    def __init__(self, n=20, sigma_o=1.0, every=4, forcing=8.0, assim=False):
        self.rng = np.random.default_rng(7)
        self.n, self.sigma_o, self.every, self.f, self.assim = n, sigma_o, every, forcing, assim
        self.truth = l96.spin_up(self.f, self.rng)
        self.restart(SIGMA0)

    def restart(self, sigma, keep=False):
        """A new forecast from the current truth (the ensemble is exchangeable with the truth: both are draws around a
        common centre), or from the current ensemble (`keep`)."""
        if not keep:
            centre = self.truth + self.rng.normal(0, sigma, l96.K)
            self.ens = centre + self.rng.normal(0, sigma, (self.n, l96.K))
        self.col = 0
        self.steps = 0
        self.th = np.zeros((SWEEP, l96.K))
        self.mh = np.zeros((SWEEP, l96.K))
        self.rm = np.zeros(SWEEP)
        self.sp = np.zeros(SWEEP)
        self.obs = np.zeros(SWEEP, bool)
        self.valid = np.zeros(SWEEP, bool)

    def resize(self, n):
        """Another ensemble size keeps the mean and the per-variable spread, and draws or drops members."""
        if n == self.n:
            return
        if n < self.n:
            self.ens = self.ens[:n]
        else:
            mean, sd = self.ens.mean(0), self.ens.std(0, ddof=1)
            self.ens = np.concatenate([self.ens, mean + sd * self.rng.normal(0, 1, (n - self.n, l96.K))])
        self.n = n

    def set_forcing(self, f):
        self.f = f
        for _ in range(600):                                   # let the truth settle on the new attractor
            self.truth = l96.rk4(self.truth, self.f)
        self.restart(1.0 if self.assim else SIGMA0)

    def set_assim(self, on):
        if on == self.assim:
            return
        self.assim = on
        if not on:                                             # data stops arriving: a free forecast starts now
            self.restart(SIGMA0, keep=True)

    def advance(self):
        self.truth = l96.rk4(self.truth, self.f)
        self.ens = l96.rk4(self.ens, self.f)
        self.steps += 1
        c = self.col
        self.obs[c] = False
        if self.assim and self.steps % self.every == 0:
            y = self.truth[OBS_IDX] + self.rng.normal(0, self.sigma_o, len(OBS_IDX))
            self.ens = l96.analysis(self.ens, y, OBS_IDX, self.sigma_o, self.rng, INFLATION, RADIUS)
            self.obs[c] = True
        self.th[c], self.mh[c] = self.truth, self.ens.mean(0)
        self.rm[c], self.sp[c] = l96.rmse(self.ens, self.truth), l96.spread(self.ens)
        self.valid[c] = True
        self.col = c + 1
        if self.col >= SWEEP:
            if self.assim:                                     # keep going: overwrite the oldest columns
                self.col = 0
            else:                                              # the forecast is full: start another one
                self.restart(SIGMA0)
        if self.assim:                                         # a gap ahead of the sweep head
            for k in range(6):
                self.valid[(self.col + k) % SWEEP] = False

    def tile(self, field):
        u = np.clip((field.T - CENTRE) / HALF, -1, 1)
        idx = np.round(127.5 + 127.5 * np.sign(u) * np.abs(u) ** GAMMA).astype(np.uint8)
        img = LUT[idx].copy()                                  # (K, SWEEP, 4)
        img[:, ~self.valid, 3] = 0
        return np.ascontiguousarray(img)

    def frame(self):
        cw = PW / SWEEP
        xs = X0 + (np.arange(SWEEP) + 0.5) * cw
        head = (self.col % SWEEP) * cw + X0
        sweep = np.concatenate([dotted(head, TRUTH_Y, head, TRUTH_Y + PH, 2.0), dotted(head, MEAN_Y, head, MEAN_Y + PH, 2.0),
                                dotted(head, CURVE_Y, head, CURVE_Y + CURVE_H, 2.5),
                                dotted(X0, curve_y(CLIM_STD), X0 + PW, curve_y(CLIM_STD), 9.0)])
        rows = TRUTH_Y + (np.arange(l96.K) + 0.5) * PH / l96.K
        oc = np.flatnonzero(self.obs & self.valid)
        obs = np.array([(xs[c], rows[k]) for c in oc for k in OBS_IDX]).reshape(-1, 2)
        pts = [STATIC, group(sweep), group(obs), group(polyline(xs, curve_y(self.rm), self.valid)), group(polyline(xs, curve_y(self.sp), self.valid))]
        pts = np.concatenate(pts)
        imgs = [(X0, TRUTH_Y, self.tile(self.th)), (X0, MEAN_Y, self.tile(self.mh))]
        raster = np.array([len(imgs)] + [v for x, y, im in imgs for v in (x, y, PW, PH, im.shape[1], im.shape[0])], np.float32)
        return pts.astype(np.float32).tobytes(), raster.tobytes() + b"".join(im.tobytes() for _, _, im in imgs)


def num(msg, key):
    v = msg.get(key)
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


def parse_params(raw):
    """Valid parameters from one client message, or {} for anything malformed."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(msg, dict):
        return {}
    out = {}
    for key, lo, hi in (("n", N_MIN, N_MAX), ("dt", 0.1, 4.0), ("g", 1, 16), ("F", 2.0, 16.0), ("assim", 0, 1)):
        v = num(msg, key)
        if v is not None:
            out[key] = min(max(v, lo), hi)
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


def apply(sim, m):
    sim.sigma_o = float(m.get("dt", sim.sigma_o))
    sim.every = int(m.get("g", sim.every))
    if "n" in m:
        sim.resize(int(m["n"]))
    if "F" in m and float(m["F"]) != sim.f:
        sim.set_forcing(float(m["F"]))
    if "assim" in m:
        sim.set_assim(m["assim"] >= 0.5)


async def handler(ws):
    sim = Climate()
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
    owed, last = 0.0, time.perf_counter()
    try:
        while True:
            t0 = time.perf_counter()
            if lock["asked"] and not lock["on"]:
                # `nimbledeck record` films in lockstep: start again from the seeded state, say so in a text frame, and from now on
                # compute exactly one frame per {"tick": n} message, so the recording does not depend on the speed of this machine
                lock["on"] = True
                sim, owed = Climate(), 0.0
                await ws.send("lockstep")
            if lock["on"]:
                if await ticks.get() is None:
                    return
                t0 = time.perf_counter()
            if pending:
                m = dict(pending); pending.clear()
                apply(sim, m)
            now = time.perf_counter()
            owed += STEP_RATE * (1 / 60 if lock["on"] else min(now - last, 0.25))   # wall-clock time free-running, one tick in lockstep
            last = now
            while owed >= 1:
                sim.advance()
                owed -= 1
            pts, raster = await asyncio.to_thread(sim.frame)
            ms = (time.perf_counter() - t0) * 1000
            await ws.send(np.array([ms, len(pts) // 8], dtype=np.float32).tobytes() + pts + raster)
            if not lock["on"]:
                await asyncio.sleep(max(0, 1 / 30 - (time.perf_counter() - t0)))
    except ConnectionClosed:
        pass
    finally:
        task.cancel()


async def main():
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, max_size=MAX_MESSAGE):
        print(f"stream climate on ws://127.0.0.1:{PORT}", flush=True)
        await asyncio.Future()


asyncio.run(main())
