# Showcase deck

An 18 slide deck for a three minute demo: motion text, a canvas, 3D, a chart, a quiz, before and after, video, live
Python and an agent loop. It is plain Markdown in `showcase.md`.

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
| Full | `npm run dev` | all 18 |
| Web | `npm run build:web` (static files in `dist/`) | 16: the slides that need `nimbledeck run` are left out |

The slides that need `nimbledeck run` are 13 (live code) and 14 (the Python particle stream). `build:web` marks them
`disabled: true` in a temporary copy, uses hash routes, and removes `nimbledeck.json` from the output. `WEB_BASE` sets the
base path (default `/nimbledeck/demos/showcase/`).

## Assets

Made by the scripts in `demos/`, nothing is fetched at run time:

- `make_loop.py` writes `public/loop.mp4`, a seamless four second loop.
- `make_compare.py` writes `public/before.jpg` and `public/after.jpg` (2560 px wide).
- `stream_swarm.py` is the particle stream behind `<PyStream name="swarm" />`.
