# Changelog

All notable changes are listed here, newest first. Versions follow [semantic versioning](docs/RELEASING.md). While the major
version is 0, a minor bump may break things; this release breaks nothing documented.

## 0.2.0 - 2026-10-11

The first tagged release.

- Release under the MIT license. Add a contributing guide, a security policy, a citation file, issue and pull request templates, a
  credits page for the projects Nimbledeck builds on, and a social preview card made from real slides (`website/make-social.mjs`).
- The site is deck first: the showcase deck is the front page, with the documentation under `/docs/`, a playground (twenty looks,
  twenty-one motion presets, ten backgrounds; typing never replays the slide's motion), the how-it-works deck and the science deck.
- Add a scripted tour (`tourScript`: a cursor that clicks, hovers, drags, types and presses keys, with a clock, adaptive pacing and a
  shield against the real pointer), a music bed from a file (`ndSound`, the showcase plays "Origami" by Scott Buckley, CC-BY 4.0)
  and event sound effects. A deck that declares no sound is silent. See docs/TOUR.md.
- `nimbledeck record` films at 2x pixels and writes VP9 webm and H.264 mp4 through the system ffmpeg; streams can be recorded in
  lockstep, at exactly 60 frames per second whatever the machine. See docs/RECORDING.md.
- Fix crops: the answered quiz and the `Chance` crowd stay inside their slide, the marquee and the look-wall titles keep tall
  glyphs of a fallback font, and the work runs offline-first on Windows, macOS and Linux (the CI runs all three).
- Replace the science deck with one story for a general audience, "Science, in one idea": why a positive test is often wrong
  (15 slides, about three minutes, a guess and then the reveal, pictures the viewer changes, every claim cited in
  `examples/science/REFERENCES.md`). It runs in the browser alone: no Python, no recordings, the same deck on the dev server and on the
  site. New `<Chance>` component; the `split` layout takes a `::caption::` line; the site bar and the next-steps card say "Science, in
  one idea". The earlier five-chapter talk (26 slides) is in git history. Also new, used by that talk's risk chapter and kept: `<Crowd>`
  and `<Polls>`. `<PyStream>` gains raster images, `draw` shapes, `groups`, `sizes`, `alphas`,
  `values` and slider `labels` (one table in docs/WRITING.md); `<NextSteps>` takes `skip`.
- Add equations: LaTeX in the Markdown is typeset by KaTeX with local fonts and styled by the theme in every look. `\term{n}{...}`
  colours a part with a chart colour and names it, `\val{name}{...}` is a number that follows a slider. `<Equation>` points,
  reveals and updates them, `highlight` on `PyStream`, `LiveCode`, `Demo`, `Chart` and `Scene3D` and `<Marker>` link them to a
  picture, `PyStream` takes `extra` sliders, `Clip` takes `position`. The science deck gets equation slides. See docs/EQUATIONS.md.
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

## 0.1.0 - baseline (never tagged)

State of the project before the first release.

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
- Windows was not tested end to end (the CI of 0.2.0 now runs there).
- No license was chosen (0.2.0 uses MIT).
