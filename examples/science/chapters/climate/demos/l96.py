"""Lorenz-96 and a stochastic ensemble Kalman filter, in plain NumPy. Shared by the stream server of the chapter.

Lorenz (1996), "Predictability: a problem partly solved": K variables on a latitude circle,
    dX_k/dt = (X_{k+1} - X_{k-2}) X_{k-1} - X_k + F,   indices modulo K.
One model time unit is about 5 days (Lorenz's own scaling), so a step of 0.05 is six hours.
The filter is the perturbed-observation EnKF (Burgers, van Leeuwen, Evensen 1998; Houtekamer and Mitchell 1998) with
multiplicative inflation and Gaspari-Cohn localisation (Gaspari and Cohn 1999).
"""
import numpy as np

K = 40            # variables around the circle
DT = 0.05         # one model step = 6 hours (a model day is 0.2 time units)


def tendency(x, f):
    """dX/dt for states stored along the last axis (any leading shape)."""
    return (np.roll(x, -1, -1) - np.roll(x, 2, -1)) * np.roll(x, 1, -1) - x + f


def rk4(x, f, h=DT):
    k1 = tendency(x, f)
    k2 = tendency(x + 0.5 * h * k1, f)
    k3 = tendency(x + 0.5 * h * k2, f)
    k4 = tendency(x + h * k3, f)
    return x + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)


def spin_up(f, rng, steps=1500):
    """A state on the attractor: start near the rest state F and let the transient die away."""
    x = f + rng.normal(0, 0.5, K)
    for _ in range(steps):
        x = rk4(x, f)
    return x


def gaspari_cohn(dist, radius):
    """Compactly supported correlation, 1 at 0 and exactly 0 beyond 2 * radius (Gaspari and Cohn 1999, eq. 4.10)."""
    z = np.abs(dist) / radius
    c = np.zeros_like(z)
    a = z <= 1
    b = (z > 1) & (z < 2)
    c[a] = -0.25 * z[a] ** 5 + 0.5 * z[a] ** 4 + 0.625 * z[a] ** 3 - 5 / 3 * z[a] ** 2 + 1
    c[b] = z[b] ** 5 / 12 - 0.5 * z[b] ** 4 + 0.625 * z[b] ** 3 + 5 / 3 * z[b] ** 2 - 5 * z[b] + 4 - 2 / (3 * z[b])
    return c


def localisation(radius, k=K):
    i = np.arange(k)
    d = np.abs(i[:, None] - i[None, :])
    return gaspari_cohn(np.minimum(d, k - d), radius)


def analysis(ens, y, obs_idx, sigma_o, rng, inflation=1.05, radius=4.0):
    """x_a = x_f + K (y - H x_f), K = P H^T (H P H^T + R)^-1, for every member with its own perturbed observation.
    P is the sample covariance of the ensemble, inflated and tapered (Schur product with the Gaspari-Cohn matrix)."""
    n = len(ens)
    mean = ens.mean(0)
    anom = inflation * (ens - mean)
    ens = mean + anom                                            # inflated prior
    p = localisation(radius, ens.shape[1]) * (anom.T @ anom) / (n - 1)
    ph = p[:, obs_idx]                                           # P H^T for a selection operator H
    s = p[np.ix_(obs_idx, obs_idx)] + sigma_o ** 2 * np.eye(len(obs_idx))
    gain = np.linalg.solve(s, ph.T).T                            # K, shape (K, m)
    y_i = y + rng.normal(0, sigma_o, (n, len(obs_idx)))          # one perturbed observation per member
    return ens + (y_i - ens[:, obs_idx]) @ gain.T


def spread(ens):
    return float(np.sqrt(ens.var(0, ddof=1).mean()))


def rmse(ens, truth):
    return float(np.sqrt(((ens.mean(0) - truth) ** 2).mean()))
