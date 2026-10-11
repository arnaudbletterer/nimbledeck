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

An illustration, not medical advice.

<!--
The whole talk in one question. Sam is made up, the condition is made up, and the people are dots in a simulation: an illustration, not medical advice. Everything that follows is arithmetic you can check on a napkin.
-->

---
layout: split
motion: slide-left
tour: 9
---

#### Meet Sam

# Sam tests positive

A routine check-up for something that affects 1 person in 1,000. The test says: positive.

::right::

<Stage :w="640" :h="720">
<At :x="60" :y="150" :w="520" :h="230" enter="up" :delay="200" middle>
<Stat value="99" suffix="%" label="accurate: it catches 99 of 100 sick people and clears 99 of 100 healthy ones" :duration="1400" />
</At>
<At :x="60" :y="440" :w="520" :h="140" enter="up" :delay="900" middle>
<Kinetic text="Positive." mode="letters" from="up" :stagger="60" :delay="1200" size="l" accent="Positive." />
</At>
</Stage>

<!--
Sam is a made-up person. The test is 99 percent accurate in the plain sense: of 100 sick people it catches 99, of 100 healthy people it clears 99. The condition is a made-up rare one; no real disease is meant. Ask the room: how likely is it that Sam is really sick?
-->

---
layout: default
motion: pop
tour: 11
tourScript:
  - { at: 2.0, hover: B, caption: "Maybe about 90?" }
  - { at: 4.2, click: D, caption: "About 9 in 100" }
---

# How likely is Sam to be sick?

The condition affects 1 person in 1,000, and the test is 99% accurate.

<Stage :h="400">
<At :y="30" :w="1140" :h="370">
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
layout: split
motion: focus
background: aurora
tour: 8
---

#### The answer

# About 9 in 100

Most people guess far higher. Here is why.

::right::

<Stage :w="640" :h="720">
<At :x="40" :y="200" :w="560" :h="320" middle>
<Stat value="9" suffix="%" label="chance that Sam is really sick" :duration="1600" />
</At>
</Stage>

::caption::

Casscells et al., 1978: 11 of 60 doctors and students got a similar question right.

<!--
The exact figure is 9.0 percent: 10 sick people among 110 who test positive is 9.1 percent, because people come in whole numbers. In 1978 Casscells, Schoenberger and Graboys asked 60 people at Harvard teaching hospitals (20 students, 20 house officers, 20 attending physicians) a similar question: a condition affecting 1 in 1,000 people and a test with a 5 percent false positive rate. Eleven of the 60 gave the right answer (about 2 percent) and the most common answer, from 27 of 60, was 95 percent. Manrai et al. (2014) asked again and found much the same. Eddy (1982) described the same kind of error in how physicians read a mammogram. refs: [casscells1978] [manrai2014] [eddy1982]
-->

---
layout: split
motion: slide-left
tour: 9
tourScript:
  - { at: 2.8, key: "ArrowRight" }
---

#### Picture 10,000 people

# Ten of them are sick

Each dot is one person, and only 1 in 1,000 is sick.

::right::

<Stage :w="640" :h="720">
<At :x="40" :y="30" :w="560" :h="660" enter="scale" :delay="200"><Chance mode="crowd" :w="560" :h="660" :steps="1" /></At>
</Stage>

::caption::

Counting people helps: Gigerenzer and Hoffrage, 1995.

<!--
1 in 1,000 of 10,000 is exactly 10 people. The dots are a simulation of expected numbers, not a random draw. Gigerenzer and Hoffrage (1995) showed that stating a problem as counts of people ("10 out of 10,000") makes it far easier to reason about than stating it as percentages; this talk follows their idea. refs: [gigerenzer1995]
-->

---
layout: split
motion: slide-left
tour: 11
tourScript:
  - { at: 2.2, key: "ArrowRight" }
  - { at: 5.6, key: "ArrowRight" }
---

#### Now everyone is tested

# Who tests positive?

The test catches the sick, and wrongly flags 1 healthy person in 100.

::right::

<Stage :w="640" :h="720">
<At :x="40" :y="30" :w="560" :h="660"><Chance mode="crowd" :w="560" :h="660" :from="1" :steps="2" /></At>
</Stage>

<!--
First click: the 10 sick people test positive (the test catches 99 percent of them, which rounds to all 10). Second click: 1 percent of the 9,990 healthy people also test positive, a false alarm: 100 people. The amber ring always means "the test said positive".
-->

---
layout: default
motion: wipe
tour: 8
tourScript:
  - { at: 2.0, key: "ArrowRight" }
---

# Of 110 positives, only 10 are sick

The healthy are so many that their false alarms outnumber the real cases ten to one.

<Stage :h="340">
<At :w="1140" :h="340"><Chance mode="rows" :w="1100" :h="330" :from="1" :steps="1" /></At>
</Stage>

<!--
10 sick people who test positive, 100 healthy people who test positive too: 110 positives. 10 of 110 is about 9 percent. That is the whole answer; the rest of the talk plays with it.
-->

---
layout: default
motion: fade-up
tour: 14
tourScript:
  - { at: 2.0, drag: ".nd-chance-read input", from: 0.18, to: 0.46, over: 2.4, caption: "1 in 100" }
  - { at: 6.0, drag: ".nd-chance-read input", from: 0.46, to: 0.73, over: 2.4, caption: "1 in 10" }
---

# Change how rare it is

<Stage :h="500">
<At :w="1140" :h="470"><Chance mode="play" controls="prevalence" :w="1140" :h="470" /></At>
</Stage>

<!--
Drag the slider: the condition gets more common and the false alarms stop dominating. At 1 in 100 a positive test is right about half the time. The sentence updates with the slider.
-->

---
layout: default
motion: fade-up
tour: 14
tourScript:
  - { at: 2.0, drag: ".nd-chance-read label:nth-of-type(1) input", from: 0.98, to: 0.6, over: 2.2, caption: "catches fewer sick people" }
  - { at: 5.6, drag: ".nd-chance-read label:nth-of-type(2) input", from: 0.9, to: 1, over: 2.2, caption: "clears more healthy people" }
---

# Change how good the test is

<Stage :h="500">
<At :w="1140" :h="470"><Chance mode="play" controls="accuracy" :w="1140" :h="470" /></At>
</Stage>

<!--
Here the condition stays at 1 in 1,000. Catching fewer sick people hurts a little. Clearing more healthy people helps a lot, because the healthy are the crowd that produces the false alarms. Even a test that clears 99.9 of 100 healthy people is right only about half the time.
-->

---
layout: stage
motion: fade-up
background: gradient
tour: 10
---

<Stage :w="1200" :h="604">
<At :x="40" :y="14" :w="1120"><Kinetic text="A rule of thumb" mode="words" from="up" :stagger="140" size="m" accent="thumb" /></At>
<At :x="40" :y="100" :w="1120" enter="up" :delay="400">

When something is rare, even a good test gives mostly false alarms.

</At>
<At :x="40" :y="190" :w="540" :h="410" enter="up" :delay="700"><Chance mode="pile" :w="540" :h="400" :prev="0.001" /></At>
<At :x="620" :y="190" :w="540" :h="410" enter="up" :delay="900"><Chance mode="pile" :w="540" :h="400" :prev="0.1" /></At>
</Stage>

::caption::

People tend to ignore how common something is: Kahneman and Tversky, 1973.

<!--
Same test, same 99 percent accuracy, two worlds. Left: the condition is rare (1 in 1,000), and the positives are mostly grey dots, false alarms. Right: it is common (1 in 10), and the positives are mostly pink. Kahneman and Tversky (1973) described this habit as ignoring the base rate. refs: [kahneman1973]
-->

---
layout: split
motion: pop
tour: 11
---

#### After a positive test

# What to ask

- How common is this condition?
- Of 100 people with a positive test, how many are really sick?
- What comes next: a second test?

::right::

<Stage :w="640" :h="720">
<At :x="40" :y="150" :w="560" enter="left" :delay="300">

#### The same idea elsewhere

- An airport scanner: danger is rare, so many beeps will be harmless.
- A fraud alert on your card: fraud is rare, so many alerts will be you.
- A fire alarm: fires are rare, so many alarms will be false.

</At>
</Stage>

::caption::

Doctors reason better with counts of people: Hoffrage and Gigerenzer, 1998.

<!--
Asking for counts of people ("out of 100 people with a positive test") rather than percentages is the advice of Gigerenzer and colleagues (2007). In the 1998 study of 48 physicians, about 10 percent of the answers were correct when the information was given as probabilities, and about 46 percent when it was given as natural frequencies (counts of people). The three examples are the same arithmetic, not measured rates. refs: [hoffrage1998] [gigerenzer2007]
-->

---
layout: stage
motion: fade-up
background: grid
tour: 14
tourScript:
  - { at: 2.4, hover: ".nd-t3", caption: "sick, test positive" }
  - { at: 4.8, hover: ".nd-t4", caption: "healthy, test positive" }
  - { at: 7.2, hover: ".nd-t1", caption: "the answer" }
  - { at: 9.6, hover: ".nd-eq" }
---

<Stage :w="1200" :h="604">
<At :x="40" :y="20" :w="640"><Kinetic text="Bayes' rule, in colour" mode="words" from="up" :stagger="120" size="m" accent="colour" /></At>
<At :x="40" :y="190" :w="600" enter="up" :delay="500">
<Equation label="Bayes' rule in words. The chance that a positive test is real equals the people who are sick and test positive, divided by the people who are sick and test positive plus the healthy people who test positive. With the numbers of the story, 10 divided by 10 plus 100, about 9 percent." align="left" :size="25" :decimals="{ riskppv: 0 }" :params="{ risktp: 10, riskfp: 100, riskppv: 9 }">

$$
\term{1}{\text{chance it is real}} = \frac{\term{3}{\text{sick, positive}}}{\term{3}{\text{sick, positive}} + \term{4}{\text{healthy, positive}}}
$$

$$
= \frac{\term{3}{\val{risktp}{10}}}{\term{3}{\val{risktp}{10}} + \term{4}{\val{riskfp}{100}}} = \val{riskppv}{9}\,\%
$$

</Equation>
</At>
<At :x="40" :y="470" :w="580" enter="up" :delay="800">

Bayes' rule counts the real cases among all the positives.

</At>
<At :x="680" :y="20" :w="500" :h="580" enter="left" :delay="300"><Chance mode="pile" :w="500" :h="560" :prev="0.001" /></At>
</Stage>

::caption::

For the curious. Rule: Bayes and Price, 1763.

<!--
This is Bayes' rule, written in words and then in the counts of the story. Point at a coloured term: the matching dots light up in the picture. Bayes' own essay was published after his death, communicated by Richard Price (1763). Writing it with counts of people, 10 / (10 + 100), is the natural-frequency form of Gigerenzer and Hoffrage (1995); with probabilities it is P(sick | positive) = P(positive | sick) P(sick) / (P(positive | sick) P(sick) + P(positive | healthy) P(healthy)). refs: [bayes1763] [gigerenzer1995]
-->

---
layout: closing
motion: spotlight
background: aurora
tour: 8
---

# Ask how rare it is

#### A positive test is a clue, not a verdict.

An illustration, not medical advice.

<NextSteps :skip="['science']" />

<!--
The one sentence to remember: when something is rare, even a good test gives mostly false alarms. Sam, the condition and the people are made up.
-->

---
layout: default
motion: fade-up
tour: 10
---

# Standing on the shoulders of... 1 of 2

- Bayes and Price (1763). An essay towards solving a problem in the doctrine of chances. *Phil. Trans. R. Soc.* 53, 370-418. doi:10.1098/rstl.1763.0053
- Kahneman and Tversky (1973). On the psychology of prediction. *Psychological Review* 80, 237-251. doi:10.1037/h0034747
- Casscells, Schoenberger and Graboys (1978). Interpretation by physicians of clinical laboratory results. *NEJM* 299, 999-1001. doi:10.1056/NEJM197811022991808
- Eddy (1982). Probabilistic reasoning in clinical medicine. In *Judgment under Uncertainty*, 249-267. doi:10.1017/CBO9780511809477.019

The idea, and early studies of how doctors reason about it.

<!--
refs: [bayes1763] [kahneman1973] [casscells1978] [eddy1982]
-->

---
layout: default
motion: fade-up
tour: 10
---

# Standing on the shoulders of... 2 of 2

- Gigerenzer and Hoffrage (1995). How to improve Bayesian reasoning without instruction: frequency formats. *Psychological Review* 102, 684-704. doi:10.1037/0033-295X.102.4.684
- Hoffrage and Gigerenzer (1998). Using natural frequencies to improve diagnostic inferences. *Academic Medicine* 73, 538-540. doi:10.1097/00001888-199805000-00024
- Gigerenzer et al. (2007). Helping doctors and patients make sense of health statistics. *Psychological Science in the Public Interest* 8, 53-96. doi:10.1111/j.1539-6053.2008.00033.x
- Manrai et al. (2014). Medicine's uncomfortable relationship with math. *JAMA Internal Medicine* 174, 991. doi:10.1001/jamainternmed.2014.1059

An illustration, not medical advice. Simulated people. Made with Nimbledeck (Slidev), equations by KaTeX. Full list: REFERENCES.md.

<!--
All eight references were checked against Crossref, PubMed or the publisher on 2026-10-11 (REFERENCES.md says how). Tools: Nimbledeck on Slidev and Vue, KaTeX for the equations, matplotlib for the live-code picture; see THIRD_PARTY.md. No music or photographs are used. refs: [gigerenzer1995] [hoffrage1998] [gigerenzer2007] [manrai2014]
-->
