"""The model shared by the three streams of the evolution chapter, and the small WebSocket server that streams a view of it.

The model is a simulation, not a claim about a real species. Each individual is a point in a plane of two heritable traits. A
landscape gives every point a fitness (several peaks, optionally ruggedness). One generation is a Wright-Fisher step: every
offspring draws its parent with probability proportional to exp(beta * fitness), then mutates by a Gaussian step. Optional:
crowding (similar individuals compete), a heritability below 1 (selection sees the trait plus noise), a mutation bias, and a
rotation of the whole landscape (the environment changes and the optimum moves).

Wire format (see docs/WRITING.md, "Adding a streamed Python animation"): binary float32 frames [step_ms, n, x0, y0, ...] with x
and y in [-2, 2] mapped on the canvas, with the heat map of the landscape as a raster block after the points (sent only when it
changes) and, before each frame, a JSON `draw` list (plots and arrows) that PyStream paints over the points. The client sends JSON with
n, dt, g and the extra sliders; the server answers the lockstep protocol of `nimbledeck record` (one frame per {"tick": n}).
"""
import asyncio
import json
import math
import sys
import time

import numpy as np
from scipy.ndimage import gaussian_filter
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

FRAME_S = 1 / 60
MAX_MESSAGE = 1024
GEN_FRAMES = 6                   # frames per generation: 10 generations a second at 60 fps, individuals glide between them
SPAN = 2.0                       # traits live in [-SPAN, SPAN]
GRID = 240                       # the heat map is GRID by GRID cells
CROWD = 0.32                     # how far apart two individuals can be and still compete

# Peaks of the landscape: (trait 1, trait 2, height, width). One broad global peak and three lower, narrower ones.
PEAKS = np.array([[-0.9, -0.7, 1.00, 0.60],
                  [1.0, 0.9, 0.85, 0.45],
                  [1.1, -1.0, 0.65, 0.40],
                  [-1.0, 1.1, 0.50, 0.35]])
# Where the founders start (the "start" slider picks one): trait 1, trait 2.
STARTS = [(0.05, 0.0), (1.05, -0.85), (-1.0, 1.05), (0.1, 1.5), (-0.1, -1.7), (1.6, 0.1)]

# name: (default, low, high)
PARAMS = {"n": (1200, 100, 3000), "dt": (0.04, 0.0, 0.15), "g": (4.0, 0.0, 12.0), "rugged": (0.0, 0.0, 1.0), "env": (0.0, 0.0, 1.0),
          "comp": (0.0, 0.0, 1.6), "h2": (1.0, 0.1, 1.0), "start": (1, 1, 6), "bias": (0.0, -0.05, 0.05)}


def landscape(x, y, rugged=0.0, env=0.0):
    """Fitness of trait pairs (x, y): a sum of Gaussian peaks, plus ripples that make many small local peaks when rugged > 0.
    env in [0, 1] turns the whole landscape around the centre by up to 86 degrees: the environment changes."""
    th = 1.5 * env
    c, s = math.cos(th), math.sin(th)
    u, v = c * x + s * y, -s * x + c * y            # the point seen from the landscape that has turned by th
    f = np.zeros(np.shape(u))
    for px, py, h, w in PEAKS:
        f = f + h * np.exp(-((u - px) ** 2 + (v - py) ** 2) / (2 * w * w))
    f = f + rugged * (0.30 * np.cos(3.3 * u + 0.7) * np.cos(3.1 * v - 0.4) + 0.18 * np.sin(5.1 * u + 1.0) * np.sin(4.6 * v + 2.0))
    return np.maximum(f, 0.0)


STOPS = np.array([  # colour of the heat map, from fitness 0 up (RGB)
    [0.00, 8, 10, 24], [0.18, 22, 22, 74], [0.40, 74, 28, 128], [0.62, 168, 40, 140], [0.82, 244, 112, 74], [1.00, 255, 214, 120], [1.20, 255, 246, 214]])


def heat(f):
    """RGB (uint8) of a fitness grid: a dark-to-warm ramp with fine contour lines every 0.1."""
    t = np.clip(f, 0, 1.2)
    rgb = np.stack([np.interp(t, STOPS[:, 0], STOPS[:, k]) for k in (1, 2, 3)], -1)
    gy, gx = np.gradient(f)
    phase = f / 0.1
    dist = np.abs(phase - np.round(phase)) / np.maximum(np.hypot(gx, gy) / 0.1, 1e-6)   # distance to the nearest level, in cells
    line = np.clip(1.2 - dist, 0, 1) * 0.22
    rgb = rgb * (1 - line[..., None]) + 255 * line[..., None]
    return np.clip(rgb, 0, 255).astype(np.uint8)


def raster_block(box, rugged, env):
    """The raster block of a frame that paints the landscape into box = (x, y, size) of the canvas (see docs/WRITING.md)."""
    g = (np.arange(GRID) + 0.5) / GRID * 2 * SPAN - SPAN
    X, Y = np.meshgrid(g, g[::-1])                  # row 0 is the top: the largest trait 2
    rgba = np.dstack([heat(landscape(X, Y, rugged, env)), np.full((GRID, GRID), 255, np.uint8)])
    head = np.array([1, box[0], box[1], box[2], box[2], GRID, GRID], dtype=np.float32)
    return head.tobytes() + rgba.tobytes()


class Evolution:
    """The population and its generations. `box` = (x, y, size) is where the trait square sits on the canvas, `canvas` = (w, h)."""

    def __init__(self, box, canvas, overrides=None, seed=11):
        self.box, self.canvas, self.seed = box, canvas, seed
        self.p = {k: v[0] for k, v in PARAMS.items()}
        self.p.update(overrides or {})
        self.reset()

    def reset(self):
        self.rng = np.random.default_rng(self.seed + int(self.p["start"]))
        n = int(self.p["n"])
        cx, cy = STARTS[int(self.p["start"]) - 1]
        self.z = np.clip(self.rng.normal([cx, cy], 0.12, (n, 2)), -SPAN, SPAN)
        self.prev = self.z.copy()
        self.k = 0
        self.gen = 0
        self.fit, self.var, self.mean = [], [], []
        self.diag = {key: np.zeros(2) for key in ("S", "R", "cov", "trans")}
        self.record()

    def set(self, m):
        restart = "start" in m and int(m["start"]) != int(self.p["start"])
        self.p.update(m)
        if restart:
            self.reset()
            return
        n = int(self.p["n"])
        if n != len(self.z):                          # a new size keeps the population: resample it
            self.z = self.z[self.rng.integers(0, len(self.z), n)]
            self.prev = self.z.copy()

    def crowding(self, z):
        """Share of the population that is close to each individual (1 = everyone is on top of it)."""
        bins = 64
        h, _, _ = np.histogram2d(z[:, 0], z[:, 1], bins=bins, range=[[-SPAN, SPAN]] * 2)
        s = CROWD / (2 * SPAN / bins)
        d = gaussian_filter(h, s, mode="constant") * (2 * math.pi * s * s) / len(z)
        ix = np.clip(((z[:, 0] + SPAN) / (2 * SPAN) * bins).astype(int), 0, bins - 1)
        iy = np.clip(((z[:, 1] + SPAN) / (2 * SPAN) * bins).astype(int), 0, bins - 1)
        return d[ix, iy]

    def record(self):
        f = landscape(self.z[:, 0], self.z[:, 1], self.p["rugged"], self.p["env"])
        self.fit.append(float(f.mean()))
        self.var.append(float(self.z.var(0).sum()))
        self.mean.append(self.z.mean(0))
        for series in (self.fit, self.var, self.mean):
            del series[:-HISTORY]

    def generation(self):
        """One Wright-Fisher generation: choose parents in proportion to fitness, then mutate. Also measures the terms of the
        breeder's equation (S, R) and of the Price equation (cov, trans) for this generation."""
        p, z, rng = self.p, self.z, self.rng
        n = len(z)
        h2 = p["h2"]
        sd_e = math.sqrt(max(z.var(0).mean(), 1e-9) * (1 - h2) / h2)       # noise that sets the heritability: h2 = Vg / (Vg + Ve)
        pheno = z + rng.normal(0, sd_e, z.shape) if h2 < 1 else z          # selection sees the phenotype
        w = landscape(pheno[:, 0], pheno[:, 1], p["rugged"], p["env"])
        if p["comp"] > 0:
            w = w - p["comp"] * self.crowding(pheno)
        w = np.exp(p["g"] * (w - w.max()))
        parents = rng.choice(n, n, p=w / w.sum())
        child = z[parents] + rng.normal(0, p["dt"], z.shape) + np.array([p["bias"], 0.0])
        child = np.where(np.abs(child) > SPAN, np.sign(child) * 2 * SPAN - child, child)   # reflect at the walls
        child = np.clip(child, -SPAN, SPAN)
        counts = np.bincount(parents, minlength=n)                          # offspring per individual: its realised fitness w, mean 1
        d = {"S": pheno[parents].mean(0) - pheno.mean(0),                   # selection differential, on the phenotype
             "R": child.mean(0) - z.mean(0),                                # response: the change of the mean trait
             "cov": ((counts - 1)[:, None] * (z - z.mean(0))).mean(0),      # Cov(w, z) / mean(w): the selection term of Price
             "trans": (child - z[parents]).mean(0)}                         # E(w dz) / mean(w): the transmission term of Price
        for key, v in d.items():                                            # smoothed over about ten generations, for steady arrows
            self.diag[key] = self.diag[key] * 0.85 + v * 0.15
        self.prev, self.z = z[parents], child
        self.gen += 1

    def step(self):
        """One frame: a new generation every GEN_FRAMES frames; in between the individuals glide from parent to offspring.
        Returns the points (in stream coordinates) and the mean position (canvas pixels)."""
        if self.k % GEN_FRAMES == 0:
            self.generation()
            self.record()
        self.k += 1
        a = (self.k % GEN_FRAMES or GEN_FRAMES) / GEN_FRAMES
        a = a * a * (3 - 2 * a)
        pos = self.prev + (self.z - self.prev) * a
        x, y = self.to_px(pos)
        W, H = self.canvas
        pts = np.stack([(x / W - 0.5) * 4, (y / H - 0.5) * 4], 1).astype(np.float32)
        mean = self.prev.mean(0) + (self.z.mean(0) - self.prev.mean(0)) * a
        return pts, mean

    def to_px(self, z):
        """Trait pairs to canvas pixels (trait 2 up)."""
        bx, by, bs = self.box
        return bx + (z[..., 0] + SPAN) / (2 * SPAN) * bs, by + (SPAN - z[..., 1]) / (2 * SPAN) * bs


HISTORY = 240                    # generations shown in the live plots


def r1(v):
    return [round(float(a), 1) for a in v]


def polyline(xs, ys):
    return [round(float(v), 1) for pair in zip(xs, ys) for v in pair]


def plot(x, y, w, h, series, color, title, fmt, lo=None, hi=None):
    """A small live line plot, as a list of shapes: a title, the latest value, a baseline and the curve."""
    out = [{"t": "text", "x": x, "y": y - 12, "s": title, "c": "--nd-muted", "size": 17, "weight": 500},
           {"t": "text", "x": x + w, "y": y - 12, "s": fmt(series[-1]), "c": color, "size": 19, "weight": 700, "align": "right"},
           {"t": "line", "p": [x, y + h, x + w, y + h], "c": "--nd-line", "w": 1.5}]
    s = np.asarray(series)
    lo = float(s.min()) if lo is None else lo
    hi = float(s.max()) if hi is None else hi
    hi = max(hi, lo + 1e-9)
    idx = np.arange(0, len(s), max(1, len(s) // 120))
    px = x + idx / (HISTORY - 1) * w
    py = y + h - (np.clip(s[idx], lo, hi) - lo) / (hi - lo) * h * 0.92 - h * 0.04
    out.append({"t": "line", "p": polyline(px, py), "c": color, "w": 2.6})
    return out


def frame_shape(box):
    bx, by, bs = box
    return [{"t": "rect", "x": bx - 1, "y": by - 1, "w": 1, "h": bs + 2, "c": "--nd-line"},
            {"t": "rect", "x": bx + bs, "y": by - 1, "w": 1, "h": bs + 2, "c": "--nd-line"},
            {"t": "rect", "x": bx - 1, "y": by - 1, "w": bs + 2, "h": 1, "c": "--nd-line"},
            {"t": "rect", "x": bx - 1, "y": by + bs, "w": bs + 2, "h": 1, "c": "--nd-line"}]


def arrow(x0, y0, dx, dy, color, width=3.5, gain=1.0, cap=None):
    """Shapes of an arrow from (x0, y0) by (dx, dy) canvas pixels, multiplied by gain (a very short one is not drawn)."""
    dx, dy = dx * gain, dy * gain
    n = math.hypot(dx, dy)
    if cap and n > cap:
        dx, dy, n = dx * cap / n, dy * cap / n, cap
    if n < 3:
        return []
    ux, uy = dx / n, dy / n
    hl = min(14.0, n * 0.5)
    tip = (x0 + dx, y0 + dy)
    left = (tip[0] - hl * (ux * 0.87 - uy * 0.5), tip[1] - hl * (uy * 0.87 + ux * 0.5))
    right = (tip[0] - hl * (ux * 0.87 + uy * 0.5), tip[1] - hl * (uy * 0.87 - ux * 0.5))
    return [{"t": "line", "p": r1([x0, y0, tip[0], tip[1]]), "c": color, "w": width},
            {"t": "line", "p": r1([left[0], left[1], tip[0], tip[1], right[0], right[1]]), "c": color, "w": width}]


class Hero:
    """The big slide: a 1280 x 720 canvas, the landscape on the right, two live plots and the generation count on the left."""
    canvas, box = (1280, 720), (640, 40, 580)

    def __init__(self):
        self.sim = Evolution(self.box, self.canvas)
        self.sent = None

    def set(self, m):
        self.sim.set(m)

    def frame(self):
        sim = self.sim
        pts, mean = sim.step()
        raster = b""
        key = (round(sim.p["rugged"], 4), round(sim.p["env"], 4))
        if key != self.sent:                        # a frame without the block keeps the last landscape
            self.sent = key
            raster = raster_block(self.box, *key)
        return [json.dumps({"draw": self.draw(mean)}, separators=(",", ":"))], pts, raster

    def draw(self, mean):
        sim = self.sim
        bx, by, bs = self.box
        mx, my = sim.to_px(mean)
        tx, ty = sim.to_px(np.array(sim.mean[-HISTORY:]))
        shapes = frame_shape(self.box)
        shapes += [{"t": "text", "x": bx + bs, "y": by + bs + 22, "s": "trait 1 →", "c": "--nd-muted", "size": 16, "align": "right"},
                   {"t": "text", "x": bx, "y": by - 10, "s": "trait 2 ↑", "c": "--nd-muted", "size": 16}]
        if len(tx) > 1:
            shapes.append({"t": "line", "p": polyline(tx, ty), "c": "--nd-chart-4", "w": 2.2, "a": 0.9})
        shapes.append({"t": "dot", "x": round(float(mx), 1), "y": round(float(my), 1), "r": 8, "c": "--nd-chart-4", "w": 2.5})
        shapes += plot(70, 410, 470, 84, sim.fit, "--nd-chart-1", "mean fitness", lambda v: f"{v:.2f}", 0.0, 1.1)
        shapes += plot(70, 546, 470, 84, sim.var, "--nd-chart-3", "trait variance", lambda v: f"{v:.3f}", 0.0, None)
        shapes.append({"t": "text", "x": bx + bs, "y": by - 10, "s": f"generation {sim.gen}", "c": "--nd-muted", "size": 16, "align": "right"})
        return shapes


class Lens:
    """A square view of the landscape with arrows at the mean: the terms of one equation, drawn longer so they can be seen.
    view = "breeder": S (selection differential) and R (response), R = h2 S.  view = "price": the selection and the
    transmission terms of the Price equation, and their sum, the change of the mean."""
    canvas, box = (640, 700), (0, 0, 640)
    GAIN = 10

    def __init__(self, view):
        self.view = view
        defaults = {"breeder": {"h2": 0.5, "n": 1500, "g": 4.0}, "price": {"n": 1500, "g": 4.0, "start": 4, "bias": 0.02}}[view]
        self.sim = Evolution(self.box, self.canvas, defaults)
        self.sent = None

    def set(self, m):
        self.sim.set(m)

    def frame(self):
        sim = self.sim
        if self.view == "breeder":
            # the landscape turns back and forth, 15 seconds a cycle, so the population always has a peak to chase
            sim.p["env"] = 0.3 * (1 - math.cos(2 * math.pi * sim.gen / 150))
        pts, mean = sim.step()
        raster = b""
        key = round(sim.p["env"], 3)
        if key != self.sent:
            self.sent = key
            raster = raster_block(self.box, 0.0, key)
        return [json.dumps({"draw": self.draw(mean)}, separators=(",", ":"))], pts, raster

    def draw(self, mean):
        sim = self.sim
        d = sim.diag
        mx, my = (float(v) for v in sim.to_px(mean))
        px = self.box[2] / (2 * SPAN)                      # canvas pixels per trait unit, to turn a change of trait into pixels
        up = np.array([px, -px])                           # trait 2 points up the screen
        shapes = frame_shape(self.box)
        label = lambda s, c, x, y: {"t": "text", "x": round(x, 1), "y": round(y, 1), "s": s, "c": c, "size": 22, "weight": 800}
        if self.view == "breeder":
            S, R = d["S"] * up, d["R"] * up
            shapes += arrow(mx, my, S[0], S[1], "--nd-chart-3", 3.5, self.GAIN, 230)
            shapes += arrow(mx, my, R[0], R[1], "--nd-chart-1", 4.5, self.GAIN, 230)
            sn, rn = float(np.hypot(*d["S"])), float(np.hypot(*d["R"]))
            for vec, name, c in ((S, "S", "--nd-chart-3"), (R, "R", "--nd-chart-1")):
                n = math.hypot(*vec) * self.GAIN
                if n >= 3:
                    k = min(n, 230) / n
                    shapes.append(label(name, c, mx + vec[0] * self.GAIN * k + 8, my + vec[1] * self.GAIN * k - 8))
            ratio = rn / sn if sn > 1e-4 else 0.0
            shapes.append({"t": "text", "x": 16, "y": 30, "s": f"R / S = {ratio:.2f}", "c": "--nd-ink", "size": 22, "weight": 700})
            shapes.append({"t": "text", "x": 16, "y": 54, "s": f"h² = {sim.p['h2']:.2f} set", "c": "--nd-chart-2", "size": 17, "weight": 600})
        else:
            C, T = d["cov"] * up, d["trans"] * up
            Z = C + T
            shapes += arrow(mx, my, Z[0], Z[1], "--nd-ink", 2.2, self.GAIN, 230)
            shapes += arrow(mx, my, C[0], C[1], "--nd-chart-1", 4.5, self.GAIN, 230)
            shapes += arrow(mx, my, T[0], T[1], "--nd-chart-2", 4.5, self.GAIN, 230)
            cn, tn, zn = (float(np.hypot(*d[k])) for k in ("cov", "trans", "R"))
            shapes.append({"t": "text", "x": 16, "y": 30, "s": f"change of the mean  {zn:.3f}", "c": "--nd-ink", "size": 20, "weight": 700})
            shapes.append({"t": "text", "x": 16, "y": 54, "s": f"selection {cn:.3f}", "c": "--nd-chart-1", "size": 18, "weight": 700})
            shapes.append({"t": "text", "x": 16, "y": 76, "s": f"transmission {tn:.3f}", "c": "--nd-chart-2", "size": 18, "weight": 700})
        shapes.append({"t": "text", "x": 624, "y": 624, "s": f"arrows drawn {self.GAIN} times longer", "c": "--nd-muted", "size": 15, "align": "right"})
        return shapes


def parse_params(raw):
    """Valid parameters from one client message, or {} for anything malformed."""
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(msg, dict):
        return {}
    out = {}
    for key, (_, lo, hi) in PARAMS.items():
        v = msg.get(key)
        if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
            out[key] = min(max(float(v), lo), hi)
    for key in ("n", "start"):
        if key in out:
            out[key] = int(out[key])
    return out


def _json(raw):
    try:
        msg = json.loads(raw)
    except (TypeError, ValueError):
        return None
    return msg if isinstance(msg, dict) else None


def parse_control(raw):
    """True when a client message asks for lockstep (`{"lockstep": true}`, sent by `nimbledeck record`)."""
    msg = _json(raw)
    return bool(msg) and msg.get("lockstep") is True


def parse_tick(raw):
    """True for a lockstep tick (`{"tick": n}`): the client wants exactly one more frame."""
    msg = _json(raw)
    return bool(msg) and isinstance(msg.get("tick"), int) and not isinstance(msg.get("tick"), bool)


def serve_view(make_view, name, default_port):
    """Run a stream server: one view per connection, computed in a worker thread, free-running at 60 fps or in lockstep."""
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else default_port
    origins = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--origin"] or ["http://127.0.0.1:3030", "http://localhost:3030"]

    async def handler(ws):
        view = make_view()
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
                    view = make_view()
                    await ws.send("lockstep")
                if lock["on"]:
                    if await ticks.get() is None:
                        return
                    t0 = time.perf_counter()
                if pending:
                    m = dict(pending); pending.clear()
                    view.set(m)
                msgs, pts, raster = await asyncio.to_thread(view.frame)
                for text in msgs:
                    await ws.send(text)
                ms = (time.perf_counter() - t0) * 1000
                await ws.send(np.array([ms, len(pts)], dtype=np.float32).tobytes() + pts.tobytes() + raster)
                if not lock["on"]:
                    await asyncio.sleep(max(0, FRAME_S - (time.perf_counter() - t0)))
        except ConnectionClosed:
            pass
        finally:
            task.cancel()

    async def main():
        async with serve(handler, "127.0.0.1", port, origins=origins, max_size=MAX_MESSAGE, compression=None):
            print(f"stream {name} on ws://127.0.0.1:{port}", flush=True)
            await asyncio.Future()

    asyncio.run(main())
