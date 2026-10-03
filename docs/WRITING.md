# Writing a deck

## The loop

1. Read the source document. Decide one message per slide.
2. Write `<name>.md`: a cover slide first, a closing slide last.
3. `nimbledeck check <name>.md` and fix every ERROR. Warnings mean "split this slide".
4. `nimbledeck run <name>.md`, then open http://localhost:3030 (keys: arrows, `O` overview, `P` presenter).
5. Export: `slidev export <name>.md --with-clicks` (one page per build step).

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
| `cover`, `closing` | first and last slide | `# Title`, `#### date`, `#### subtitle` |
| `agenda` | 3 to 8 items | numbered list, subtitle in *italics* on the next line |
| `divider` | section break | `# Section` |
| `default` | bullets, tables, callouts | `# Title`, then Markdown |
| `two-cols` | two parallel columns | `::title::`, `::default::`, `::right::` |
| `photo-right` | idea plus photo | `image:` frontmatter, `::title::`, `::default::` |
| `full` | a full-frame element: website, animation, video, photo with text | no title bar or footer; the slot fills the 1280 x 720 slide |

Diagrams: a fenced `mermaid` block. Builds: wrap a list in `<v-clicks>`. Speaker notes: an HTML comment at the end of
a slide.

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
clipped to its own box, so nothing can spill out. `<At v-click ...>` makes an element appear on click. For a full-frame
slide use `layout: full` and `<Stage full>` (1280 x 720). `<Photo>` and `<Clip>` take `fit` (`cover` or `contain`) and
`dim` (0 to 1, darkens them so text stays readable). `<Headline>` is large display text for impact slides.

## Crisp rendering

Canvases and 3D scenes render at the real on-screen resolution: slide size x slide scale x device pixel ratio (capped
at about 9 million pixels). Photos need enough pixels for their box, at least 1.5 times its width; use 2560 px wide
images for a full-frame photo. Videos should be at least as wide as their box in slide units.

## Live components

| Tag | What it shows |
|---|---|
| `<Orbit />` | Canvas animation. `controls` adds play, pause, scrub, speed; `hud` shows the frame rate; `frame` adds a border. A template for your own canvas scene. |
| `<Scene3D />` | three.js scene, drag to rotate. A template for your own 3D scene. |
| `<PyStream name="x" />` | A Python process streaming state to a canvas. |
| `<Demo name="x" />` | A local marimo app in an iframe, with an offline fallback. |
| `<Clip src="/a.mp4" />` | A looping video. `fit`, `dim`, `controls`. |
| `<Chart type="bar" :labels="[...]" :data="[...]" />` | Chart.js chart (`bar`, `line`, `pie`, `doughnut`), coloured by `--nd-chart-1..4`, animated when its slide appears. `horizontal`, `stacked`, `values`, `legend`, `center="3,2K"` (donut). |
| `<Quiz>` with `<Choice letter="A" correct>` and `<Explain letter="B">` | Answer grid and the explanation panel. |
| `<Photo src="/a.jpg" />` | An image. `fit`, `position`, `dim`. |
| `<Headline>text</Headline>` | Large display text (`size` xl, l, m; `tone` light, dark). |
| `<Site url="https://..." />` | A website in a frame. Many sites forbid framing (GitHub does): use a screenshot or open it separately. |
| `<Fly>text</Fly>` | Entrance motion. |

## Adding a live Python demo

1. `demos/<name>.py`: a marimo app. Put heavy work in `subprocess.run(...)`.
2. Register it in `nimbledeck.config.json` under `demos` with a free port, and list its packages in
   `demos/requirements.txt`.
3. Put `<Demo name="<name>" />` on a slide. Optional poster: `public/posters/<name>.png`.

## Adding a streamed Python animation

1. `demos/stream_<name>.py`: a WebSocket server (see `examples/how-it-works/demos/stream_nbody.py`). Frame format:
   binary float32 `[step_ms, n, x0, y0, x1, y1, ...]`. The client sends JSON parameters; apply them between steps.
2. Register it under `streams` in the config, then use `<PyStream name="<name>" />`.
3. Smoothness is bounded by the Python step time: about 16 ms per step for 60 fps.

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
