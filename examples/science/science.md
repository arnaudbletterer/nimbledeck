---
theme: nimbledeck
ndVariant: studio
ndMotion: fade-up
title: Why a positive test is often wrong
transition: fade
layout: hero
motion: rise
background: dots
tour: 7
---

# You tested positive.

#### How worried should you be?

<!--
The whole talk in one question. Sam is made up, the condition is made up, and the people are dots in a simulation: an illustration, not medical advice. Everything that follows is arithmetic you can check on a napkin.
-->

---
layout: default
tour: 10
tourScript:
  - { at: 8, wait: 1 }
---

# Sam tests positive

A routine check-up for something that affects 1 person in 1,000. The test says: positive.

<Stage :h="500">
<At :x="0" :y="30" :w="620" :h="400" enter="up" :delay="200" middle>
<Stat value="99" suffix="%" label="accurate: it catches 99 of 100 sick people and clears 99 of 100 healthy ones" :duration="1400" />
</At>
<At :x="680" :y="30" :w="460" :h="400" enter="up" :delay="900" middle>
<Kinetic text="Positive." mode="letters" from="up" :stagger="60" :delay="1200" size="l" accent="Positive." />
</At>
</Stage>

<!--
Sam is a made-up person. The test is 99 percent accurate in the plain sense: of 100 sick people it catches 99, of 100 healthy people it clears 99. The condition is a made-up rare one; no real disease is meant. Ask the room: how likely is it that Sam is really sick?
-->

---
layout: default
tour: 11
tourScript:
  - { at: 2.0, hover: B, caption: "Maybe about 90?" }
  - { at: 4.2, click: D, caption: "About 9 in 100" }
---

# How likely is Sam to be sick?

The condition affects 1 person in 1,000, and the test is 99% accurate.

<Stage :h="500">
<At :y="30" :w="1140" :h="400">
<Quiz answer="D">
<Choice letter="A">About 99 in 100</Choice>
<Choice letter="B">About 90 in 100</Choice>
<Choice letter="C">About 50 in 100</Choice>
<Choice letter="D">About 9 in 100</Choice>
<Explain letter="D">

Only about 9 in 100. Surprising? Most people think so.

</Explain>
</Quiz>
</At>
</Stage>

<!--
Take a guess before the reveal; click an answer or press 1 to 4. The condition is 1 in 1,000 and the test is 99 percent accurate, as said on the last slide. refs: [casscells1978]
-->

---
layout: default
tour: 9
tourScript:
  - { at: 8, wait: 1 }
---

# About 9 in 100

Most people guess far higher. Here is why.

<Stage :h="500">
<At :x="0" :y="30" :w="1140" :h="400" middle>
<Stat value="9" suffix="%" label="chance that Sam is really sick" :duration="1600" />
</At>
</Stage>

::caption::

Casscells et al., 1978, as reported by Manrai et al., 2014: 11 of 60 doctors and students got a similar question right.

<!--
The exact figure is 9.0 percent: 10 sick people among 110 who test positive is 9.1 percent, because people come in whole numbers. In 1978 Casscells, Schoenberger and Graboys asked 60 people at Harvard teaching hospitals (20 students, 20 house officers, 20 attending physicians) a similar question: a condition affecting 1 in 1,000 people and a test with a 5 percent false positive rate. Eleven of the 60 gave the right answer (about 2 percent) and the most common answer, from 27 of 60, was 95 percent. Manrai et al. (2014) asked again and found much the same. Eddy (1982) described the same kind of error in how physicians read a mammogram. refs: [casscells1978] [manrai2014] [eddy1982]
-->

---
layout: default
tour: 9
tourScript:
  - { at: 2.8, key: "ArrowRight" }
---

# Ten of them are sick

Picture 10,000 people. Each dot is one person, and only 1 in 1,000 is sick.

<Stage :h="500">
<At :x="383" :y="30" :w="374" :h="440" enter="scale" :delay="200"><Chance mode="crowd" :w="374" :h="440" :steps="1" /></At>
</Stage>

::caption::

Counting people helps: Gigerenzer and Hoffrage, 1995.

<!--
1 in 1,000 of 10,000 is exactly 10 people. The dots are a simulation of expected numbers, not a random draw. Gigerenzer and Hoffrage (1995) showed that stating a problem as counts of people ("10 out of 10,000") makes it far easier to reason about than stating it as percentages; this talk follows their idea. refs: [gigerenzer1995]
-->

---
layout: default
tour: 11
tourScript:
  - { at: 2.2, key: "ArrowRight" }
  - { at: 5.6, key: "ArrowRight" }
---

# Who tests positive?

Now everyone is tested. The test catches the sick, and wrongly flags 1 healthy person in 100.

<Stage :h="500">
<At :x="383" :y="30" :w="374" :h="440"><Chance mode="crowd" :w="374" :h="440" :from="1" :steps="2" /></At>
</Stage>

<!--
First click: the 10 sick people test positive (the test catches 99 percent of them, which rounds to all 10). Second click: 1 percent of the 9,990 healthy people also test positive, a false alarm: 100 people. The amber ring always means "the test said positive".
-->

---
layout: default
tour: 8
tourScript:
  - { at: 2.0, key: "ArrowRight" }
---

# Of 110 positives, only 10 are sick

The healthy are so many that their false alarms outnumber the real cases ten to one.

<Stage :h="500">
<At :y="30" :w="1140" :h="340"><Chance mode="rows" :w="1100" :h="330" :from="1" :steps="1" /></At>
</Stage>

<!--
10 sick people who test positive, 100 healthy people who test positive too: 110 positives. 10 of 110 is about 9 percent. That is the whole answer; the rest of the talk plays with it.
-->

---
layout: default
tour: 14
tourScript:
  - { at: 2.0, drag: ".nd-chance-read input", from: 0.18, to: 0.46, over: 2.4, caption: "1 in 100" }
  - { at: 6.0, drag: ".nd-chance-read input", from: 0.46, to: 0.73, over: 2.4, caption: "1 in 10" }
---

# Change how rare it is

Drag the slider: the condition gets more common, and the sentence follows.

<Stage :h="500">
<At :y="30" :w="1140" :h="410"><Chance mode="play" controls="prevalence" :w="1140" :h="410" /></At>
</Stage>

<!--
Drag the slider: the condition gets more common and the false alarms stop dominating. At 1 in 100 a positive test is right about half the time. The sentence updates with the slider.
-->

---
layout: default
tour: 14
tourScript:
  - { at: 2.0, drag: ".nd-chance-read label:nth-of-type(1) input", from: 0.98, to: 0.6, over: 2.2, caption: "catches fewer sick people" }
  - { at: 5.6, drag: ".nd-chance-read label:nth-of-type(2) input", from: 0.9, to: 0.99, over: 2.2, caption: "clears more healthy people" }
---

# Change how good the test is

Drag the sliders: the condition stays at 1 in 1,000, and the sentence follows.

<Stage :h="500">
<At :y="30" :w="1140" :h="410"><Chance mode="play" controls="accuracy" :w="1140" :h="410" /></At>
</Stage>

<!--
Here the condition stays at 1 in 1,000. Catching fewer sick people hurts a little. Clearing more healthy people helps a lot, because the healthy are the crowd that produces the false alarms. Even a test that clears 99.9 of 100 healthy people is right only about half the time.
-->

---
layout: default
tour: 10
tourScript:
  - { at: 8, wait: 1 }
---

# A rule of thumb

When something is rare, even a good test gives mostly false alarms.

<Stage :h="500">
<At :x="0" :y="30" :w="540" :h="440" enter="up" :delay="300"><Chance mode="pile" :w="540" :h="430" :prev="0.001" /></At>
<At :x="600" :y="30" :w="540" :h="440" enter="up" :delay="600"><Chance mode="pile" :w="540" :h="430" :prev="0.1" /></At>
</Stage>

::caption::

People tend to ignore how common something is: Kahneman and Tversky, 1973.

<!--
Same test, same 99 percent accuracy, two worlds. Left: the condition is rare (1 in 1,000), and the positives are mostly grey dots, false alarms. Right: it is common (1 in 10), and the positives are mostly pink. Kahneman and Tversky (1973) described this habit as ignoring the base rate. refs: [kahneman1973]
-->

---
layout: default
tour: 9
tourScript:
  - { at: 7, wait: 1 }
---

# What to ask

After a positive test, ask for counts of people.

<Stage :h="500">
<At :x="0" :y="30" :w="560" :h="360" enter="left" :delay="300" frame pad="28px 32px">

**Ask your doctor**

- How common is this condition?
- Of 100 people with a positive test, how many are really sick?
- What comes next: a second test?

</At>
<At :x="600" :y="30" :w="540" :h="360" enter="left" :delay="500" frame pad="28px 32px">

**The same idea elsewhere**

- A scanner: if danger is rare, most beeps are false alarms.
- A card alert: if fraud is rare, most alerts are really you.
- A fire alarm: if fires are rare, most alarms are false.

</At>
</Stage>

::caption::

Doctors reason better with counts of people: Hoffrage and Gigerenzer, 1998.

<!--
Asking for counts of people ("out of 100 people with a positive test") rather than percentages is the advice of Gigerenzer and colleagues (2007). In the 1998 study of 48 physicians, about 10 percent of the answers were correct when the information was given as probabilities, and about 46 percent when it was given as natural frequencies (counts of people). The three examples are the same arithmetic ("if it is rare, most alerts are false"), not measured rates. The brief's example "1 in 10 gives about 50 percent" does not hold for a 99 percent test: 1 in 10 gives 92 in 100, and 1 in 100 gives 50 in 100. refs: [hoffrage1998] [gigerenzer2007]
-->

---
layout: default
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t3", caption: "sick, test positive" }
  - { at: 4.8, hover: ".nd-t4", caption: "healthy, test positive" }
  - { at: 7.2, hover: ".nd-t1", caption: "the answer" }
  - { at: 9.6, hover: ".nd-eq" }
---

# Bayes' rule, in colour

For the curious (optional): the rule counts the real cases among all the positives.

<Stage :h="500">
<At :x="640" :y="30" :w="500" :h="440" enter="left" :delay="300"><Chance mode="pile" :w="500" :h="430" :prev="0.001" /></At>
<At :x="0" :y="110" :w="600" enter="up" :delay="500">
<Equation label="Bayes' rule in words. The chance that a positive test is real equals the people who are sick and test positive, divided by the people who are sick and test positive plus the healthy people who test positive. With the numbers of the story, 10 divided by 10 plus 100, about 9 percent." align="left" :size="25" :decimals="{ riskppv: 0 }" :params="{ risktp: 10, riskfp: 100, riskppv: 9 }">

$$
\term{1}{\text{chance it is real}} = \frac{\term{3}{\text{sick, positive}}}{\term{3}{\text{sick, positive}} + \term{4}{\text{healthy, positive}}}
$$

$$
= \frac{\term{3}{\val{risktp}{10}}}{\term{3}{\val{risktp}{10}} + \term{4}{\val{riskfp}{100}}} = \val{riskppv}{9}\,\%
$$

</Equation>
</At>
</Stage>

::caption::

For the curious. Rule: Bayes and Price, 1763.

<!--
This is Bayes' rule, written in words and then in the counts of the story. Point at a coloured term: the matching dots light up in the picture. Bayes' own essay was published after his death, communicated by Richard Price (1763). Writing it with counts of people, 10 / (10 + 100), is the natural-frequency form of Gigerenzer and Hoffrage (1995); with probabilities it is P(sick | positive) = P(positive | sick) P(sick) / (P(positive | sick) P(sick) + P(positive | healthy) P(healthy)). refs: [bayes1763] [gigerenzer1995]
-->

---
layout: numbers
class: nd-cards
motion: cascade
tour: 9
tourScript:
  - { at: 3.0, hover: ".nd-num:nth-child(2)" }
  - { at: 5.2, hover: ".nd-num:nth-child(3)" }
---

# The giants, 1763 to 1978

Standing on the shoulders of giants: the idea, and how we get it wrong.

::a::

### The idea

## 1763

**Bayes and Price**

An essay towards solving a problem in the doctrine of chances. The rule itself.

*Phil. Trans. R. Soc.* 53 · [doi:10.1098/rstl.1763.0053](https://doi.org/10.1098/rstl.1763.0053)

::b::

### How we get it wrong

## 1973

**Kahneman and Tversky**

On the psychology of prediction. People ignore how rare things are.

*Psychological Review* 80 · [doi:10.1037/h0034747](https://doi.org/10.1037/h0034747)

::c::

### How we get it wrong

## 1978

**Casscells and colleagues**

Interpretation by physicians of clinical laboratory results. Only 11 of 60 got it right.

*NEJM* 299 · [doi:10.1056/NEJM197811022991808](https://doi.org/10.1056/NEJM197811022991808)

<!--
refs: [bayes1763] [kahneman1973] [casscells1978]
-->

---
layout: numbers
class: nd-cards
motion: cascade
tour: 9
tourScript:
  - { at: 3.0, hover: ".nd-num:nth-child(2)" }
  - { at: 5.2, hover: ".nd-num:nth-child(3)" }
---

# The giants, 1982 to 1998

Why even doctors get it wrong, and a better way to say it.

::a::

### How we get it wrong

## 1982

**Eddy**

Probabilistic reasoning in clinical medicine. Physicians make big errors.

*Judgment under Uncertainty* · [doi:10.1017/CBO9780511809477.019](https://doi.org/10.1017/CBO9780511809477.019)

::b::

### How to explain it

## 1995

**Gigerenzer and Hoffrage**

How to improve Bayesian reasoning without instruction: frequency formats. Counting people beats percentages.

*Psychological Review* 102 · [doi:10.1037/0033-295X.102.4.684](https://doi.org/10.1037/0033-295X.102.4.684)

::c::

### How to explain it

## 1998

**Hoffrage and Gigerenzer**

Using natural frequencies to improve diagnostic inferences. 46% right with counts, 10% with percentages.

*Academic Medicine* 73 · [doi:10.1097/00001888-199805000-00024](https://doi.org/10.1097/00001888-199805000-00024)

<!--
refs: [eddy1982] [gigerenzer1995] [hoffrage1998]
-->

---
layout: numbers
class: nd-cards
motion: cascade
tour: 9
tourScript:
  - { at: 3.0, hover: ".nd-num:nth-child(2)" }
  - { at: 5.2, hover: ".nd-num:nth-child(3)" }
---

# The giants, 2007 to 2014

A last word on how to explain it, and on how little has changed.

::a::

### How to explain it

## 2007

**Gigerenzer and colleagues**

Helping doctors and patients make sense of health statistics. Say it with counts of people.

*Psychol. Sci. Public Interest* 8 · [doi:10.1111/j.1539-6053.2008.00033.x](https://doi.org/10.1111/j.1539-6053.2008.00033.x)

::b::

### Still true today

## 2014

**Manrai and colleagues**

Medicine's uncomfortable relationship with math. In 2013, 14 of 61 answered the question right.

*JAMA Intern. Med.* 174 · [doi:10.1001/jamainternmed.2014.1059](https://doi.org/10.1001/jamainternmed.2014.1059)

<!--
refs: [gigerenzer2007] [manrai2014]. Every reference was checked against Crossref, PubMed or the publisher (REFERENCES.md says how).
-->

---
layout: closing
motion: spotlight
background: aurora
tour: 9
tourScript:
  - { at: 7, wait: 1 }
---

# Made with Nimbledeck

#### This whole talk is one Markdown file: pictures you can play with, a quiz, equations, and a tour that plays itself.

Everything you touched here runs in your browser.

<NextSteps :skip="['science']" />

<!--
The talk is only an example. Nimbledeck turns plain Markdown into live slides: the quiz, the crowd, the equations in colour and this tour are all features of the tool. The people and the condition in the story are made up.
-->
