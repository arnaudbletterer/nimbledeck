---
theme: nimbledeck
ndVariant: studio
title: Risk, live
transition: fade
ndMotion: fade-up
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
layout: full
tour: 14
tourScript:
  - { at: 2.2, hover: ".nd-t1", caption: "the true share" }
  - { at: 4, hover: ".nd-t4", caption: "people per poll" }
  - { at: 5.8, hover: ".nd-t2", caption: "the spread of the polls" }
  - { at: 7.6, hover: ".nd-t3", caption: "95% of polls fall inside" }
  - { at: 9.6, hover: ".nd-eq" }
---

<Stage full>
<At :x="70" :y="58" :w="560" :z="1">
<Kinetic text="The size|of the noise." mode="lines" from="up" :stagger="260" size="m" accent="noise." />
</At>
<At :x="70" :y="250" :w="580" :z="1" enter="up" :delay="500">
<Equation label="The standard error of a poll is the square root of p times one minus p, over n. The margin of error is 1.96 standard errors. With the current sliders the standard error and the margin, in points, are shown below." align="left" :size="32" :decimals="{ riskpollse: 1, riskpollmoe: 1 }" :params="{ riskpollse: 1.6, riskpollmoe: 3.1 }">

$$
\term{2}{\mathrm{SE}} = \sqrt{\frac{\term{1}{p}\,(1 - \term{1}{p})}{\term{4}{n}}}
\qquad
\term{3}{\mathrm{MoE} = 1.96\,\mathrm{SE}}
$$

$$
\term{2}{\val{riskpollse}{1.6}} \text{ points} \qquad \term{3}{\val{riskpollmoe}{3.1}} \text{ points}
$$

</Equation>
</At>
<At :x="70" :y="500" :w="560" :z="1" enter="up" :delay="800">

Four times the people, half the noise. The margin is for one share: the lead of A over B has twice that margin, and a lead inside it is still ahead about 9 times in 10.

</At>
<At :x="670" :y="60" :w="560" :h="600" :z="1" enter="left" :delay="300"><Polls :w="560" :h="600" :controls="false" /></At>
</Stage>

<!--
For n independent answers, each saying A with probability p, the number of A answers is binomial, so the share has variance p (1 - p) / n: SE = sqrt(p (1 - p) / n). About 95 percent of polls land within 1.96 SE of p (the normal approximation; Brown, Cai and DasGupta 2001 discuss where it is poor, mainly for small n or p near 0 or 1). At n = 1,000 and p = 0.52, SE = 1.58 points and MoE = 3.1 points. The lead A minus B equals 2 p minus 1, so its variance is 4 p (1 - p) / n and its margin is twice the margin of one share. That is why a 52 to 48 poll of 1,000 people, with a margin of 3 points on each share, is not a coin flip: in the simulation it names the right winner about 9 times in 10. It is not a certainty either. None of this formula contains bias: a poll that cannot reach part of the population has an error that does not shrink with n. The sliders are those of the previous slide.
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
