# Handoff: state of the work (2026-10-07)

Read this first when starting a new session. It is a snapshot, not a design document: see README.md, docs/ARCHITECTURE.md and
docs/DECISIONS.md for the why. This file is kept out of the published site.

## Where things are

| What | Where | State |
|---|---|---|
| Nimbledeck | `/Users/abletterer/Projects/nimbledeck`, remotes `origin` (Synology) and `github` (`git@github.com:arnaudbletterer/nimbledeck.git`) | Local `main` is about 180 commits ahead of `github/main`. **Not pushed on purpose**: pushing deploys the site to GitHub Pages. The owner decides when. |
| Site (preview) | `npm run docs:build`, then `npm run docs:preview` -> http://127.0.0.1:4173/nimbledeck/ | Deck-first: `/` is the showcase deck, `/docs/`, `/playground/`, `/demos/how-it-works/`, `/demos/science/`. |
| Lockstep 60 fps recording | branch `feat/lockstep-recording`, worktree `/Users/abletterer/.herdr/worktrees/nimbledeck/agent-a0112cdadcdeb976b` | Unfinished, see below. Not merged. |

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
- Science deck (21 slides) with LaTeX equations, `\term{n}{...}` colour links, live parameters (docs/EQUATIONS.md).
- Offline-first (docs/OFFLINE.md), performance work (docs/PERFORMANCE.md), CI on 3 OSes.

Last known checks on `main`: `npm test` 241 pass; link crawler 0 problems; `website/site-e2e.mjs`, `examples/showcase/e2e.mjs`,
`examples/showcase/e2e-tour.mjs --dist <build with WEB_BASE=/>`, `examples/how-it-works/e2e-interactions.mjs`,
`examples/motion-lab/lab-e2e.mjs` all pass (run them on a quiet machine, kill stale servers first).

## Unfinished: lockstep 60 fps recording (branch `feat/lockstep-recording`)

Goal: clips at exactly 60 fps whatever the machine speed (virtual time, one lossless frame per 1/60 s). Scope decided by the owner
because of quota: **streams only** (nbody, swarm, Lorenz). Live code and marimo stay real time.

- Done and committed on the branch: engine (`packages/cli/src/lockstep.mjs`), tick protocol in the three stream servers, `PyStream.vue`
  hooks, config keys `isolate` / `realtime`, CLI `--fps --realtime --timeout`, manifest fields, tests written (not yet run), docs written.
  The screenshot hang is fixed with Chrome flags (`LOCKSTEP_FLAGS` in `record.mjs`).
- `stream-nbody` re-recorded in lockstep (540 frames, 60 fps, 2200x1000). The first version had the swarm flying off screen after 6 s
  (gravity 2.5 with 1200 particles); the steps were changed to 700 particles then gravity 1.4 and the new clip looks good.
- Still to do: set `"isolate": true` for `stream-lorenz` in `examples/science/nimbledeck.config.json`; record `stream-swarm` then
  `stream-lorenz` one at a time (`NIMBLEDECK_PORT_OFFSET=50 node packages/cli/bin/nimbledeck.mjs run <deck.md>`, then
  `node packages/cli/bin/nimbledeck.mjs record <deck.md> --url http://localhost:3080 --slide N`); check pts spacing with ffprobe and
  look at extracted frames; run `npm test` (the tick-protocol test needs `uv`), `npm run docs:build`, the e2e scripts above and
  `examples/how-it-works/record-e2e.mjs`; update the sizes table in docs/RECORDING.md; then merge into `main`.
- If it goes wrong: leave the current 2x clips (they are fine, particle clips run at 19 to 35 fps).

## Open points before a push

- Aurora background contrast in `plain` and `studio-light` is below 4.5:1 (`examples/theme-lab/presets-e2e.mjs`), same on the base code.
- The runner test "code above the memory limit is stopped and reported" times out under load (passes alone).
- Not tested: Safari, Firefox, Windows locally, audible sound, weaker GPUs.
- `stream-lorenz` clip has the old title and paragraph burnt in: never re-record it without `isolate`.
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
