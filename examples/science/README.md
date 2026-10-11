# Science, in one idea

**Why a positive test is often wrong.** A talk of 15 slides and about three minutes for a general audience, in one Markdown file
(`science.md`). It tells a story (Sam tests positive), asks the viewer to guess, reveals the answer (about 9 in 100), then shows
why with pictures the viewer changes: 10,000 dots, two rows of positives, sliders for how rare the condition is and how good the
test is. The device is predict, then reveal. Each slide says one thing in one plain sentence next to one picture.

**The deck needs no Python.** Every picture runs in the browser, so `npm run dev`, `nimbledeck run` and the hosted edition behave
the same and nothing is recorded. **Everything is simulated**: Sam, the condition and the people are made up, no real disease is
named, and the first and last slides say "An illustration, not medical advice."

Colour means one thing everywhere: pink is sick, grey is healthy, an amber ring or frame is "the test said positive".

## The slides

| # | Slide | The one sentence | Picture |
|---|---|---|---|
| 1 | You tested positive. | How worried should you be? | dots background |
| 2 | Sam tests positive | A routine check-up for something that affects 1 person in 1,000. The test says: positive. | the test is 99% accurate, in words |
| 3 | How likely is Sam to be sick? | The condition affects 1 person in 1,000, and the test is 99% accurate. | `<Quiz>`: the guess |
| 4 | About 9 in 100 | Most people guess far higher. Here is why. | a big 9% |
| 5 | Ten of them are sick | Each dot is one person, and only 1 in 1,000 is sick. | `<Chance mode="crowd">`, one click |
| 6 | Who tests positive? | The test catches the sick, and wrongly flags 1 healthy person in 100. | the same crowd, two clicks |
| 7 | Of 110 positives, only 10 are sick | The healthy are so many that their false alarms outnumber the real cases ten to one. | `<Chance mode="rows">` |
| 8 | Change how rare it is | (a sentence that follows the slider) | `<Chance mode="play" controls="prevalence">` |
| 9 | Change how good the test is | (a sentence that follows the sliders) | `<Chance mode="play" controls="accuracy">` |
| 10 | A rule of thumb | When something is rare, even a good test gives mostly false alarms. | two piles, rare against common |
| 11 | What to ask | Three questions to ask after a positive test, and the same idea elsewhere. | lists |
| 12 | Bayes' rule, in colour | Bayes' rule counts the real cases among all the positives. (for the curious) | `<Equation>` terms light the dots |
| 13 | Ask how rare it is | A positive test is a clue, not a verdict. | closing, `<NextSteps>` |
| 14, 15 | Standing on the shoulders of... | The eight references with DOIs, the credits and the disclaimer | text |

Slides 4, 5, 10, 11 and 12 carry a small source line (the `::caption::` of the `split` and `stage` layouts). The speaker notes name
the references by key.

## Sources

`REFERENCES.md` lists every source with author, year, title, venue, DOI, the claim the deck uses it for, and how it was checked
(Crossref, PubMed or a paper that reports it). `packages/cli/test/science-refs.test.mjs` fails when a key in the notes is not in
that file or an entry is never cited. Figures quoted as "what most people answer" are only the counts reported in the Casscells
study (11 of 60) and the Hoffrage and Gigerenzer study (about 10 against about 46 percent).

## Files

| Path | What it is |
|---|---|
| `science.md` | The deck. Edit it directly. |
| `REFERENCES.md` | The sources and how each was verified |
| `nimbledeck.config.json` | Only the checker limits: no demo, stream, runner or recording |
| `build-web.mjs` | Builds the web edition (`WEB_BASE`, `WEB_OUT`); the site build calls it for `/demos/science/` |
| `walk.mjs`, `shot.mjs`, `e2e.mjs` | Browser checks (below) |

The components are `<Chance>` (`packages/addon/components/Chance.vue`, words in `composables/chance.mjs`), `<Quiz>`, `<Stat>`,
`<Kinetic>`, `<Equation>` and `<NextSteps>`.

## Run it

```sh
npm install                                   # once, from the repository root
cd examples/science
npm run dev                                   # http://localhost:3030 (plain Slidev, no Python, no uv)
npm run check                                 # nimbledeck check: 0 errors, 0 warnings
npm run verify                                # with the deck running: nothing overflows or is clipped
node walk.mjs http://localhost:3030 shots     # two screenshots per slide (as it opens, with every click shown), console and request report
node e2e.mjs http://localhost:3030            # the guess, the clicks, the sliders and their sentences, a term of the equation
WEB_BASE=/ node build-web.mjs                 # the web edition, the same deck
```

The deck has a tour (`tour:` seconds and `tourScript` steps): on the guess slide the cursor hovers a wrong answer, then clicks the
right one; on the two play slides it drags the sliders so the viewer sees the interaction. The sounds are the quiz chime and the
number landing, which the components play themselves.

## What was cut

The earlier talk had five chapters (risk, everyday AI, evolution, climate, gravitational waves), 26 slides, Python streams, a marimo
demo, ten recordings (69 MB) and live-code slides: too much, with too little context for a general audience. Its sources, demos,
recordings and assets are recoverable from commit `5722d9e` and from the branches `feat/sci-*`. The `<Crowd>` and `<Polls>`
components, their tests and the `<PyStream>` extensions stay in the addon.

## Honest limits

- The dots show expected counts of 10,000 people, not a random draw: 1 in 1,000 is exactly 10 sick, 100 false alarms, 110 positives
  (9.1 percent as whole people, 9.0 percent exactly).
- One test with one error rate for sick and for healthy people; real tests, and real conditions, are less tidy.
- The studies cited are about doctors and students reading a test; the deck says so and claims no more.
- Checked in Chrome only; the look is `studio` (dark). Other looks change the colours of pink, grey and amber.
