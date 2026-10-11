"""The toy noise predictor of the diffusion demo: a small network, in plain NumPy, trained by demos/train_diffusion.py.

eps(x, abar, label) answers one question: "this point x was made from a picture by mixing in noise, so that a fraction
abar of the signal is left; which noise was mixed in?"  The network sees x, the noise level (as log-SNR) and the prompt
(label 0 = no prompt, 1 = smiley, 2 = spiral, 3 = the letters AI). About 140,000 numbers, 3 hidden layers of 256.
"""
import os

import numpy as np

FREQ = np.array([1, 2, 4, 8], np.float32)
_W = {}


def load():
    if not _W:
        z = np.load(os.path.join(os.path.dirname(__file__), "diffusion.npz"))
        _W.update({k: z[k].astype(np.float32) for k in z.files})
    return _W


def silu(a):
    return a * 0.5 * (1 + np.tanh(a / 2))   # a / (1 + exp(-a)), without the overflow warning


def logsnr(abar):
    abar = np.clip(abar, 4.54e-5, 1 - 4.54e-5)   # log-SNR in [-10, 10], the range the network was trained on
    return np.log(abar / (1 - abar))


def features(x, abar, label):
    """The network input: the point with Fourier features, and the conditioning (noise level and prompt)."""
    x = np.asarray(x, np.float32)
    n = len(x)
    lam = np.broadcast_to(np.asarray(logsnr(abar), np.float32), (n,))
    lab = np.broadcast_to(np.asarray(label), (n,)).astype(int)
    xf = np.concatenate([x, np.sin(x[:, :, None] * FREQ).reshape(n, -1), np.cos(x[:, :, None] * FREQ).reshape(n, -1)], 1)
    cond = np.concatenate([lam[:, None] / 5, np.sin(lam[:, None] * np.array([0.5, 1, 2], np.float32)),
                           np.cos(lam[:, None] * np.array([0.5, 1, 2], np.float32)), np.eye(4, dtype=np.float32)[lab]], 1)
    return xf.astype(np.float32), cond.astype(np.float32)


def eps(x, abar, label=0):
    """The predicted noise for each point of x (shape (n, 2)). abar and label may be numbers or one per point."""
    w = load()
    xf, cond = features(x, abar, label)
    h = silu(np.concatenate([xf, cond], 1) @ w["W0"] + w["b0"])
    h = silu(np.concatenate([h, cond], 1) @ w["W1"] + w["b1"])
    h = silu(np.concatenate([h, cond], 1) @ w["W2"] + w["b2"])
    return np.concatenate([h, cond], 1) @ w["W3"] + w["b3"]
