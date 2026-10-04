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

# A paper freezes the result.

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
---

<Stage full>
<At :w="1280" :h="720" :z="0"><PyStream name="lorenz" controls hud :w="1280" :h="720" :size="2.6" :fade="0.05" :colors="['--nd-accent', '#38bdf8', '#818cf8', '--nd-accent-2', '#e879f9', '#f472b6', '#fb923c', '#fbbf24']" :sliders="[{ label: 'trajectories', min: 20, max: 600, step: 20, value: 200 }, { label: 'speed', min: 0.01, max: 0.06, step: 0.01, value: 0.04 }, { label: 'shared digits', min: 2, max: 8, step: 1, value: 5 }]" /></At>
<At :x="70" :y="60" :w="520" :z="1">
<Kinetic text="Same start.|Almost.|Another future." mode="lines" from="up" :stagger="260" size="m" accent="future." />
</At>
<At :x="70" :y="330" :w="400" :z="1">

200 copies of the Lorenz system, each nudged by one part in 100,000. NumPy integrates them and streams the result.

</At>
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
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="net" :auto="false" :timeout="20">

```python
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
a, y = rng.uniform(0, 6.3, 200), np.arange(200) // 100
r = 1 + y + rng.normal(0, .12, 200)     # two rings
X = np.c_[r * np.cos(a), r * np.sin(a), np.ones(200)]

H = 6                                   # hidden units
W1 = rng.normal(size=(3, H))
W2 = rng.normal(size=(H, 1))
for _ in range(3000):                   # gradient descent
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
layout: numbers
---

# Measured, not claimed

::a::

<Stat value="0.6" suffix=" ms" :decimals="1" label="Python step, 200 trajectories" />

::b::

<Stat value="60" label="frames per second to the canvas" />

::c::

<Stat value="2.8" suffix=" s" :decimals="1" label="256 by 256, 4,000 steps" />

::d::

<Stat value="1" label="Markdown file for the slides" />

<!--
PLACEHOLDER numbers, to be replaced by the final measurements.
-->

---
layout: split
---

::default::

<Typewriter :speed="30" :delay="500" lang="md">

````md
<LiveCode id="fit">

```python
deg = 3
plt.plot(xs, fit(x))
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
<Terminal title="science" :lines="['$ nimbledeck run science.md', 'demo turing -> http://127.0.0.1:2830', 'stream lorenz -> ws://127.0.0.1:18870', 'runner -> ws://127.0.0.1:18910 (live code)', '$ nimbledeck check science.md', '15 slides, 0 errors, 0 warnings']" />
</At>
</Stage>

::caption::

PLACEHOLDER for the record command.

<!--
Placeholder.
-->

---
layout: statement
---

#### On the web

# No Python? It plays the recording.

<!--
Placeholder: depends on nimbledeck record.
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
<Terminal title="science" :lines="['$ git diff science.md', '-deg = 3', '+deg = 8', '$ nimbledeck check science.md', '15 slides, 0 errors, 0 warnings']" />
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
