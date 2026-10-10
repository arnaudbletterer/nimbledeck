"""Simulated gravitational-wave detection, shared by the marimo demo and mirrored in the LiveCode slide.

Everything here is SIMULATED: Gaussian noise coloured by a toy Advanced-LIGO-like curve, plus a leading-order
post-Newtonian inspiral (the quadrupole formula of a point-mass binary). No LIGO data is used.

Conventions: one-sided PSD S(f) in 1/Hz, DFT without a dt factor (so <|X_k|^2> = N fs S_k / 2 for noise), time axis
from -2 to 2 s, the template merges at t = 0 and the SNR series is the lag: its peak reads the merger time of the data.
"""
import numpy as np
from scipy.signal.windows import tukey

G, C, MSUN, MPC = 6.674e-11, 2.998e8, 1.989e30, 3.0857e22
FS, N = 2048, 8192                      # 2048 samples per second, 4 seconds
T = np.arange(N) / FS - 2                         # -2 .. 2 s, the event merges at t = 0 (index N / 2)
FREQ = np.fft.rfftfreq(N, 1 / FS)
F_END = 220.0                           # the point-mass formula stops here; a real merger needs numerical relativity


def psd_curve(f=FREQ):
    """A toy bucket-shaped noise curve, one-sided PSD in 1/Hz: a steep rise towards low frequencies (flat under 10 Hz), a floor of 4e-24 per root hertz
    around 100 Hz and a rise above 300 Hz. Shaped like an Advanced LIGO design curve, not a measured one."""
    f = np.maximum(f, 10.0)
    return 1.6e-47 * ((50 / f) ** 4.5 + 1 + (f / 300) ** 2)


def noise(seed, psd):
    rng = np.random.default_rng(seed)
    X = np.sqrt(psd * FS * N / 4) * (rng.normal(size=psd.size) + 1j * rng.normal(size=psd.size))
    return np.fft.irfft(X, N)


def chirp(mc, flow=20.0, dist=None):
    """h(t) of the inspiral, merger at t = 0, from flow up to F_END. mc in solar masses.
    Unit amplitude when dist is None, else the physical strain at dist (Mpc), face-on."""
    tm = G * mc * MSUN / C ** 3                                  # G Mc / c^3, seconds
    tau = np.maximum(-T, 1e-9)                                    # time to merger
    f = (1 / np.pi) * (5 / (256 * tau)) ** (3 / 8) * tm ** (-5 / 8)
    phase = -2 * (5 * tm) ** (-5 / 8) * tau ** (5 / 8)
    amp = tau ** -0.25 if dist is None else (G * mc * MSUN / C ** 2) ** 1.25 * (5 / (C * tau)) ** 0.25 / (dist * MPC)
    on = (T < 0) & (f >= flow) & (f <= F_END)
    return np.where(on, amp * np.cos(phase), 0.0)


def snr_series(data, template, psd, band=(20, 300), alpha=0.1):
    """Complex matched filter: whiten both, correlate in the frequency domain, return |SNR|(t)."""
    w = tukey(N, alpha)
    ok = (FREQ > band[0]) & (FREQ < band[1])
    asd = np.sqrt(psd)
    d = np.fft.rfft(data * w) / asd * ok
    h = np.fft.rfft(template * w) / asd * ok
    z = np.fft.ifft(d * h.conj(), n=N)
    norm = np.sqrt(FS * np.sum(abs(h) ** 2) / N)
    return np.fft.fftshift(2 * abs(z) / norm)
