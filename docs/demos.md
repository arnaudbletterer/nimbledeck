# Live demos

Three decks are published with this documentation. Each one is built with Nimbledeck.

| Deck | What it is | Open |
|---|---|---|
| **The showcase** | The home page. Motion text, a canvas, 3D, a chart, a quiz, before and after, video. About five minutes. | [Home page](../){ target="_blank" } |
| **How a Nimbledeck deck works** | The writing loop, the layouts, builds and each live component, one slide at a time. | [Open it](../demos/how-it-works/){ target="_blank" } |
| **The layout playground** | Not a deck: change a layout and see the slide re-arrange. | [Open it](../playground/){ target="_blank" } |

The bar at the top of the home page has a **Play the tour** button: the deck plays itself, slide after slide, and stops
when you press a key or click.

## The example deck

<div class="nd-frame"><iframe src="../demos/how-it-works/" title="The Nimbledeck example deck, running" loading="lazy" allow="fullscreen"></iframe></div>

*How a Nimbledeck deck works* walks through the writing loop, the layouts, builds, a canvas scene, a WebGL scene, video,
a quiz and a website in a slide. Its source is `examples/how-it-works/how-it-works.md` in the repository.

Keys: arrows to move, `?` lists every shortcut, `o` opens the overview, `/` searches slide titles.

## What the hosted copies contain

These are **web editions**: static builds served from the web, with no Python process behind them. They keep everything
that runs in a browser: layouts, builds, the looks, `Orbit`, `Scene3D`, `Chart`, `Clip`, `Compare`, `Quiz`, `Flip`,
`Countdown`, `CountUp` and `Site`. Search covers slide titles and notes.

The slides that need `nimbledeck run` (`PyStream`, `Demo`, `LiveCode`) are left out of the hosted copies, so nothing here
shows an offline panel. See them, and how to run them yourself, on [Run it locally](run-locally.md).

## Add your own deck here

Any Slidev build can be published under `demos/`. `website/build.mjs` builds each deck in turn and skips any slide that
uses `PyStream`, `Demo` or `LiveCode`. Add a call there to build another deck next to the others. The decks of a site
build use hash routes (`#/3`), because a static host has no fallback to `index.html` for `/3`.
