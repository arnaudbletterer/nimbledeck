"""Three made-up 2D pictures, each a cloud of points, for the diffusion toy. Coordinates fit in [-1.2, 1.2].

shape(label, n, rng): label 1 = smiley, 2 = spiral, 3 = the letters AI, 0 = "anything" (a third of each).
"""
import numpy as np

NAMES = {0: "anything", 1: "smiley", 2: "spiral", 3: "AI"}


def _strokes(points, n, rng, jitter):
    """n points spread along a polyline (a list of corners) with a little jitter."""
    pts = np.asarray(points, float)
    seg = pts[1:] - pts[:-1]
    length = np.hypot(seg[:, 0], seg[:, 1])
    k = rng.choice(len(seg), n, p=length / length.sum())
    u = rng.random(n)[:, None]
    return pts[k] + u * seg[k] + rng.normal(0, jitter, (n, 2))


def smiley(n, rng):
    face, eye, mouth = int(n * 0.42), int(n * 0.10), int(n * 0.28)
    a = rng.uniform(0, 2 * np.pi, face)
    ring = np.c_[np.cos(a), np.sin(a)] * 1.02
    eyes = []
    for sx in (-1, 1):
        r = 0.12 * np.sqrt(rng.random(eye))
        b = rng.uniform(0, 2 * np.pi, eye)
        eyes.append(np.c_[sx * 0.38 + r * np.cos(b), 0.34 + r * np.sin(b)])
    c = rng.uniform(np.radians(205), np.radians(335), mouth)
    smile = np.c_[0.62 * np.cos(c), 0.05 + 0.62 * np.sin(c)]
    rest = n - face - 2 * eye - mouth
    c = rng.uniform(np.radians(205), np.radians(335), rest)
    smile2 = np.c_[0.62 * np.cos(c), 0.05 + 0.62 * np.sin(c)]
    return np.vstack([ring, *eyes, smile, smile2]) + rng.normal(0, 0.022, (n, 2))


def spiral(n, rng):
    arm = rng.integers(0, 2, n)
    u = rng.random(n)
    th = 3.3 * np.pi * np.sqrt(u) + 0.35
    r = 0.1 + 1.05 * th / (3.3 * np.pi + 0.35)
    th = th + arm * np.pi
    return np.c_[r * np.cos(th), r * np.sin(th)] + rng.normal(0, 0.03, (n, 2))


def letters(n, rng):
    a = _strokes([(-1.12, -0.85), (-0.66, 0.9), (-0.2, -0.85)], int(n * 0.36), rng, 0.026)
    bar = _strokes([(-0.9, -0.3), (-0.42, -0.3)], int(n * 0.1), rng, 0.026)
    i1 = _strokes([(0.55, -0.85), (0.55, 0.9)], int(n * 0.26), rng, 0.026)
    i2 = _strokes([(0.2, 0.9), (0.9, 0.9)], int(n * 0.14), rng, 0.026)
    i3 = _strokes([(0.2, -0.85), (0.9, -0.85)], n - len(a) - len(bar) - len(i1) - len(i2), rng, 0.026)
    return np.vstack([a, bar, i1, i2, i3])


GEN = {1: smiley, 2: spiral, 3: letters}


def shape(label, n, rng):
    """n points of the picture `label` (0 mixes the three). Returns an (n, 2) array."""
    if label in GEN:
        return GEN[label](n, rng)
    k = [n // 3, n // 3, n - 2 * (n // 3)]
    pts = np.vstack([GEN[i + 1](k[i], rng) for i in range(3)])
    return pts[rng.permutation(n)]
