---
theme: nimbledeck
ndVariant: studio
title: Weather, chaos and ensembles
layout: statement
motion: blur-in
background: waves
transition: fade
---

#### Climate and weather

<Kinetic text="The weather forgets in two weeks." mode="words" from="blur" :stagger="170" size="l" accent="forgets" />

Not for lack of computers. The equations are chaotic, and every measurement is a little wrong.

<!--
The next slides are a toy atmosphere that runs on this laptop: forty numbers on a circle of latitude, simulated, not a forecast. It behaves like the real thing in the one way that matters here. Two starts that differ by a hair end up as different weather.
-->

---
layout: full
tour: 16
tourScript:
  - { at: 2.5, hover: ".nd-t1", caption: "error of the mean" }
  - { at: 4.5, hover: ".nd-t2", caption: "spread of the members" }
  - { at: 6.5, drag: ".nd-ctl-many label:nth-child(5) input", from: 0, to: 1, over: 0.8, caption: "switch assimilation on" }
---

<Stage full>
<At :x="50" :y="20" :w="1180" :h="540" :z="0"><PyStream name="climate-l96" controls :w="1180" :h="540" :fade="1" :size="1.9" :colors="['#ffffff24', '#ffffff66', '--nd-chart-4', '--nd-chart-1', '--nd-chart-2']" :sliders="[{ label: 'ensemble size', min: 4, max: 40, step: 2, value: 20 }, { label: 'obs noise', min: 0.2, max: 3, step: 0.2, value: 1 }, { label: 'obs every (steps)', min: 1, max: 12, step: 1, value: 4 }]" values :extra="[{ name: 'F', label: 'forcing F', min: 2, max: 14, step: 1, value: 8 }, { name: 'assim', label: 'assimilate', min: 0, max: 1, step: 1, value: 0 }]" /></At>
<At :x="62" :y="76" :w="80" :z="2">
<Equation label="truth" align="left" :size="22">

$$\text{truth}$$

</Equation>
</At>
<At :x="62" :y="204" :w="80" :z="2">
<Equation label="forecast mean" align="left" :size="22">

$$\text{mean}$$

</Equation>
</At>
<At :x="76" :y="302" :w="64" :z="2">
<Equation label="log axis, 10" align="left" :size="18">

$$10^{1}$$

</Equation>
</At>
<At :x="76" :y="358" :w="64" :z="2">
<Equation label="log axis, 1" align="left" :size="18">

$$1$$

</Equation>
</At>
<At :x="76" :y="414" :w="64" :z="2">
<Equation label="log axis, 0.1" align="left" :size="18">

$$10^{-1}$$

</Equation>
</At>
<At :x="70" :y="590" :w="560" :z="2">
<Equation label="error of the ensemble mean in cyan, spread of the members in violet" align="left" :size="26">

$$\term{1}{\text{error of the mean}}\qquad\term{2}{\text{spread of the members}}$$

</Equation>
</At>
<At :x="640" :y="584" :w="570" :z="2">

Simulated toy atmosphere, not a forecast. Left to right: 50 model days.

</At>
</Stage>

<!--
Lorenz-96, forty variables on a circle, forcing F equal to 8. Top: the true run, longitude against time. Below: the mean of an ensemble that started one part in a hundred from the truth. Beneath: the error of the ensemble mean in cyan and the spread of the members in violet, on a log scale, so exponential growth is a straight line. One model day is four steps of six hours. Needs nimbledeck run.
-->

---
layout: full
---

<Stage full>
<At :x="24" :y="16" :w="1232" :h="688">
<LiveCode id="enkf">

```python
import numpy as np, matplotlib.pyplot as plt
rng = np.random.default_rng(2)
K, F, N = 40, 8.0, 20           # N members: try 8
infl, radius, every = 1.1, 4, 4 # try 1.0, then 50
H = np.eye(K)[::2]              # observed: try [::4]
sig = 1.0                       # instrument noise
r = lambda x, s: np.roll(x, s, -1)
def f(x):                       # Lorenz-96
    return (r(x, -1) - r(x, 2)) * r(x, 1) - x + F
def step(x, dt=0.05):           # RK4, six hours
    a = f(x); b = f(x + dt/2*a)
    c = f(x + dt/2*b); d = f(x + dt*c)
    return x + dt/6 * (a + 2*b + 2*c + d)
d = abs(np.arange(K)[:, None] - np.arange(K))
C = np.exp(-(np.minimum(d, K - d) / radius)**2)
def analysis(X, x):             # x_a = x_f + K (y - H x_f)
    y = H @ x + sig * rng.normal(size=len(H))
    m = X.mean(0); A = infl * (X - m)
    P = C * (A.T @ A) / (N - 1)
    S = H @ P @ H.T + sig**2 * np.eye(len(H))
    G = P @ H.T @ np.linalg.inv(S)
    Y = y + sig * rng.normal(size=(N, len(H)))
    return m + A + (Y - (m + A) @ H.T) @ G.T
x = 8 + rng.normal(size=K)
for _ in range(1000): x = step(x)
X = x + rng.normal(size=(N, K)); err, spr = [], []
for t in range(1, 401):
    x, X = step(x), step(X)
    if t % every == 0: X = analysis(X, x)
    err.append(np.sqrt(((X.mean(0) - x)**2).mean()))
    spr.append(np.sqrt(X.var(0, ddof=1).mean()))
plt.semilogy(np.c_[err, spr]); plt.axhline(sig, c="gray", ls=":")
plt.legend(["error of the mean", "spread"])
```

</LiveCode>
</At>
</Stage>

<!--
A complete ensemble Kalman filter, in the cell you see. The truth is a Lorenz-96 run; the ensemble starts one unit around it; every four steps, one day, half the variables are observed with noise of 1 and each member is corrected with its own perturbed observation (Burgers, van Leeuwen and Evensen 1998). Inflation widens the ensemble so it does not become overconfident; the taper keeps a distant variable from correcting this one, because twenty members cannot know the covariance between forty. The taper here is a Gaussian, simpler than the Gaspari and Cohn function of the stream. What to try, from my own runs: inflation 1.0 doubles the error; radius 50 (no localisation) makes the filter diverge, error about 4; 8 members, about 2.6; observing every fourth variable, about 1.8; observing every variable, about 0.5. The error lands below the instrument noise of 1 because the model carries information forward from the earlier observations. The code is 34 lines: the editor shows about 28, scroll for the rest. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 1.8, hover: ".nd-t3", caption: "waves carried round" }
  - { at: 3.4, hover: ".nd-t5", caption: "friction" }
  - { at: 5, hover: ".nd-t6", caption: "the forcing F" }
  - { at: 6.8, hover: ".nd-t1", caption: "the forecast" }
  - { at: 8.4, hover: ".nd-t4", caption: "the observations" }
  - { at: 10, hover: ".nd-t2", caption: "the gain" }
  - { at: 11.6, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="46" :w="560" :z="1">
<Kinetic text="One model.|One update." mode="lines" from="up" :stagger="260" size="m" accent="update." />
</At>
<At :x="70" :y="250" :w="540" :z="1" enter="up" :delay="400">
<Equation label="Lorenz-96: the rate of change of X k is X k plus one minus X k minus two, times X k minus one, minus X k, plus F" align="left" :size="28">

$$
\dot X_k = \term{3}{(X_{k+1} - X_{k-2})\,X_{k-1}}\;\term{5}{-\,X_k}\;\term{6}{+\,F}
$$

</Equation>
</At>
<At :x="70" :y="390" :w="540" :z="1" enter="up" :delay="700">
<Equation label="The analysis x a equals the forecast x f plus the gain K times the innovation y minus H x f. The gain K is P H transpose times the inverse of H P H transpose plus R" align="left" :size="28">

$$
\begin{aligned}
x_a &= \term{1}{x_f} + \term{2}{K}\,\term{4}{(y - H x_f)} \\
K &= \term{2}{P}\,H^\top (H P H^\top + \term{4}{R})^{-1}
\end{aligned}
$$

</Equation>
</At>
<At :x="640" :y="120" :w="600" :h="275" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/stream-climate-l96.webm" fit="cover" /></At>
<At :x="640" :y="420" :w="580" :z="1" enter="up" :delay="900">

Without data the forecast mean fades to a flat grey-blue. When observations arrive it snaps back.

</At>
<At :x="900" :y="150" :z="2"><Marker term="3">waves are carried round the circle</Marker></At>
<At :x="900" :y="150" :z="2"><Marker term="5">friction damps them</Marker></At>
<At :x="900" :y="150" :z="2"><Marker term="6">the forcing keeps them alive</Marker></At>
<At :x="860" :y="235" :z="2"><Marker term="1">forecast mean</Marker></At>
<At :x="1000" :y="150" :z="2"><Marker term="4">observations, the amber dots</Marker></At>
<At :x="900" :y="340" :z="2"><Marker term="2">the gain grows with the spread</Marker></At>
</Stage>

<!--
Left: Lorenz-96 (Lorenz 1996; Lorenz and Emanuel 1998), the model of the stream. The first term moves a wave round the circle and steepens it, the second damps it, F keeps it alive; in the pictures, F = 8. Below: the analysis step of the Kalman filter (Kalman 1960; in its ensemble form Evensen 1994). x_f is the forecast, y the observation, H picks the observed variables out of the state, R is the covariance of the instrument noise, P the covariance of the forecast error, estimated here from the spread of 20 members. K weighs the innovation y minus H x_f: a large P (a large spread) and a small R mean the filter trusts the observation. Every member is updated with its own perturbed observation (Burgers, van Leeuwen and Evensen 1998). The colour scale of the two panels is flat near the climate mean, so a mean that has lost its structure looks flat. The clip is the recording of the stream of the second slide.
-->

---
layout: full
tour: 12
tourScript:
  - { at: 2, hover: ".nd-t1", caption: "the error of the mean" }
  - { at: 4, hover: ".nd-t2", caption: "the spread" }
  - { at: 6, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="46" :w="560" :z="1">
<Kinetic text="The spread|should match|the error." mode="lines" from="up" :stagger="240" size="m" accent="match" />
</At>
<At :x="70" :y="330" :w="540" :z="1" enter="up" :delay="500">
<Equation label="The root mean square error of the ensemble mean is about the square root of N plus one over N times the ensemble spread" align="left" :size="32">

$$
\term{1}{\mathrm{RMSE}(\bar x)} \approx \sqrt{\tfrac{N+1}{N}}\;\term{2}{\mathrm{spread}}
$$

</Equation>
</At>
<At :x="70" :y="440" :w="540" :z="1" enter="up" :delay="800">
<Equation label="The ensemble mean is the average of the members. The spread squared is the variance of the members, averaged over the variables" align="left" :size="22">

$$
\bar x = \tfrac1N \sum_i x_i, \qquad \mathrm{spread}^2 = \tfrac1K \sum_k \tfrac{1}{N-1} \sum_i (x_{ik} - \bar x_k)^2
$$

</Equation>
</At>
<At :x="70" :y="560" :w="540" :z="1" enter="up" :delay="1000">

Violet below cyan: overconfident. Violet above cyan: too cautious.

</At>
<At :x="640" :y="120" :w="600" :h="275" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/stream-climate-l96.webm" fit="cover" /></At>
<At :x="640" :y="420" :w="580" :z="1" enter="up" :delay="900">

Simulated: a toy atmosphere of 40 variables. A real forecast model has orders of magnitude more.

</At>
<At :x="800" :y="300" :z="2"><Marker term="1">error of the ensemble mean</Marker></At>
<At :x="800" :y="330" :z="2"><Marker term="2">spread of the members</Marker></At>
</Stage>

<!--
Spread-skill: for a reliable ensemble of N members the root mean square error of the ensemble mean equals the square root of (N+1)/N times the average ensemble spread (Leutbecher and Palmer 2008, Journal of Computational Physics 227; Fortin, Abaza, Anctil and Turcotte 2014, Monthly Weather Review 142). The factor is a finite-size correction: the truth counts as one more member. In the pictures the two curves sit together in the free forecast and saturate together, at the spread of the climate, about 3.6 here. In the assimilating part the spread can sit under the error when inflation is small; the live code slide shows it: inflation 1.0 gives a spread of 0.6 against an error of 2. The limit in the real atmosphere is about two weeks for the weather of the day (Lorenz 1969; Zhang et al. 2019, Journal of the Atmospheric Sciences 76); this toy has no such number, its model days follow Lorenz's rough scale of five days per time unit.
-->
