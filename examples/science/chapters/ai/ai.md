---
theme: nimbledeck
ndVariant: studio
title: Everyday AI
layout: statement
transition: fade
motion: blur-in
background: aurora
---

#### Everyday AI

<Kinetic text="Noise in. A picture out." mode="words" from="blur" :stagger="170" size="l" accent="picture" />

Two small models, running on this laptop, show how image generators and chatbots work.

<!--
Two ideas carry most of today's AI. Image generators start from pure noise and remove it, step by step. Chatbots let every word look at the other words and decide which ones matter. Both demos in this chapter are toy models: a few thousand numbers, trained in minutes on made-up data. They are not a real image model or a real chatbot, and they run for real, nothing is faked. Needs nimbledeck run for the live parts.
-->

---
layout: full
motion: none
background: none
tour: 20
tourScript:
  - { at: 3, drag: ".nd-ctl-many label:nth-child(1) input", from: 0.3, to: 0.05, over: 2, caption: "fewer steps" }
  - { at: 8, drag: ".nd-ctl-many label:nth-child(3) input", from: 0.3, to: 0.9, over: 2, caption: "more guidance" }
---

<Stage full>
<At :w="1280" :h="720" :z="0"><PyStream name="ai-diffusion" controls :w="1280" :h="720" :size="2.6" :fade="1" :groups="[2800, 2704, 100, 100]" :sizes="[2.6, 2.2, 1.4, 3.2]" :alphas="[1, 1, 0.35, 1]" :colors="['--nd-chart-1', '--nd-chart-3', '--nd-muted', '--nd-accent']" :sliders="[]" :extra="[{ name: 'steps', label: 'steps', min: 4, max: 120, step: 1, value: 40 }, { name: 'schedule', label: 'schedule', min: 0, max: 1, step: 1, value: 1, labels: ['linear', 'cosine'] }, { name: 'guidance', label: 'guidance', min: 0, max: 6, step: 0.5, value: 2 }, { name: 'prompt', label: 'prompt', min: 0, max: 3, step: 1, value: 1, labels: ['anything', 'smiley', 'spiral', 'AI'] }]" /></At>
<At :x="70" :y="60" :w="440" :z="1">
<Kinetic text="Noise becomes|a picture." mode="lines" from="up" :stagger="260" size="m" accent="picture." />
</At>
<At :x="70" :y="270" :w="380" :z="1" enter="up" :delay="500">

A small network learned three pictures. Now it draws a new one from pure noise, one step at a time. The arrows are its answer at each step.

</At>
<At :x="70" :y="520" :w="380" :z="1" enter="up" :delay="800">

Toy model: 145,000 numbers, trained for minutes on made-up points.

</At>
</Stage>

<!--
This is a diffusion model in miniature (Ho, Jain and Abbeel 2020). A picture of 2,800 points is mixed with Gaussian noise until nothing is left (the forward process, a closed formula). Then the reverse process draws a new picture from fresh noise: at each step a small network, trained on three pictures, guesses the noise in every point and a step removes a little of it. The arrows are the network's guess, reversed, on a grid. Fewer steps: a blurred picture. The cosine schedule beats the linear one when steps are few. Guidance (Ho and Salimans 2022) pushes the result further toward the prompt than the network alone would: a little sharpens it, too much tears it apart. Prompt anything mixes the three pictures. Needs nimbledeck run.
-->

---
layout: stage
motion: none
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="ai-sampler" :timeout="30">

```python
import numpy as np, matplotlib.pyplot as plt
from aitoy import diffusion as D   # trained network

steps, g, prompt = 50, 2.0, 1      # 1 smiley 2 spiral 3 AI
s = np.linspace(1, 0, steps + 1)   # 1: noise, 0: picture
abar = np.exp(-(0.1 * s + 9.95 * s**2))   # signal left
  # cosine: np.clip(np.cos(s * np.pi / 2) ** 2, 1e-5, 1)

rng = np.random.default_rng(0)
x = rng.normal(size=(2000, 2))     # pure noise
shots = [x]
for t, u in zip(abar[:-1], abar[1:]):
    lab = [0] * len(x) + [prompt] * len(x)
    e0, e1 = np.split(D.eps(np.r_[x, x], t, lab), 2)
    eps = e0 + g * (e1 - e0)       # guidance
    a = t / u
    k = (1 - a) / np.sqrt(1 - t)
    mean = (x - k * eps) / np.sqrt(a)   # remove noise
    sig = np.sqrt((1 - u) / (1 - t) * (1 - a))
    x = mean + sig * rng.normal(size=x.shape)
    shots.append(x)

fig, axs = plt.subplots(1, 4)
for ax, k in zip(axs, np.linspace(0, steps, 4).astype(int)):
    ax.scatter(*shots[k].T, s=1); ax.axis("equal"); ax.axis("off")
```

</LiveCode>
</At>
</Stage>

::caption::

Reverse diffusion. Edit steps, schedule, guidance.

<!--
The sampler of the demo, as code. The network D.eps is the one of the demo, trained once beforehand (demos/train_diffusion.py). Each loop turn is one reverse step: guess the noise, remove a little, add a little fresh noise. Try steps = 6, then 100. Swap the schedule line for the cosine one. Set g to 0, then to 5. Delete the last term of the x update to remove the fresh noise. Needs nimbledeck run.
-->

---
layout: full
motion: none
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "the picture fades" }
  - { at: 4.4, hover: ".nd-t2", caption: "the noise grows" }
  - { at: 6.4, hover: ".nd-t3", caption: "the network's guess" }
  - { at: 8.4, hover: ".nd-t4", caption: "a little fresh noise" }
  - { at: 10.4, hover: ".nd-eq" }
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Clip src="/recordings/stream-ai-diffusion.webm" fit="cover" /></At>
<At :x="70" :y="50" :w="540" :z="1">
<Kinetic text="Add noise.|Learn to undo it." mode="lines" from="up" :stagger="260" size="m" accent="undo" />
</At>
<At :x="70" :y="250" :w="560" :z="1" enter="up" :delay="500">
<Equation label="Forward process: x t given x zero is a Gaussian with mean the square root of alpha bar t times x zero, and variance one minus alpha bar t, times the identity. Reverse step: x t minus one equals one over the square root of alpha t times x t minus one minus alpha t over the square root of one minus alpha bar t times epsilon theta of x t and t, plus sigma t times z." align="left" :size="27">

$$
\begin{aligned}
q(x_t \mid x_0) &= \mathcal N\!\big(x_t;\ \term{1}{\sqrt{\bar\alpha_t}\,x_0},\ \term{2}{(1-\bar\alpha_t)\,I}\big) \\[10pt]
x_{t-1} &= \frac{1}{\sqrt{\alpha_t}}\Big(x_t - \frac{1-\alpha_t}{\sqrt{1-\bar\alpha_t}}\,\term{3}{\epsilon_\theta(x_t, t)}\Big) + \term{4}{\sigma_t z}
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="560" :w="470" :z="1" enter="up" :delay="800">

Top: the forward process, a formula. Bottom: one reverse step, which needs the network.

</At>
</Stage>

<!--
Standard forms from Ho et al. 2020: the forward marginal q(x_t | x_0) = N(sqrt(abar_t) x_0, (1 - abar_t) I), and the reverse step of their algorithm 2, x_{t-1} = (x_t - (1 - alpha_t) / sqrt(1 - abar_t) eps_theta(x_t, t)) / sqrt(alpha_t) + sigma_t z, with alpha_t = 1 - beta_t and abar_t the product of the alphas. The sampler of this demo uses the same step between any two noise levels (a respaced sampler, Nichol and Dhariwal 2021), so the number of steps is free. Term 1 is the picture, shrinking by sqrt(abar). Term 2 is the noise, growing. Term 3 is the network's guess of the noise, the reversed arrows. Term 4 is the small fresh noise added at each step, the jitter you see. This slide plays the recording of the previous one.
-->

---
layout: stage
motion: none
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="ai-attention" :timeout="20">

```python
import numpy as np, matplotlib.pyplot as plt
from aitoy import attention as T   # toy: 23 words

s = "the cat chased the mouse because it was hungry"
temp = 1.0                         # try 3, then 0.3
words = s.split()
x = T.embed(words)                 # 16 numbers per word

def softmax(z):
    e = np.exp(z - z.max(1, keepdims=True))
    return e / e.sum(1, keepdims=True)

maps = []
for L in T.layer_list():           # two rounds
    Q, K, V = x @ L.Wq, x @ L.Wk, x @ L.Wv
    d = Q.shape[1]
    scores = Q @ K.T / np.sqrt(d) / temp
    A = softmax(scores)            # rows add up to 1
    x = x + A @ V                  # mix the values
    maps.append(A)

who, p = T.referent(x, words)
fig, axs = plt.subplots(1, 2)
for ax, A, n in zip(axs, maps, "12"):
    ax.imshow(A, cmap="magma", vmin=0, vmax=1)
    ax.set_xticks(range(len(words)), words, rotation=60)
    ax.set_yticks(range(len(words)), words)
    ax.set_title("layer " + n)
fig.suptitle(f"it = the {who} ({p:.0%})")
```

</LiveCode>
</At>
</Stage>

::caption::

Who is "it"? Change a word, or the temperature, and watch the attention move.

<!--
A toy model with two rounds of attention (Vaswani et al. 2017), trained on sentences of one shape: the A chased the B because it was ADJ. Rows look, columns are looked at. In layer 1 the word it looks at the adjective; in layer 2 it looks at the animal that the adjective points to, and the model answers. Swap hungry for scared: the attention jumps from the cat to the mouse. Swap the two animals. Divide the scores by a larger temperature and the rows spread out. The words it knows are listed in the error if you type another one. Needs nimbledeck run.
-->

---
layout: full
motion: none
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t1", caption: "do query and key match?" }
  - { at: 4.4, hover: ".nd-t2", caption: "keep the scores tame" }
  - { at: 6.4, hover: ".nd-t3", caption: "rows add up to 1" }
  - { at: 8.4, hover: ".nd-t4", caption: "what is passed on" }
  - { at: 10.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="Every word|asks and answers." mode="lines" from="up" :stagger="260" size="m" accent="answers." />
</At>
<At :x="70" :y="290" :w="560" :z="1" enter="up" :delay="500">
<Equation label="Attention of Q, K and V is the softmax of Q K transpose divided by the square root of d, times V." align="left" :size="34">

$$
\mathrm{Attention}(Q,K,V) = \term{3}{\mathrm{softmax}}\Big(\frac{\term{1}{Q K^\top}}{\term{2}{\sqrt{d}}}\Big)\,\term{4}{V}
$$

</Equation>
</At>
<At :x="70" :y="560" :w="520" :z="1" enter="up" :delay="800">

On the right, the recording of the live slide. Rows look, columns are looked at.

</At>
<At :x="640" :y="58" :w="600" :h="604" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/live-ai-attention.webm" fit="cover" position="right" /></At>
</Stage>

<!--
Scaled dot-product attention, equation 1 of Vaswani et al. 2017. Each word makes a query Q (what am I looking for), a key K (what do I offer) and a value V (what I pass on). Q K^T scores every pair. Dividing by sqrt(d) keeps the scores small enough that the softmax does not saturate (the paper's argument: dot products grow with the dimension). Softmax turns each row into weights that add up to 1. Multiplying by V mixes the values with those weights. The bright cell where the row it meets the column cat is that weight.
-->
