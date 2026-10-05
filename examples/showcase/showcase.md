---
theme: nimbledeck
ndVariant: studio
title: "Nimbledeck: Markdown slides that run things"
titleTemplate: "%s"
layout: hero
class: nd-grid
transition: nd-zoom
ndSound: pad
ndSlideSound: whoosh
tour: 5
sounds:
  - { at: 0.3, src: swell, volume: 0.6 }
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Shader :hue="0" /></At>
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
tour: 5
sounds:
  - { at: 1.2, src: soft-boom, volume: 0.5 }
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
tour: 9
sounds:
  - { at: 0.9, src: typing, volume: 0.7 }
  - { at: 2.2, src: typing, volume: 0.7 }
  - { at: 3.5, src: typing, volume: 0.7 }
  - { at: 4.8, src: typing, volume: 0.6 }
---

<Stage full>
<At :w="1280" :h="720" :z="1">
<Livedeck :speed="20" :delay="900" :size="23">

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
Fourteen lines of Markdown, three slides. The preview on the right is a sketch of the theme layouts, drawn from the same colour tokens.
-->

---
layout: stage
tour: 6
sounds:
  - { at: 0.4, src: tick, volume: 0.4 }
  - { at: 0.5, src: tick, volume: 0.4 }
  - { at: 0.6, src: tick, volume: 0.4 }
  - { at: 0.7, src: tick, volume: 0.4 }
  - { at: 0.8, src: tick, volume: 0.4 }
  - { at: 0.9, src: tick, volume: 0.4 }
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

[cover · agenda · divider · default · two-cols · photo-right · full ·]{.nd-quiet}

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
tour: 7
tourScript:
  - { at: 1.0, click: ".nd-look:nth-child(1)", caption: "Click a look" }
  - { at: 1.9, click: ".nd-look:nth-child(2)" }
  - { at: 2.8, click: ".nd-look:nth-child(3)" }
  - { at: 3.7, click: ".nd-look:nth-child(4)" }
  - { at: 4.6, click: ".nd-look:nth-child(5)" }
sounds:
  - { at: 1.0, src: click, volume: 0.6 }
  - { at: 1.9, src: click, volume: 0.6 }
  - { at: 2.8, src: click, volume: 0.6 }
  - { at: 3.7, src: click, volume: 0.6 }
  - { at: 4.6, src: click, volume: 0.6 }
---

# Same words. Five looks.

<Stage :h="64">
<At :w="1140" :h="64"><Looks /></At>
</Stage>

| Look | What it looks like |
|---|---|
| Plain | White page, blue accent |
| Paper | Serif type on a warm page |
| Night | Slate page, sky blue accent |
| Studio light | Warm white page, violet accent |
| Studio | Near black page, cyan to violet accent |

> `ndVariant: studio`

<!--
Press 1 to 5, or click a chip. The slide steps through the looks by itself and ends on the deck's own. Same Markdown, nothing edited.
-->

---
layout: statement
tour: 5
---

::bg::

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.55" :hue="70" :cx="0.25" :cy="0.5" /></At>
<At :y="430" :w="1280" :h="270" :z="1" enter="fade" :delay="500">
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
tour: 5
sound: swell
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
tour: 7
tourScript:
  - { at: 1.2, drag: ".nd-gl canvas", from: 0.3, to: 0.7, over: 2, caption: "Drag the scene" }
  - { at: 3.6, drag: ".nd-gl canvas", from: 0.7, to: 0.35, over: 1.6 }
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
tour: 6
sounds:
  - { at: 1.7, src: pop, volume: 0.5 }
  - { at: 1.85, src: pop, volume: 0.5 }
  - { at: 2.0, src: pop, volume: 0.5 }
  - { at: 2.15, src: pop, volume: 0.5 }
---

# Measured on one Mac

::a::

<Stat value="13" label="layouts in one theme" :delay="200" />

::b::

<Stat value="0.13" :decimals="2" suffix=" s" label="to check a 29 slide deck" :delay="340" />

::c::

<Stat value="22" suffix=" ms" label="to run Python that prints" :delay="480" />

::d::

<Stat value="60" suffix=" fps" label="drawn with a real GPU" :delay="620" />

<!--
Thirteen layout files in the theme. 0.13 s, 22 ms and 60 fps come from docs/PERFORMANCE.md, measured on one Apple Silicon Mac, the 60 fps with a real GPU: read them as what one machine did, not as a promise.
-->

---
layout: default
tour: 5
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
tour: 7
tourScript:
  - { at: 1.2, hover: B, caption: "Which file holds the deck?" }
  - { at: 2.6, click: C, caption: "One .md file" }
sounds:
  - { at: 2.75, src: success, volume: 0.8 }
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
tour: 8
tourScript:
  - { at: 2.4, drag: ".nd-compare", from: 0.56, to: 0.12, over: 1.2, caption: "Drag to compare" }
  - { at: 3.9, drag: ".nd-compare", from: 0.12, to: 0.88, over: 1.5 }
sounds:
  - { at: 2.4, src: whoosh, volume: 0.35 }
  - { at: 3.9, src: whoosh, volume: 0.35 }
---

<Stage :w="1200" :h="604">
<At :w="1200" :h="604"><Compare before="/source.jpg" after="/slide.jpg" :start="56" before-label="Markdown" after-label="Slide, sketched" sweep label="The Markdown of a slide and a sketch of the slide it makes, drag to compare" /></At>
</Stage>

::caption::

Same words, two forms. Drag the divider.

<!--
Left: the Markdown. Right: a sketch of the slide in the studio colours, drawn by a script, not a screenshot. The divider glides once by itself; drag it or use the arrow keys.
-->

---
layout: full
tour: 5
---

<Stage full>
<At :w="1280" :h="720" :z="0"><Clip src="/loop.mp4" webm="/loop.webm" fit="cover" :dim="0.2" /></At>
<At :y="340" :w="1280" :h="380" :z="1" bg="linear-gradient(0deg, color-mix(in srgb, var(--nd-bg) 92%, transparent) 15%, transparent)" />
<At :x="90" :y="450" :w="1000" :z="2">
<Kinetic text="Video is an element too." mode="words" from="mask" :stagger="120" size="l" tone="light" accent="element" />
</At>
<At :x="90" :y="600" :w="900" :z="2">
<Kinetic text="A four second loop, 300 KB, made by a short numpy script." mode="words" from="up" :stagger="25" size="s" tone="light" :delay="800" />
</At>
</Stage>

<!--
A four second loop made by a short numpy script in the repo, 300 KB.
-->

---
layout: stage
tour: 9
sounds:
  - { at: 1.0, src: click }
  - { at: 1.6, src: tick }
  - { at: 2.2, src: pop }
  - { at: 2.9, src: chime }
  - { at: 3.7, src: success }
  - { at: 4.8, src: whoosh }
---

<Stage full>
<At :w="1280" :h="720"><Aurora :intensity="0.45" :hue="-60" :cx="0.5" :cy="0.9" /></At>
<At :x="140" :y="64" :w="1000" :z="1">
<Kinetic text="It has a voice." mode="words" from="mask" :stagger="170" size="l" accent="voice." />
</At>
<At :x="140" :y="200" :w="1000" :h="230" :z="1" enter="fade" :delay="500"><Equalizer :bars="32" /></At>
<At :x="140" :y="460" :w="1000" :z="1" enter="fade" :delay="900">
<Kinetic text="Eleven sounds, made in the browser. No files." mode="words" from="up" :stagger="30" size="s" tone="muted" :delay="900" />
</At>
</Stage>

::caption::

Sound is optional. The speaker in the bar switches it off.

<!--
Click, tick, pop, chime, success, whoosh: each is synthesised with the Web Audio API, zero bytes, nothing fetched. Sound is off until the viewer asks, and the equalizer is drawn from the real output.
-->

---
layout: default
tour: 9
tourScript:
  - { at: 2.0, type: "\nplt.title('typed by the tour')", into: ".cm-content", speed: 60, caption: "Edit the code" }
sounds:
  - { at: 2.2, src: typing, volume: 0.7 }
---

# Edit the code. The plot reruns.

<Stage :h="500">
<At :w="1140" :h="500">
<LiveCode id="14">

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
tour: 8
tourScript:
  - { at: 2.0, drag: ".nd-ctl label:nth-child(1) input", from: 0.15, to: 0.7, over: 1.6, caption: "More particles" }
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
tour: 7
sounds:
  - { at: 1.3, src: typing, volume: 0.7 }
  - { at: 3.2, src: success, volume: 0.6 }
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
tour: 5
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
tour: 9
sounds:
  - { at: 1.1, src: typing, volume: 0.7 }
  - { at: 2.6, src: typing, volume: 0.7 }
  - { at: 4.1, src: typing, volume: 0.7 }
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
tour: 6
sounds:
  - { at: 0.0, src: riser, volume: 0.8 }
  - { at: 2.2, src: soft-boom, volume: 0.8 }
  - { at: 2.3, src: chime, volume: 0.6 }
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
