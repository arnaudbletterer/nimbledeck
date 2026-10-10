# Gravitational waves, live

A five slide chapter of the science deck. Hero demo: a LIGO-style detection. A binary black hole inspiral is buried in
detector noise, and the audience finds it with a matched filter: slide the chirp mass of the template until the SNR
peak locks onto the event, then read and edit the real code that does it.

**Everything here is simulated.** The noise is Gaussian, coloured by a toy bucket-shaped curve (a steep rise towards low
frequencies, a floor of 4e-24 per root hertz near 100 Hz, a rise above 300 Hz) that is shaped like an Advanced LIGO design
curve, not a measured one. The signal is the leading-order post-Newtonian inspiral of a point-mass binary, stopped at 220 Hz
(a real merger and ringdown need numerical relativity). No LIGO data is used. With this toy noise the distance is only a
loudness knob: the real GW150914 was at about 410 Mpc, the demo's events sit at 500 to 3000 Mpc.

## Run it

```sh
npm install                                    # once, from the repository root
cd examples/science/chapters/gw
NIMBLEDECK_PORT_OFFSET=5 node ../../../../packages/cli/bin/nimbledeck.mjs run gw.md     # live, http://localhost:3035
node ../../../../packages/cli/bin/nimbledeck.mjs check gw.md
node ../../../../packages/cli/bin/nimbledeck.mjs record gw.md                           # re-film public/recordings
```

The first run lets uv fetch Python and the packages of `demos/requirements.txt`; after that it works offline. Ports: demo
2900, runner 19100 (plus the offset). Every name is prefixed `gw-` so the chapter merges with the others.

## The slides

| # | Slide | What it shows |
|---|---|---|
| 1 | Two black holes collided. | Hook: `statement`, motion `blur-in`, background `waves` |
| 2 | Simulated strain: slide the template's chirp mass | `Demo gw-detect`: sliders for the template chirp mass, the distance and the noise sample. Four panels: whitened strain with the template laid over it, a Q-transform with the template's f(t) track dashed, the matched-filter SNR against time, and the peak SNR of a bank of templates against their mass |
| 3 | The live code | `LiveCode`: whiten, correlate, normalise, scan a bank of masses. Edit `mc`, `flow`, `band` or `alpha` |
| 4 | Three equations. One detection. | Chirp frequency, chirp mass and the SNR integral. Their coloured terms point at the track, the mass scan and the SNR peak of a still picture (`public/gw-chirp.png`) |
| 5 | The real event, for scale | Published values of GW150914 (Abbott et al. 2016) |

## The physics

Leading order, circular orbit, with $\tau = t_c - t$ and $\mathcal M_c = (m_1 m_2)^{3/5} / (m_1 + m_2)^{1/5}$:

- frequency of the wave: $f(\tau) = \frac{1}{\pi}\left(\frac{5}{256\,\tau}\right)^{3/8}\left(\frac{G\mathcal M_c}{c^3}\right)^{-5/8}$
- phase: $\Phi(\tau) = \Phi_c - 2\,(5 G\mathcal M_c / c^3)^{-5/8}\,\tau^{5/8}$
- amplitude (face on): $h_0 = \frac{1}{r}\left(\frac{G\mathcal M_c}{c^2}\right)^{5/4}\left(\frac{5}{c\,\tau}\right)^{1/4}$

(Maggiore, *Gravitational Waves* vol. 1, chapter 4.) The matched filter is
$\rho(t) = 4\,\mathrm{Re}\int_0^\infty \tilde d(f)\,\tilde h^*(f)\,e^{2\pi i f t}/S_n(f)\,\mathrm d f$, divided by
$\sigma^2 = 4\int_0^\infty |\tilde h|^2/S_n\,\mathrm d f$. The code takes the modulus of the analytic version (keep only
positive frequencies, `ifft(..., n=N)`), which also searches over the unknown phase. Checks done while writing it: pure noise
gives a peak SNR of 3 to 4 over 4 seconds (the maximum of a Rayleigh variable), and the SNR of the injected signal at the
right mass equals the analytic optimal SNR $\sqrt{4\int|\tilde h|^2/S_n}$ within noise.

## Files

| File | What it is |
|---|---|
| `gw.md` | The slides, with the speaker notes that cite the standard forms |
| `nimbledeck.config.json` | The demo, the runner, and the scripted steps of the two recordings |
| `demos/gwlib.py` | Noise curve, noise, chirp, matched filter. The LiveCode slide is a compact copy of the same functions |
| `demos/gwplot.py` | The four-panel figure of the demo and the three-panel still of the equation slide, in the colours of the `studio` look |
| `demos/gw_detect.py`, `demos/gw.css` | The marimo app and its transparent page |
| `demos/make_stack.py` | Rewrites `public/gw-chirp.png` (`python demos/make_stack.py` with numpy, scipy and matplotlib) |
| `public/recordings/` | `demo-gw-detect` and `live-gw-matched`, filmed by `nimbledeck record`: the template mass dragged to the event, and the mass edited in the code |

The still of slide 4 and the recordings keep the colours of `studio` (chart colours 1, 2, 3: cyan, violet, pink); the
equation terms 1, 2 and 3 use the same colours in that look.
