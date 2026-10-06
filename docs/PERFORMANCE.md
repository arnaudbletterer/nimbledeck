# Performance

What was measured, what changed, what was left alone. All numbers are from one machine (Apple Silicon Mac, 6 cores,
Node 26, Python 3.12, matplotlib 3.11, numpy 2.5) on `examples/how-it-works`, so read them as ratios, not promises.
The scripts were throwaway; the method is stated with each row.

## Results

| What | Before | After | Change |
|---|---|---|---|
| Live code, one plot run (runner, client side, median of 10, 1.2 s apart) | 626 ms | 132 ms | about 4.7x faster |
| Live code, a run that only prints | 501 ms | 22 ms | about 23x faster |
| Live code, keystroke to updated output in the browser (median of 8) | about 1230 ms (600 debounce + 630 run) | 431 ms (300 debounce + 130 run) | about 2.9x faster |
| Live code, first run on a machine with many fonts | over 12 s, hits the 10 s timeout, every run | one wait at startup, then none | fixed |
| `nimbledeck run` to the deck answering HTTP (median of 8) | 3.3 s | 2.7 s | 0.6 s less |
| `nimbledeck verify` on the 29 slide example | 73.7 s | 27.5 s | 2.7x faster, same findings |
| `nimbledeck check` on the example | 0.13 s | 0.13 s | unchanged |
| Save the .md to the browser showing it (HMR, text slide) | 45 to 160 ms (first save 620 ms) | same | unchanged |

The "before" of the live-code rows is the runner at the start of this work with a warm matplotlib cache for the 626 ms
and 501 ms rows. On this machine the real "before" was worse, see the first change below.

## What changed

1. **One shared matplotlib font cache.** Every run set `MPLCONFIGDIR` to a fresh folder, so every run rebuilt matplotlib's
   font cache. Measured directly: 19.3 s of import with an empty cache folder, 0.49 s with a filled one. The runner now
   creates one cache folder (`.nimbledeck/cache/matplotlib` for `nimbledeck run`, a temporary one when started by hand),
   fills it at startup in the background, and the first run waits for that before its timeout starts.
2. **A waiting wrapper process.** About 0.5 s of a plot run is importing numpy and matplotlib, and loading fonts for the
   first figure. The runner keeps one wrapper process that has done this and waits for a job on stdin. A run takes it, a new
   one is started at once. Every run still gets its own process, session, limits and kill, and no process runs two jobs, so
   the security model in `ARCHITECTURE.md` is unchanged. Cost: one idle Python process of about 50 MB while the runner
   is up, and one extra process started per run (the same imports as before, paid earlier). If the next run arrives before
   the replacement has finished importing, it waits for the rest of it, never longer than the old cold start.
3. **No interpreter teardown.** After the output is flushed the wrapper calls `os._exit`. Shutting down numpy and
   matplotlib took about 90 ms of each run. Trade-off: `atexit` handlers registered by the user's code do not run.
4. **Debounce 600 ms to 300 ms** in `<LiveCode>`. A superseded run is killed at once, so a shorter wait does not queue work.
   A steady typist (a key every 150 to 250 ms) still triggers no run mid-word.
5. **Slidev started with node, not `npx`.** `npx` costs about 0.6 s before Slidev begins. The CLI resolves
   `@slidev/cli` from the deck project and falls back to `npx` when it is not installed there.
6. **`verify` checks four slides at a time.** It waited a fixed 1.2 s (4.5 s for demos) per slide, one after the other.
   Four pages in parallel give identical output (compared with a config that produces 41 findings) in order. Eight
   pages were no faster on 6 cores. Set `NIMBLEDECK_VERIFY_PAGES` to change it.

## Measured and left alone

- **Browser, per slide.** With a real GPU (Chrome with Metal), the main thread is busy 2 to 7 percent at 60 fps on every
  slide, including the Orbit canvas, the three.js scene and the live stream, over 5 s each. Neighbouring slides that are
  mounted but inactive add nothing visible: `useActive()` gating works. The profile of a mermaid slide shows idle time
  except for Slidev's own mermaid layout.
- **Headless software rendering is not a fair test of WebGL.** The same three.js slide takes 99 percent of the main thread at
  20 fps in Playwright's headless Chromium (software GL). Cutting the torus knot from 57,600 to 10,000 quads changed nothing
  there (22 vs 20 to 25 fps), so the cost is fill rate, not geometry, and the change was dropped.
- **Bundle.** Three.js (Scene3D, 483 KB) and CodeMirror (LiveCode, 453 KB) are already separate chunks, loaded only
  when a slide mounts them or sits next to one. Opening slide 1 loads 549 KB of JS (195 KB gzip); the live-code slide loads
  1.0 MB. The largest chunks on a slide that neighbours a mermaid diagram are Slidev's (mermaid and elk, 1.5 MB) and shiki
  (217 KB on every slide). They are not Nimbledeck's to split.
- **PNG compression** of the figure: compression level 1 saves 8 ms of 87 and makes the picture 80 percent bigger. Dropped.
- **A fork server** (preloaded parent that forks per run) was not built. The waiting process gets most of the gain
  with the existing pipe, limit and kill code; a fork server would need file descriptor passing and exit-status relay.
- **Time to first slide in a fresh browser** (about 3 s after the server answers in dev) is Vite transforming and loading
  modules on first request. It happens once per server start, in Slidev, and was not changed.
- **`nimbledeck check`** takes 0.13 s. Nothing to gain.

## Re-measuring

- Runner: start `runner.py` with `NIMBLEDECK_TOKEN` set, send `run` messages over a WebSocket with an allowed `Origin`,
  and time the round trip. Leave 1.2 s between runs so the waiting process is ready, as a person typing would.
- Startup and `verify`: `time nimbledeck verify how-it-works.md --url ...` against a deck started with
  `NIMBLEDECK_PORT_OFFSET`.
- Browser: Playwright with the Chrome DevTools `Performance.getMetrics` (`TaskDuration` per second) and a
  `requestAnimationFrame` counter; use a real GPU (`--use-angle=metal`) or the WebGL numbers mean nothing.

## Showcase

The 18 slide deck `examples/showcase`, measured on the web edition (16 slides, served statically) and in dev. Same Mac
(Apple Silicon, headless Chrome 154 with Metal), but other jobs were running on it (load average 10 to 14), so software-GL
numbers are noisy and only large differences are reported. Slide numbers are the web edition's (deck slide 15 onwards is 13).

| What | Before | After | Change |
|---|---|---|---|
| First slide visible, 10 Mbps, 40 ms RTT, HTTP/2, cold cache (median of 5) | 454 to 468 ms | 389 to 400 ms | about 65 ms less |
| First video frame on the Clip slide, same network (median of 5) | 709 to 840 ms, 3 requests | 554 to 575 ms, 1 request | about 200 ms less |
| Enter the 3D slide (6 to 7), long task, 1x / 3.4x CPU slowdown, GPU | 62 ms / 174 ms | none / none | fixed |
| WebGL contexts after 24 visits to the 3D slide | 24 (Chrome logs "Too many active WebGL contexts", 8 lost) | 1 | fixed |
| Listeners and nodes leaked per visit to the 3D slide | 5 and 1 | 0 and 0 | fixed |
| Weight of before.jpg + after.jpg | 347 KB | 212 KB | 39 percent less |
| Frames per slide, 5 s each, 1x and about 3x CPU slowdown, GPU | 60 fps, 0 to 1 slow frame | same | already good |

Unchanged and already light: slide 1 loads 234 KB over 40 requests (198 KB JS gzipped, 3 Slidev modules are most of it); no mermaid or
CodeMirror ships in the web build; three.js (120 KB gzipped) is inlined in the 3D slide's chunk and only loads
from the slide before it; the neighbouring slides' images and video are fetched while the previous slide is shown. Main thread
busy time with a GPU is 1 to 12 percent on every slide at 1x and 4 to 12 at a measured 2.5 to 3.4x slowdown. `useActive()` gating holds:
a requestAnimationFrame counter attributed by chunk shows only the active slide's component running (Aurora 60 per second on
slides 1 and 3, Typewriter only while typing, none on text slides). Heap after three walks of the deck: 7.1, 7.4, 7.6 MB, listeners flat at 128
(they grew 131, 136, 141 before). Dev: `nimbledeck run` answers HTTP in about 4.2 s, HMR of one line takes a median 175 ms,
the first cold load in the browser takes 5.9 s (Vite transforms, 400 modules, not changed).

### What changed

1. **Scene3D builds its renderer at idle and keeps it while the slide is a neighbour.** The context, shader compile and geometry upload
   took about 60 ms (170 ms with a 3.4x slowdown) inside the transition. It is now built 1.2 s after the slide mounts, when the browser is
   idle; only the render loop follows `useActive()`. Controls, geometry and material are disposed, and `forceContextLoss()` releases the
   context (after 1.2 s, so it does not land in the next transition). Trade-off: one GL context is held while the slide is a neighbour,
   at most three at a time. Each entry resets the rotation and camera, so it looks as before.
2. **`build-web` adds the first slide's files to `index.html`** as `modulepreload` and stylesheet links. They come from the dependency lists
   Vite wrote in the entry script; if the format changes the step prints "skipped" and the page still works. A deep link to another slide
   gains nothing and fetches about 10 KB it does not need.
3. **Assets.** `loop.mp4` has `-movflags +faststart` (same bitstream, same size, the index first). The two JPEGs are progressive with
   optimised tables at quality 85.

### Measured and left alone

- **Aurora adaptive resolution.** With software rendering and a measured 3.7x slowdown the main thread is 90 to 99 percent busy on slide 1 but
  frames hold 57 to 60 fps, so a 14 ms trigger would not fire. The canvas is already at half resolution. Not built.
- **Orbit, Marquee, Kinetic, Typewriter.** 1 to 7 percent busy with a GPU. Removing `will-change` from the Kinetic units changed nothing
  (software rendering, slide 3 and 5, within noise). Left as is.
- **Software GL (`--disable-gpu`).** The Orbit canvas and Scene3D are the cost: Scene3D runs at 10 to 16 fps with no GPU, as noted above. Pixel ratio steps
  gave 6 to 8 fps and turning antialiasing off gave between no change and 6x depending on the run, with the machine loaded: inconclusive, so
  nothing was changed. A real laptop GPU is not in this case.
- **Chart entry.** Creating the Chart.js chart is a 57 to 96 ms task when entering a chart slide (the showcase deck no longer has one). Creating it early would play its animation off screen;
  not changed.
- **The two walls.** `<LookWall />` is twenty cards of plain CSS and one ring moved by `transform`; `<MotionWall />` is twenty-one scaled mini slides, ten CSS backdrops and two small canvases (Aurora and Shader at half resolution of a 107 px card). Slides 9 and 10 of the showcase held 60 fps with a 16.7 ms median and a 16.8 ms worst frame over five seconds in headless Chrome on the same Mac, the same as the plain statement slide beside them. Nothing runs while the slide is off screen.
- **Fewer bytes on slide 1.** The shiki and vue chunks (108 KB gzipped) belong to Slidev. No web fonts are used. WebP or AVIF: the file names are in
  `showcase.md`, so not changed.
- **Dev edition walk.** Only the web edition was walked slide by slide; slides 13 and 14 (live code, Python stream) were not measured.

### Re-measuring

`npm --workspace examples/showcase run build:web` with `WEB_BASE=/ WEB_OUT=<dir>`, serve it over HTTP/2 with gzip (a self-signed certificate
and `ignoreHTTPSErrors`), then Playwright with Chrome: `Network.emulateNetworkConditions` (40 ms, 10 Mbps), `Emulation.setCPUThrottlingRate`
(re-send it after navigation and measure the real slowdown with a loop in the page: 4 gave 2.5 to 3.7x), `Performance.getMetrics`
(`TaskDuration` per second), a `longtask` observer, a requestAnimationFrame wrapper that reads `new Error().stack` for the chunk name, and
`HeapProfiler.collectGarbage` before reading `JSHeapUsedSize` and `JSEventListeners`.
