# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](docs/RELEASING.md). Nimbledeck
has not had a tagged release yet, so everything below sits under Unreleased.

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
