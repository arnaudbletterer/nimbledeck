# Risk and probability

A chapter of six slides on the mathematics everybody needs and nobody sees move: why a 99 percent accurate test is wrong
most of the time when you test positive, and why a poll of 1,000 people is wrong about once in ten. It stands alone
(`risk.md`) and is meant to be composed with the other chapters of the science deck.

## Run it

```sh
cd examples/science/chapters/risk
NIMBLEDECK_PORT_OFFSET=0 node ../../../../packages/cli/bin/nimbledeck.mjs run risk.md      # http://localhost:3030
node ../../../../packages/cli/bin/nimbledeck.mjs check risk.md
node ../../../../packages/cli/bin/nimbledeck.mjs verify risk.md                              # with the deck running
node e2e.mjs http://localhost:3030                                                            # browser test, deck running
node build-web.mjs                                                                            # static web edition in dist/
```

Ports: the deck 3030 and the live-code runner 19900 (add `NIMBLEDECK_PORT_OFFSET` to move them). The chapter has no demo or
stream of its own, so the ranges 3300 to 3399 and 19800 to 19899 are unused. The first `run` downloads Python and the packages of
`demos/requirements.txt` into uv's cache; after that it works offline. `requirements.txt` holds NumPy and matplotlib (the
live-code runner needs matplotlib to draw), pinned like the science deck so uv's cache is shared.

## The slides

| # | Slide | What it shows | Live where |
|---|---|---|---|
| 1 | How likely are you sick? | The question, no numbers yet | |
| 2 | 10,000 people. One test. | `<Crowd>`: 10,000 dots coloured by truth and test result; sliders for prevalence, sensitivity and specificity; the positives gathered on the right; "10 of 110 positives are sick, 9 %" | browser |
| 3 | Bayes, in colour. | Bayes' theorem with `\term{3}` (sick and positive) and `\term{4}` (false alarm) lighting those dots, and the same sum in people, with live numbers from the sliders of slide 2 | browser |
| 4 | 2,000 polls. One truth. | `<Polls>`: a histogram of simulated polls that builds up; sliders for sample size, true share, number of polls and bias; the share of polls that name the wrong winner | browser |
| 5 | The size of the noise. | The standard error and the 95 percent margin of error; the terms light the true share, the spread, the margin band and the sample size | browser |
| 6 | (live code) | `<LiveCode>`: 21 lines of NumPy; make the young harder to reach (`reach`), then correct for it (`WEIGHT`); change `N` | Python runner |

Pointing at a term of an equation, at a line of the key of the crowd, or at a dot, lights the same group everywhere.

## What is live, what is recorded

`<Crowd>` and `<Polls>` are addon components (`packages/addon/components`, arithmetic in `packages/addon/composables/risk.mjs`,
documented in `docs/WRITING.md`) and run in the browser, so the web edition keeps them live: the audience can drag the
sliders on a static host. Only the live-code slide needs Python, and it plays `public/recordings/live-polls.*` where no runner
is present (the steps are in `nimbledeck.config.json`: `reach` to `[0.5, 1.0]`, then `WEIGHT = True`; the keystrokes address lines
by number, so re-record with `nimbledeck record risk.md` after editing the code).

## Honest about what it is

- The crowd shows expected counts, not a random draw: 1 in 1,000 of 10,000 is exactly 10 sick. The percentage is Bayes'
  theorem from the probabilities (9.0 percent); the counts say 10 of 110 (9.1 percent), because people come whole.
- The polls are a simulation (exact binomial draws, labelled on the slide), not survey data. The same random numbers are reused
  when a slider moves, so the histogram morphs; letting go takes the polls again.
- The bias model is one specific one: a share of A supporters do not answer. Real polls are also weighted; the live-code slide
  shows weighting and its price (a wider histogram).
- `demos/crosscheck.py` recomputes the quoted numbers by Monte Carlo (`uv run --with numpy==2.5.3 python demos/crosscheck.py`).

## References for the notes

Bayes (1763), communicated by Price; Eddy (1982), the screening problem; Gigerenzer and Hoffrage (1995), natural frequencies;
Brown, Cai and DasGupta (2001), the interval `p +- 1.96 sqrt(p (1 - p) / n)` and where it is poor; Meng (2018), bias that does not
shrink with n.
