"""The pictures of the detection demo, drawn in the colours of the studio look (chart colours 1, 2, 3 = cyan, violet, pink).

Panels: the whitened strain with the template laid over it, a Q-transform with the template's f(t) track, the matched-filter
SNR time series, and the peak SNR of a bank of templates against their chirp mass. Everything is simulated (see gwlib.py).
`figure` is the 2 by 2 picture of the demo, `stack` the three panels of the equation slide.
"""
import io

import numpy as np

import gwlib as gw

INK, MUTED, LINE = "#f2eee6", "#9aa3b8", "#2c3552"
C1, C2, C3 = "#22d3ee", "#a78bfa", "#f472b6"
BAND = (20, 300)
BANK = np.arange(10.0, 60.5, 1.0)
ORDER = np.argsort(gw.T)
TS = gw.T[ORDER]                 # time axis in increasing order, -2 .. 2 s


def make_event(seed, dist, mc_true=30.0):
    psd = gw.psd_curve()
    return psd, gw.noise(seed, psd) + gw.chirp(mc_true, dist=dist)


def whiten(x, psd, band=BAND):
    ok = (gw.FREQ > band[0]) & (gw.FREQ < band[1])
    return np.fft.irfft(np.fft.rfft(x * gw.tukey(gw.N, 0.1)) / np.sqrt(psd) * ok, gw.N)


def scan(data, psd, bank=BANK):
    return np.array([gw.snr_series(data, gw.chirp(m), psd).max() for m in bank])


def track(mc, t):
    """f(t) of the leading-order inspiral at the times t (< 0), in Hz."""
    tm = gw.G * mc * gw.MSUN / gw.C ** 3
    tau = np.maximum(-t, 1e-6)
    return (1 / np.pi) * (5 / (256 * tau)) ** (3 / 8) * tm ** (-5 / 8)


def qtransform(x, freqs, q=6.0):
    """Normalised energy of a constant-Q Gabor filter bank (a Q-transform): rows are frequencies, columns are samples."""
    X = np.fft.rfft(x)
    rows = []
    for f0 in freqs:
        g = np.exp(-0.5 * ((gw.FREQ - f0) / (f0 / q)) ** 2)
        e = np.abs(np.fft.ifft(X * g, n=gw.N)) ** 2
        rows.append(e / np.median(e))
    return np.array(rows)


def style(ax, xlabel, ylabel, title, fs=10):
    for s in ax.spines.values():
        s.set_color(LINE)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(colors=MUTED, labelsize=fs - 1, length=3)
    ax.set_xlabel(xlabel, color=MUTED, fontsize=fs)
    ax.set_ylabel(ylabel, color=MUTED, fontsize=fs)
    ax.set_title(title, color=INK, fontsize=fs + 2, loc="left", fontweight="bold", pad=8)
    ax.patch.set_alpha(0)


class Run:
    """One matched-filter run: the event, the template, its SNR series, the bank scan."""

    def __init__(self, mc, dist, seed):
        self.mc = mc
        self.psd, self.data = make_event(seed, dist)
        self.tpl = gw.chirp(mc)
        self.snr = gw.snr_series(self.data, self.tpl, self.psd)
        self.k = int(self.snr.argmax())
        self.t_peak = float(gw.T[self.k])
        self.wd = whiten(self.data, self.psd)
        self.peaks = scan(self.data, self.psd)

    def overlay(self):
        """The template as the filter sees it (whitened), shifted to the SNR peak, with the phase and amplitude of the best fit."""
        ok = (gw.FREQ > BAND[0]) & (gw.FREQ < BAND[1])
        w = gw.tukey(gw.N, 0.1)
        hf = np.fft.rfft(self.tpl * w) / np.sqrt(self.psd) * ok
        df = np.fft.rfft(self.data * w) / np.sqrt(self.psd) * ok
        lag = self.k - gw.N // 2
        z = np.fft.ifft(df * hf.conj(), n=gw.N)[lag % gw.N]
        ana = np.fft.ifft(hf, n=gw.N) * 2
        cands = [np.roll(np.real(ana * np.exp(s * 1j * np.angle(z))), lag) for s in (1, -1)]
        best = max(cands, key=lambda c: np.dot(c, self.wd))
        return best * np.dot(best, self.wd) / max(np.dot(best, best), 1e-30)

    def draw_strain(self, ax, fs=10):
        m = (TS > -1.0) & (TS < 0.35)
        sd = self.wd.std()
        ax.plot(TS[m], self.wd[ORDER][m] / sd, color=MUTED, lw=0.7, alpha=0.9)
        ax.plot(TS[m], self.overlay()[ORDER][m] / sd, color=C1, lw=1.4)
        ax.set_xlim(-1.0, 0.35)
        ax.set_ylim(-4.5, 4.5)
        style(ax, "time (s)", "whitened strain (sigma)", "What the detector records", fs)

    def draw_chirp(self, ax, fs=10, title="The chirp, if you know where to look"):
        from matplotlib.colors import LinearSegmentedColormap
        freqs = np.geomspace(20, 300, 72)
        img = qtransform(self.wd, freqs)[:, ORDER]
        cmap = LinearSegmentedColormap.from_list("gw", ["#07090f", "#1b2250", "#5b3fa5", "#c05f9e", "#f5d9a0"])
        ax.pcolormesh(TS, freqs, img, cmap=cmap, vmin=1.0, vmax=max(6.0, 0.8 * img.max()), shading="auto", rasterized=True)
        tr = np.linspace(-0.98, -0.004, 400)
        ft = track(self.mc, tr)
        keep = (ft > 20) & (ft < gw.F_END)
        ax.plot((tr + self.t_peak)[keep], ft[keep], color=C1, lw=1.8, ls=(0, (4, 3)))
        ax.set_xlim(-1.0, 0.35)
        ax.set_ylim(20, 300)
        ax.set_yscale("log")
        ax.set_yticks([20, 50, 100, 200, 300])
        ax.set_yticklabels(["20", "50", "100", "200", "300"])
        ax.minorticks_off()
        style(ax, "time (s)", "frequency (Hz)", title, fs)

    def draw_snr(self, ax, fs=10, title=None):
        s = self.snr
        ax.plot(TS, s[ORDER], color=C3, lw=1.1)
        ax.axhline(8, color=MUTED, lw=0.8, ls=(0, (2, 3)))
        ax.text(TS[-1], 8.4, "detection threshold", color=MUTED, fontsize=fs - 2, ha="right", va="bottom")
        ax.plot([self.t_peak], [s[self.k]], "o", color=C3, ms=5)
        ax.set_xlim(TS[0], TS[-1])
        ax.set_ylim(0, max(12, s.max() * 1.18))
        where = "merger at t = 0.00 s" if abs(self.t_peak) < 0.005 else f"peak at t = {self.t_peak:+.2f} s"
        style(ax, "time (s)", "matched-filter SNR", title or f"SNR {s[self.k]:.1f}, {where}", fs)

    def draw_masses(self, ax, fs=10, title=None):
        ax.plot(BANK, self.peaks, color=C2, lw=1.4)
        ax.fill_between(BANK, self.peaks, color=C2, alpha=0.18, lw=0)
        ax.axhline(8, color=MUTED, lw=0.8, ls=(0, (2, 3)))
        ax.axvline(self.mc, color=C2, lw=1.0, ls=(0, (4, 3)))
        ax.plot([self.mc], [self.snr[self.k]], "o", color=C2, ms=6, mec=INK, mew=1.0)
        ax.set_xlim(BANK[0], BANK[-1])
        ax.set_ylim(0, max(12, self.peaks.max() * 1.18))
        style(ax, "template chirp mass (solar masses)", "peak SNR", title or f"Best template: {self.best:.0f} solar masses", fs)

    @property
    def best(self):
        return float(BANK[self.peaks.argmax()])


def _png(fig):
    import matplotlib.pyplot as plt
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True)
    plt.close(fig)
    return buf.getvalue()


def _fig(size, dpi):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig = plt.figure(figsize=size, dpi=dpi)
    fig.patch.set_alpha(0)
    return fig


def figure(mc, dist, seed, dpi=150, size=(11.2, 4.9)):
    """The 2 by 2 picture of the demo. Returns (png bytes, SNR of the template, best mass of the bank)."""
    r = Run(mc, dist, seed)
    fig = _fig(size, dpi)
    gs = fig.add_gridspec(2, 2, hspace=0.62, wspace=0.2, left=0.06, right=0.985, top=0.93, bottom=0.1)
    r.draw_strain(fig.add_subplot(gs[0, 0]))
    r.draw_chirp(fig.add_subplot(gs[1, 0]))
    r.draw_snr(fig.add_subplot(gs[0, 1]))
    r.draw_masses(fig.add_subplot(gs[1, 1]))
    return _png(fig), float(r.snr[r.k]), r.best


def stack(mc=30.0, dist=1800, seed=7, dpi=200, size=(7.0, 7.4)):
    """Three panels one above the other for the equation slide: the chirp track, the chirp mass, the SNR peak."""
    r = Run(mc, dist, seed)
    fig = _fig(size, dpi)
    gs = fig.add_gridspec(3, 1, hspace=0.78, left=0.1, right=0.97, top=0.95, bottom=0.075)
    r.draw_chirp(fig.add_subplot(gs[0]), fs=11, title="Frequency climbs along the dashed track")
    r.draw_masses(fig.add_subplot(gs[1]), fs=11, title="One chirp mass fits best")
    r.draw_snr(fig.add_subplot(gs[2]), fs=11, title="The filter's answer: one peak")
    return _png(fig)
