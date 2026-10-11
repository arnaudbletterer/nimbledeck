---
theme: nimbledeck
ndVariant: studio
title: Evolution, live
layout: statement
motion: focus
background: shader
transition: fade
---

#### Natural selection

<Kinetic text="Copy. Mutate. Filter. Repeat." mode="words" from="mask" :stagger="200" size="l" accent="Filter." />

<Kinetic text="A population searches a landscape that nobody can see." mode="lines" from="blur" size="s" tone="muted" :delay="1400" />

<!--
Four verbs are the whole algorithm: make copies, let the copies differ a little, keep the ones that do better, do it again. The next slides run exactly that, with 1,200 individuals, on this laptop. It is a simulation model: two heritable traits, one fitness landscape, no real species.
-->

---
layout: full
tour: 18
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "the dots" }
  - { at: 4.2, hover: ".nd-t2", caption: "the height under them" }
  - { at: 6, hover: ".nd-t3", caption: "mutation blurs" }
  - { at: 8, drag: ".nd-ctl-many label:nth-child(6) input", from: 0, to: 0.55, over: 2.4, caption: "make neighbours compete" }
  - { at: 12.5, drag: ".nd-ctl-many label:nth-child(5) input", from: 0, to: 0.5, over: 2.4, caption: "move the landscape" }
---

<Stage full>
<At :w="1280" :h="720" :z="0"><PyStream name="evo-landscape" controls values :w="1280" :h="720" :size="2.6" :fade="0.3" :colors="['#f8fafc']" :highlight="{ 1: 'p: how many dots are here', 2: 'w: the height under them', 3: 'M: mutation spreads the children' }" :sliders="[{ label: 'population', min: 100, max: 3000, step: 100, value: 1200 }, { label: 'mutation', min: 0, max: 0.15, step: 0.005, value: 0.04 }, { label: 'selection', min: 0, max: 12, step: 0.5, value: 4 }]" :extra="[{ name: 'rugged', label: 'ruggedness', min: 0, max: 1, step: 0.05, value: 0 }, { name: 'env', label: 'environment', min: 0, max: 1, step: 0.01, value: 0 }, { name: 'comp', label: 'competition', min: 0, max: 1.6, step: 0.05, value: 0 }, { name: 'h2', label: 'heritability', min: 0.1, max: 1, step: 0.05, value: 1 }, { name: 'start', label: 'start', min: 1, max: 6, step: 1, value: 1 }]" /></At>
<At :x="70" :y="46" :w="540" :z="1">
<Kinetic text="Dots climb|a landscape." mode="lines" from="up" :stagger="260" size="m" accent="climb" />
</At>
<At :x="70" :y="172" :w="540" :z="1" enter="up" :delay="500">
<Equation label="Next generation: the share of type i is the sum over types j of the mutation probability from j to i, times the share p j of type j, times its fitness w j divided by the mean fitness. The fitness is e to the beta times the height of the landscape." align="left" :size="30">

$$
\begin{aligned}
\term{1}{p_i'} &= \sum_j \term{3}{M_{ij}}\,\term{1}{p_j}\,\term{2}{\tfrac{w_j}{\bar w}} \\
\term{2}{w_j} &= e^{\beta f(z_j)}
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="330" :w="540" :z="1" enter="up" :delay="800">

Each dot is an individual. Warm means fit.

</At>
</Stage>

<!--
The model: 1,200 individuals, two heritable traits (the axes), a fitness landscape f (the colour: warm is high). Every generation a Wright-Fisher step draws each child's parent with probability proportional to w = exp(beta f), then adds a Gaussian mutation. The equation is the expected result of that step, the discrete replicator-mutator equation (Hofbauer and Sigmund 1998; Nowak 2006, Evolutionary Dynamics, ch. 5): p_i' = sum_j Q_ij w_j p_j / w-bar, with w-bar = sum_j p_j w_j. Selection is the term w_j/w-bar, mutation is Q (written M here). The sampling of N children from these probabilities is Wright-Fisher drift.
Things to try, in this order: start 1 climbs the nearest big hill. Raise ruggedness to 1 with mutation 0.02: the population gets stuck on a small local peak; raise mutation and it escapes. Competition 0.7: the cloud splits over several peaks (an adaptive-radiation-like branching; the individuals are asexual, so these are lineages, not species). Move the environment slider: the whole landscape turns and the cloud has to chase its peak; watch mean fitness dip and recover. Heritability below 1 makes selection see the trait plus noise, so progress slows. Start 2 and 3 begin on lower peaks.
Honest limits: asexual, two traits, a made-up landscape, a fixed population size. Needs nimbledeck run.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="evo-code">

```python
import numpy as np
import matplotlib.pyplot as plt
rng = np.random.default_rng(3)
PEAKS = [(-.9, -.6, .9, .5), (.9, .7, 1, .5)]
def fitness(z):          # a row per individual
    r2 = lambda x, y: ((z - [x, y])**2).sum(1)
    return sum(h * np.exp(-r2(x, y) / (2 * s * s))
               for x, y, h, s in PEAKS)

def crowding(z):         # share of neighbours
    d2 = ((z[:, None] - z[None])**2).sum(-1)
    return np.exp(-d2 / 0.18).mean(1)

def select(z, beta=5, compete=0):
    f = fitness(z) - compete * crowding(z)
    w = np.exp(beta * f)  # fit: more kids
    return z[rng.choice(len(z), len(z), p=w / w.sum())]

z = rng.normal(0, .15, (400, 2))  # founders
for _ in range(150):
    z = select(z) + rng.normal(0, .03, z.shape)
X, Y = np.meshgrid(*[np.linspace(-2, 2, 99)] * 2)
F = fitness(np.c_[X.ravel(), Y.ravel()])
plt.contourf(X, Y, F.reshape(X.shape), 24, cmap="magma")
plt.scatter(*z.T, s=5, c="w")
```

</LiveCode>
</At>
</Stage>

::caption::

The whole model on one screen. Add a peak, set compete=0.9, or swap the selection step.

<!--
The same model as the live landscape, small enough to read. Founders start in the middle; each generation is one line: select, then mutate. The white line is the path of the mean, the dots are the last generation. By chance this seed drifts to the lower hill and stays: selection climbs the nearest hill, not the best one.
Edits that change the ending: add a peak next to the centre, for example PEAKS.append((-0.6, 0.6, 1.3, 0.3)), and the population ends there. Set compete=0.9 and neighbours compete for the same spot, so the cloud spreads over both hills. Replace the selection step with truncation (keep the best fifth: top = z[np.argsort(fitness(z))[-80:]]; return np.repeat(top, 5, axis=0)) and the cloud collapses to a point. Mix two parents (a, b = ...; np.where(rng.random(z.shape) < 0.5, a, b)) for recombination. Needs nimbledeck run.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "the response" }
  - { at: 4.4, hover: ".nd-t2", caption: "heritability" }
  - { at: 6.4, hover: ".nd-t3", caption: "the selection differential" }
  - { at: 8.4, drag: ".nd-ctl-many label:nth-child(4) input", from: 0.5, to: 0.15, over: 2.4, caption: "less heritable" }
---

<Stage full>
<At :x="70" :y="58" :w="520" :z="1">
<Kinetic text="The response|to selection." mode="lines" from="up" :stagger="260" size="m" accent="response" />
</At>
<At :x="70" :y="270" :w="520" :z="1" enter="up" :delay="500">
<Equation label="The breeder's equation: the response R equals the heritability h squared times the selection differential S. Heritability is the genetic variance divided by the genetic plus the environmental variance." align="left" :size="46" :params="{ h2: 0.5 }" :decimals="2">

$$
\term{1}{R} = \term{2}{h^2}\,\term{3}{S}
$$

$h^2 = \dfrac{V_g}{V_g + V_e} = \val{h2}{0.5}$

</Equation>
</At>
<At :x="70" :y="500" :w="480" :z="1" enter="up" :delay="800">

The landscape turns, so the cloud keeps chasing. Parents sit S ahead of the average; only the heritable share of that gap reaches the children.

</At>
<At :x="640" :y="10" :w="600" :h="700" :z="1" enter="left" :delay="300"><PyStream name="evo-breeder" controls values :w="640" :h="700" :size="2.4" :fade="0.3" :colors="['#f8fafc']" :highlight="{ 1: 'R: the mean moves this far', 2: 'h²: the slider', 3: 'S: the parents sit this far ahead' }" :sliders="[{ label: 'population', min: 300, max: 3000, step: 100, value: 1500 }, { label: 'mutation', min: 0, max: 0.15, step: 0.005, value: 0.04 }, { label: 'selection', min: 0, max: 12, step: 0.5, value: 4 }]" :extra="[{ name: 'h2', label: 'heritability', min: 0.1, max: 1, step: 0.05, value: 0.5 }]" /></At>
</Stage>

<!--
Standard form (Lush 1937; Falconer and Mackay 1996, Introduction to Quantitative Genetics, ch. 11): R = h^2 S, where S = (mean of the selected parents) - (mean of the population), R = (mean of the offspring) - (mean of the population), and h^2 = V_g / (V_g + V_e) is the narrow-sense heritability (here every genetic effect is additive, so broad and narrow agree). In the model, selection sees the trait plus noise, with the noise sized so that h^2 is the value of the slider. The picture measures S and R in every generation and draws them ten times longer. The pink arrow is S, the cyan one R, and R/S in the corner follows the slider. At h^2 = 1 the arrows coincide; at 0.2 the cyan one is a fifth of the pink one. The cloud climbs more slowly even though selection is as strong: that is the whole message. Needs nimbledeck run.
-->
