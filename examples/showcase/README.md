# Showcase deck

A 20 slide deck for a three minute demo: a shader opening, Markdown typed while its slides build themselves, five looks
of one slide, motion text, a canvas, 3D, a wall of all twenty looks (`<LookWall />`), a wall of every motion and background
preset (`<MotionWall />`), a quiz, a Markdown and slide comparison, video, live Python, an agent loop and a finale. It is
plain Markdown in `showcase.md`. The deck uses its own presets: `ndMotion: fade-up` for the deck, and a bolder `motion:`
and `background:` on the slides that suit it (a spotlight cover, a curtain statement, a typed code title, a focus finale).

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
| Full | `npm run dev` | all 20 |
| Web | `npm run build:web` (static files in `dist/`) | all 20: the live code and the stream play a recording; a live slide with no recording is left out |

The slides that need `nimbledeck run` are 15 (live code) and 16 (the Python particle stream). `build:web` marks those that have no recording
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

About three minutes at a steady pace. Slides 1, 2, 5, 6 and 18 move by themselves; 3 types and builds by itself; the two walls
(9 and 10) run on their own and answer the pointer; the quiz (11) and the compare slider (12) are the places to pause. Slide 5
steps through the looks on its own, keys 1 to 5 pick one. On slide 9 a hover previews a look and a click keeps it; on slide 10
a click replays a motion card.

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
the first-slide hint and the tour are the addon's `SiteBar` component and appear only on the hosted site: the build injects `window.__ND_SITE__`
into the page, and without it (dev server, PDF export, any other build) the bar renders nothing and takes no room.

- The tour is a video with a length and a clock: the button shows `0:13 / 2:38`, the hairline under the bar follows the clock, a big "Watch the tour" button sits on the first slide, and `/?tour` starts it by itself. A finished tour plays again from the start.
- A slide stays on screen for 8 seconds in the tour. `tour: 14` in a slide's frontmatter changes that; click builds share the
  slide's time (at least 2.5 seconds each).
- `node website/make-social.mjs` regenerates `public/social.jpg`, the 1280 x 640 preview used by link cards and by GitHub (it composes three real slides over the name and the tagline).

## Tour script and sound

Slides carry `tourScript` and `sounds` in their frontmatter (quiz, compare, looks, 3D, live code, stream, and the two walls, where the cursor hovers and clicks cards); slide 14 is the sound slide. The tour is about two and a half minutes. Pacing is adaptive. See `docs/TOUR.md`. `node e2e-tour.mjs --dist dist --full` checks it in Chrome and prints the time per slide. The live code keeps `id="14"` so its recording still matches.
