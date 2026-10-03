# Architecture

## Pieces

```
packages/addon   slidev-addon-nimbledeck   components + design tokens + composables
packages/theme   slidev-theme-nimbledeck   seven layouts, three variants, pulls in the addon by default
packages/cli     nimbledeck                run, check
examples/        decks that exercise everything (also the integration test)
```

A deck project needs: a Slidev entry file, `nimbledeck.config.json`, optional `demos/` (Python), `public/` (assets).

## Runtime: what talks to what

| Content | Runs where | Link to the slide |
|---|---|---|
| Builds, motion, canvas, WebGL | The browser | Vue components, no process needed |
| Marimo demo (`<Demo>`) | A local `marimo run` process, port from config | iframe on `http://127.0.0.1:<port>` |
| Python stream (`<PyStream>`) | A local Python process | WebSocket on `ws://127.0.0.1:<port>`, binary float32 frames |
| Video, website | The browser / the remote site | `<video>`, iframe |

`nimbledeck run` reads `nimbledeck.config.json`, checks that every port is free, starts each process with
`uv run` (bound to 127.0.0.1), writes `public/nimbledeck.json` with the ports, starts the deck, and stops
everything on exit. Components read `nimbledeck.json` at runtime, so they never import project files.

## The live-code runner and its security model

`runner/runner.py` executes Python typed on a slide. It runs code with the presenter's own rights, like a notebook, so it is
strict about who can talk to it:

- binds to 127.0.0.1 only; a connection needs the per-session random token (`?t=`) and an `Origin` header from the deck's
  own origins (`--origin`). A request without an Origin is refused too, so only a browser on the deck's page connects
  (checked in tests with an explicit Origin header, and in a real browser);
- every run is a separate subprocess in a temporary folder and its own process group, with a wall-clock timeout (at most
  60 s), killed as a whole at the end or when a newer run replaces it. On POSIX it also gets a CPU limit
  (`RLIMIT_CPU`) and a file-size limit (`RLIMIT_FSIZE`) where the OS accepts them;
- memory: `RLIMIT_AS` is set where the OS accepts it (Linux; macOS refuses it, and the runner logs that at startup), and on
  every POSIX system the runner also polls the resident memory of the run's process group every 200 ms and kills it above
  `--memory-mb` (default 4096), reporting "Stopped: memory limit". Windows has no memory limit;
- output is read incrementally and only its last 20,000 characters are kept; a run that prints more than 10 MB is stopped.
  A figure file larger than 8 MB is dropped without being read.

It is for the presenter's machine and the presenter's own code. Do not expose the port, and do not paste code you would
not run anyway. Windows: no limits, the process-group kill falls back to a plain kill; not tested.

## Failure model

- Demo process down: the `Demo` component shows an offline panel (and a poster if `public/posters/<name>.png`
  exists). It probes every 3 s and swaps the iframe back in when the process returns.
- Stream process down: `PyStream` shows an offline notice and reconnects every 2 s.
- A subprocess that crashes inside a demo is caught by the demo's own code. Only that demo shows an error.
- Port already in use: `nimbledeck run` refuses to start and names the port.
- Leaving a demo slide: a long computation already started in a subprocess keeps running to the end (measured with
  a marimo demo). Returning gives a fresh session and the earlier result is lost. A stream closes its WebSocket
  when its slide is left.

## Rules every live component must follow

1. **Gate on `useActive()`.** Slidev keeps neighbouring slides mounted. Without the gate, timers, sockets and WebGL
   keep running off screen.
2. **Never measure the element's size.** A mounted but hidden slide reports width 0. Use a fixed logical size
   (the slide canvas is 1280 wide).
3. **Colours come from tokens**, via `cssVar('--nd-ink')`, never hard-coded.
4. **Shared CSS goes in the global stylesheet**, never in one layout's `<style>`. Slidev loads a layout's styles
   only when that layout is first used, so a slide loaded on its own would lose them.
5. **Render canvases at the real resolution** with `useCrisp` (slide units x slide scale x pixel ratio), drawing in
   logical coordinates, so they stay sharp on large and high-density screens.
6. **Fill the box you are given.** Components are plain elements (no margins, borders or backgrounds of their own),
   so `<Stage>`/`<At>` can layer them. Widths use `auto`, never `100%` plus side margins.
7. **Apply parameter changes between steps** in stream servers, never mid-step (a resize during a step crashed an
   early version).

## Design tokens

Defined with zero CSS priority (`:where(:root)`) in the addon, so any theme overrides them. Tokens:
`--nd-bg --nd-ink --nd-muted --nd-accent --nd-accent-2 --nd-surface --nd-line --nd-font-body --nd-font-display`.
The base theme adds `--nd-cover-bg --nd-cover-fg --nd-title-transform --nd-title-size`.
The variant is chosen by the headmatter key `ndVariant`, applied as `data-nd-variant` on `<html>`.

## The CLI checker

`nimbledeck check <deck.md>` reports errors (exit 1) and warnings. It resolves the deck's theme and addons the way
Slidev does (`theme: foo` is the package `slidev-theme-foo`), so layout names are validated against the real
theme. Limits (`maxTitle`, `maxBullets`) come from `nimbledeck.config.json`.
