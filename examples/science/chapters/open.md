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
