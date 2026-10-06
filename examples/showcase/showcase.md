---
theme: nimbledeck
ndVariant: studio
ndMotion: fade-up
title: "Nimbledeck: Markdown slides that run things"
titleTemplate: "%s"
layout: hero
class: nd-grid
motion: spotlight
transition: nd-zoom
ndSound: uplift
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
background: aurora
motion: curtain
tour: 5
sounds:
  - { at: 1.2, src: soft-boom, volume: 0.5 }
---

#### The whole idea

<Kinetic text="A deck is a Markdown file." mode="words" from="mask" :stagger="130" size="xl" accent="Markdown" :delay="200" />

<!--
No slide editor, no binary format. A file you can diff, review and hand to an agent.
-->

---
layout: stage
tour: 9
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
motion: cascade
tour: 7
tourScript:
  - { at: 1.0, click: ".nd-look:nth-child(1)", caption: "Click a look" }
  - { at: 1.9, click: ".nd-look:nth-child(2)" }
  - { at: 2.8, click: ".nd-look:nth-child(3)" }
  - { at: 3.7, click: ".nd-look:nth-child(4)" }
  - { at: 4.6, click: ".nd-look:nth-child(5)" }
---

# Same words. Five looks.

<Stage :h="64">
<At :w="1140" :h="64"><Looks :looks="['plain', 'paper', 'night', 'studio-light', 'studio']" /></At>
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
background: waves
motion: rise
tour: 5
---

::bg::

<Stage full>
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
motion: slide-left
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
layout: full
background: mesh
motion: none
tour: 17
tourScript:
  - { at: 2.6, hover: ".nd-lw-card:nth-child(4)", caption: "Hover: the slide follows" }
  - { at: 4.4, hover: ".nd-lw-card:nth-child(11)" }
  - { at: 6.2, hover: ".nd-lw-card:nth-child(16)" }
  - { at: 8.0, click: ".nd-lw-card:nth-child(8)", caption: "Click to keep a look" }
  - { at: 10.4, click: ".nd-lw-card:nth-child(19)" }
  - { at: 12.4, click: ".nd-lw-card:nth-child(1)" }
  - { at: 14.4, click: ".nd-lw-card:nth-child(4)", caption: "Back to the deck's look" }
---

<Stage full>
<At :x="48" :y="26" :w="720" :h="80" :z="1">
<Kinetic text="Twenty looks. One file." mode="words" from="mask" :stagger="110" size="m" accent="Twenty" />
</At>
<At :x="800" :y="26" :w="440" :h="86" :z="1"><WallDemo kind="look" /></At>
<At :x="26" :y="118" :w="1228" :h="590">
<At :x="14" :y="14" :w="1200" :h="562"><LookWall /></At>
</At>
</Stage>

<!--
Every look of the theme, drawn at once: each card is a small slide that takes its colours from its own look. A ring tours them by itself. Hover a card and the whole slide takes that look, click one to keep it. Nothing is edited: the Markdown is the same.
-->

---
layout: full
motion: none
tour: 16
tourScript:
  - { at: 2.8, click: ".nd-mw-card:nth-child(13)", caption: "Click a card to apply it" }
  - { at: 4.6, click: ".nd-mw-card:nth-child(11)" }
  - { at: 6.4, click: ".nd-mw-card:nth-child(19)" }
  - { at: 8.2, click: ".nd-mw-card:nth-child(15)" }
  - { at: 10.0, click: ".nd-mw-card:nth-child(21)" }
  - { at: 11.8, click: ".nd-mw-bg:nth-child(4)", caption: "Backdrops too" }
  - { at: 13.6, click: ".nd-mw-card:nth-child(17)" }
---

<WallDemo :x="64" :y="20" />

<Stage full>
<At :w="1280" :h="720" :z="0"><WallDemo kind="bg" /></At>
<At :x="40" :y="232" :w="1200" :h="470" :z="1"><MotionWall :width="1200" /></At>
</Stage>

<!--
Twenty-one motions and ten backdrops, all running at once. Each card is a real slide with one line of frontmatter, so the real preset plays. They replay in a wave. Click a card to replay it.
-->

---
layout: default
motion: flip
tour: 7
tourScript:
  - { at: 1.2, hover: B, caption: "Which file holds the deck?" }
  - { at: 2.6, click: C, caption: "One .md file" }
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
motion: blur-in
tour: 8
tourScript:
  - { at: 2.4, drag: ".nd-compare", from: 0.56, to: 0.12, over: 1.2, caption: "Drag to compare" }
  - { at: 3.9, drag: ".nd-compare", from: 0.12, to: 0.88, over: 1.5 }
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
background: mesh
motion: none
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
<At :x="140" :y="64" :w="1000" :z="1">
<Kinetic text="It has a voice." mode="words" from="mask" :stagger="170" size="l" accent="voice." />
</At>
<At :x="140" :y="200" :w="1000" :h="230" :z="1" enter="fade" :delay="500"><Equalizer :bars="32" /></At>
<At :x="140" :y="460" :w="1000" :z="1" enter="fade" :delay="900">
<Kinetic text="Thirteen sounds, made in the browser. No files." mode="words" from="up" :stagger="30" size="s" tone="muted" :delay="900" />
</At>
</Stage>

::caption::

Sound is optional, and the speaker in the bar switches it off. Music plays throughout, effects follow what you click, and the tour adds a soundtrack.

<!--
Click, tick, pop, chime, success, whoosh: each is synthesised with the Web Audio API, zero bytes, nothing fetched. The music under them is a generated bed called uplift, set by one line of headmatter; a deck can pick another (pad) or point it at its own file. Sound is off until the viewer asks, and the equalizer is drawn from the real output.
-->

---
layout: default
motion: typewriter
tour: 9
tourScript:
  - { at: 2.0, type: "\nplt.title('typed by the tour')", into: ".cm-content", speed: 60, caption: "Edit the code" }
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
background: aurora
motion: none
tour: 8
tourScript:
  - { at: 2.0, drag: ".nd-ctl label:nth-child(1) input", from: 0.15, to: 0.7, over: 1.6, caption: "More particles" }
---

<Stage full>
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
background: spotlight
motion: none
tour: 7
---

<Stage full>
<At :x="140" :y="64" :w="1000" :z="1">
<Kinetic text="An agent writes it." mode="words" from="left" :stagger="150" size="l" accent="agent" />
</At>
<At :x="140" :y="246" :w="1000" :h="296" :z="1">
<Terminal title="nimbledeck" :size="30" :lines="['$ nimbledeck check showcase.md', '20 slides, 0 errors, 0 warnings', '$ nimbledeck verify showcase.md', '20 slides verified, 0 placement problems']" />
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
background: stars
motion: drop
tour: 5
---

#### Offline

<Kinetic text="Works with no connection." mode="words" from="mask" :stagger="130" size="l" accent="no" />

<Kinetic text="Fonts, images, video, Python and live code all run from your machine." mode="words" from="up" :stagger="25" size="s" tone="muted" :delay="900" />

<!--
Nimbledeck makes no network request of its own. Only a website embedded in a slide needs the internet.
-->

---
layout: stage
background: grid
motion: none
tour: 9
---

<Stage full>
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
motion: focus
tour: 6
sounds:
  - { at: 0.0, src: riser, volume: 0.8 }
  - { at: 1.7, src: finale, volume: 0.8 }
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
