# Recording live components

A live slide needs its Python process. A web page on GitHub Pages has none, and neither has a viewer who opens your deck
without `nimbledeck run`. A recording fixes that: you film the real application once, on your machine, and the slide plays
the film wherever the process is not there. When the process is there, the slide is live as before.

## Record in three commands

```sh
npm install                                   # once; playwright-chromium is already a dependency of a deck
brew install ffmpeg                           # once; any ffmpeg with libvpx-vp9 and libx264 (see "What you need")
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
| `--width 2560` | 2560 | width a whole slide would have in the video (480 to 2560). 2560 keeps every pixel; a smaller value scales down, only for a smaller file |
| `--out public/recordings` | `<publicDir>/recordings` | where the files go |
| `--url http://localhost:3030` | none | film a deck that is already running (with its processes) instead of starting one |

On a machine where another deck uses the default ports, set `NIMBLEDECK_PORT_OFFSET` as for `run`.

What you get, for a component called `stream-nbody`:

```
public/recordings/stream-nbody.webm   VP9, the smaller file; Chrome, Firefox, Edge, and Safari where it plays WebM
public/recordings/stream-nbody.mp4    H.264 High, for Safari and iOS
public/recordings/stream-nbody.jpg    a still: the last frame, at the full pixel size of the video
public/recordings/index.json          the list of recordings: id, kind, seconds, size, files
```

The video is the box of the component, not the whole slide, at twice the pixels it has on a 1280 x 720 slide: a box of
1140 x 460 on the slide is a 2280 x 920 video. The page lays it out at 1140 x 460, so it is sharp on a 2x screen and
merely fine on a 1x one. The mouse pointer, Slidev's controls and toasts are not in it. In `index.json`, `width` and
`height` are the logical size (CSS pixels), `pixelWidth` and `pixelHeight` the pixels of the file.

### What you need

An ffmpeg on your PATH built with `libvpx-vp9` and `libx264` (`brew install ffmpeg`, `apt install ffmpeg`, or the
Windows builds of gyan.dev). `nimbledeck record` asks it (`ffmpeg -encoders`) and writes what it can. Without one, it
falls back on the ffmpeg that Playwright downloads, which writes VP8 only, at a fixed quality and without an MP4: the
clips play, but they are softer, and it says so. The ladder in this page assumes the system ffmpeg.

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

`<LiveCode>`, `<PyStream>` and `<Demo>` look for `recordings/<name>.webm` or `.mp4` when their process cannot be reached. The
browser is asked (`canPlayType`) about VP9 WebM and H.264 High MP4: the file it is sure about comes first, and WebM before MP4
when it is sure about both or neither (Safari answers "probably" for MP4 only, so it gets the MP4). The path starts at the deck's base, so a deck published under
`/nimbledeck/demos/x/` finds `/nimbledeck/demos/x/recordings/<name>.webm`. If a recording exists, the component shows it
instead of the offline panel:

- a muted, looping, inline video that fills the box of the component (the box already has the logical size and shape of the
  recording, so nothing moves when the video loads), with the still as its poster. It loads when the slide shows;
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

The clips of the example decks, 9 to 12 seconds, 30 frames per second, pixels as written in the file:

| Clip | Pixels | WebM (VP9) | MP4 (H.264) | Still |
|---|---|---|---|---|
| `stream-nbody` (200 to 1200 moving particles) | 2200 x 1000 | 2.8 MB | 3.7 MB | 79 KB |
| `stream-swarm` | 2040 x 1120 | 2.5 MB | 3.7 MB | 233 KB |
| `stream-lorenz` (whole slide) | 2560 x 1440 | 3.0 MB | 2.4 MB | 483 KB |
| `demo-turing` | 2148 x 1208 | 1.3 MB | 0.9 MB | 259 KB |
| `live-14`, `live-fft`, `live-fit`, `live-net` (typing, plot updating) | 2280 x 1000 to 2400 x 1208 | 0.7 to 1.0 MB | 0.7 to 1.1 MB | 250 to 350 KB |
| `live-19` | 2280 x 920 | 0.6 MB | 0.6 MB | 175 KB |
| `demo-compute`, `live-20` | 2280 x 920 | 0.2 to 0.3 MB | 0.2 to 0.3 MB | 47 to 81 KB |

All 11 clips, both formats and the stills: 33 MB. Moving particles are the worst case, since every frame differs, so their
rate is capped (VP9 at 2.8 Mbit/s, H.264 at 3.4 Mbit/s, about 3 to 4 MB per 9 seconds); a calm slide never reaches the cap
and stays under 1 MB. A clip of 12 seconds with moving particles would reach 4 to 5 MB. Keep clips short: 8 to 12 seconds
loops well. `--width 1280` makes a clip about a third of the size, at the 1x look of the first version.

How many frames the browser delivers depends on the machine: 35 to 60 a second for a calm page, 16 to 28 for particles drawn
on a busy laptop, and nothing while the screen does not change. The timeline repeats the last frame to fill 30 a second,
and `nimbledeck record` prints what it got (`browser sent 28 frames/s`).

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
- `no ffmpeg found`: neither a system ffmpeg nor the Playwright one. Install ffmpeg, or run `npx playwright-chromium install ffmpeg`.
- `no system ffmpeg with VP9: using the ffmpeg of Playwright`: the clips are VP8 and no MP4 is written. Install a full ffmpeg.
- No `.mp4` next to the `.webm`: the ffmpeg on your PATH has no `libx264`.
- The recording is slow (a few minutes for ten clips): VP9 runs in two passes on a 2560 x 1440 page, and a busy machine
  makes the browser deliver fewer frames. Close other heavy programs while it films.
- `stream-x is on slides ...` or `two components called live-...`: give each `<LiveCode>` its own `id`.

## How it works

Chrome lays the deck out at 2560 x 1440, twice a 1280 x 720 slide, so text, canvases and the matplotlib figures of
`<LiveCode>` (drawn at the dpi of their on-screen size) are rendered natively at 2x, not scaled up. The recorder takes
the frames Chrome produces (the screencast of the Chrome DevTools protocol, as lossless PNG), keeps the latest one of
every 30th of a second, and holds the last frame on a still screen. It crops the box of the component and encodes it
without scaling.

Why a 2560 x 1440 page and not a 1280 x 720 one at a device scale factor of 2: the screencast always sends frames in CSS
pixels, so a 2x page would arrive at 1280 x 720. `Page.captureScreenshot` does deliver 2x, but at 16 to 25 frames a second
for a clip box, against 35 to 60 for the screencast. The pixels are the same, because Slidev scales the slide to the page.

The quality ladder, in `QUALITY` of `packages/cli/src/record.mjs`:

| Output | Encoder | Settings |
|---|---|---|
| `.webm` | `libvpx-vp9` | `-crf 29 -b:v 0`, two passes, `-row-mt 1 -tile-columns 2`, `-deadline good -cpu-used 1`, `-tune-content screen`, `-g 60` (a keyframe every 2 s), `yuv420p` |
| `.mp4` | `libx264` | `-preset slow -crf 21 -profile:v high`, `yuv420p`, `-g 60`, `+faststart` |
| `.webm` without a system ffmpeg | `libvpx` (VP8) | `-crf 10 -b:v 6M` |

Both are 30 frames a second, RGB converted to BT.709 limited range and tagged as such (an untagged video shifts colours in
some browsers), no audio. A lower CRF is sharper and bigger: 24 for VP9 or 18 for H.264 was indistinguishable from 29 and 21
on every clip, and the noisiest clip (1200 moving particles) grew by a quarter. The poster is cut from the last frame by
Chrome itself, as a JPEG at quality 93.

Other choices measured and left out: playing the clips as 4:4:4 (`yuv444p`, VP9 profile 1) does not decode in Safari or
hardware decoders; AV1 (`libsvtav1`) is not written: Safari decodes it only on recent chips (A17 and M3, iOS 17 and macOS 14), so an MP4 stays
necessary, and VP9 already fits the size targets; Playwright's own video recording films the whole slide at 25 frames a second
and 1x, and its text was visibly softer.
