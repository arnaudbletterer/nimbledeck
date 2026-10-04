# Roadmap

Nimbledeck makes Slidev decks that run live: Markdown for the story, components and local processes for the motion, interaction and
compute. This roadmap is about making it public and useful to people who have never heard of it. It is independent of any one
organisation's decks or brand.

Status: early (version 0.1.0). Everything below was written from an audit of the repository on 2026-10-04. Items marked **verified**
were checked in the code or by running it; items marked **assumed** were not.

## Where we are

Works today (verified):
- 8 layouts and 3 theme variants, about 20 components (canvas, WebGL, charts, Python stream, local demos, live code editor, quiz, video,
  photo, command palette, and more), and a checker (`check`), a browser placement and resolution verifier (`verify`), a scaffold
  (`new`), a PDF export (`export`) and a launcher (`run`).
- 60 unit tests, a browser end-to-end script with about 70 checks, a live-code runner with token, origin check and resource limits, tested on macOS.
- Independent architecture, security, code, UX and product reviews; their confirmed findings were fixed or written down (see docs/DECISIONS.md).

Not there yet (verified):
- No license. No security policy, contributing guide, code of conduct, issue templates or editor config.
- Package metadata is empty (`license`, `repository`, `keywords`), the root is private, nothing is published. The three package names
  (`nimbledeck`, `slidev-addon-nimbledeck`, `slidev-theme-nimbledeck`) are free on npm.
- A new project made with `nimbledeck new` links to the Nimbledeck checkout it was created from (relative `file:` links), so a stranger
  cannot start without cloning this repository first.
- The repository still contains organisation-specific material (see Milestone 0).
- Windows, Linux, Firefox and Safari are untested. The CI workflow exists but has never run.

Principles to keep (do not trade away):
1. Markdown is the source of truth; no inline CSS or HTML in decks.
2. Heavy work runs in local processes, never in the browser; a failing demo must not stop a talk.
3. Local only by default: bound to 127.0.0.1, no telemetry, no accounts.
4. A theme is replaceable: components follow design tokens; brands live in their own repositories.
5. Every behaviour has a test that fails when it breaks; a feature is not done until it was seen working in a real browser.

## Milestone 0: publishable (identity, legal, hygiene)

Goal: nothing in the repository embarrasses or exposes anyone, and the legal status is clear.

- [ ] **P0 License.** Choose one (MIT or Apache-2.0 fit the dependencies, which are MIT, Apache-2.0 and BSD). Add `LICENSE` and the
  `license` field to every package. The owner decides, and should check whether an employer has a claim.
- [ ] **P0 Remove organisation-specific content.** README names a private git host; docs/THEMING.md uses a company theme as its example;
  docs/HANDOFF.md holds local paths and the company repository. Replace with neutral examples (a made-up brand), move HANDOFF.md out of
  the public repository, and re-run a search for internal names before every release. Acceptance: a search for the organisation's name,
  host names and home paths returns nothing.
- [ ] **P0 Name check.** The earlier candidate "LiveDeck" collided with an existing project in the same niche. Do a proper check for
  Nimbledeck (trademark databases, GitHub, PyPI, search engines) before announcing. npm names are free today.
- [ ] **P0 Package metadata.** `repository`, `bugs`, `homepage`, `keywords`, `engines`, `license`, `files` in each package; a clean
  `npm pack` for each (inspect the tarball contents).
- [ ] **P1 Community files.** `SECURITY.md` (how to report, what the runner can do, supported versions), `CONTRIBUTING.md` (setup, tests,
  commit style, how to add a component), `CODE_OF_CONDUCT.md`, issue and pull request templates, `.editorconfig`.
- [ ] **P1 Third-party notices** re-checked against the lockfiles before each release (THIRD_PARTY.md says "not legal advice").
- [ ] **P2 Provenance.** Publish from CI with npm provenance; sign tags.

## Milestone 1: a stranger succeeds in ten minutes

Goal: from "heard of it" to a running, good-looking live deck without reading source.

- [ ] **P0 Publish the packages** (CLI, addon, base theme) so `npm create`/`npx nimbledeck new my-talk` works without a checkout. The
  scaffold must use registry versions, not `file:` links. Acceptance: on a clean machine with only Node, uv and Chrome, one command creates
  a deck and `npm run dev` shows it.
- [ ] **P0 Time-to-first-deck measurement.** Run the first-run script in the appendix on macOS, Linux and Windows, record the time and every
  friction point, fix the top three.
- [ ] **P0 README that sells and teaches.** One screenshot or short recording of a live deck at the top, a 30-second "why", a 5-line
  quick start, and an honest comparison with Slidev alone, reveal.js, Marp and notebook-based slides (what Nimbledeck adds and what it does not).
- [ ] **P1 Docs site.** The example deck already explains itself; publish it (static build) as the live demo, plus a gallery of every
  component with copyable snippets and a "recipes" section (a live plot, a quiz, a full-frame website, a Python stream, a before/after).
- [ ] **P1 Better first-run diagnostics.** `nimbledeck doctor`: checks Node, uv, Python, Chrome, ports, and prints exact fixes. (Today a
  missing tool gives a clear error, but there is no single health check.)
- [ ] **P1 Fewer moving parts to start.** The example starts six processes (three demos, a stream, the runner and the deck server). Offer a "no Python" path (everything except the runner and
  Python demos works without uv) and say so in the docs; consider hosting demos and streams from one process.
- [ ] **P2 Editor and agent support.** Snippets for common editors, a documented prompt for AI agents (AGENTS.md exists), and an evaluation
  of Slidev's own MCP server for agent workflows.

## Milestone 2: trustworthy

Goal: it works on the platforms people use, upgrades do not break decks, and security claims are true.

- [ ] **P0 Cross-platform CI that runs.** Make the existing workflow green on Ubuntu, macOS and Windows: unit tests, `check`, a Slidev build
  of the example, and the browser end-to-end script (headless, in CI). Fix what Windows breaks (process handling, paths, quoting).
- [ ] **P0 Compatibility policy.** State supported Node, Python, Slidev and browser versions; test against the newest Slidev on a schedule.
  Reduce reliance on Slidev internals: the palette thumbnails import private Slidev files (`internals/*`); either replace them with a
  public API, vendor them, or isolate behind one adapter with a test that fails loudly on a Slidev upgrade.
- [ ] **P0 Security model made enforceable.** The runner executes code with the user's rights. Keep the token, origin check and limits, and add:
  an opt-in container or sandbox mode, resource limits on Windows, a safer way to hand the token to the page, and an authenticated
  option for the local demo apps (they run without a token today). Publish the threat model in SECURITY.md.
- [ ] **P1 Accessibility pass.** Real screen reader and keyboard walkthrough of the quiz, flip card, palette, code editor and embedded-page
  guard; contrast audit of the base themes (the checks done so far were on one brand theme); reduced-motion everywhere.
- [ ] **P1 Test depth.** Component tests (not only the end-to-end script), a visual-regression suite for the base themes, and the top
  untested behaviours from the code review (embedded-page geometry, port handling, palette search, image-size checks).
- [ ] **P1 Static builds.** Define what works in a built deck: live components need local processes, the palette can only search titles
  because Slidev blanks slide text in builds. Generate a search index at build time, and show a clear offline panel everywhere.
- [ ] **P2 Presenter workflow.** Presenter view with live components, speaker notes and a rehearsal timer are untested; recording a talk is untested.

## Milestone 3: useful for everyone

Goal: people make it their own without forking.

- [ ] **P1 Theme authoring kit.** A documented contract for brand themes, a `nimbledeck check-theme` command that tests the layout and token
  contract, and a template repository for a brand theme. More neutral base themes (for example a code-first dark theme, an editorial serif theme).
- [ ] **P1 Components people ask for.** Candidates, to be validated with users first: embedded terminal output, 3D model viewer, map, data
  table with sorting, a poll with audience voting (opt-in, needs a network port), speaker timer. Each needs tokens, accessibility and tests.
- [ ] **P1 Python ecosystem.** Documented patterns for numpy, pandas, plotly and matplotlib animations in the runner and streams; a
  generic stream protocol so other languages can drive a canvas; a warm worker pool to cut the 1 to 2 second run time.
- [ ] **P2 Export.** PDF is solid. PPTX is one image per slide with no animations; document it plainly, and evaluate native conversion only if
  demand is real.
- [ ] **P2 Internationalisation.** UI strings (palette, cheat-sheet, verdicts) are English; make them overridable.

## Later, ideas (not committed)

- One local server hosting runner, streams and demos on a single port.
- Optional in-browser Python (WebAssembly) for tiny demos on static sites.
- A visual editor on top of the Markdown (round-trip editing was judged too risky early on).
- A hosted gallery of community themes and recipes.

## Non-goals

- A WYSIWYG slide editor, collaborative editing, or a cloud service.
- Replacing Slidev; Nimbledeck stays a layer on top and tracks it.
- Making live content work inside PowerPoint.
- Telemetry, accounts or anything that phones home.

## Risks and open questions

- **Slidev dependency.** Upgrades can break layouts and private imports. Mitigation: compatibility matrix, scheduled CI, an adapter layer.
- **Code execution.** A deck is code (components, setup files, demos, live code). Opening untrusted decks is unsafe; say it everywhere.
- **Two toolchains** (Node and Python). Mitigation: `doctor`, a no-Python path, clear errors.
- **Maintenance load of the component set.** Freeze new components until Milestones 0 to 2 are done.
- Open: which license; whether to publish under a scope (`@nimbledeck/*`) or the free unscoped names; whether Windows is a launch requirement.

## Appendix: first-run usability review (for a first-time evaluator)

Use a clean machine or user account if possible. Time each step and write down every moment of confusion, every error message you had to
search for, and every place you wanted to give up. Do not read the source.

1. From the README alone, install what is needed. Time it. Was anything missing or wrong?
2. Create a deck (`nimbledeck new`), start it, and open it. Time to the first rendered slide.
3. Edit the Markdown: change a title, add a slide with a layout, add a chart, a quiz and a full-frame slide. Did the layout names and component
   tags feel guessable? Which error messages helped and which did not?
4. Add a live Python plot with `<LiveCode>`. How long until it worked? What was unclear about the runner and the config?
5. Break things on purpose: stop a demo, use a wrong layout name, a long title, an oversize image. Does `check` and `verify` explain it?
6. Present it: fullscreen, the shortcut cheat-sheet (`?`), the slide palette (`/`), presenter view. Anything you could not find or do?
7. Export a PDF handout. Is the result what you would send?
8. Read the docs as a newcomer: what did you search for and not find? What is jargon you did not understand?
9. Verdict: would you recommend it to a colleague today, and what is the one change that would most increase that likelihood?
