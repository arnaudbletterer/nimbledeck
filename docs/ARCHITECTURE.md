# Architecture

## Pieces

```
packages/addon   slidev-addon-nimbledeck   components + design tokens + composables
packages/theme   slidev-theme-nimbledeck   eight layouts, three variants, pulls in the addon by default
packages/cli     nimbledeck                run, check, verify
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

`NIMBLEDECK_PORT_OFFSET=<n>` adds `n` to every port (deck, demos, streams, runner), so several decks, or several agents on
one machine, can run side by side. `nimbledeck.json` carries the shifted ports, so the components follow. Example:
`NIMBLEDECK_PORT_OFFSET=200 npm run example` serves the deck on http://localhost:3230.

Each child's output goes to `<deck folder>/.nimbledeck/logs/<name>.log` (the deck's own Slidev output stays on the
terminal). When a child dies, the CLI prints `<name> exited (code N), see <log>` and keeps the rest running. Add
`.nimbledeck/` and `public/nimbledeck.json` (it holds the session token) to the deck project's `.gitignore`.
`nimbledeck run` validates the config first: `python.version` must look like `3.12`, and every demo, stream, requirements
and `publicDir` path must stay inside the project folder and contain no shell characters.

## nimbledeck.config.json

| Key | Default | Meaning |
|---|---|---|
| `python.version`, `python.requirements` | `3.12`, `demos/requirements.txt` | Python for `uv run`, and the packages file (used when it exists) |
| `demos`, `streams` | none | `{ "name": { "file": "...", "port": n } }` for `<Demo>` and `<PyStream>` |
| `runner` | none | `{ "port": n }` enables live code |
| `port`, `publicDir` | `3030`, `public` | the deck's port, and where its assets live |
| `limits.maxTitle`, `limits.maxSubtitle` | 40, 55 | longest `# title` (error) and `#### subtitle` (warning) before the theme cuts it off |
| `limits.maxBullets`, `limits.maxChars` | 7, 900 | bullets per slide, and characters of prose per slide (warnings) |
| `leadLayouts` | `cover, divider, closing, full, end, section, intro, none` | layouts that need no `# title` and skip the text limits |
| `verify.chrome` | `.nd-foot, .nd-page, footer` | CSS selectors of slide furniture, exempt from `verify`'s placement checks |
| `verify.bleed` | `.nd-photo, .nd-media` | CSS selectors of media meant to reach the slide edge |

A list given in the config replaces the default list; it is not merged. A brand theme with its own classes and layout
names sets `leadLayouts` and `verify`, so the generic CLI carries no brand names.

`nimbledeck verify <deck.md>` opens the running deck in Chrome at 1280 x 720 (device scale 2) and reports content that
overflows the slide, enters the footer zone, is clipped or cut by an ellipsis, or is too low-resolution for its box.

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
- to start fast, the runner keeps one wrapper process waiting with numpy and matplotlib already imported. A run takes it
  and a new one is started at once, so no process ever serves two runs: each is still its own process and session, with
  the same limits (the CPU limit is set by the process itself when the job arrives), the same timeout and the same kill.
  Its stdin is `/dev/null` for the user's code. Matplotlib's font cache lives in one shared folder
  (`.nimbledeck/cache/matplotlib`), not in each run's folder;
- output is read incrementally and only its last 20,000 characters are kept; a run that prints more than 10 MB is stopped.
  A figure file larger than 8 MB is dropped without being read.

It is for the presenter's machine and the presenter's own code. Do not expose the port, and do not paste code you would
not run anyway. Windows: no limits, the process-group kill falls back to a plain kill; not tested.

## Known risk: marimo demos run without a token

`nimbledeck run` starts each `<Demo>` with `marimo run ... --host 127.0.0.1 --headless --no-token`. The demo is bound to
localhost, but it has no authentication: any local process, and any web page open in the same browser, can reach
`http://127.0.0.1:<port>` and use the demo like the slide does. In `run` mode marimo serves an app, not an editor, and does
not send the source to the client by default, so a visitor can drive the demo's own widgets and nothing more. Whatever
those widgets make the demo do (read a file, compute for a long time) is open to them. Whether marimo checks the Origin of
its WebSocket in this mode was not verified.

Options, none implemented yet:

1. Accept it for demos you wrote, on a single-user machine (today's behaviour).
2. `--token-password-file <file>` (or `--token-password`): marimo then requires the token. The iframe URL must carry it
   (`?access_token=...`), so the `Demo` component, which lives in `packages/addon`, has to append it, read from
   `nimbledeck.json` the way the runner token is, and its offline probe must carry it too. Prefer the file form: a password
   on the command line is visible to other local users in `ps`.
3. `--allow-origins` to restrict CORS to the deck's origin. This does not stop a request from another process.

Option 2 is the proper fix and needs a change in the addon first.

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
2. **Never trust a 0 measurement.** A mounted but hidden slide reports width 0, so a measured size of 0 means "not
   visible", not "empty". Use a fixed logical size (the slide canvas is 1280 wide).
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
`--nd-bg --nd-ink --nd-muted --nd-accent --nd-accent-2 --nd-surface --nd-line --nd-font-body --nd-font-display`, the chart
palette `--nd-chart-1` to `--nd-chart-4` (used by `Chart`), and the quiz feedback tints `--nd-good` and `--nd-bad`.
The base theme adds `--nd-cover-bg --nd-cover-fg --nd-title-transform --nd-title-size`.
The variant is chosen by the headmatter key `ndVariant`, applied as `data-nd-variant` on `<html>`.

## The CLI checker

`nimbledeck check <deck.md>` reports errors (exit 1) and warnings. It resolves the deck's theme and addons the way
Slidev does (`theme: foo` is the package `slidev-theme-foo`), so layout names are validated against the real
theme. Limits (`maxTitle`, `maxBullets`) come from `nimbledeck.config.json`.
