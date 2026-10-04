# Recording live components

A live slide needs its Python process. A web page on GitHub Pages has none, and neither has a viewer who opens your deck
without `nimbledeck run`. A recording fixes that: you film the real application once, on your machine, and the slide plays
the film wherever the process is not there. When the process is there, the slide is live as before.

## Record in three commands

```sh
npm install                                   # once; playwright-chromium is already a dependency of a deck
nimbledeck record my-deck.md                  # starts the deck and its processes, films every live slide
git add public/recordings                     # the files are part of the deck
```

`nimbledeck record` starts the deck and its Python processes the way `nimbledeck run` does, opens the deck in Chrome, goes
to each slide with a `<LiveCode>`, `<PyStream>` or `<Demo>`, waits until the component is live, films it, and stops
everything. Options:

| Option | Default | Meaning |
|---|---|---|
| `--slide 11 19` | all slides with a live component | film only these slides |
| `--seconds 8` | 8 | length of a clip (1 to 60). A `seconds` in the config wins |
| `--width 1280` | 1280 | width a whole slide would have in the video (480 to 2560) |
| `--out public/recordings` | `<publicDir>/recordings` | where the files go |
| `--url http://localhost:3030` | none | film a deck that is already running (with its processes) instead of starting one |

On a machine where another deck uses the default ports, set `NIMBLEDECK_PORT_OFFSET` as for `run`.

What you get, for a component called `stream-nbody`:

```
public/recordings/stream-nbody.webm   always
public/recordings/stream-nbody.mp4    only when ffmpeg is on your PATH (H.264, for Safari and iOS)
public/recordings/stream-nbody.jpg    a still: the last frame
public/recordings/index.json          the list of recordings: id, kind, seconds, size, files
```

The video is the box of the component, not the whole slide, cut and scaled to the size it has on the slide. The mouse
pointer, Slidev's controls and toasts are not in it.

### Names

| Component | Recording name |
|---|---|
| `<PyStream name="nbody" />` | `stream-nbody` |
| `<Demo name="compute" />` | `demo-compute` |
| `<LiveCode id="plot">` | `live-plot` |
| `<LiveCode>` (no `id`) | `live-<slide number>`, for example `live-19` |

The same stream or demo on several slides is filmed once, on the first of them, and every slide plays that file. Give each
`<LiveCode>` an `id` when a slide holds two of them, or when you may reorder slides: the number in the default name is the
slide number at the time of recording.

## Scripted steps

By default a recording shows the component as it starts. To show the point, describe what to do in
`nimbledeck.config.json`, under `recordings`:

```json
{
  "recordings": {
    "stream-nbody": {
      "seconds": 9,
      "steps": [{ "wait": 1500 }, { "set": "gravity", "value": 2.5 }, { "wait": 1500 }, { "set": "particles", "value": 1200 }]
    },
    "live-19": {
      "seconds": 12,
      "steps": [{ "wait": 1200 }, { "type": "\nplt.plot(x, np.sin(2 * x))\nplt.grid(True)\n" }, { "wait": 1500 }]
    },
    "live-20": {
      "steps": [{ "type": "print(sum(range(10)))", "replace": true }, { "key": "ControlOrMeta+Enter" }, { "wait": 1500 }]
    }
  }
}
```

Steps run in order from the first frame. Each has one action:

| Step | What it does |
|---|---|
| `{ "wait": 800 }` | Pauses for that many milliseconds. |
| `{ "type": "text" }` | Types into the `<LiveCode>` editor, at the end of the code. `"replace": true` clears the editor first. Keys come one at a time with uneven pauses, longer at spaces, punctuation and line ends, and the editor re-runs after each pause, so the plot changes while you watch. The same text gives the same rhythm every time. Only for `live-` recordings. |
| `{ "key": "ControlOrMeta+Enter" }` | Presses a key or a combination. `ControlOrMeta` is Cmd on a Mac and Ctrl elsewhere (`Mod` is accepted as a short form). |
| `{ "set": "gravity", "value": 2.5 }` | Moves a slider to a value. The slider is found by the text of its label. It moves in small steps, like a drag. Works for the sliders of `<PyStream controls>` and for marimo sliders. |
| `{ "click": "Run" }` | Clicks a button by its text. |

The clip lasts `seconds`, or the length of the steps plus a short tail when they take longer. `nimbledeck record` checks
the config before it starts and says which step is wrong. The editor indents by itself after a line break and closes
brackets, so type code that does not depend on the indentation you would get by hand, or keep it flat.

## How playback works

`<LiveCode>`, `<PyStream>` and `<Demo>` look for `recordings/<name>.webm` or `.mp4` (WebM first, then MP4, whichever the
browser can play) when their process cannot be reached. The path starts at the deck's base, so a deck published under
`/nimbledeck/demos/x/` finds `/nimbledeck/demos/x/recordings/<name>.webm`. If a recording exists, the component shows it
instead of the offline panel:

- a muted, looping, inline video that fills the box of the component, with the still as its poster;
- a small pill, "Recording of a live run", and a line, "Run it locally to make it live". Neither links anywhere;
- the live component's own controls are hidden, because the video already shows them, and its editor is inert;
- with the system setting "reduce motion", only the still is shown, with the same pill.

The recording appears after the process has been missing for 0.7 seconds, so the short moment of connecting never flashes a
video. When the process comes back, the live component replaces it. Nothing is fetched from the network but your own files.

To use another file, give the component a path without extension, relative to the public folder:
`<Demo name="compute" recording="/recordings/compute-slow" />` (`.webm` or `.mp4` is added). A recording given this way is
looked up as written, even when the manifest does not list it.

### The web edition

The build that publishes a deck on a static host (`website/build.mjs`, `examples/showcase/build-web.mjs`) leaves out the
slides that need `nimbledeck run`, except those whose live components all have a recording in `public/recordings`. Those
stay, and play the recordings. A slide with one live component and no recording is still left out.

## Sizes

Measured on the example deck, 9 to 12 second clips, 30 frames per second:

| Clip | Box | WebM (VP8) | MP4 (H.264) | Still |
|---|---|---|---|---|
| `stream-nbody` (200 to 1200 moving particles) | 1100 x 500 | 1.7 MB | 1.3 to 1.6 MB | 30 to 90 KB |
| `live-19` (typing, plot updating) | 1140 x 460 | 0.4 MB | 0.1 MB | 50 KB |
| `demo-compute` (marimo) | 1140 x 460 | 0.2 MB | 0.05 MB | 25 KB |

Moving particles are the worst case: every frame differs. The WebM encoder is capped at 1.6 Mbit/s, so a clip cannot grow
past about 1.6 MB per 8 seconds; a calm slide is much smaller. `--width 1920` made the particle clip 1.8 MB (WebM) and
2.7 MB (MP4), and `--width 2560` 2.1 MB and 3.9 MB, with no gain you can see on a 1280 pixel slide. Keep clips short:
8 to 12 seconds loops well.

## What is not recorded

- Sound. The video has no audio track.
- The mouse pointer, and anything outside the box of the component, such as the slide title and footer.
- Anything that depends on the viewer: a recording does not react to clicks. Sliders and the editor on the poster or the
  video do nothing. It is a film, and it says so.
- Components that need no process (Orbit, Scene3D, Chart): they run in the browser anyway.
- Marimo's own drag handles: sliders are moved with the arrow keys, not by dragging.

## Troubleshooting

- `never went live`: the process did not start in 45 seconds. Run `nimbledeck run` on the deck and read
  `.nimbledeck/logs/`.
- `no ffmpeg found`: the Playwright download of ffmpeg is missing. Run `npx playwright-chromium install ffmpeg`.
- No `.mp4` next to the `.webm`: ffmpeg is not on your PATH. WebM plays in Chrome, Firefox, Edge and current Safari; add
  ffmpeg for older Safari and iOS.
- `stream-x is on slides ...` or `two components called live-...`: give each `<LiveCode>` its own `id`.

## How it works

Chrome renders the deck at 2560 x 1440, twice the slide, so text and canvases are drawn at full detail. The recorder takes
the frames Chrome produces (the screencast of the Chrome DevTools protocol, about 30 to 50 a second), keeps one per
30th of a second, crops the box of the component and scales it down, then encodes it with ffmpeg: VP8 from the copy that
Playwright already downloaded, H.264 from an ffmpeg on your PATH. The poster is cut from the last frame by Chrome itself.
Playwright's own video recording was measured and rejected: it films the whole slide at 25 frames per second and 1x
resolution, and its text was visibly softer.
