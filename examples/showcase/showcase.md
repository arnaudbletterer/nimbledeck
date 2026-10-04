---
theme: nimbledeck
ndVariant: studio
title: Slides that move
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

<Stage>
<At v-click :x="0" :y="0" :w="570" :h="500">
<Aurora :intensity="0.8" />
</At>
<At v-click :x="60" :y="150" :w="480" :z="1">
<Kinetic text="The plan" mode="letters" from="up" :stagger="40" size="s" />
<Kinetic text="Ship it on Friday." mode="words" from="blur" :stagger="120" size="l" accent="Friday." />
</At>
</Stage>

<!--
Seven lines on the left. Click: the slide on the right is what they produce.
-->

---
layout: stage
---

<Stage full>
<At :x="90" :y="90" :w="1100">
<Kinetic text="Layouts, not CSS." mode="words" from="mask" :stagger="160" size="l" accent="CSS." />
</At>
<At :x="0" :y="330" :w="1280" :h="90">
<Marquee :speed="40">hero · statement · split · stage · numbers · cover · agenda · divider · default · two-cols · photo-right · closing · full ·</Marquee>
</At>
<At :x="0" :y="450" :w="1280" :h="90">
<Marquee :speed="28">layout: statement · layout: split · layout: numbers · layout: stage · layout: hero · layout: closing ·</Marquee>
</At>
</Stage>

<!--
One word in the frontmatter picks the whole look. The checker rejects inline HTML and CSS in slides, so the look stays in the theme.
-->

---
layout: statement
---

#### Motion

<Kinetic text="Type it. See it. Ship it." mode="words" from="blur" :stagger="220" size="xl" accent="See" />

<!--
Text that moves is a tag, not a keyframe editor. Words, letters or lines; from any side.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Orbit /></At>
<At :x="90" :y="470" :w="1000" :z="1">
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

<Scene3D controls />

<!--
Drag it. A three.js scene, loaded only on the slide that uses it.
-->

---
layout: numbers
---

# Measured, not claimed

::a::

<Stat value="13" label="layouts, one theme" />

::b::

<Stat value="0" label="lines of CSS per slide" />

::c::

<Stat value="132" suffix=" ms" label="one live plot run" />

::d::

<Stat value="60" suffix=" fps" label="canvas and 3D, GPU on" />

<!--
Thirteen layout files in the theme. The checker refuses inline CSS. 132 ms and 60 fps come from docs/PERFORMANCE.md, measured on one Apple Silicon Mac.
-->

---
layout: default
---

# Live code got 4.7x faster

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

<Stage full>
<At :w="1280" :h="720"><Compare before="/before.jpg" after="/after.jpg" /></At>
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

<Stage>
<At :w="1140" :h="460">
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
<At :x="90" :y="600" :w="1000" :z="2">
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

<Terminal title="nimbledeck" :lines="['$ nimbledeck check showcase.md', 'CHECK_RESULT', '$ nimbledeck verify showcase.md', 'VERIFY_RESULT']" />

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
node packages/cli/bin/nimbledeck.mjs new my-deck
cd my-deck && npm install
npm run dev
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
