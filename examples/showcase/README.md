# Showcase deck

A 20 slide deck for a three minute demo: a shader opening, Markdown typed while its slides build themselves, five looks
of one slide, motion text, a canvas, 3D, measured numbers, a quiz, a Markdown and slide comparison, video, live Python,
an agent loop and a finale. It is plain Markdown in `showcase.md`.

## Run it

```sh
npm install                       # once, from the repository root
npm --workspace examples/showcase run dev      # the full edition, http://localhost:3030
npm --workspace examples/showcase run check    # lint the deck
```

`NIMBLEDECK_PORT_OFFSET=700` shifts every port, so it can run next to the other example.

## Two editions

| Edition | How | Slides |
|---|---|---|
| Full | `npm run dev` | all 19 |
| Web | `npm run build:web` (static files in `dist/`) | 17: the slides that need `nimbledeck run` are left out |

The slides that need `nimbledeck run` are 14 (live code) and 15 (the Python particle stream). `build:web` marks them
`disabled: true` in a temporary copy, uses hash routes, and removes `nimbledeck.json` from the output. `WEB_BASE` sets the
base path (default `/nimbledeck/demos/showcase/`) and `WEB_OUT` the output folder. Files of `public/` are written as
`/loop.mp4` in the Markdown; the components put the base path in front, so the same Markdown works at any base.

## Assets

Made by the scripts in `demos/`, nothing is fetched at run time:

- `make_loop.py` writes `public/loop.mp4` (H.264) and `public/loop.webm` (VP9, for browsers built without H.264), a
  seamless four second loop.
- `make_compare.py` writes `public/source.jpg` and `public/slide.jpg` (2560 px wide): the Markdown of a slide and the slide
  it makes, drawn on one grid so the divider of `<Compare>` joins them.
- `stream_swarm.py` is the particle stream behind `<PyStream name="swarm" />`.

## Pacing

About three minutes at a steady pace. Slides 1, 2, 5, 6 and 17 move by themselves; 3 types and builds by itself; the quiz
(11) and the compare slider (12) are the places to pause. Slide 5 steps through the looks on its own, keys 1 to 5 pick one.

## Testing the web edition

`e2e-web.mjs` walks the built web edition in Chrome and asserts that every request succeeds under a sub-path base, the
video plays, the compare images decode, no offline panel shows and the two `nimbledeck run` slides are left out
(`npm run e2e:web -- <url>`):

```sh
WEB_BASE=/nimbledeck/demos/showcase/ WEB_OUT=/tmp/site/nimbledeck/demos/showcase npm run build:web
# serve /tmp/site with any static server, then:
node e2e-web.mjs http://localhost:8123/nimbledeck/demos/showcase/
```

## On the site

`npm run docs:build` at the repository root builds this deck, with `build:web`, as the front page of the site. The bar,
the first-slide hint and the tour live in `global-top.vue` and appear only there: the build injects `window.__ND_SITE__`
into the page, and without it (dev server, PDF export, any other build) the bar renders nothing and takes no room.

- The tour is a video with a length and a clock: the button shows `0:13 / 2:38`, the hairline under the bar follows the clock, a big "Watch the tour" button sits on the first slide, and `/?tour` starts it by itself. A finished tour plays again from the start.
- A slide stays on screen for 8 seconds in the tour. `tour: 14` in a slide's frontmatter changes that; click builds share the
  slide's time (at least 2.5 seconds each).
- `node website/make-social.mjs` regenerates `public/social.jpg`, the 1200 x 630 preview used by link cards.

## Tour script and sound

Slides carry `tourScript` and `sounds` in their frontmatter (quiz, compare, looks, 3D, live code, stream); slide 14 is the sound slide. Pacing is adaptive. See `docs/TOUR.md`. `node e2e-tour.mjs --dist dist --full` checks it in Chrome and prints the time per slide. The live code keeps `id="14"` so its recording still matches.
