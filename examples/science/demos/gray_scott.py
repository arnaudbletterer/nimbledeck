"""Gray-Scott reaction-diffusion on a periodic grid. Usage: gray_scott.py <feed> <kill> <steps> <out.npy> [<size>].

Two chemicals, U (food) and V (the thing that eats it and spreads). Diffusion is a five point Laplacian, the reaction is
U + 2V -> 3V, and food is fed in at rate F while V decays at rate F + k. Writes the V field as float32.
"""
import sys

import numpy as np

feed, kill, steps, out = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
n = int(sys.argv[5]) if len(sys.argv) > 5 else 256

U = np.ones((n, n), np.float32)
V = np.zeros((n, n), np.float32)
rng = np.random.default_rng(7)
for _ in range(9):                                   # nine small seeds of V in a sea of U
    y, x = rng.integers(n // 8, n - n // 8, 2)
    U[y - 4:y + 4, x - 4:x + 4], V[y - 4:y + 4, x - 4:x + 4] = 0.5, 0.25
V += rng.random((n, n), dtype=np.float32) * 0.02


def lap(z):
    return np.roll(z, 1, 0) + np.roll(z, -1, 0) + np.roll(z, 1, 1) + np.roll(z, -1, 1) - 4 * z


for _ in range(steps):
    uvv = U * V * V
    U += 0.16 * lap(U) - uvv + feed * (1 - U)
    V += 0.08 * lap(V) + uvv - (feed + kill) * V
np.save(out, V)
