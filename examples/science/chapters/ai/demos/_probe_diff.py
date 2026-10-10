import sys, time, math
sys.path.insert(0, "demos/aitoy")
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from aitoy import diffusion as D

def abar(s, sched):
    s = np.asarray(s, float)
    if sched == 0:
        a = np.exp(-(0.1 * s + 9.95 * s ** 2))
    else:
        a = np.cos((s + 0.008) / 1.008 * np.pi / 2) ** 2 / np.cos(0.008 / 1.008 * np.pi / 2) ** 2
    return np.clip(a, 1e-5, 1.0)

def sample(prompt, steps, sched, g, n=2800, seed=0):
    rng = np.random.default_rng(seed)
    ab = abar(np.linspace(1, 0, steps + 1), sched)
    x = rng.normal(size=(n, 2))
    for k in range(steps):
        t, s = ab[k], ab[k + 1]
        if prompt == 0:
            eps = D.eps(x, t, 0)
        else:
            both = D.eps(np.concatenate([x, x]), t, np.r_[np.zeros(n, int), np.full(n, prompt)])
            eps = both[:n] + g * (both[n:] - both[:n])
        alpha = t / s
        mean = (x - (1 - alpha) / math.sqrt(1 - t) * eps) / math.sqrt(alpha)
        x = mean + math.sqrt((1 - s) / (1 - t) * (1 - alpha)) * rng.normal(size=x.shape)
    return x

cfgs = [(1, 40, 1, 2.0), (2, 40, 1, 2.0), (3, 40, 1, 2.0), (0, 40, 1, 1.0),
        (1, 8, 0, 2.0), (1, 8, 1, 2.0), (1, 40, 1, 0.5), (1, 40, 1, 5.0)]
fig, ax = plt.subplots(2, 4, figsize=(16, 8))
for a, (p, st, sc, g) in zip(ax.ravel(), cfgs):
    t0 = time.time(); x = sample(p, st, sc, g); dt = time.time() - t0
    a.scatter(x[:, 0], x[:, 1], s=1.5); a.set_xlim(-1.6, 1.6); a.set_ylim(-1.6, 1.6); a.set_aspect("equal")
    a.set_title(f"prompt {p} steps {st} sched {sc} g {g}  {dt:.1f}s")
fig.savefig(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ai-probe.png", dpi=70)
