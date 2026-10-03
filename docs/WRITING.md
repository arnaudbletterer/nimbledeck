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

Diagrams: a fenced `mermaid` block. Builds: wrap a list in `<v-clicks>`. Speaker notes: an HTML comment at the end of
a slide.

## Live components

| Tag | What it shows |
|---|---|
| `<Orbit />` | Canvas animation with play, pause, scrub, speed. A template for your own canvas scene. |
| `<Scene3D />` | three.js scene, drag to rotate. A template for your own 3D scene. |
| `<PyStream name="x" />` | A Python process streaming state to a canvas. |
| `<Demo name="x" />` | A local marimo app in an iframe, with an offline fallback. |
| `<Clip src="/a.mp4" />` | A looping video. |
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

## Rules the checker enforces

Known layout, a `# title` of at most `maxTitle` characters on content slides, at most `maxBullets` bullets (warning),
no `<div>`, `<style>` or `style=`, every `/asset` exists in `public/`, every `<Demo>` and `<PyStream>` is registered
and its file exists.

When the theme lacks something, add a layout or component once and use it by name. Never patch a single slide
with inline CSS.
