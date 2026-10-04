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
