# Live demos

## The example deck

<div class="nd-frame"><iframe src="demos/how-it-works/" title="The Nimbledeck example deck, running" loading="lazy" allow="fullscreen"></iframe></div>

[Open it full screen](demos/how-it-works/){ .md-button .md-button--primary target="_blank" }

*How a Nimbledeck deck works* is built with Nimbledeck itself. It walks through the writing loop, the layouts, builds,
a canvas scene, a WebGL scene, Python, video, a quiz and live code. Its source is
`examples/how-it-works/how-it-works.md` in the repository.

Keys: arrows to move, `?` lists every shortcut, `o` opens the overview, `/` searches slide titles.

## What works on this page

This copy is a **static build** served from the web. There is no `nimbledeck run` behind it, so no Python process is
running.

| Works here | Needs a local process, so it shows its offline panel |
|---|---|
| Layouts, builds, themes | `<PyStream>` (streamed simulation) |
| `Orbit`, `Scene3D` | `<Demo>` (marimo apps) |
| `Clip`, `Photo`, `Compare`, `Chart` | `<LiveCode>` (editable Python) |
| `Quiz`, `Flip`, `Countdown`, `CountUp` | |
| Search by slide title and notes | Search inside slide text |

The offline panels are the designed failure model: a demo that is down must never stop the talk. To see everything
working, run the example on your machine:

```sh
git clone <the Nimbledeck repository URL> nimbledeck
cd nimbledeck
npm install
npm run example        # http://localhost:3030, with every demo running
```

Needs Node 20 or newer and [uv](https://docs.astral.sh/uv/). See [Get started](GETTING-STARTED.md).

## Add your own deck here

Any Slidev build can be published under `demos/`. The site build in `website/build.mjs` builds the example deck; add a
line there to build another one next to it.
