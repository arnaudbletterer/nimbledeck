# Writing a deck

## The loop

1. Read the source document. Decide one message per slide.
2. Write `<name>.md`: a cover slide first, a closing slide last.
3. `nimbledeck check <name>.md` and fix every ERROR. Warnings mean "split this slide".
4. `nimbledeck run <name>.md`, then open http://localhost:3030 (keys: arrows to move, `?` lists every shortcut, `/` searches slides, `o` overview; presenter view is the address `/presenter/1`).
5. Export: `slidev export <name>.md --with-clicks` (one page per build step).

## Choosing a look

One line of the header: `ndVariant: <id>`. `nimbledeck check` rejects an unknown id and lists the known ones. Twenty looks ship with the
theme (full catalogue in [THEMING.md](THEMING.md)); the short version:

- Everyday content: `plain`, `slate-pro`, `ocean`, `paper`, `editorial`.
- Keynote and stage talks: `studio`, `studio-light`, `neon`, `sunset`, `gold`, `swiss`.
- Technical audiences: `night`, `terminal`, `blueprint`.
- Character: `mono`, `candy`, `newsprint`, `forest`.
- A big room, a weak projector or accessibility needs: `high-contrast` (7:1 text, larger footer).
- A PDF to print or hand out: `print` (white page, no gradients, grayscale photos).

Choose the look first and write the content second; the layouts are the same in every look, and a title of up to 40 characters fits
in all of them.

## Syntax

Slides are separated by `---`. A slide picks a layout in its own frontmatter:

````md
---
layout: two-cols
---

::title::

# Title

::default::

- left column

::right::

> a callout on the right
````

| Layout | Use for | Content |
|---|---|---|
| `cover`, `closing` | first and last slide | `# Title`, `#### date`, `#### subtitle`; `closing` also takes an optional `::bg::` |
| `agenda` | 3 to 8 items | numbered list, subtitle in *italics* on the next line |
| `divider` | section break | `# Section` |
| `default` | bullets, tables, callouts | `# Title`, then Markdown |
| `two-cols` | two parallel columns | `::title::`, `::default::`, `::right::` |
| `photo-right` | idea plus photo | `image:` frontmatter, `::title::`, `::default::` |
| `full` | a full-frame element: website, animation, video, photo with text | no title bar or footer; the slot fills the 1280 x 720 slide |

Showcase layouts, for keynote-style decks (they look best with `ndVariant: studio` or `studio-light`, and work in all twenty looks):

| Layout | Use for | Content |
|---|---|---|
| `hero` | an opening or big-picture slide | `::bg::` for a background (`<Stage full>` with a live component or a video), then `# Title` and `#### subtitle` at the bottom left |
| `statement` | one sentence, very large | optional `::bg::` (a `<Stage full>`), `#### kicker` (small, above), then `# The sentence` (up to about 70 characters) or a `<Kinetic>` |
| `split` | words on the left, a live component on the right | `# Title`, `#### kicker`, a paragraph; `::right::` fills the right half (use `<Stage :w="640" :h="720">`); optional `::bg::` behind both |
| `stage` | a live component with almost no chrome | the slot (`<Stage full>` or a 1200 x 604 `<Stage>`), `::caption::` bottom left, page pill bottom right |
| `numbers` | 2 to 4 big figures | `# Title`, then `::a::`, `::b::`, `::c::`, `::d::`, each `## 60 fps` plus one line of text, or a `<Stat>`. Four figures sit in a 2 x 2 grid and each card enters in turn |

Diagrams: a fenced `mermaid` block. Builds: wrap a list in `<v-clicks>`. Speaker notes: an HTML comment at the end of
a slide.

## Motion and backgrounds

One line animates a slide: `motion: pop` in its frontmatter, `ndMotion: cascade` in the headmatter for the whole deck, and
`background: aurora` for a live background. `nimbledeck check` validates the ids. See [MOTION.md](MOTION.md).

## Placing things: Stage and At

Live components fill the box they are put in and have no frame or background by default, so they behave like any other
element. To combine elements (a video, an animation, text) put them in a `<Stage>` and place each with `<At>`:

```md
<Stage>
<At :w="1140" :h="460"><Clip src="/a.mp4" fit="cover" /></At>
<At :w="1140" :h="460" :z="1"><Orbit /></At>
<At :x="40" :y="360" :z="2" bg="var(--nd-bg)">

**Text over a live canvas over a video.**

</At>
</Stage>
```

Coordinates are in slide units (the slide is 1280 x 720). A normal slide's content area is 1140 x 500; a `<Stage>` is
clipped to its own box, so nothing can spill out. `<At v-click ...>` makes an element appear on click. `<At enter="up" :delay="120">` makes it arrive when its slide appears (`enter` is up, down, left, right, scale or fade; give a row of elements 0, 90, 180 ms to stagger them). `frame` adds a hairline border, rounded corners and a shadow, `:radius` rounds and clips, `:pad` pads (a number or a CSS value such as `"0 28px"`), `middle` centres the content vertically. For a full-frame
slide use `layout: full` and `<Stage full>` (1280 x 720). `<Photo>` and `<Clip>` take `fit` (`cover` or `contain`) and
`dim` (0 to 1, darkens them so text stays readable). `<Headline>` is large display text for impact slides.

## Crisp rendering

Canvases and 3D scenes render at the real on-screen resolution: slide size x slide scale x device pixel ratio (capped
at about 9 million pixels). Photos need enough pixels for their box, at least 1.5 times its width; use 2560 px wide
images for a full-frame photo. Videos should be at least as wide as their box in slide units.

## Live components

| Tag | What it shows |
|---|---|
| `<Orbit />` | Canvas animation. `controls` adds play, pause, scrub, speed; `hud` shows the frame rate; `frame` adds a border; `full` draws the scene for a whole 16:9 slide (use it in a 1280 x 720 `<At>`). A template for your own canvas scene. |
| `<Scene3D />` | three.js scene, drag to rotate. A template for your own 3D scene. |
| `<PyStream name="x" />` | A Python process streaming state to a canvas. `controls`, `hud`, `frame`, `color`. Plays its [recording](RECORDING.md) `stream-x` when the process is not running; `recording="/recordings/other"` names another file. |
| `<Demo name="x" />` | A local marimo app in an iframe. Plays its [recording](RECORDING.md) `demo-x` when the process is not running, else an offline panel. |
| `<LiveCode>` with a fenced block | An editor and its result. `:auto="false"`, `:timeout`, `frame`; `id="plot"` names its [recording](RECORDING.md) `live-plot` (default `live-<slide number>`). |

| `<Clip src="/a.mp4" webm="/a.webm" />` | A looping video. `fit`, `dim`, `controls`. `webm` is an optional second encoding for a browser built without H.264. A `/` address is a file of `public/` and follows the base path of the build. |
| `<Chart type="bar" :labels="[...]" :data="[...]" />` | Chart.js chart (`bar`, `line`, `pie`, `doughnut`), coloured by `--nd-chart-1..4`, animated when its slide appears. `horizontal`, `stacked`, `values`, `legend`, `center="3,2K"` (donut). |
| `<Quiz answer="B">` with `<Choice letter="A">` ... and `<Explain letter="B">` inside | Interactive quiz: the presenter clicks an answer (or presses 1 to 4); it turns good or bad, the right answer is revealed, the others fade, and the explanation appears. Leaving the slide resets it. Without `answer`, mark the right choice with `correct` for a static slide (use that for PDF handouts). |
| `<Countdown :seconds="20" />` | Circular timer that starts when its slide appears; click pauses. |
| `<Flip>` with `<template #front>` and `<template #back>` | A card that flips on click. |
| `<Compare before="/a.jpg" after="/b.jpg" />` | Before and after images with a draggable divider (arrow keys work too). `before-label` and `after-label` caption the corners, `sweep` glides the divider in once when the slide appears, `label` names the slider for screen readers. Give both images one layout so the divider reads as a restyle. |
| `<CountUp :to="3200" suffix="K" />` | A number that counts up when its slide appears (`:delay` ms to wait first). |
| `<Photo src="/a.jpg" />` | An image. `fit`, `position`, `dim`. |
| `<Headline>text</Headline>` | Large display text (`size` xl, l, m; `tone` light, dark). |
| `<Site url="https://..." />` | A website in a frame. Many sites forbid framing (GitHub does): use a screenshot or open it separately. |
| `<Fly>text</Fly>` | Entrance motion. |
| `<Kinetic text="Slides that move." />` | Kinetic headline in the display font, tight and balanced, filling its box. `mode` words, letters or lines (lines split on `\|`); `from` up, down, left, right, blur, scale or mask (a reveal from a clipping line); `:stagger` in ms; `:delay` ms before the first unit moves (a subtitle after its headline); `size` xl (120 px), l, m, s; `tone` auto, light, dark, muted; `accent="move,fast"` colours those words with `--nd-accent`. Plays when its slide appears and again on every re-entry. `hold` keeps it hidden until a `v-click` on it (`<Kinetic v-click hold ... />`) or until a bound `:trigger` number is above 0; any later change of `:trigger` replays it. |
| `<Typewriter lang="md">` with a fenced block or plain text | Types its content with a blinking caret and simple highlighting (`md`, `sh`, `py`, `json`, `html`). `:speed` ms per character, `:delay` ms before it starts, `caret`, `:keep="false"` fades the text out after a moment. With `lang="sh"` a line starting with `$ ` is typed and any other line appears as output. When it is done the root gets the class `nd-done`. Leaving the slide resets it. `:size` sets the font size in slide pixels (22 by default, for example `:size="30"`). |
| `<Terminal title="nimbledeck" :lines="[...]" />` | A window (three dots, a title) that types a shell session: `$ ` lines are typed, other lines appear as output. `:size` as for Typewriter. Same `nd-done` class and reset as Typewriter. |
| `<Aurora :intensity="1" :speed="1" />` | An animated gradient mesh of the accent colours that fills its box. Put it in `<Stage full>` inside an `<At :w="1280" :h="720">`. `:hue` turns the colours (degrees), `:cx` and `:cy` move the centre of the drift (0 to 1), so neighbouring slides do not repeat one picture. Renders at half resolution, pauses off screen, suits dark and light variants. |
| `<Stat value="60" suffix=" fps" label="smooth on a laptop" />` | A big number that counts up (`:decimals`, `prefix`, `:duration`, `:delay` to stagger several), then its label fades up and the number glows. The number never changes width while it counts. |
| `<Shader :hue="0" :intensity="1" :lines="0.35" />` | A WebGL fragment shader that fills its box: slow folds of colour in the accent colours with fine contour lines. Use it like Aurora, in `<Stage full>` inside `<At :w="1280" :h="720">`, when a hero or a finale needs more depth. Half resolution, sleeps off screen, one still frame for reduced motion, a flat background where WebGL is missing. |
| `<Livedeck>` with a fenced `md` block | Markdown typed on the left, the slides it describes appearing on the right as each is finished (`layout: hero`, `statement` or `closing`, `# Title` with `**bold**` in the accent colour, `#### kicker`). The preview is a sketch drawn from the colour tokens, not a screenshot. `:speed`, `:delay`, `:size` as for Typewriter. |
| `<Looks />` | A look switcher. It steps through a curated tour (plain, paper, night, studio light, studio, editorial, swiss, neon) by itself when its slide appears (a soft cross-fade through View Transitions where the browser has them), keys 1 to 9 or a click on a chip pick one, and leaving the slide puts the deck's look back. `:looks="['terminal', 'gold']"` names the looks, `looks="all"` offers all twenty (it wraps onto several rows, so give it height), `:interval`, `:delay`, `auto`. |
| `<LookWall />` | Every look of the theme as a card, in a grid (`:cols`, 5 for 20 looks). Each card is a mock slide that takes its colours from its look. The cards cascade in, a ring tours them (`:tour` ms per card, 0 for none), hover a card to see the whole slide in that look, click it to keep it. Give it 1200 x 560 in a `<Stage>`; leaving the slide puts the deck's look back. Gated on the slide, reduced motion shows the grid at once. |
| `<MotionWall :width="1200" />` | Every motion preset as a mini slide that really plays it, replaying in a diagonal wave (`:period` ms between waves), and a row of animated backdrops, one per background preset (`:backgrounds="false"` leaves it out). Hover or click a card to replay it. Give it 1200 x 470 in a `<Stage>` on a slide with `motion: none`, so the slide's own preset does not move the cards a second time. |
| `<Marquee :speed="40" gap="2em">` with content | Content that scrolls sideways for ever (`speed` in slide pixels per second). Repeats its content to fill the slide; paused off screen. |
| `<Spotlight>` with content | A soft pool of accent light that follows the pointer over the content, and drifts slowly by itself when the pointer is away. |
| `<Tilt>` with content | Content that tilts in 3D toward the pointer (8 degrees at most) with a soft moving sheen. Off for reduced motion. Round the sheen with `--nd-tilt-radius` (16 px by default). |

The motion components give a size to anything that fills its box, so place them with `<At :w :h>`. All of them honour the
system "reduce motion" setting by showing their final state. To chain the typing with a build, hide the next element until a
click: `<At v-click>`.

## Adding a live Python demo

1. `demos/<name>.py`: a marimo app. Put heavy work in `subprocess.run(...)`.
2. Register it in `nimbledeck.config.json` under `demos` with a free port, and list its packages in
   `demos/requirements.txt`.
3. Put `<Demo name="<name>" />` on a slide. Optional poster: `public/posters/<name>.png`.

A web page cannot run these. To make them play there too, record them once with `nimbledeck record` (see
[Recording live components](RECORDING.md)); the web edition then keeps those slides.

## Adding a streamed Python animation

1. `demos/stream_<name>.py`: a WebSocket server (see `examples/how-it-works/demos/stream_nbody.py`). Frame format:
   binary float32 `[step_ms, n, x0, y0, x1, y1, ...]`. The client sends JSON parameters; apply them between steps.
2. Register it under `streams` in the config, then use `<PyStream name="<name>" />`.
3. Optional settings, all with the original look as default: `:colors="['--nd-accent', '#f472b6']"` cuts the points into
   that many equal consecutive groups, one colour each (CSS colours or token names), so a trajectory keeps its colour;
   `:size` is the dot size in logical pixels (2.2), `:fade` how much of the previous frame is erased per frame (0.25;
   smaller gives longer trails); `:w` and `:h` set the logical canvas (1000 x 460), and the stream's x and y in
   [-2, 2] map to its width and height; `:sliders` is three `{label, min, max, step, value}` objects for the `n`, `dt` and
   `g` sliders that `controls` shows.
3. Smoothness is bounded by the Python step time: about 16 ms per step for 60 fps.

## Live code

`<LiveCode>` puts an editor and a result side by side. Edit the Python and the output (printed text and every open
matplotlib figure) updates as you type. The starting code is a fenced block inside the component:

````md
<Stage>
<At :w="1140" :h="460">
<LiveCode>

```python
import numpy as np, matplotlib.pyplot as plt
x = np.linspace(0, 6.28, 200)
plt.plot(x, np.sin(x))
```

</LiveCode>
</At>
</Stage>
````

- Enable it with `"runner": { "port": 18800 }` in `nimbledeck.config.json`; `nimbledeck run` starts the runner. List the
  packages the code needs (numpy, matplotlib...) in `demos/requirements.txt`.
- Figures are drawn in the slide's colours on a transparent background and rendered at screen resolution.
- `:auto="false"` stops re-running while you type (for heavy code): use the Run button or Cmd/Ctrl+Enter. `:timeout="20"` sets
  the time limit in seconds (default 10, at most 60).
- Esc leaves the editor so the arrow keys drive the deck again. Reset restores the starting code. Edits are temporary:
  the Markdown stays the source of truth.
- A broken program shows its error and keeps the last good picture. A newer run replaces one still in progress.
- Each run starts a fresh Python process (about 1 to 2 seconds for numpy and matplotlib). That is what makes it safe to
  kill runaway code.

## Embedded pages never take the deck hostage

`<Site>` and `<Demo>` put a page in an iframe, and an iframe that has focus swallows keys and clicks, which the deck
cannot intercept. So an embedded page starts behind a transparent shield: arrow keys and clicks drive the deck, even on a
full-frame slide with no margin. Click the page to interact with it; a control bar inside the slide then offers
previous, "Back to slides" and next, and works whatever the frame size. Leaving the slide re-guards the page.

## Finding your way: the command palette and the cheat-sheet

Press `/` (or Ctrl/Cmd+K) to open the command palette. Type to fuzzy-search slide titles and body text; every word must
match, in any order, and a number jumps to that slide. Results show thumbnails drawn by Slidev's own renderer with the matching words
highlighted; arrows move, Enter jumps, Esc closes. Press `?` for the cheat-sheet listing every shortcut, Slidev's and
Nimbledeck's. The palette and `?` ignore keystrokes while you type in an input or the code editor. In a static build
(not `nimbledeck run`) Slidev blanks the slide text, so only titles and notes are searchable. Thumbnails of website and
demo slides show a placeholder instead of loading the page.

## Interactions are for the presenter

Interactive components react to clicks and keys on the presenting machine; they are not audience polling. Clicks on them
never advance the slide. Everything resets when you leave the slide, so a rehearsed quiz is fresh on stage. All motion
respects the system "reduce motion" setting. In a PDF export an interactive quiz shows its initial, unanswered state.
`examples/how-it-works/e2e-interactions.mjs` clicks through every interaction in a real browser and asserts the result
(run it against the running example).

## Verifying placement in a browser

`nimbledeck check` lints the Markdown. `nimbledeck verify <deck.md>` opens the running deck (start it with
`nimbledeck run` first, or pass `--url`) at 2x resolution, goes through every slide with all builds shown, and reports:
content overflowing the slide, content entering the footer zone, clipped content, and canvases, images or videos that
are too low-resolution for the screen. Run it before presenting.

## Rules the checker enforces

Known layout, a `# title` of at most `maxTitle` characters on content slides, at most `maxBullets` bullets (warning),
no `<div>`, `<style>` or `style=`, every `/asset` exists in `public/`, every `<Demo>` and `<PyStream>` is registered
and its file exists, every `<At>` fits its `<Stage>` and every `<Stage>` fits the slide, and a warning when a slide holds
more than `maxChars` (900) characters or a `<Photo>` has too few pixels for its box.

When the theme lacks something, add a layout or component once and use it by name. Never patch a single slide
with inline CSS.

## Tour scripts and sounds

A slide can script what the site tour does on it (`tourScript`) and ask for sounds (`sound`, `sounds`); the deck can set a bed (`ndSound`). See [Scripted tours and sounds](TOUR.md). `nimbledeck check` validates both.
