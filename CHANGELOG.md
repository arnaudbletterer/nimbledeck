# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](docs/RELEASING.md). Nimbledeck
has not had a tagged release yet, so everything below sits under Unreleased.

## Unreleased

- Add `<LookWall />` (every look of the theme as a live card: hover previews a look on the whole slide, a click keeps it) and
  `<MotionWall />` (every motion preset playing on a real mini slide in a wave, with a row of animated backdrops). The showcase deck
  replaces its two benchmark slides with them and uses motion and background presets itself. See docs/components.md.
- Add fifteen looks to the base theme (`editorial`, `swiss`, `neon`, `terminal`, `blueprint`, `sunset`, `ocean`, `forest`, `mono`,
  `candy`, `gold`, `newsprint`, `slate-pro`, `high-contrast`, `print`), chosen with `ndVariant`. They are listed in
  `packages/theme/looks.json`, which `nimbledeck check` uses to reject an unknown `ndVariant`, and a test keeps it in step with the
  stylesheet and checks contrast. `<Looks />` takes any ids and tours a wider default set. `plain` and `paper` have a slightly darker
  muted colour and a chart palette that reaches 3:1, and `night` has dark quiz tints. See docs/THEMING.md.
- Add docs/HANDOFF.md with the state of the work and the open items.
- Add `nimbledeck record`: films the live components of a deck (LiveCode, PyStream, Demo) into `public/recordings`, with
  scripted typing, keys, sliders and clicks set in `nimbledeck.config.json`. The components play the recording when their
  process is not running, and the web editions keep the slides that have one. See docs/RECORDING.md.

## Unreleased

State of the project at 0.1.0 (the version in every `package.json`; no tag has been cut).

### Added
- `slidev-addon-nimbledeck`: live components (canvas, three.js, Python streams, local Marimo demos, video, websites,
  charts, live code, quiz, flip card, compare slider, count-up), composable placement with `Stage` and `At`, and design
  tokens.
- `slidev-theme-nimbledeck`: eight layouts (cover, closing, agenda, divider, default, two-cols, photo-right, full) and three variants
  (plain, paper, night).
- `nimbledeck` CLI: `run` (starts a deck with its demos), `check` (slide rules), `verify` (renders the deck in Chrome and
  measures it), `new` (scaffolds a deck project) and `export` (PDF with one page per build step, finds Chrome on macOS,
  Linux and Windows).
- `examples/how-it-works`: a deck that describes and exercises everything above.
- Continuous integration workflow for Ubuntu, macOS and Windows (not yet run on GitHub).
- Guides: getting started, writing, theming, architecture, decisions, releasing.

### Changed
- Every npm dependency and the example's Python requirements are pinned to exact versions, so installs are reproducible.

### Known gaps
- Windows has not been tested end to end.
- No license has been chosen (see `docs/RELEASING.md`).
