# Handoff: state of the work (2026-10-07)

Read this first when starting a new session. It is a snapshot, not a design document: see README.md, docs/ARCHITECTURE.md and
docs/DECISIONS.md for the why. This file is kept out of the published site.

## Where things are

| What | Where | State |
|---|---|---|
| Nimbledeck | `/Users/abletterer/Projects/nimbledeck`, remotes `origin` (Synology) and `github` (`git@github.com:arnaudbletterer/nimbledeck.git`) | Local `main` is about 180 commits ahead of `github/main`. **Not pushed on purpose**: pushing deploys the site to GitHub Pages. The owner decides when. |
| Site (preview) | `npm run docs:build`, then `npm run docs:preview` -> http://127.0.0.1:4173/nimbledeck/ | Deck-first: `/` is the showcase deck, `/docs/`, `/playground/`, `/demos/how-it-works/`, `/demos/science/`. |

## What is on `main` (all tested, local)

- Deck-first site (showcase deck at `/`), docs under `/docs/`, playground with 20 looks, 21 motion presets, 10 backgrounds.
- 20 looks (`packages/theme/looks.json`), shared title/footer grid across looks (`examples/theme-lab/align-audit.mjs --check`).
- Motion and background presets (`packages/theme/presets.json`, docs/MOTION.md), checker rules for `ndVariant`, `ndMotion`, `motion`, `background`.
- Scripted tour (cursor, adaptive pacing, clock, big play button, `/?tour`), real pointer shielded while it plays, ending with next-step cards.
- Sound: music bed from a file (`ndSound`), event-driven effects (`sfx`), tour-only soundtrack cues (`sound`, `sounds`, `when: always`).
  Music is "Origami" by Scott Buckley, CC-BY 4.0, a seamless 153.6 s loop cut at 100 bpm (credit in `THIRD_PARTY.md`,
  `examples/showcase/public/audio/CREDITS.md` and on the sound slide). Decorative cues were removed on purpose.
- Recordings (`nimbledeck record`): 2x native pixels, lossless PNG frames, VP9 webm + H.264 mp4 from the system ffmpeg
  (`brew install ffmpeg`), played by `Recorded.vue` when the Python process is not reachable. 11 clips under `examples/*/public/recordings`.
- LaTeX equations, `\term{n}{...}` colour links, live parameters (docs/EQUATIONS.md). The science deck (15 slides, one idea, no Python) is described below.
- Offline-first (docs/OFFLINE.md), performance work (docs/PERFORMANCE.md), CI on 3 OSes.

Last known checks on `main`: `npm test` 241 pass; link crawler 0 problems; `website/site-e2e.mjs`, `examples/showcase/e2e.mjs`,
`examples/showcase/e2e-tour.mjs --dist <build with WEB_BASE=/>`, `examples/how-it-works/e2e-interactions.mjs`,
`examples/motion-lab/lab-e2e.mjs` all pass (run them on a quiet machine, kill stale servers first).

## Science deck: one idea (branch `feat/science-risk-story`, not merged)

The five-chapter, 26-slide talk was replaced by one story for a general audience: why a positive test is often wrong (17 slides, about two and a half minutes, predict then reveal; one slide grammar, checked by `examples/science/coherence.mjs`). `examples/science/science.md` is edited directly; there is no compose step, no Python, no
recording and no runner, so the dev server and the hosted edition are the same deck. New `<Chance>` component (four plain-word
pictures, one colour each for sick, healthy and tested positive), `default` gained a `::caption::` slot for source lines and `numbers` a `class: nd-cards` mode, the site bar and its tour became the addon's `SiteBar` (the hosted science and how-it-works pages have it), and every
claim is cited (`examples/science/REFERENCES.md`, verified against Crossref and PubMed; `packages/cli/test/science-refs.test.mjs`).
The old chapters, demos and recordings are recoverable from commit `5722d9e` and the branches `feat/sci-*`. Check with
`node walk.mjs <url> <dir>` and `node e2e.mjs <url>` in `examples/science`.

## Lockstep 60 fps recording: merged into `main`

Streams only (owner's scope decision because of quota). `stream-nbody` and `stream-swarm` are re-recorded in lockstep (540 frames,
exactly 60 fps, even pts spacing, 3.1 MB webm each). The science deck's old Lorenz clip is gone with the old deck. Live code and marimo clips stay real time. Docs: `docs/RECORDING.md` ("Lockstep"). The branch
`feat/lockstep-recording` and its worktree can be deleted.

## Open points before a push

- Aurora background contrast in `plain` and `studio-light` is below 4.5:1 (`examples/theme-lab/presets-e2e.mjs`), same on the base code.
- The runner test "code above the memory limit is stopped and reported" times out under load (passes alone).
- Not tested: Safari, Firefox, Windows locally, audible sound, weaker GPUs.
- Markdown slide numbers: some e2e scripts hard-code slides 11 and 12 (quiz, compare); update them if slides are inserted before.
- Merged feature branches and agent worktrees under `/Users/abletterer/.herdr/worktrees/nimbledeck/` can be deleted once merged.

## How to preview and test (quiet machine, stale servers killed)

```sh
pkill -f marimo; pkill -f slidev; pkill -f runner.py; pkill -f stream_; pkill -f nimbledeck.mjs
npm test
npm run docs:build && npm run docs:preview        # http://127.0.0.1:4173/nimbledeck/
node website/site-e2e.mjs
(cd examples/showcase && node e2e.mjs && WEB_BASE=/ WEB_OUT=/tmp/showcase-root node build-web.mjs && node e2e-tour.mjs --dist /tmp/showcase-root)
```

## Decisions already taken

- Slidev is the base; heavy work runs in local processes; the live-code runner executes Python locally with a token, an origin check and limits.
- Deck-first site; a static host cannot run Python, so hosted decks play recordings of the Python slides.
- The owner reviews before anything is pushed. Never push `main` without an explicit OK.
