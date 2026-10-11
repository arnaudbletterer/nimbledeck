# Science, live

A talk for researchers and science communicators, in one Markdown file (`science.md`, 26 slides). Five chapters, each built
around one hero demo that the audience changes and whose equations point at the picture: touch a term and the part of the demo it
describes lights up. The message: show the experiment, not the screenshot.

**Everything is simulated or a toy model, and every slide says so.** No real data is used: the polls are binomial draws, the
detector noise is Gaussian, the atmosphere has 40 variables, the neural networks have a few thousand to 145,000 numbers, the
organisms are dots on a made-up landscape.

## Files

| Path | What it is |
|---|---|
| `chapters/open.md`, `<chapter>.md`, `close.md` | The slides, one file per part. Edit these. |
| `compose.mjs` | Writes `science.md` from them (`--check` in CI, `--only risk,gw` writes a deck of those chapters to work on one) |
| `science.md` | Generated and committed: the CLI, the web edition and the recorder read one flat file |
| `demos/` | Python of all chapters: models, stream servers, the marimo demo, the `aitoy` package, training scripts |
| `public/` | The ten recordings (`public/recordings`), the still of the equation slide of the gravitational waves chapter |
| `nimbledeck.config.json` | Demo, streams, ONE runner, limits and the scripted steps of every recording |
| `walk.mjs`, `shot.mjs`, `e2e-risk.mjs` | Browser checks (below) |

The chapters are not runnable alone any more: their demos and recordings live once, here. `node compose.mjs --only gw` and
`nimbledeck run science-gw.md` gives a deck of one chapter with the same config.

## The slides

| # | Slide | What it is |
|---|---|---|
| 1 | Science, live. | Title with four looping clips of the hero demos |
| 2 | Five experiments. | The chapter map |
| 3 | How likely are you sick? | Risk: the question, no numbers |
| 4 | 10,000 people. One test. | `<Crowd>`: 10,000 dots, sliders for prevalence, sensitivity, specificity, natural frequencies. Browser only |
| 5 | Bayes, in colour. | Bayes' theorem; terms light the dot groups; live numbers |
| 6 | 2,000 polls. One truth. | `<Polls>`: simulated polls, margin, bias slider. Browser only |
| 7 | (live code) | NumPy poll simulation with reach and weighting |
| 8 | Noise in. A picture out. | Everyday AI: chapter title |
| 9 | Noise becomes a picture. | `PyStream` ai-diffusion: a trained toy diffusion model; steps, schedule, guidance, prompt |
| 10 | Add noise. Learn to undo it. | The forward and reverse steps, over the diffusion clip |
| 11 | (live code) | Two layers of attention on "the cat chased the mouse because it was hungry" |
| 12 | Every word asks and answers. | softmax(QK^T / sqrt d) V, over the attention clip |
| 13 | Copy. Mutate. Filter. Repeat. | Evolution: chapter title |
| 14 | Dots climb a landscape. | `PyStream` evo-landscape, eight sliders, live plots; replicator-mutator equation |
| 15 | (live code) | The whole model on one screen |
| 16 | The response to selection. | Breeder's equation; `PyStream` evo-breeder draws S and R |
| 17 | The weather forgets in two weeks. | Climate: chapter title |
| 18 | (hero) | `PyStream` climate-l96: truth, ensemble mean, error and spread; assimilation on or off |
| 19 | (live code) | A complete ensemble Kalman filter |
| 20 | One model. One update. | Lorenz-96 and the Kalman update, over the clip |
| 21 | Gravitational waves | Chapter title |
| 22 | Simulated strain | `Demo` gw-detect (marimo): slide the template mass until the SNR peak locks on |
| 23 | (live code) | The matched filter in code; edit the mass, band, taper |
| 24 | Three equations. One detection. | Chirp, chirp mass, SNR; terms point at a still of the simulation |
| 25 | The real event, for scale | Published values of GW150914 |
| 26 | What you just saw | Closing: one Markdown file, `run`, `record`, link cards |

Left out of the talk and deleted with their assets: the polls noise equation, the diffusion sampler as code, the Price equation and
the spread-skill relation (see git history of the chapter branches `feat/sci-*`).

## Run it

```sh
npm install                                   # once, from the repository root
cd examples/science
node ../../packages/cli/bin/nimbledeck.mjs run science.md        # http://localhost:3030 (NIMBLEDECK_PORT_OFFSET moves every port)
node ../../packages/cli/bin/nimbledeck.mjs check science.md
node ../../packages/cli/bin/nimbledeck.mjs verify science.md     # with the deck running
node walk.mjs http://localhost:3030 shots                        # two screenshots per slide, console and request report
node e2e-risk.mjs http://localhost:3030                          # the crowd and the polls respond to their sliders
WEB_BASE=/ node build-web.mjs                                    # the web edition, no Python, plays the recordings
```

The first run lets uv fetch Python 3.12 and the packages of `demos/requirements.txt`; after that it works offline. The marimo
demo of slide 22 takes about 20 seconds to appear the first time.

Ports: deck 3030, demo 2900 (marimo, 3600 with offset 700), streams 19200 (climate), 19400 and 19401 (evolution), 19600 (AI),
runner 19100, plus the offset.

## Record it

`nimbledeck record science.md` films every live slide into `public/recordings` following the steps of `nimbledeck.config.json`;
`--slide 14 16` films only those. The ids are explicit (`<LiveCode id="...">`), so they survive a change of slide numbers. The
live-code steps address lines by number: after editing the code of a live-code slide, record it again. The web edition
(`build-web.mjs`) keeps a slide with live components only when all of them have a recording: here all ten do.

## Honest limits

- Risk: the crowd shows expected counts, not a random draw (9.0 percent by Bayes, 10 of 110 as whole people). The polls are one
  specific bias model (a share of A supporters do not answer).
- AI: toy networks on made-up data. At temperature 3 the attention clip ends on a wrong answer ("sheep"), on purpose of the
  recording: the toy degrades when its attention is spread out.
- Evolution: asexual individuals, two traits, a made-up landscape; two peaks are two lineages, not two species.
- Climate: Lorenz-96 with a perfect model; the two-week limit is a property of the real atmosphere, not proved by the toy.
- Gravitational waves: the toy noise curve is bucket-shaped, not a measured one; the inspiral stops at 220 Hz; no LIGO data.
- The live-code editors show about 23 to 27 lines: the edited lines are at the top, the plotting lines scroll.

## References

Bayes 1763; Eddy 1982; Gigerenzer and Hoffrage 1995; Meng 2018 (risk). Ho, Jain and Abbeel 2020; Ho and Salimans 2022; Vaswani et
al. 2017 (AI). Hofbauer and Sigmund 1998; Lush 1937; Falconer and Mackay 1996 (evolution). Lorenz 1996; Evensen 1994; Burgers, van
Leeuwen and Evensen 1998 (climate). Abbott et al. 2016, Phys. Rev. Lett. 116, 061102; Maggiore vol. 1 (gravitational waves). The
speaker notes carry the full citations next to each equation.
