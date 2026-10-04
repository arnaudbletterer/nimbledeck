# Live demos

## The example deck

<div class="nd-frame"><iframe src="demos/how-it-works/" title="The Nimbledeck example deck, running" loading="lazy" allow="fullscreen"></iframe></div>

[Open it full screen](demos/how-it-works/){ .md-button .md-button--primary target="_blank" }

*How a Nimbledeck deck works* is built with Nimbledeck itself. It walks through the writing loop, the layouts, builds,
a canvas scene, a WebGL scene, video, a quiz and a website in a slide. Its source is
`examples/how-it-works/how-it-works.md` in the repository.

Keys: arrows to move, `?` lists every shortcut, `o` opens the overview, `/` searches slide titles.

## What this copy contains

This is the **web edition** of the example: a static build served from the web, with no Python process behind it. It
keeps everything that runs in a browser: layouts, builds, the three looks, `Orbit`, `Scene3D`, `Chart`, `Clip`,
`Compare`, `Quiz`, `Flip`, `Countdown`, `CountUp` and `Site`. Search covers slide titles and notes.

The six slides that need `nimbledeck run` (`PyStream`, `Demo`, `LiveCode`) are left out of this copy, so nothing here
shows an offline panel. See them, and how to run them yourself, on [Run it locally](run-locally.md).

## Add your own deck here

Any Slidev build can be published under `demos/`. The site build in `website/build.mjs` builds the example deck, skipping any
slide that uses `PyStream`, `Demo` or `LiveCode`. Add a line there to build another deck next to it.
