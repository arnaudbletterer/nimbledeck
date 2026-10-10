---
theme: nimbledeck
ndVariant: studio
title: Gravitational waves, live
ndMotion: fade-up
transition: fade
layout: statement
motion: blur-in
background: waves
---

#### Gravitational waves

<Kinetic text="Two black holes collided. A filter found it in the noise." mode="words" from="blur" :stagger="140" size="l" accent="noise." />

<!--
Hook. In September 2015 the two LIGO detectors recorded the merger of two black holes about 1.3 billion light-years away (GW150914, Abbott et al., Phys. Rev. Lett. 116, 061102). The change in length they measured was about one thousandth of a proton's width over four kilometres, and the raw signal sits below the instrument noise. The next slides run the same kind of search on SIMULATED data: no LIGO data is used anywhere in this chapter.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604"><Demo name="gw-detect" /></At>
</Stage>

::caption::

Simulated strain: slide the template's chirp mass until the pink peak locks on.

<!--
Everything here is simulated: Gaussian noise coloured by a toy bucket-shaped curve (shaped like an Advanced LIGO design curve, not a measured one), plus a leading-order inspiral of two black holes with a chirp mass of 30 solar masses at the chosen distance (1800 Mpc by default; with this toy noise the distance is just a loudness knob, the real event was at about 410 Mpc), merging at t = 0. Top left: what a detector records, whitened. The cyan curve is the template at the peak. Bottom left: the same data as a constant-Q transform (a Q-transform), with the template's frequency track dashed. Top right: matched-filter signal to noise ratio against time. Bottom right: the best peak of each template in a bank of masses. Drag the mass from 18 to 30: the dashed track slides onto the chirp, the pink peak rises above the threshold and the violet dot reaches the top of the curve. Raise the distance to make the event quieter, change the noise sample to see another noise. Needs nimbledeck run.
-->

---
layout: full
---

<Stage full>
<At :x="40" :y="28" :w="1200" :h="640">
<LiveCode id="gw-matched" :auto="false" :timeout="20">

```python
import numpy as np, matplotlib.pyplot as plt
from scipy.signal.windows import tukey
fs, N = 2048, 8192             # 4 s at 2048 Hz

#-- edit these --
mc = 15
flow, band, alpha = 20, (20, 300), .1

def snr(mc):
    ok = (f > band[0]) & (f < band[1])
    w, asd = tukey(N, alpha), np.sqrt(psd)
    d = np.fft.rfft(data * w) / asd * ok
    h = np.fft.rfft(chirp(mc, flow)) / asd * ok
    z = np.fft.ifft(d * h.conj(), n=N)
    norm = np.sqrt(fs * np.sum(abs(h)**2) / N)
    return np.fft.fftshift(2 * abs(z) / norm)

#-- simulated data: nothing to edit below --
t = np.arange(N) / fs - 2
f = np.maximum(np.fft.rfftfreq(N, 1 / fs), 10)
psd = 1.6e-47 * ((50 / f)**4.5 + 1 + (f / 300)**2)

def chirp(mc, flow=20, tc=0):   # mc: solar masses
    tm = 4.925e-6 * mc           # G Mc / c^3, seconds
    tau = np.maximum(tc - t, 1e-9)
    f_gw = (5 / 256 / tau)**.375 / np.pi * tm**-.625
    ph = -2 * (5 * tm)**-.625 * tau**.625
    on = (t < tc) & (f_gw > flow) & (f_gw < 220)
    return np.where(on, tau**-.25 * np.cos(ph), 0)

rng = np.random.default_rng(7)
mt, t0 = rng.uniform(25, 35), rng.uniform(-.5, .8)
z = rng.normal(size=(2, f.size))
amp = np.sqrt(psd * fs * N / 4)
noise = np.fft.irfft(amp * (z[0] + 1j * z[1]), N)
dist = 1800 * 3.086e22         # 1800 Mpc, in metres
h0 = (1477 * mt)**1.25 * (5 / 3e8)**.25 / dist
data = noise + h0 * chirp(mt, tc=t0)

bank = np.arange(10, 61)
peaks = [snr(m).max() for m in bank]
best = bank[np.argmax(peaks)]
s = snr(mc)
k = s.argmax()
print(f"mass {mc}: SNR {s[k]:.1f} at {t[k]:+.2f} s")
print(f"bank best {best}; hidden {mt:.1f} at {t0:+.2f}")
fig, (a, b) = plt.subplots(2, 1)
a.plot(t, s, "C2"); a.axhline(8, c="C3", ls=":")
b.plot(bank, peaks, "C1"); b.axvline(mc, ls="--")
a.set_ylabel("SNR"); a.set_xlabel("time (s)")
b.set_ylabel("peak SNR")
b.set_xlabel("template chirp mass")
```

</LiveCode>
</At>
</Stage>

<!--
A complete matched-filter search in a screenful, on simulated data (the lower half builds it: noise from a toy bucket-shaped curve, one inspiral of hidden mass and arrival time injected at 1800 Mpc). The method is the top half, which is the part to read and edit. Whiten: divide the Fourier transform by the amplitude spectral density, so every frequency counts for what its noise allows. Correlate: multiply by the conjugate template and transform back, which is the correlation at every time shift at once; the analytic (positive-frequency) version gives the modulus, which also searches over the unknown phase. Normalise by the template's own noise-weighted length and the result is the SNR time series. Edits to try, with Cmd or Ctrl Enter to run: the template mass (15, 22, 29: the SNR climbs and the peak slides to the true merger time); flow = 45 (a shorter template loses cycles and SNR); band = (20, 120) or (60, 300) (where the signal lives); alpha = 0.5 (a heavy taper eats the data); a finer bank, np.arange(25, 40, 0.5). The leading-order chirp: f(tau) = (1/pi) (5 / (256 tau))^(3/8) (G Mc / c^3)^(-5/8) and phase -2 (5 G Mc / c^3)^(-5/8) tau^(5/8), amplitude proportional to tau^(-1/4) (Maggiore, Gravitational Waves vol. 1, chapter 4). It stops at 220 Hz: a real merger needs numerical relativity. Needs nimbledeck run.
-->

---
layout: full
tourScript:
  - { at: 1.5, hover: ".nd-t1", caption: "frequency climbs" }
  - { at: 3.5, hover: ".nd-t2", caption: "the mass sets the rate" }
  - { at: 5.5, hover: ".nd-t3", caption: "the filter finds the peak" }
  - { at: 7.5, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="50" :w="560" :z="1">
<Kinetic text="Three equations.|One detection." mode="lines" from="up" :stagger="260" size="m" accent="detection." />
</At>
<At :x="70" :y="236" :w="580" :z="1" enter="up" :delay="400">
<Equation label="The frequency of the gravitational wave: f of tau is one over pi, times five over 256 tau to the power three eighths, times G chirp mass over c cubed to the power minus five eighths" align="left" :size="27">

$$
\term{1}{f(\tau)} = \frac{1}{\pi}\left(\frac{5}{256\,\tau}\right)^{3/8}\left(\term{2}{\frac{G\,\mathcal M_c}{c^3}}\right)^{-5/8}
$$

</Equation>
</At>
<At :x="70" :y="364" :w="580" :z="1" enter="up" :delay="700">
<Equation label="The chirp mass: M c is m one times m two to the power three fifths, over m one plus m two to the power one fifth" align="left" :size="27">

$$
\term{2}{\mathcal M_c} = \frac{(m_1 m_2)^{3/5}}{(m_1 + m_2)^{1/5}}
$$

</Equation>
</At>
<At :x="70" :y="452" :w="580" :z="1" enter="up" :delay="1000">
<Equation label="The signal to noise ratio over time: four over sigma times the real part of the integral over positive frequencies of d tilde times h tilde conjugate, divided by the noise power S n, times e to the two pi i f t. Sigma squared is four times the integral of h tilde squared over S n" align="left" :size="27">

$$
\begin{aligned}
\term{3}{\mathrm{SNR}(t)} &= \frac{4}{\sigma}\,\mathrm{Re}\!\int_0^\infty \frac{\tilde d(f)\,\tilde h^{*}(f)}{S_n(f)}\,e^{2\pi i f t}\,\d f \\
\sigma^2 &= 4\!\int_0^\infty \frac{|\tilde h(f)|^2}{S_n(f)}\,\d f
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="640" :w="580" :z="1">

$\tau = t_c - t$ is the time left before the merger.

</At>
<At :x="700" :y="50" :w="520" :h="550" :z="0" frame><Photo src="/gw-chirp.png" fit="contain" /></At>
<At :x="1040" :y="106" :z="2"><Marker term="1">f(t) on the picture</Marker></At>
<At :x="960" :y="250" :z="2"><Marker term="2">the mass sets the curve</Marker></At>
<At :x="1000" :y="420" :z="2"><Marker term="3">the SNR peak</Marker></At>
</Stage>

<!--
Simulated data throughout; the picture is the same simulation as the demo, drawn once. First line: the leading-order (quadrupole, Newtonian orbit) frequency of the gravitational wave of a circular binary, with tau the time before merger. The frequency rises as tau shrinks, so the signal sweeps up: a chirp. The only thing in it that depends on the black holes is the chirp mass, G Mc over c cubed, a time: 4.9 microseconds per solar mass. Second line: the chirp mass is the combination of the two masses that the leading-order inspiral measures; for 36 and 29 solar masses it is about 28. Third line: the matched-filter signal to noise ratio. d is the Fourier transform of the data, h of the template, S_n the one-sided noise power spectral density in per hertz; dividing by S_n is the whitening. The integral is a correlation, evaluated at every time shift t; sigma normalises it so that pure noise gives about 1 and a perfect match of a loud event gives a large number. The code of the previous slide uses the complex (analytic) form, which takes the modulus over the unknown phase. Standard references: Maggiore vol. 1, eq. 4.19 and 4.29; Allen et al. 2012, Phys. Rev. D 85, 122006.
-->

---
layout: numbers
---

# The real event, for scale

::a::

## 410 Mpc

about 1.3 billion light-years: where GW150914 happened (Abbott et al. 2016).

::b::

## 0.2 s

of signal in the detectors, from 35 to 250 Hz.

::c::

## SNR 24

of the real detection, found with templates like these.

<!--
Published values of GW150914 (Abbott et al., Phys. Rev. Lett. 116, 061102): masses 36 and 29 solar masses, a distance of about 410 megaparsecs which is 1.3 billion light-years, a signal of about 0.2 s between 35 and 250 Hz, and a network signal to noise ratio of 24. This deck's chapter is a simulation in the same spirit, not a reanalysis: it uses no LIGO data, a simpler noise curve, and a point-mass inspiral that stops at 220 Hz. The real search also fits spins and mass ratio and models the merger and ringdown.
-->
