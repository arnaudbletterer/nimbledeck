---
theme: nimbledeck
ndVariant: studio
title: Science, live
layout: hero
transition: fade
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.9" /></At>
</Stage>

::default::

<Kinetic text="Science, live." mode="words" from="up" :stagger="180" size="xl" accent="live." />

#### A research talk that runs.

<!--
Everything on the next slides computes while you watch, on this laptop. The file behind it is plain Markdown.
-->

---
layout: statement
---

#### The problem

<Kinetic text="A paper freezes the result." mode="words" from="mask" :stagger="170" size="l" accent="freezes" />

A figure is a photograph of an experiment.

<!--
By the time a result is a PNG, nobody can ask it a question: what if the noise were doubled, what if the seed changed.
-->

---
layout: statement
---

#### The idea

<Kinetic text="Show the experiment, not the screenshot." mode="words" from="blur" :stagger="170" size="l" accent="experiment," />

<!--
Same slide, but the experiment is still running in the room.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.2, hover: ".nd-t1", caption: "x follows y" }
  - { at: 4, hover: ".nd-t2", caption: "y is not drawn" }
  - { at: 5.8, hover: ".nd-t3", caption: "z is the height" }
  - { at: 7.6, hover: ".nd-eq" }
  - { at: 8.4, drag: ".nd-ctl-many label:nth-child(4) input", from: 0.3, to: 0.9, over: 2.2, caption: "move sigma" }
---

<Stage full>
<At :w="1280" :h="720" :z="0"><PyStream name="lorenz" controls hud :w="1280" :h="720" :size="2.6" :fade="0.05" :colors="['--nd-accent', '#38bdf8', '#818cf8', '--nd-accent-2', '#e879f9', '#f472b6', '#fb923c', '#fbbf24']" :sliders="[{ label: 'trajectories', min: 20, max: 600, step: 20, value: 200 }, { label: 'speed', min: 0.01, max: 0.06, step: 0.01, value: 0.04 }, { label: 'shared digits', min: 2, max: 8, step: 1, value: 5 }]" :extra="[{ name: 'sigma', label: 'σ', min: 0, max: 30, step: 0.5, value: 10 }, { name: 'rho', label: 'ρ', min: 0, max: 60, step: 1, value: 28 }, { name: 'beta', label: 'β', min: 0.5, max: 6, step: 0.01, value: 2.6667 }]" /></At>
<At :x="70" :y="60" :w="520" :z="1">
<Kinetic text="Same start.|Almost.|Another future." mode="lines" from="up" :stagger="260" size="m" accent="future." />
</At>
<At :x="70" :y="330" :w="400" :z="1">

200 copies of the Lorenz system, each nudged by one part in 100,000. NumPy integrates them and streams the result.

</At>
<At :x="70" :y="448" :w="560" :z="1">
<Equation label="The Lorenz system: x dot is sigma times y minus x, y dot is x times rho minus z, minus y, z dot is x y minus beta z" align="left" :size="32" :params="{ sigma: 10, rho: 28, beta: 2.6667 }">

$$
\begin{aligned}
\dot x &= \term{1}{\sigma\,(y - x)} \\
\dot y &= \term{2}{x\,(\rho - z) - y} \\
\dot z &= \term{3}{x y - \beta z}
\end{aligned}
$$

$\sigma = \val{sigma}{10}\quad \rho = \val{rho}{28}\quad \beta = \val{beta}{2.67}$

</Equation>
</At>
<At :x="700" :y="572" :z="2"><Marker term="1">x: left to right</Marker></At>
<At :x="495" :y="262" :z="2"><Marker term="3">z: height</Marker></At>
<At :x="640" :y="90" :z="2"><Marker term="2">y: not drawn, it steers x and z</Marker></At>
</Stage>

<!--
Colour is the order they started in. At first they are one dot. After about ten seconds the colours are mixed over the whole attractor. Slide shared digits to 8 and the split comes later. Needs nimbledeck run.
-->

---
layout: stage
---

<Stage :w="1074" :h="604">
<At :w="1074" :h="604"><Demo name="turing" /></At>
</Stage>

::caption::

Gray-Scott reaction-diffusion. NumPy computes every pattern in a subprocess, on this machine.

<!--
Move feed and kill a little: spots, stripes, worms. The text under the sliders gives the measured time of that run. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "F feeds u" }
  - { at: 4.4, hover: ".nd-t2", caption: "k removes v" }
  - { at: 6.4, hover: ".nd-t3", caption: "u v squared reacts" }
  - { at: 8.4, hover: ".nd-t4", caption: "diffusion spreads" }
  - { at: 10.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="Two chemicals.|Two equations." mode="lines" from="up" :stagger="260" size="m" accent="equations." />
</At>
<At :x="70" :y="270" :w="470" :z="1" enter="up" :delay="500">
<Equation label="Gray-Scott: the rate of change of u is D u times the Laplacian of u, minus u v squared, plus F times one minus u; the rate of change of v is D v times the Laplacian of v, plus u v squared, minus F plus k, times v" align="left" :size="29">

$$
\begin{aligned}
\partial_t u &= \term{4}{D_u \nabla^2 u} - \term{3}{u v^2} + \term{1}{F}\,(1 - u) \\
\partial_t v &= \term{4}{D_v \nabla^2 v} + \term{3}{u v^2} - (\term{1}{F} + \term{2}{k})\,v
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="440" :w="440" :z="1" enter="up" :delay="800">

Two numbers, F and k, decide between spots, stripes and worms.

</At>
<At :x="540" :y="140" :w="700" :h="394" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/demo-turing.webm" /></At>
<At :x="828" :y="315" :z="2"><Marker term="1">&larr; F, feed rate</Marker></At>
<At :x="828" :y="358" :z="2"><Marker term="2">&larr; k, kill rate</Marker></At>
<At :x="900" :y="165" :z="2"><Marker term="3">u v squared grows the pattern</Marker></At>
<At :x="900" :y="490" :z="2"><Marker term="4">diffusion spreads it</Marker></At>
</Stage>

<!--
The Gray-Scott model (Gray and Scott 1984, in the form of Pearson 1993): u is the fuel, v the catalyst. F feeds u and removes both, k removes v, and u v squared is the reaction that turns u into v. The two D terms spread each chemical. Point at a term and the part of the recording it controls is named. The sliders are those of the live slide before this one.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="fft">

```python
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
t = np.arange(1000) / 1000          # one second
f = [50, 120]                       # Hz: edit me
x = sum(np.sin(2 * np.pi * k * t) for k in f)
x = x + rng.normal(0, 1.5, t.size)  # bury it in noise

freq = np.fft.rfftfreq(t.size, 1 / 1000)
spec = abs(np.fft.rfft(x))

fig, (a, b) = plt.subplots(2, 1)
a.plot(t[:200], x[:200])
b.plot(freq, spec)
b.set_xlim(0, 250)
```

</LiveCode>
</At>
</Stage>

::caption::

Find the signal in the noise. Edit the frequencies.

<!--
The top panel is what the instrument gives you. The bottom panel is its spectrum. Add a third frequency to the list. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "a 50 Hz sine" }
  - { at: 4.4, hover: ".nd-t2", caption: "a 120 Hz sine" }
  - { at: 6.4, hover: ".nd-t3", caption: "the noise floor" }
  - { at: 8.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="Fourier,|term by term." mode="lines" from="up" :stagger="260" size="m" accent="term." />
</At>
<At :x="70" :y="290" :w="560" :z="1" enter="up" :delay="500">
<Equation label="The signal is a sine at 50 Hz plus a sine at 120 Hz plus noise. Its Fourier transform X of f is the integral of x of t times e to the minus 2 pi i f t. The discrete version is the sum over n of x n times e to the minus 2 pi i k n over N." align="left" :size="32">

$$
\begin{aligned}
x(t) &= \term{1}{\sin 2\pi\,50\,t} + \term{2}{\sin 2\pi\,120\,t} + \term{3}{\varepsilon(t)}
\end{aligned}
$$

$$
\begin{aligned}
X(f) &= \int_{-\infty}^{\infty} x(t)\,e^{-2\pi i f t}\,dt \\
X_k &= \sum_{n=0}^{N-1} x_n\,e^{-2\pi i k n / N}
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="570" :w="520" :z="1" enter="up" :delay="800">

A sine of frequency f is one spike at f; the noise is the floor. On the right, the recording of the live slide.

</At>
<At :x="640" :y="58" :w="600" :h="604" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/live-fft.webm" fit="cover" position="right" /></At>
<At :x="800" :y="300" :z="2"><Marker term="1">50 Hz</Marker></At>
<At :x="944" :y="300" :z="2"><Marker term="2">120 Hz</Marker></At>
<At :x="968" :y="392" :z="2"><Marker term="3">noise floor</Marker></At>
</Stage>

<!--
The recording of the slide before this one, right half. A sine of frequency f is one spike at f in the spectrum. The 50 and 120 Hz terms of x(t) are the two tall spikes; the noise term is the ragged floor. The sum is the discrete transform that numpy's rfft computes. Type a third frequency in the live slide and a third spike appears.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="fit">

```python
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(4)
x = np.linspace(0, 10, 25)
y = 4 * np.sin(x / 1.6) + rng.normal(0, 1.2, 25)
deg = 3                          # try 1, then 8

xs = np.linspace(0, 10, 200)
def fit(i):                      # fit on points i
    return np.polyval(np.polyfit(x[i], y[i], deg), xs)

boot = [fit(rng.choice(25, 25)) for _ in range(300)]
lo, hi = np.percentile(boot, [5, 95], axis=0)
plt.fill_between(xs, lo, hi, alpha=0.25)
plt.plot(xs, fit(slice(None)))
plt.scatter(x, y)
plt.ylim(-9, 9)
```

</LiveCode>
</At>
</Stage>

::caption::

A fit with an honest error band. Raise the degree and watch it open up.

<!--
The line is a least squares fit. The band holds 90 percent of 300 refits on resampled points. A flexible model fits the points and the band opens up. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t2", caption: "the data" }
  - { at: 4.4, hover: ".nd-t1", caption: "the fitted curve" }
  - { at: 6.4, hover: "[class*=nd-t1b]", caption: "the error band" }
  - { at: 8.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="The line,|and its band." mode="lines" from="up" :stagger="260" size="m" accent="band." />
</At>
<At :x="70" :y="290" :w="560" :z="1" enter="up" :delay="500">
<Equation label="Least squares: X transpose X times beta hat equals X transpose y, and the fitted curve f hat of x is the sum of beta hat j times x to the j. The bootstrap band runs from the 5th to the 95th percentile of the refitted curves." align="left" :size="34">

$$
\begin{aligned}
X^\top X\,\hat{\boldsymbol\beta} &= X^\top \term{2}{\mathbf y} \\
\term{1}{\hat f(x)} &= \sum_{j=0}^{d} \hat\beta_j\,x^j
\end{aligned}
$$

$$
\term{1b}{\bigl[\,\hat f^{*}_{5\%}(x),\ \hat f^{*}_{95\%}(x)\,\bigr]}
$$

</Equation>
</At>
<At :x="70" :y="560" :w="520" :z="1" enter="up" :delay="800">

The band holds 90 percent of 300 refits on resampled points. On the right, the recording of the live slide.

</At>
<At :x="640" :y="58" :w="600" :h="604" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/live-fit.webm" fit="cover" position="right" /></At>
<At :x="700" :y="300" :z="2"><Marker term="2">data</Marker></At>
<At :x="900" :y="520" :z="2"><Marker term="1">fit</Marker></At>
<At :x="1040" :y="130" :z="2"><Marker term="1b">90% band</Marker></At>
</Stage>

<!--
Least squares chooses the coefficients that minimise the squared distance to the points; setting the gradient to zero gives the normal equations. The band is a percentile bootstrap (Efron 1979): refit on 300 resamples of the points, then keep the 5th and 95th percentile of the curves at each x. The recording shows degree 8, where the band opens up at the edges.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="net" :auto="false" :timeout="20">

```python
import numpy as np
import matplotlib.pyplot as plt
plt.figure(figsize=(7, 5))
rng = np.random.default_rng(0)
a, y = rng.uniform(0, 6.3, 200), np.arange(200) // 100
r = 1 + y + rng.normal(0, .12, 200)     # two rings
X = np.c_[r * np.cos(a), r * np.sin(a), np.ones(200)]

H = 6                                   # hidden units
W1 = rng.normal(size=(3, H))
W2 = rng.normal(size=(H, 1))
for _ in range(3000):                   # train
    h = np.tanh(X @ W1)
    d = (1 / (1 + np.exp(-h @ W2)) - y[:, None]) / 200
    W1 -= 1.5 * X.T @ ((d @ W2.T) * (1 - h ** 2))
    W2 -= 1.5 * h.T @ d

g = np.mgrid[-3:3:100j, -3:3:100j]
G = np.c_[g.reshape(2, -1).T, np.ones(10000)]
z = (np.tanh(G @ W1) @ W2).reshape(100, 100)
c = ["C0", "C1"]
plt.contourf(*g, z, [-99, 0, 99], colors=c, alpha=.25)
plt.scatter(X[:, 0], X[:, 1], c=[c[k] for k in y])
```

</LiveCode>
</At>
</Stage>

::caption::

A neural net in plain NumPy. Press Run (Cmd+Enter) after an edit.

<!--
Two noisy rings. The net learns the boundary between them. Try 2 hidden units, then 6. This one does not rerun while you type. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "the inner ring, y = 0" }
  - { at: 4.4, hover: ".nd-t2", caption: "the outer ring, y = 1" }
  - { at: 6.4, hover: ".nd-t3", caption: "where the output is 1/2" }
  - { at: 8.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="Two rings,|one loss." mode="lines" from="up" :stagger="260" size="m" accent="loss." />
</At>
<At :x="70" :y="270" :w="560" :z="1" enter="up" :delay="500">
<Equation label="A hidden layer h is the hyperbolic tangent of W one transpose x. The output y hat is the logistic function of W two transpose h. The loss is the mean cross-entropy over the points. The decision boundary is where the output equals one half." align="left" :size="32">

$$
\begin{aligned}
h &= \tanh(W_1^\top x) \\
\hat y &= \sigma(W_2^\top h), \quad \sigma(z) = \frac{1}{1 + e^{-z}}
\end{aligned}
$$

$$
\begin{aligned}
L &= -\frac{1}{N} \sum_{i=1}^{N} \Bigl[\, \term{2}{y_i \ln \hat y_i} \\
  &\qquad\qquad + \term{1}{(1 - y_i) \ln (1 - \hat y_i)} \,\Bigr]
\end{aligned}
$$

$$
\term{3}{W_2^\top \tanh(W_1^\top x) = 0}
$$

</Equation>
</At>
<At :x="640" :y="58" :w="600" :h="604" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/live-net.webm" fit="cover" position="right" /></At>
<At :x="870" :y="235" :z="2"><Marker term="1">inner ring, y = 0</Marker></At>
<At :x="900" :y="125" :z="2"><Marker term="2">outer ring, y = 1</Marker></At>
<At :x="990" :y="84" :z="2"><Marker term="3">decision boundary</Marker></At>
</Stage>

<!--
Each ring pays its own half of the cross-entropy: the points with y = 1 through the first log, the points with y = 0 through the second. The network is the one of the live slide, with the bias folded into x as a constant 1. The boundary is where the output equals one half, which is where its input W2 transpose h is zero. The recording uses two hidden units, so the boundary is close to two straight lines.
-->

---
layout: full
tour: 20
tourScript:
  - { at: 3, key: "ArrowRight" }
  - { at: 5, key: "ArrowRight" }
  - { at: 7, key: "ArrowRight" }
  - { at: 9, key: "ArrowRight" }
  - { at: 10.5, hover: ".nd-t2", caption: "the decay, in violet" }
  - { at: 12.5, hover: ".nd-t1", caption: "x(t), in cyan" }
  - { at: 14.5, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="48" :w="560" :z="1">
<Kinetic text="A damped|oscillator." mode="lines" from="up" :stagger="260" size="m" accent="oscillator." />
</At>
<At :x="70" :y="250" :w="680" :z="1" enter="up" :delay="500">
<Equation label="A damped oscillator, derived line by line. The equation of motion is x double dot plus 2 zeta omega 0 x dot plus omega 0 squared x equals zero. Try x equals e to the lambda t. Then lambda is minus zeta omega 0 plus or minus i omega d, with omega d equal to omega 0 times the square root of one minus zeta squared. So x of t is e to the minus zeta omega 0 t times A cosine omega d t plus B sine omega d t. Starting at rest from one, A is 1 and B is zeta omega 0 over omega d." align="left" :size="34">

$$ {1|2|3|4|5|all}
\begin{aligned}
&\ddot x + 2\zeta\omega_0\,\dot x + \omega_0^2\,x = 0 \\
&x = e^{\lambda t} \;\Rightarrow\; \lambda^2 + 2\zeta\omega_0\,\lambda + \omega_0^2 = 0 \\
&\lambda = -\zeta\omega_0 \pm i\,\omega_d, \quad \omega_d = \omega_0\sqrt{1 - \zeta^2} \\
&\term{1}{x(t)} = \term{2}{e^{-\zeta\omega_0 t}}\,\bigl(A\cos\omega_d t + B\sin\omega_d t\bigr) \\
&x(0) = 1,\ \dot x(0) = 0 \;\Rightarrow\; A = 1,\ B = \zeta\omega_0 / \omega_d
\end{aligned}
$$

</Equation>
</At>
<At :x="790" :y="150" :w="460" :h="400" :z="1" enter="left" :delay="300"><Chart type="line" :highlight="{ 1: 'x(t)', 2: 'decay' }" :labels="Array.from({ length: 121 }, (_, i) => (i % 20 === 0 ? i / 20 + ' s' : ''))" :names="['x(t)', 'decay']" :data="[Array.from({ length: 121 }, (_, i) => +(Math.exp(-0.7539 * i * 0.05) * (Math.cos(6.2378 * i * 0.05) + 0.1209 * Math.sin(6.2378 * i * 0.05))).toFixed(3)), Array.from({ length: 121 }, (_, i) => +Math.exp(-0.7539 * i * 0.05).toFixed(3))]" /></At>
</Stage>

<!--
Substituting x = e^(lambda t) turns the differential equation into a quadratic. For damping ratio zeta below 1 its roots are complex, so the solution is a decaying oscillation at the damped frequency omega_d. The chart is that solution for zeta = 0.12 and omega_0 = 2 pi, released from rest at x = 1; the violet curve is the decay factor of the formula. Each click lights the next line of the derivation.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.5, hover: ".nd-eq", caption: "all from LaTeX" }
  - { at: 7, hover: ".nd-t1" }
---

<Stage full>
<At :x="70" :y="44" :w="900" :z="1">
<Kinetic text="Typeset, not pasted." mode="words" from="up" :stagger="170" size="m" accent="pasted." />
</At>
<At :x="70" :y="170" :w="360" :z="1" enter="up" :delay="400">
<Equation align="left" :size="52" label="Euler's identity: e to the i pi plus 1 equals 0">

$$ \term{1}{e^{i\pi}} + \term{2}{1} = 0 $$

</Equation>

Euler's identity

</At>
<At :x="460" :y="170" :w="360" :z="1" enter="up" :delay="550">
<Equation align="left" :size="52" label="E equals m c squared">

$$ \term{1}{E} = \term{2}{m}\,\term{3}{c^2} $$

</Equation>

Mass and energy

</At>
<At :x="850" :y="170" :w="360" :z="1" enter="up" :delay="700">
<Equation align="left" :size="46" label="Boltzmann's entropy: S equals k B times the natural log of W">

$$ S = k_B \ln \term{1}{W} $$

</Equation>

Boltzmann's entropy

</At>
<At :x="70" :y="340" :w="360" :z="1" enter="up" :delay="850">
<Equation align="left" :size="42" label="Schroedinger equation: i h bar times the time derivative of psi equals H hat psi">

$$ i\hbar\,\partial_t \psi = \hat H \psi $$

</Equation>

Schrödinger

</At>
<At :x="460" :y="340" :w="360" :z="1" enter="up" :delay="1000">
<Equation align="left" :size="42" label="Faraday's law, one of Maxwell's equations: the curl of E equals minus the time derivative of B">

$$ \nabla \times \mathbf{E} = -\,\partial_t \mathbf{B} $$

</Equation>

Maxwell, Faraday's law

</At>
<At :x="850" :y="340" :w="360" :z="1" enter="up" :delay="1150">
<Equation align="left" :size="46" label="The heat equation: the time derivative of u equals alpha times the Laplacian of u">

$$ \partial_t u = \alpha \nabla^2 u $$

</Equation>

Heat equation

</At>
<At :x="70" :y="500" :w="1140" :z="1" enter="up" :delay="1300">
<Equation align="left" :size="42" label="Navier-Stokes for an incompressible fluid: rho times the material derivative of u equals minus the gradient of p plus mu times the Laplacian of u plus f, and the divergence of u is zero">

$$
\rho\left(\partial_t \mathbf{u} + \mathbf{u}\cdot\nabla\mathbf{u}\right) = -\nabla p + \mu\,\nabla^2 \mathbf{u} + \mathbf{f}, \qquad \nabla\cdot\mathbf{u} = 0
$$

</Equation>

Navier-Stokes, incompressible flow

</At>
</Stage>

<!--
Every equation on this slide is a line of LaTeX in the Markdown file, set by KaTeX with fonts that ship with the deck. No image, no network request.
-->

---
layout: numbers
---

# Measured, not claimed

::a::

<Stat value="0.9" suffix=" ms" :decimals="1" label="Python step for 200 trajectories, drawn at 56 fps" />

::b::

<Stat value="1.3" suffix=" s" :decimals="1" label="to recompute a 192 by 192 pattern" />

::c::

<Stat value="0.2" suffix=" s" :decimals="1" label="to rerun the code you just edited" />

<!--
Medians on one Apple Silicon Mac, Chrome with the GPU on: 0.9 ms Python step and 56 fps over 20 s of the Lorenz slide; 1.3 s for 3,000 steps of Gray-Scott on 192 by 192 cells (a subprocess, including its start); 0.12 to 0.29 s per live-code run (three slides, four loads each). Read them as one machine, not as a promise.
-->

---
layout: split
---

::default::

<Typewriter :speed="30" :delay="500" lang="md">

````md
<LiveCode id="fit">

```python
deg = 3                  # try 8
plt.fill_between(xs, lo, hi)
```

</LiveCode>
````
</Typewriter>

::right::

<Stage :w="640" :h="720">
<At :w="640" :h="720"><Aurora :intensity="0.7" /></At>
<At :x="60" :y="230" :w="520" :z="1">
<Kinetic text="Notebook cell.|Two fences.|A live slide." mode="lines" from="up" :stagger="260" size="s" accent="live" />
</At>
</Stage>

<!--
The code from your notebook goes between two fences inside a LiveCode tag. That is the slide.
-->

---
layout: stage
---

<Stage full>
<At :x="90" :y="70" :w="1100">
<Kinetic text="Run it. Record it. Check it." mode="words" from="up" :stagger="170" size="l" accent="Record" />
</At>
<At :x="90" :y="260" :w="1100" :h="330">
<Terminal title="science" :lines="['$ nimbledeck run science.md', 'runner -> ws://127.0.0.1:18910 (live code)', '$ nimbledeck record science.md', '5 recorded, manifest public/recordings/index.json', '$ nimbledeck check science.md', '21 slides, 0 errors, 0 warnings']" />
</At>
</Stage>

::caption::

Record films each live slide once, on your machine.

<!--
run starts the deck and its Python processes, record films every live slide into public/recordings, check lints the Markdown.
-->

---
layout: statement
---

#### On the web

# No Python? It plays the recording.

On a page with no Python process, each live slide plays a clip filmed from the real run. Start the process and it is live again.

<!--
nimbledeck record films the Lorenz stream, the reaction-diffusion demo and the three code slides once, on your machine, into public/recordings. The web edition keeps those slides and plays the clips; the hosted copy has no Python.
-->

---
layout: split
---

::default::

<Kinetic text="Reviewed like code." mode="words" from="up" :stagger="160" size="l" accent="code." />

The seed, the parameters and the code live in one file. A change is a diff. An agent can write it, and the checker says what is wrong.

::right::

<Stage :w="640" :h="720">
<At :x="30" :y="210" :w="580" :h="300">
<Terminal title="science" :lines="['$ git diff science.md', '-deg = 3', '+deg = 8', '$ nimbledeck check science.md', '21 slides, 0 errors, 0 warnings']" />
</At>
</Stage>

<!--
Raising the degree on the fit slide is one changed line.
-->

---
layout: statement
---

#### Private by default

# Your data stays on your machine.

Python runs on this laptop. Nimbledeck makes no network request of its own.

<!--
Fonts, Python and live code all run locally. See docs/OFFLINE.md.
-->

---
layout: closing
---

<Kinetic text="Show the experiment." mode="words" from="up" :stagger="150" size="xl" accent="experiment." />

#### github.com/arnaudbletterer/nimbledeck

<!--
Thank you.
-->
