---
theme: nimbledeck
ndVariant: studio
title: Slides that move
layout: hero
class: nd-grid
transition: nd-zoom
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Shader :hue="0" /></At>
<At :y="70" :w="1280" :h="210" :z="1" enter="fade" :delay="900">
<Marquee :speed="34">

[MARKDOWN IN · MOTION OUT ·]{.nd-outline}

</Marquee>
</At>
</Stage>

::default::

<Kinetic text="Slides that move." mode="words" from="up" :stagger="140" size="xl" accent="move." :delay="300" />

<Kinetic text="Nimbledeck. Markdown in, motion out." mode="lines" from="blur" size="s" tone="muted" :delay="1400" />

<!--
Hook. Everything you are about to see is one Markdown file. Nothing was exported from a design tool. Let the headline land, then start.
-->

---
layout: statement
class: nd-grid
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.5" :cx="0.5" :cy="1.05" /></At>
</Stage>

::default::

#### The whole idea

<Kinetic text="A deck is a Markdown file." mode="words" from="mask" :stagger="130" size="xl" accent="Markdown" :delay="200" />

<!--
No slide editor, no binary format. A file you can diff, review and hand to an agent.
-->

---
layout: stage
---

<Stage full>
<At :w="1280" :h="720" :z="1">
<Livedeck :speed="26" :delay="900" :size="23">

````md
---
layout: hero
---
# Slides that **move.**
#### Markdown in, motion out.
---
layout: statement
---
#### The plan
# Ship it on **Friday.**
---
layout: closing
---
# Questions?
````

</Livedeck>
</At>
</Stage>

::caption::

Type the Markdown. The slides appear as you finish them.

<!--
Seventeen lines of Markdown, three slides. The preview on the right is a sketch of the theme layouts, drawn from the same colour tokens.
-->

---
layout: stage
---

<Stage full>
<At :x="80" :y="84" :w="520">
<Kinetic text="Layouts, not CSS." mode="words" from="mask" :stagger="160" size="l" accent="CSS." />
</At>
<At :x="80" :y="350" :w="470">
<Kinetic text="One word in the frontmatter picks the layout." mode="words" from="up" :stagger="45" size="s" tone="muted" :delay="900" />
</At>
<At :x="560" :y="0" :w="720" :h="620" :opacity="0.45"><Spotlight /></At>
<At :x="640" :y="64" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="150">

[hero]{.nd-name} Big title over a live background

</At>
<At :x="640" :y="150" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="250">

[statement]{.nd-name} One sentence, huge

</At>
<At :x="640" :y="236" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="350">

[split]{.nd-name} Words left, a live element right

</At>
<At :x="640" :y="322" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="450">

[stage]{.nd-name} A full pane for one element

</At>
<At :x="640" :y="408" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="550">

[numbers]{.nd-name} Four big figures

</At>
<At :x="640" :y="494" :w="560" :h="72" :z="1" bg="var(--nd-surface)" frame middle pad="0 30px" enter="right" :delay="650">

[closing]{.nd-name} The last slide, with a background

</At>
<At :x="0" :y="612" :w="1280" :h="52" enter="fade" :delay="900">
<Marquee :speed="34">

[cover · agenda · divider · default · two-cols · photo-right · full ·]{.nd-dim}

</Marquee>
</At>
</Stage>

::caption::

`layout: hero` is the whole instruction. The look lives in the theme.

<!--
One word in the frontmatter picks the layout. The checker rejects inline HTML and CSS in slides, so the look stays in the theme.
-->

---
layout: default
class: nd-wide
---

# Same words. Five looks.

<Stage :h="64">
<At :w="1140" :h="64"><Looks /></At>
</Stage>

| Look | Made for |
|---|---|
| Plain | Handouts and documents |
| Paper | Essays and long reads |
| Night | Dark rooms and screens |
| Studio light | Bright rooms |
| Studio | Keynotes and demos |

> `ndVariant: studio`

<!--
Press 1 to 5, or click a chip. The slide steps through the looks by itself and ends on the deck's own. Same Markdown, nothing edited.
-->

---
layout: statement
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.55" :hue="70" :cx="0.25" :cy="0.5" /></At>
<At :y="440" :w="1280" :h="240" :z="1" enter="fade" :delay="500">
<Marquee :speed="30">

[WORDS · LETTERS · LINES · MASKS · BLUR ·]{.nd-outline}

</Marquee>
</At>
</Stage>

::default::

#### Motion

<Kinetic text="Type it. See it. Ship it." mode="words" from="blur" :stagger="260" size="l" accent="See" />

<!--
Text that moves is a tag, not a keyframe editor. Words, letters or lines; from any side.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Orbit full /></At>
<At :x="90" :y="48" :w="1000" :z="1">
<Kinetic text="A canvas, built in." mode="words" from="mask" :stagger="130" size="l" accent="built" />
</At>
<At :x="90" :y="170" :w="760" :z="1">
<Kinetic text="Drawn live at your screen's own resolution." mode="words" from="up" :stagger="30" size="s" tone="muted" :delay="900" />
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
<At :w="640" :h="720"><Aurora :intensity="0.55" :hue="-40" :cx="0.5" :cy="0.55" /></At>
<At :w="640" :h="720" :z="1"><Scene3D controls /></At>
</Stage>

<!--
Drag it. A three.js scene, loaded only on the slide that uses it.
-->

---
layout: numbers
---

# Measured on one laptop

::a::

<Stat value="13" label="layouts in one theme" :delay="200" />

::b::

<Stat value="0.13" :decimals="2" suffix=" s" label="to check a 29 slide deck" :delay="340" />

::c::

<Stat value="22" suffix=" ms" label="to run Python that prints" :delay="480" />

::d::

<Stat value="60" suffix=" fps" label="drawn on a laptop GPU" :delay="620" />

<!--
Thirteen layout files in the theme. 0.13 s, 22 ms and 60 fps come from docs/PERFORMANCE.md, measured on one Apple Silicon Mac: read them as what one machine did, not as a promise.
-->

---
layout: default
---

# What a live code run costs, in ms

<Stage>
<At :w="1140" :h="460">
<Chart type="bar" horizontal :labels="['Run that prints', 'Run that draws a plot', 'Keystroke to updated result']" :data="[22, 132, 431]" values />
</At>
</Stage>

<!--
Measured on one Mac (docs/PERFORMANCE.md): 22 ms for a run that prints, 132 ms for a plot, 431 ms from a keystroke in the editor to the new result, which includes a 300 ms wait so a word is not run half typed.
-->

---
layout: default
---

# Which file holds the deck?

<Stage :h="500">
<At :w="1140" :h="500">
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

<Stage :w="1200" :h="604">
<At :w="1200" :h="604"><Compare before="/source.jpg" after="/slide.jpg" :start="56" before-label="Markdown" after-label="Slide" sweep label="The Markdown of a slide and the slide it makes, drag to compare" /></At>
</Stage>

::caption::

Same words, two forms. Drag the divider.

<!--
Left: the Markdown. Right: the slide it makes. The divider glides once by itself; drag it or use the arrow keys.
-->

---
layout: full
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Clip src="/loop.mp4" webm="/loop.webm" fit="cover" /></At>
<At :x="90" :y="450" :w="1000" :z="1">
<Kinetic text="Video is an element too." mode="words" from="mask" :stagger="120" size="l" tone="light" accent="element" />
</At>
<At :x="90" :y="600" :w="900" :z="1">
<Kinetic text="A four second loop, 300 KB, made by a short numpy script." mode="words" from="up" :stagger="25" size="s" tone="light" :delay="800" />
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
layout: stage
---

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.5" :hue="25" :cx="0.85" :cy="0.15" /></At>
<At :x="140" :y="64" :w="1000" :z="1">
<Kinetic text="An agent writes it." mode="words" from="left" :stagger="150" size="l" accent="agent" />
</At>
<At :x="140" :y="246" :w="1000" :h="296" :z="1">
<Terminal title="nimbledeck" :size="30" :lines="['$ nimbledeck check showcase.md', '19 slides, 0 errors, 0 warnings', '$ nimbledeck verify showcase.md', '19 slides verified, 0 placement problems']" />
</At>
</Stage>

::caption::

The checker gives it a pass or a fail.

<!--
check lints the Markdown. verify opens the running deck in Chrome and reports clipped or blurry content.
-->

---
layout: statement
class: nd-grid
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.45" :hue="-35" :cx="0.5" :cy="0.45" /></At>
</Stage>

::default::

#### Offline

<Kinetic text="Works with no connection." mode="words" from="mask" :stagger="130" size="l" accent="no" />

<Kinetic text="Fonts, images, video, Python and live code all run from your machine." mode="words" from="up" :stagger="25" size="s" tone="muted" :delay="900" />

<!--
Nimbledeck makes no network request of its own. Only a website embedded in a slide needs the internet.
-->

---
layout: stage
---

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.4" :hue="-20" :cx="0.1" :cy="1" /></At>
<At :x="90" :y="80" :w="1100" :z="1">
<Kinetic text="Three commands." mode="words" from="up" :stagger="180" size="l" accent="Three" />
</At>
<At :x="90" :y="250" :w="1100" :h="260" :z="1">
<Typewriter :speed="30" :delay="900" lang="sh" :size="34">

```sh
$ node packages/cli/bin/nimbledeck.mjs new my-deck
$ cd my-deck && npm install
$ npm run dev
http://localhost:3030/
```

</Typewriter>
</At>
<At :x="90" :y="540" :w="1100" :z="1">
<Kinetic v-click hold text="Edit slides.md. The browser follows." mode="words" from="blur" :stagger="70" size="m" accent="follows." />
</At>
</Stage>

::caption::

After a git clone and one npm install of the repository.

<!--
That is docs/GETTING-STARTED.md in three lines. Click for the last beat: edit the Markdown and the browser reloads.
-->

---
layout: closing
class: nd-grid
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Shader :hue="20" :intensity="1.15" :speed="1.2" /></At>
</Stage>

::default::

<Kinetic text="Write it. Run it." mode="letters" from="up" :stagger="45" size="xl" accent="Run" />

<Typewriter :speed="42" :delay="1900" lang="md" :size="30">github.com/arnaudbletterer/nimbledeck</Typewriter>

<!--
Markdown for the story, components for the motion. Thank you.
-->
