---
theme: nimbledeck
ndVariant: studio
title: "Nimbledeck: Markdown slides that run things"
titleTemplate: "%s"
layout: hero
transition: fade
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora /></At>
</Stage>

::default::

<Kinetic text="Slides that move." mode="words" from="up" :stagger="140" size="xl" accent="move." />

#### Nimbledeck. Markdown in, motion out.

<!--
Everything you are about to see is one Markdown file. Nothing was exported from a design tool.
-->

---
layout: statement
---

#### The whole idea

# A deck is a Markdown file.

<!--
No slide editor, no binary format. A file you can diff, review and hand to an agent.
-->

---
layout: split
---

::default::

<Typewriter :speed="34" :delay="500" lang="md">

````md
---
layout: statement
---

#### The plan

# Ship it on Friday.
````

</Typewriter>

::right::

<Stage :w="640" :h="720">
<At :w="640" :h="720"><Aurora :intensity="0.8" /></At>
<At :x="70" :y="250" :w="520" :z="1">
<Kinetic v-click hold text="The plan" mode="letters" from="up" :stagger="40" size="s" />
<Kinetic v-click hold text="Ship it on Friday." mode="words" from="blur" :stagger="120" size="l" accent="Friday." />
</At>
</Stage>

<!--
Seven lines on the left. Click: the slide on the right is what they produce.
-->

---
layout: stage
tour: 14
---

<Stage full>
<At :x="80" :y="50" :w="1100">
<Kinetic text="Layouts, not CSS." mode="words" from="mask" :stagger="160" size="l" accent="CSS." />
</At>
<At :x="80" :y="200" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### hero

`layout: hero`

Big title over a live background

</At>
<At :x="460" :y="200" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### statement

`layout: statement`

One sentence, huge

</At>
<At :x="840" :y="200" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### split

`layout: split`

Words left, live element right

</At>
<At :x="80" :y="390" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### stage

`layout: stage`

A full pane for one element

</At>
<At :x="460" :y="390" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### numbers

`layout: numbers`

Four big stats

</At>
<At :x="840" :y="390" :w="360" :h="170" :z="1" bg="var(--nd-surface)">

### closing

`layout: closing`

The last slide

</At>
<At :x="0" :y="600" :w="1280" :h="60">
<Marquee :speed="40">

## cover · agenda · divider · default · two-cols · photo-right · full ·

</Marquee>
</At>
</Stage>

<!--
One word in the frontmatter picks the whole look. The checker rejects inline HTML and CSS in slides, so the look stays in the theme.
-->

---
layout: statement
---

#### Motion

<Kinetic text="Type it. See it. Ship it." mode="words" from="blur" :stagger="260" size="l" accent="See" />

<!--
Text that moves is a tag, not a keyframe editor. Words, letters or lines; from any side.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Orbit /></At>
<At :x="90" :y="40" :w="1000" :z="1">
<Headline size="l">A canvas, built in.</Headline>
</At>
</Stage>

<!--
This runs in the browser at the screen's own resolution. No video, no plugin.
-->

---
layout: split
---

::default::

<Kinetic text="3D, one tag." mode="words" from="up" :stagger="160" size="l" accent="one" />

Drag the scene. It is WebGL, and it is a file in your deck.

::right::

<Stage :w="640" :h="720">
<At :w="640" :h="720"><Scene3D controls /></At>
</Stage>

<!--
Drag it. A three.js scene, loaded only on the slide that uses it.
-->

---
layout: numbers
tour: 9
---

# Measured, not claimed

::a::

<Stat value="13" label="layouts, one theme" />

::b::

<Stat value="0" label="lines of CSS per slide" />

::c::

<Stat value="22" label="ms to run live code that prints" />

::d::

<Stat value="60" label="frames per second, GPU on" />

<!--
Thirteen layout files in the theme. The checker refuses inline CSS. 22 ms and 60 fps come from docs/PERFORMANCE.md, measured on one Apple Silicon Mac.
-->

---
layout: default
---

# Live code, before and after

<Stage>
<At :w="1140" :h="460">
<Chart type="bar" :labels="['One plot run', 'A run that prints', 'Keystroke to output']" :data="[[626, 501, 1230], [132, 22, 431]]" :names="['Before', 'After']" legend values />
</At>
</Stage>

<!--
Milliseconds, before and after the runner work in docs/PERFORMANCE.md. One machine, so read the ratios, not the promises.
-->

---
layout: default
tour: 7
---

# Which file holds the deck?

<Stage>
<At :x="0" :y="0" :w="1140" :h="460">
<Quiz answer="C">
<Choice letter="A">A database</Choice>
<Choice letter="B">A .pptx file</Choice>
<Choice letter="C">One .md file</Choice>
<Choice letter="D">A cloud editor</Choice>
<Explain letter="C">

Plain Markdown. It diffs in git and an agent can write it.

</Explain>
</Quiz>
</At>
</Stage>

<!--
Click an answer, or press 1 to 4. Interaction is for the presenter and resets when you leave the slide.
-->

---
layout: stage
---

<Stage :w="1074" :h="604">
<At :w="1074" :h="604"><Compare before="/before.jpg" after="/after.jpg" :start="35" /></At>
</Stage>

::caption::

Same words. One line of layout. Drag the divider.

<!--
Left: what a default template gives you. Right: the same text in the studio theme.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Clip src="/loop.mp4" fit="cover" /></At>
<At :x="90" :y="470" :w="1000" :z="1">
<Headline size="l" tone="dark">Video is an element too.</Headline>
</At>
</Stage>

<!--
A four second loop made by a short numpy script in the repo, 300 KB.
-->

---
layout: default
---

# Edit the code. The plot reruns.

<Stage :h="500">
<At :w="1140" :h="500">
<LiveCode>

```python
import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 2 * np.pi, 800)
for k in (3, 4, 5):
    plt.plot(np.sin(k * t), np.cos((k + 1) * t))
plt.axis("equal")
```

</LiveCode>
</At>
</Stage>

<!--
Needs nimbledeck run. Change a number, the figure follows. Python runs on this machine. Esc leaves the editor.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Aurora :intensity="0.6" /></At>
<At :x="130" :y="40" :w="1020" :h="560" :z="1"><PyStream name="swarm" controls hud color="#ffffff" /></At>
<At :x="90" :y="625" :w="1100" :z="2">
<Headline size="m">Python pushes the particles. The browser draws them.</Headline>
</At>
</Stage>

<!--
Needs nimbledeck run. A numpy process computes every frame and streams it over a WebSocket. Raise the particle count to load it.
-->

---
layout: split
---

::default::

<Kinetic text="An agent writes it." mode="words" from="left" :stagger="150" size="l" accent="agent" />

The checker gives it a pass or a fail.

::right::

<Stage :w="640" :h="720">
<At :x="30" :y="210" :w="580" :h="300">
<Terminal title="nimbledeck" :lines="['$ nimbledeck check showcase.md', '18 slides, 0 errors, 0 warnings', '$ nimbledeck verify showcase.md', '18 slides verified, 0 placement problems']" />
</At>
</Stage>

<!--
check lints the Markdown. verify opens the running deck in Chrome and reports clipped or blurry content.
-->

---
layout: statement
---

#### Offline

# Works with no connection.

Fonts, images, video, Python and live code all run from your machine.

<!--
Nimbledeck makes no network request of its own. Only a website embedded in a slide needs the internet.
-->

---
layout: stage
---

<Stage full>
<At :x="90" :y="90" :w="1100">
<Kinetic text="Three commands." mode="words" from="up" :stagger="180" size="l" accent="Three" />
</At>
<At :x="90" :y="290" :w="1100" :h="260">
<Typewriter :speed="30" :delay="900" lang="sh">

```sh
$ node packages/cli/bin/nimbledeck.mjs new my-deck
$ cd my-deck && npm install
$ npm run dev
```

</Typewriter>
</At>
</Stage>

::caption::

After a git clone and one npm install of the repository.

<!--
That is docs/GETTING-STARTED.md in three lines.
-->

---
layout: closing
---

<Kinetic text="Write it. Run it." mode="letters" from="up" :stagger="45" size="xl" accent="Run" />

#### github.com/arnaudbletterer/nimbledeck

<!--
Markdown for the story, components for the motion. Thank you.
-->
