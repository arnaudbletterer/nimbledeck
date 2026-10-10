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
        rng = self.rng = np.random.default_rng(3)   # the respawns draw from it too: the same swarm every time
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
            acc += self.g * (0.9 * pull + 0.7 * swirl)
        self.v = (self.v + acc * self.dt) * 0.985
        np.clip(self.v, -3, 3, out=self.v)
        self.p += self.v * self.dt
        far = (np.abs(self.p) > 1.9).any(1)   # leave the frame: respawn near the centre
        if far.any():
            self.p[far] = self.rng.normal(0, 0.4, (int(far.sum()), 2)).astype(np.float32)
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
    sim = Swarm()
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
                sim = Swarm()
                await ws.send("lockstep")
            if lock["on"]:
                if await ticks.get() is None:
                    return
                t0 = time.perf_counter()
            if pending:
                m = dict(pending); pending.clear()
                if "n" in m and m["n"] != len(sim.p): sim.reset(m["n"])
                sim.dt, sim.g = float(m.get("dt", sim.dt)), float(m.get("g", sim.g))
            await asyncio.to_thread(sim.step)
            ms = (time.perf_counter() - t0) * 1000
            head = np.array([ms, len(sim.p)], dtype=np.float32)
            await ws.send(head.tobytes() + sim.p.astype(np.float32).tobytes())
            if not lock["on"]:
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
