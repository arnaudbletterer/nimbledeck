"""Trains the toy attention model (plain NumPy, Adam, hand-written backpropagation).

    uv run --python 3.12 --with numpy python demos/train_attention.py [steps]

The data are made-up sentences "the A chased the B because it was ADJ"; the answer is A when ADJ describes the one who
chases (hungry, angry, fast, strong) and B when it describes the one who is chased (scared, slow, weak, small).
The model is the one of aitoy/attention.py: word + position vectors, two attention layers (softmax(QK^T/sqrt(d))V added
back to the vectors, Vaswani et al. 2017), then a linear read-out of the vector of "it".
"""
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "aitoy"))
from aitoy import attention as T  # noqa: E402

rng = np.random.default_rng(1)
V, D, N, L = len(T.VOCAB), T.D, 9, 2
P = {"emb": rng.normal(0, 0.5, (V, D)), "pos": rng.normal(0, 0.5, (N, D)), "out": rng.normal(0, 0.2, (D, len(T.ANIMALS)))}
for i in range(L):
    for n in ("Wq", "Wk", "Wv"):
        P[f"{n}{i}"] = rng.normal(0, 1 / np.sqrt(D), (D, D))


def batch(b):
    toks, y = np.empty((b, N), int), np.empty(b, int)
    for i in range(b):
        a, c = rng.choice(len(T.ANIMALS), 2, replace=False)
        verb = rng.integers(len(T.VERBS))
        doer = rng.random() < 0.5
        adj = rng.choice(T.DOER if doer else T.TARGET)
        words = ["the", T.ANIMALS[a], T.VERBS[verb], "the", T.ANIMALS[c], "because", "it", "was", adj]
        toks[i] = [T.INDEX[w] for w in words]
        y[i] = a if doer else c
    return toks, y


def forward(p, toks):
    x = p["emb"][toks] + p["pos"]
    cache = []
    for i in range(L):
        q, k, v = x @ p[f"Wq{i}"], x @ p[f"Wk{i}"], x @ p[f"Wv{i}"]
        s = q @ k.transpose(0, 2, 1) / np.sqrt(D)
        e = np.exp(s - s.max(2, keepdims=True))
        a = e / e.sum(2, keepdims=True)
        cache.append((x, q, k, v, a))
        x = x + a @ v
    h = x[:, 6]
    z = h @ p["out"]
    pr = np.exp(z - z.max(1, keepdims=True))
    pr /= pr.sum(1, keepdims=True)
    return pr, h, x, cache


def backward(p, toks, y, pr, h, cache):
    b = len(y)
    g = {k: np.zeros_like(v) for k, v in p.items()}
    dz = pr.copy()
    dz[np.arange(b), y] -= 1
    dz /= b
    g["out"] = h.T @ dz
    dx = np.zeros((b, N, D))
    dx[:, 6] = dz @ p["out"].T
    for i in reversed(range(L)):
        x, q, k, v, a = cache[i]
        da = dx @ v.transpose(0, 2, 1)
        dv = a.transpose(0, 2, 1) @ dx
        ds = a * (da - (da * a).sum(2, keepdims=True)) / np.sqrt(D)
        dq, dk = ds @ k, ds.transpose(0, 2, 1) @ q
        g[f"Wq{i}"] = np.einsum("bnd,bne->de", x, dq)
        g[f"Wk{i}"] = np.einsum("bnd,bne->de", x, dk)
        g[f"Wv{i}"] = np.einsum("bnd,bne->de", x, dv)
        dx = dx + dq @ p[f"Wq{i}"].T + dk @ p[f"Wk{i}"].T + dv @ p[f"Wv{i}"].T
    np.add.at(g["emb"], toks, dx)
    g["pos"] = dx.sum(0)
    return g


def loss(p, toks, y):
    pr = forward(p, toks)[0]
    return -np.log(pr[np.arange(len(y)), y] + 1e-12).mean()


if __name__ == "__main__":
    steps = int(sys.argv[1]) if len(sys.argv) > 1 else 6000
    toks, y = batch(8)
    pr, h, _, cache = forward(P, toks)
    g = backward(P, toks, y, pr, h, cache)
    for k in ("Wq0", "Wk1", "Wv0", "pos", "emb", "out"):
        idx = tuple(rng.integers(0, s) for s in P[k].shape)
        q = {kk: v.copy() for kk, v in P.items()}
        q[k][idx] += 1e-6
        print(f"gradient check {k}: analytic {g[k][idx]:.3e} numeric {(loss(q, toks, y) - loss(P, toks, y)) / 1e-6:.3e}")
    m = {k: np.zeros_like(v) for k, v in P.items()}
    s2 = {k: np.zeros_like(v) for k, v in P.items()}
    t0 = time.time()
    for it in range(1, steps + 1):
        lr = 3e-3 * (0.5 * (1 + np.cos(np.pi * it / steps)) * 0.97 + 0.03)
        toks, y = batch(128)
        pr, h, _, cache = forward(P, toks)
        g = backward(P, toks, y, pr, h, cache)
        for k in P:
            m[k] = 0.9 * m[k] + 0.1 * g[k]
            s2[k] = 0.999 * s2[k] + 0.001 * g[k] ** 2
            P[k] -= lr * (m[k] / (1 - 0.9 ** it)) / (np.sqrt(s2[k] / (1 - 0.999 ** it)) + 1e-8)
        if it % 500 == 0:
            acc = (pr.argmax(1) == y).mean()
            print(f"step {it:5d} loss {-np.log(pr[np.arange(len(y)), y]).mean():.4f} acc {acc:.2f} {time.time() - t0:.0f}s", flush=True)
    toks, y = batch(2000)
    print("accuracy on 2000 fresh sentences:", (forward(P, toks)[0].argmax(1) == y).mean())
    np.savez(os.path.join(HERE, "aitoy", "aitoy", "attention.npz"), **P)
    print("saved", sum(v.size for v in P.values()), "numbers")
