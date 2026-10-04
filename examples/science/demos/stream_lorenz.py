"""Live Python animation: the Lorenz system, integrated for an ensemble of trajectories that start almost on top of each other.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...], x and y in [-2, 2] (the PyStream canvas maps that to
its width and height; this demo expects a 1280 x 720 canvas). The points are ordered by trajectory, `SUB` consecutive points per trajectory (the sub-steps of
one frame, so a fast trajectory still draws a continuous line). The page colours the points by position in the
list, so a trajectory keeps its colour for its whole life.

The client sends JSON {"n", "dt", "g"}, which this demo reads as: n = trajectories, dt = Lorenz time per frame,
g = the number of decimal digits the first and the last trajectory share at the start (difference = 10 ** -g). Each connection owns its
simulation and the numpy step runs in a worker thread. The ensemble restarts when it has spread over the whole attractor.
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


def rhs(s):
    x, y, z = s[:, 0], s[:, 1], s[:, 2]
    return np.stack([SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z], 1)


def rk4(s, h):
    k1 = rhs(s)
    k2 = rhs(s + 0.5 * h * k1)
    k3 = rhs(s + 0.5 * h * k2)
    k4 = rhs(s + h * k3)
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
        self.reset(n)

    def reset(self, n):
        # n copies on a short line along x: the first and the last differ by 10 ** -g
        self.s = START + np.outer(np.linspace(0, 10.0 ** -self.g, n), [1.0, 0.0, 0.0])
        self.t = 0.0

    def step(self):
        h = self.dt / SUB
        pts = np.empty((len(self.s), SUB, 2), np.float32)
        for k in range(SUB):
            self.s = rk4(self.s, h)
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
    return out


async def handler(ws):
    sim = Lorenz()
    pending = {}

    async def recv():
        async for msg in ws:
            pending.update(parse_params(msg))   # applied between steps, never mid-step

    task = asyncio.create_task(recv())
    try:
        while True:
            t0 = time.perf_counter()
            if pending:
                m = dict(pending); pending.clear()
                sim.dt = float(m.get("dt", sim.dt))
                if "g" in m: sim.g = float(m["g"])
                if "n" in m or "g" in m: sim.reset(int(m.get("n", len(sim.s))))
            pts = await asyncio.to_thread(sim.step)
            ms = (time.perf_counter() - t0) * 1000
            await ws.send(np.array([ms, len(pts)], dtype=np.float32).tobytes() + pts.tobytes())
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
