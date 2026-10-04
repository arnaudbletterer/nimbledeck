"""Live Python animation: a swarm of particles drawn into a drifting vortex, streamed over a WebSocket.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...]. The PyStream canvas maps x in [-2, 2] to its
width, so the swarm is kept inside +-1.9. The client sends JSON {"n", "dt", "g"}: particle count, time step and pull. Each connection owns its simulation and the
numpy step runs in a worker thread, so the event loop keeps serving the socket.
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 18865
ORIGINS = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]
FRAME_S = 1 / 60
N_MIN, N_MAX = 100, 4000
MAX_MESSAGE = 1024


class Swarm:
    def __init__(self, n=1500, dt=0.02, g=1.0):
        self.dt, self.g, self.t = dt, g, 0.0
        self.reset(n)

    def reset(self, n):
        rng = np.random.default_rng(3)
        self.p = (rng.normal(0, 0.9, (n, 2))).astype(np.float32)
        self.v = np.zeros((n, 2), np.float32)

    def step(self):
        self.t += self.dt
        # two attractors orbit the centre; each particle also feels a swirl around the nearer one
        c = np.array([[1.0 * math.cos(self.t), 0.6 * math.sin(self.t * 1.3)],
                      [-1.0 * math.cos(self.t * 0.8 + 1), -0.6 * math.sin(self.t)]], np.float32)
        acc = np.zeros_like(self.p)
        for k, centre in enumerate(c):
            d = centre - self.p
            r2 = (d * d).sum(1, keepdims=True) + 0.08
            pull = d / r2 ** 1.5
            swirl = np.stack([-d[:, 1], d[:, 0]], 1) / r2 ** 1.25 * (1 if k == 0 else -1)
            acc += self.g * (0.35 * pull + 0.5 * swirl)
        self.v = (self.v + acc * self.dt) * 0.995
        np.clip(self.v, -3, 3, out=self.v)
        self.p += self.v * self.dt
        far = (np.abs(self.p) > 1.9).any(1)   # leave the frame: respawn near the centre
        if far.any():
            self.p[far] = np.random.normal(0, 0.4, (int(far.sum()), 2)).astype(np.float32)
            self.v[far] = 0


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
    return out


async def handler(ws):
    sim = Swarm()
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
                if "n" in m and m["n"] != len(sim.p): sim.reset(m["n"])
                sim.dt, sim.g = float(m.get("dt", sim.dt)), float(m.get("g", sim.g))
            await asyncio.to_thread(sim.step)
            ms = (time.perf_counter() - t0) * 1000
            head = np.array([ms, len(sim.p)], dtype=np.float32)
            await ws.send(head.tobytes() + sim.p.astype(np.float32).tobytes())
            await asyncio.sleep(max(0, FRAME_S - (time.perf_counter() - t0)))
    except ConnectionClosed:
        pass
    finally:
        task.cancel()


async def main():
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, max_size=MAX_MESSAGE):
        print(f"stream swarm on ws://127.0.0.1:{PORT}", flush=True)
        await asyncio.Future()


asyncio.run(main())
