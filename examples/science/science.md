---
theme: nimbledeck
ndVariant: studio
ndMotion: fade-up
title: Science, live
transition: fade
layout: full
motion: blur-in
background: aurora
tour: 8
---

<Stage full>
<At :x="70" :y="70" :w="1140" :z="2">
<Kinetic text="Science, live." mode="words" from="up" :stagger="180" size="xl" accent="live." />
</At>
<At :x="70" :y="230" :w="1100" :z="2" enter="up" :delay="900">

Five fields, five experiments. Each one runs here, and you change it.

</At>
<At :x="70" :y="360" :w="270" :h="250" :z="1" frame enter="up" :delay="300"><Clip src="/recordings/stream-evo-landscape.webm" fit="cover" /></At>
<At :x="368" :y="360" :w="270" :h="250" :z="1" frame enter="up" :delay="450"><Clip src="/recordings/stream-ai-diffusion.webm" fit="cover" /></At>
<At :x="666" :y="360" :w="270" :h="250" :z="1" frame enter="up" :delay="600"><Clip src="/recordings/stream-climate-l96.webm" fit="cover" /></At>
<At :x="964" :y="360" :w="270" :h="250" :z="1" frame enter="up" :delay="750"><Clip src="/recordings/demo-gw-detect.webm" fit="cover" /></At>
</Stage>

<!--
The message of the talk in one line: show the experiment, not the screenshot. Everything on the next slides computes while you watch. The four clips are the demos of four chapters, in the order of their fields: evolution, everyday AI, climate, gravitational waves. The file behind the whole talk is plain Markdown.
-->

---
layout: full
---

<Stage full>
<At :x="70" :y="40" :w="1000" :z="1">
<Kinetic text="Five experiments." mode="words" from="up" :stagger="150" size="m" accent="experiments." />
</At>
<At :x="70" :y="210" :w="214" :h="330" :z="1" frame :pad="20" enter="up" :delay="300">

#### 1

**Risk and probability**

Why a positive test is usually wrong

</At>
<At :x="302" :y="210" :w="214" :h="330" :z="1" frame :pad="20" enter="up" :delay="450">

#### 2

**Everyday AI**

How a picture comes out of noise

</At>
<At :x="534" :y="210" :w="214" :h="330" :z="1" frame :pad="20" enter="up" :delay="600">

#### 3

**Evolution**

Copy, mutate, filter, repeat

</At>
<At :x="766" :y="210" :w="214" :h="330" :z="1" frame :pad="20" enter="up" :delay="750">

#### 4

**Climate**

Why the forecast forgets

</At>
<At :x="998" :y="210" :w="214" :h="330" :z="1" frame :pad="20" enter="up" :delay="900">

#### 5

**Gravitational waves**

A collision found in the noise

</At>
</Stage>

<!--
Each chapter has one demo that the audience changes, and the equation next to it points at the picture: touch a term and the part of the demo it describes lights up. Everything is simulated or a toy model, and every slide says so.
-->

---
layout: statement
motion: drop
background: aurora
---

#### A screening test, 99% accurate. You test positive.

<Kinetic text="How likely are you sick?" mode="words" from="mask" :stagger="170" size="l" accent="sick?" />

<!--
Say the number you would guess before the next slide. The assumption, stated once: the condition affects 1 person in 1,000, and the test catches 99 percent of the sick and clears 99 percent of the healthy. This is the screening problem of the research on Bayesian reasoning (Eddy 1982; Gigerenzer and Hoffrage 1995).
-->

---
layout: full
tour: 18
tourScript:
  - { at: 1.6, drag: ".nd-crowd-ctl label:nth-child(1) input", from: 0.2, to: 0.6, over: 2.4, caption: "more sick people" }
  - { at: 4.8, drag: ".nd-crowd-ctl label:nth-child(3) input", from: 0.9, to: 0.5, over: 2.4, caption: "a worse test" }
  - { at: 8.2, hover: ".nd-crowd-key li:nth-child(2)", caption: "false alarms" }
---

<Stage full>
<At :x="70" :y="34" :w="900" :z="1">
<Kinetic text="10,000 people. One test." mode="words" from="up" :stagger="150" size="m" accent="One" />
</At>
<At :x="70" :y="120" :w="1140" :h="580" :z="1"><Crowd :w="1140" :h="580" /></At>
</Stage>

<!--
Each dot is a person. The picture shows expected numbers, not a random draw, so 1 in 1,000 is exactly 10 sick people in 10,000. Sick and positive: 10. Healthy but positive, a false alarm: 100 (1 percent of 9,990). Of the 110 people who test positive, 10 are sick: about 9 percent, not 99. The block on the right is those 110 people. Drag prevalence up and the sick share among the positives climbs; make the test worse and it falls. The percentage is P(D | +) from Bayes' theorem, computed from the probabilities: 0.99 x 0.001 / (0.99 x 0.001 + 0.01 x 0.999) = 9.0 percent. The counts give 10 of 110, 9.1 percent, because people come in whole numbers. Hover a dot, or a line of the key, to light its group.
-->

---
layout: full
tour: 14
tourScript:
  - { at: 2.2, hover: ".nd-t3", caption: "sick and positive" }
  - { at: 4.2, hover: ".nd-t4", caption: "healthy, still positive" }
  - { at: 6.2, hover: ".nd-t1", caption: "the answer" }
  - { at: 8.4, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="Bayes,|in colour." mode="lines" from="up" :stagger="260" size="m" accent="colour." />
</At>
<At :x="70" :y="250" :w="580" :z="1" enter="up" :delay="500">
<Equation label="Bayes' theorem. The probability of being sick given a positive test is the probability of testing positive when sick, times the prevalence, divided by that same product plus the probability of testing positive when healthy, times the probability of being healthy. In people: the true positives divided by the true positives plus the false positives." align="left" :size="25" :decimals="{ riskppv: 0 }" :params="{ risktp: 10, riskfp: 100, riskppv: 9 }">

$$
\term{1}{P(D \mid +)} = \frac{\term{3}{P(+ \mid D)\,P(D)}}{\term{3}{P(+ \mid D)\,P(D)} + \term{4}{P(+ \mid \neg D)\,P(\neg D)}}
$$

$$
\approx \frac{\term{3}{\val{risktp}{10}}}{\term{3}{\val{risktp}{10}} + \term{4}{\val{riskfp}{100}}} = \val{riskppv}{9}\,\%
$$

</Equation>
</At>
<At :x="70" :y="560" :w="560" :z="1" enter="up" :delay="800">

Point at a term. The sick who test positive (pink) and the false alarms (amber) are the two groups of dots.

</At>
<At :x="670" :y="60" :w="560" :h="600" :z="1" enter="left" :delay="300"><Crowd :w="560" :h="600" :controls="false" /></At>
</Stage>

<!--
Bayes' theorem, P(D | +) = P(+ | D) P(D) / (P(+ | D) P(D) + P(+ | not D) P(not D)); Bayes 1763, Price (ed.). The numerator is the pink group: sick people who test positive. The denominator adds the amber group: healthy people who test positive. In whole people the same ratio is 10 / (10 + 100). Gigerenzer and Hoffrage (1995) showed that stating a problem in these natural frequencies, not in probabilities, makes it far easier to reason about. The crowd on the right shows the same sliders as the previous slide: change them there and they change here.
-->

---
layout: full
tour: 20
tourScript:
  - { at: 2.4, drag: ".nd-polls-ctl label:nth-child(1) input", from: 0.5, to: 0.9, over: 2.2, caption: "ask more people" }
  - { at: 5.6, drag: ".nd-polls-ctl label:nth-child(4) input", from: 0, to: 0.5, over: 2.4, caption: "a biased sample" }
  - { at: 9.4, drag: ".nd-polls-ctl label:nth-child(1) input", from: 0.9, to: 1, over: 1.6, caption: "still not the truth" }
---

<Stage full>
<At :x="70" :y="30" :w="1000" :z="1">
<Kinetic text="2,000 polls. One truth." mode="words" from="up" :stagger="150" size="m" accent="truth." />
</At>
<At :x="70" :y="122" :w="1140" :h="580" :z="1"><Polls :w="1140" :h="580" /></At>
</Stage>

<!--
A simulation, not data: 2,000 polls of the same population, 52 percent for A. Each poll asks 1,000 people; the bars count how many polls gave each result. The black curve is the normal curve with the standard error of a poll. The shaded band is the 95 percent margin of error around the truth. The line at the top is the one poll a newspaper would print, with its own margin. Two things to say. First, about 1 poll in 10 names the wrong winner even though nothing is wrong with the method: that is what sampling noise costs. Second, push the bias slider: when 10 percent of A supporters hang up, the polls centre on 49 percent, and asking 10,000 people only makes them more sure of the wrong answer. A larger sample shrinks the noise and leaves the bias alone (Meng 2018). The sliders redraw the same random numbers, so the histogram morphs; let go and the polls are taken again.
-->

---
layout: stage
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604">
<LiveCode id="polls" :timeout="20">

```python
import numpy as np
import matplotlib.pyplot as plt
plt.figure(figsize=(7, 4))
rng = np.random.default_rng(3)
N, POLLS = 1000, 4000          # people, polls
share = np.array([0.4, 0.6])   # young, older
likeA = np.array([0.7, 0.4])   # prefer A: 52%
reach = np.array([1.0, 1.0])   # try [0.5, 1]
WEIGHT = False                 # try True

mix = share * reach
n = rng.multinomial(N, mix / mix.sum(), POLLS)
yes = rng.binomial(n, likeA)
rate = yes / np.maximum(n, 1)
res = rate @ share if WEIGHT else yes.sum(1) / N

truth = share @ likeA
plt.hist(res * 100, np.arange(35, 70, .5))
plt.axvline(truth * 100, color="C1")
plt.axvline(50, ls="--", color="gray")
plt.title(f"A wins {(res > .5).mean():.0%} of polls")
```

</LiveCode>
</At>
</Stage>

::caption::

The same simulation in NumPy. Make the young harder to reach, then correct for it.

<!--
The population has two groups: the young (40 percent of voters, 70 percent for A) and the older (60 percent, 40 percent for A), 52 percent for A overall. Each poll draws N respondents; mix is the share of each group among them (a multinomial draw), and yes counts the A answers in each group. With reach = [1, 1] every voter is equally likely to be reached and the polls centre on 52 percent. Try reach = [0.5, 1]: young people answer half as often, they are 25 percent of the sample instead of 40, and the polls centre on 47.5 percent, so A loses in most polls although it has 52 percent of the voters. Now set WEIGHT = True: each group is counted at its true share, the bias goes away and the histogram is wider, because the young are few in the sample (the price of weighting is variance). Change N to 100 or 10,000 to see the noise change. Poll weighting by group is post-stratification. Simulation, not data. Needs nimbledeck run.
-->

---
layout: statement
motion: blur-in
background: aurora
---

#### Everyday AI

<Kinetic text="Noise in. A picture out." mode="words" from="blur" :stagger="170" size="l" accent="picture" />

<Kinetic text="Two small models, running on this laptop, show how image generators and chatbots work." mode="lines" from="blur" size="s" tone="muted" :delay="1400" />

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
<Equation label="Forward process: x t given x zero is a Gaussian with mean the square root of alpha bar t times x zero, and variance one minus alpha bar t, times the identity. Reverse step: x t minus one equals one over the square root of alpha t times x t minus one minus alpha t over the square root of one minus alpha bar t times epsilon theta of x t and t, plus sigma t times z." align="left" :size="24">

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
<At :x="610" :y="130" :z="2"><Marker term="1">the picture, fading out</Marker></At>
<At :x="900" :y="95" :z="2"><Marker term="2">the noise, growing</Marker></At>
<At :x="660" :y="560" :z="2"><Marker term="3">the network's guess, reversed: the arrows</Marker></At>
<At :x="930" :y="610" :z="2"><Marker term="4">fresh noise each step: the jitter</Marker></At>
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
x = T.embed(words)                 # 16 numbers each

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
<Equation label="Attention of Q, K and V is the softmax of Q K transpose divided by the square root of d, times V." align="left" :size="30">

$$
\begin{aligned}
\mathrm{Attention}(Q,K,V) &= \\[6pt]
&\quad \term{3}{\mathrm{softmax}}\Big(\frac{\term{1}{Q K^\top}}{\term{2}{\sqrt{d}}}\Big)\,\term{4}{V}
\end{aligned}
$$

</Equation>
</At>
<At :x="70" :y="560" :w="520" :z="1" enter="up" :delay="800">

On the right, the recording of the live slide. Rows look, columns are looked at.

</At>
<At :x="640" :y="58" :w="600" :h="604" :z="1" frame enter="left" :delay="300"><Clip src="/recordings/live-ai-attention.webm" fit="cover" position="right" /></At>
<At :x="690" :y="150" :z="2"><Marker term="2">scores kept small</Marker></At>
<At :x="880" :y="325" :z="2"><Marker term="1">query meets key</Marker></At>
<At :x="1000" :y="482" :z="2"><Marker term="3">each row adds up to 1</Marker></At>
<At :x="1050" :y="385" :z="2"><Marker term="4">the value that flows into it</Marker></At>
</Stage>

<!--
Scaled dot-product attention, equation 1 of Vaswani et al. 2017. Each word makes a query Q (what am I looking for), a key K (what do I offer) and a value V (what I pass on). Q K^T scores every pair. Dividing by sqrt(d) keeps the scores small enough that the softmax does not saturate (the paper's argument: dot products grow with the dimension). Softmax turns each row into weights that add up to 1. Multiplying by V mixes the values with those weights. The bright cell where the row it meets the column cat is that weight.
-->

---
layout: statement
motion: focus
background: shader
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

---
layout: statement
motion: blur-in
background: waves
---

#### Climate and weather

<Kinetic text="The weather forgets in two weeks." mode="words" from="blur" :stagger="170" size="l" accent="forgets" />

<Kinetic text="Not for lack of computers. The equations are chaotic, and every measurement is a little wrong." mode="lines" from="blur" size="s" tone="muted" :delay="1400" />

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

---
layout: closing
background: aurora
motion: focus
tour: 8
tourScript:
  - { at: 3.2, hover: ".nd-next-github", caption: "The source of this talk" }
---

# What you just saw

#### One Markdown file. The Python ran on this laptop.

`nimbledeck run` computes the demos live.

`nimbledeck record` films them, so the same deck plays on a static site.

<NextSteps :skip="['science']" />

<!--
The deck is one Markdown file, examples/science/science.md, composed from five chapter files. The simulations are small on purpose: a population of dots, a toy atmosphere, two toy neural networks, simulated detector noise, a crowd of 10,000 dots. They run for real, nothing is faked, and each one is labelled as a model.
-->
