"""Live Python animation: an N-body simulation streamed to the slide over a WebSocket.

Frame format (binary, float32): [step_ms, n, x0, y0, x1, y1, ...]. The client sends
JSON {"n", "dt", "g"} to change parameters. Each connection owns its own simulation, and
the numpy step runs in a worker thread so the event loop keeps serving the socket.
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 18765
# allowed origins come from the CLI (`--origin`, repeatable); the default is the usual deck address
ORIGINS = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]
FRAME_S = 1 / 60
N_MIN, N_MAX = 100, 2000   # the step is O(n^2): a client must not be able to ask for more
MAX_MESSAGE = 1024        # bytes; the client only ever sends a few numbers


class Sim:
    def __init__(self, n=400, dt=0.02, g=1.0):
        self.reset(n); self.dt, self.g = dt, g

    def reset(self, n):
        rng = np.random.default_rng(1)
        r = np.sqrt(rng.random(n)) * 2; a = rng.random(n) * 6.283
        self.p = np.stack([r * np.cos(a), r * np.sin(a)], 1).astype(np.float32)
        self.v = (np.stack([-np.sin(a), np.cos(a)], 1) * np.sqrt(r)[:, None] * 0.6).astype(np.float32)

    def step(self):
        d = self.p[None, :, :] - self.p[:, None, :]
        inv = (np.einsum("ijk,ijk->ij", d, d) + 0.05) ** -1.5
        self.v += self.g * self.dt * (d * inv[:, :, None]).sum(1) / len(self.p) * 40
        self.p += self.v * self.dt


def parse_params(raw):
    """Valid parameters from one client message, or {} for anything malformed. Missing keys are simply not updated."""
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
    sim = Sim()
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
        pass   # the client left, or sent a message over the size cap
    finally:
        task.cancel()


async def main():
    async with serve(handler, "127.0.0.1", PORT, origins=ORIGINS, max_size=MAX_MESSAGE):
        print(f"stream nbody on ws://127.0.0.1:{PORT}", flush=True)
        await asyncio.Future()


asyncio.run(main())
