"""Trains the toy noise predictor of the diffusion demo (plain NumPy, Adam, hand-written backpropagation).

    uv run --python 3.12 --with numpy python demos/train_diffusion.py [steps]

Each step draws fresh points from the three pictures (demos/aitoy/aitoy/shapes.py), mixes in noise at a random level and
asks the network for the noise (Ho et al. 2020, the simple loss). The prompt is dropped 20% of the time, so the same
network also knows the unprompted case (classifier-free guidance, Ho and Salimans 2022). Writes aitoy/diffusion.npz,
the average of the weights over the last steps (an exponential moving average).
"""
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "aitoy"))
from aitoy import diffusion as D  # noqa: E402
from aitoy.shapes import shape  # noqa: E402

H = 256
rng = np.random.default_rng(0)
din, dcond = 2 + 16, 11
sizes = [(din + dcond, H), (H + dcond, H), (H + dcond, H), (H + dcond, 2)]
P = {}
for i, (a, b) in enumerate(sizes):
    P[f"W{i}"] = (rng.normal(size=(a, b)) * np.sqrt(1.0 / a)).astype(np.float32)
    P[f"b{i}"] = np.zeros(b, np.float32)
P["W3"] *= 0.1


def forward(p, xf, cond):
    cache = []
    h = np.concatenate([xf, cond], 1)
    for i in range(3):
        z = h @ p[f"W{i}"] + p[f"b{i}"]
        a = z / (1 + np.exp(-z))
        cache.append((h, z))
        h = np.concatenate([a, cond], 1)
    cache.append((h, None))
    return h @ p["W3"] + p["b3"], cache


def backward(p, cache, dout):
    g = {}
    h, _ = cache[3]
    g["W3"], g["b3"] = h.T @ dout, dout.sum(0)
    dh = dout @ p["W3"].T
    for i in (2, 1, 0):
        da = dh[:, :H]
        hin, z = cache[i]
        s = 1 / (1 + np.exp(-z))
        dz = da * (s * (1 + z * (1 - s)))
        g[f"W{i}"], g[f"b{i}"] = hin.T @ dz, dz.sum(0)
        dh = dz @ p[f"W{i}"].T
    return g


def batch(n):
    lab = rng.integers(1, 4, n)
    x0 = np.empty((n, 2))
    for k in (1, 2, 3):
        m = lab == k
        x0[m] = shape(k, int(m.sum()), rng)
    lab = np.where(rng.random(n) < 0.2, 0, lab)
    lam = np.where(rng.random(n) < 0.7, rng.normal(0, 2.0, n), rng.uniform(-10, 10, n)).clip(-10, 10)
    ab = 1 / (1 + np.exp(-lam))
    e = rng.normal(size=(n, 2))
    xt = np.sqrt(ab)[:, None] * x0 + np.sqrt(1 - ab)[:, None] * e
    xf, cond = D.features(xt, ab, lab)
    return xf, cond, e.astype(np.float32)


def check_gradient():
    p = {k: v.astype(np.float64) for k, v in P.items()}
    xf, cond, e = batch(32)
    xf, cond, e = xf.astype(np.float64), cond.astype(np.float64), e.astype(np.float64)
    def loss(q):
        out, _ = forward(q, xf, cond)
        return ((out - e) ** 2).mean()
    out, cache = forward(p, xf, cond)
    g = backward(p, cache, 2 * (out - e) / out.size)
    for k in ("W0", "b1", "W2", "W3"):
        idx = tuple(rng.integers(0, s) for s in p[k].shape)
        q = {kk: v.copy() for kk, v in p.items()}
        q[k][idx] += 1e-6
        num = (loss(q) - loss(p)) / 1e-6
        print(f"gradient check {k}: analytic {g[k][idx]:.3e} numeric {num:.3e}")


if __name__ == "__main__":
    steps = int(sys.argv[1]) if len(sys.argv) > 1 else 30000
    B, lr0, lr1 = 2048, 2e-3, 5e-5
    check_gradient()
    m = {k: np.zeros_like(v) for k, v in P.items()}
    v = {k: np.zeros_like(x) for k, x in P.items()}
    ema = {k: x.copy() for k, x in P.items()}
    t0, run = time.time(), 0.0
    for it in range(1, steps + 1):
        lr = lr1 + 0.5 * (lr0 - lr1) * (1 + np.cos(np.pi * it / steps)) * min(1, it / 200)
        xf, cond, e = batch(B)
        out, cache = forward(P, xf, cond)
        d = out - e
        run = 0.99 * run + 0.01 * float((d ** 2).mean()) if it > 1 else float((d ** 2).mean())
        g = backward(P, cache, 2 * d / d.size)
        for k in P:
            m[k] = 0.9 * m[k] + 0.1 * g[k]
            v[k] = 0.999 * v[k] + 0.001 * g[k] ** 2
            P[k] -= (lr * (m[k] / (1 - 0.9 ** it)) / (np.sqrt(v[k] / (1 - 0.999 ** it)) + 1e-8)).astype(np.float32)
            ema[k] = 0.999 * ema[k] + 0.001 * P[k]
        if it % 500 == 0:
            print(f"step {it:6d}  loss {run:.4f}  lr {lr:.1e}  {time.time() - t0:.0f}s", flush=True)
            np.savez(os.path.join(HERE, "aitoy", "aitoy", "diffusion.npz"), **{k: ema[k] for k in ema})
    np.savez(os.path.join(HERE, "aitoy", "aitoy", "diffusion.npz"), **{k: ema[k] for k in ema})
    print("saved", sum(x.size for x in ema.values()), "numbers")
