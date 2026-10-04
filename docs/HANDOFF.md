# Handoff: state of the work (2026-10-04)

Read this first when starting a new session. It is a snapshot, not a design document: see README.md, docs/ARCHITECTURE.md and
docs/DECISIONS.md for the why.

## Where things are

| What | Where | State |
|---|---|---|
| Nimbledeck (this repo) | `/Users/abletterer/Projects/nimbledeck`, remote `ssh://git@git.abletterer.synology.me:40001/abletterer/nimbledeck.git` | `main`, 60 unit tests pass. |
| Quartier Latin brand theme and decks | `/Users/abletterer/Projects/presentations/Presentations-QuartierLatin-Brand`, branch `feat/ql-theme-on-nimbledeck` (the parent folder `presentations` is the git repo) | Committed, not merged into `master`, no remote. Depends on this repo through `file:../../nimbledeck/...`. |
| Reference branches in the brand repo | `feat/slidev-vs-marimo-spike`, `feat/slidev-animation-spike` | Early experiments, kept for reference only. |

Tools installed with Homebrew: Node 26, uv. Python runs through uv.

## Run it

```sh
cd /Users/abletterer/Projects/nimbledeck && npm install
npm run example                                   # example deck, http://localhost:3030
npm test                                          # unit tests (CLI, runner, addon)
node examples/how-it-works/e2e-interactions.mjs   # browser end-to-end test, needs the example running
cd /Users/abletterer/Projects/presentations/Presentations-QuartierLatin-Brand/decks
NIMBLEDECK_PORT_OFFSET=100 npx nimbledeck run PatternGallery.md   # brand gallery on 3130 (offset shifts every port)
npx nimbledeck check <deck.md>                    # lint; `verify <deck.md>` needs the deck running; `export <deck.md>` makes a PDF
```

The brand decks are PatternGallery (every pattern), StrategicOverview, EpicsStatus, TeamWorkStatus, Starter. `decks/GUIDE.md` is the brand
authoring guide, `decks/MIGRATION.md` the policy for older Marp decks.

## Decisions already taken

- Slidev is the base; heavy work runs in local processes; the live-code runner executes Python locally with a token, an origin check and limits.
- Brand body text is 28px by default; `ql-dense` is the brand's 21px scale, `ql-large` is bigger. Coloured-text fallbacks and the closing-photo
  scrim are kept. Emphasis chips are controllable per deck, slide and word.
- Older Marp decks stay archived; convert one only when it is reused (`decks/MIGRATION.md`).
- Nimbledeck is hosted at the remote above. Windows is to be tested later.

## Open items

- License: none chosen (the owner decides). Teammates need Nimbledeck as a sibling checkout until it is installable from the remote or a registry.
- Windows and the GitHub Actions workflow are unverified. The winget package IDs in docs/GETTING-STARTED.md were written from memory.
- Not tested: Firefox, Safari, offline playback, presenter view with live components, a real screen reader.
- marimo demos run without a token (see docs/ARCHITECTURE.md for the risk and options).
- PPTX export is one image per slide; use PDF for handouts.
- Two commit subjects on `main` are longer than 72 characters (history is not rewritten).
- The product review's advice: take one real deck from document to delivery (presenter view, PDF handout, one live element) before adding features.

## Working notes for the next session

- Several decks can run side by side with `NIMBLEDECK_PORT_OFFSET`. Never stop servers with a broad `pkill`; stop by port or PID.
- Before verifying, confirm which deck a port serves (`curl localhost:3030 | grep title`). Two checks in this project ran against the wrong deck
  because an old server still held the port.
- A new layout or component file needs a dev-server restart; edits to existing files hot-reload.
- Changing `nimbledeck.config.json`, a Python demo, the stream server or the runner needs a restart.
