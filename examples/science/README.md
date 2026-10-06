# Science, live

A 21 slide deck for a talk to researchers, data scientists and science communicators. The idea: a paper
freezes a result into a picture; a Nimbledeck deck keeps the experiment running in the room. NumPy does the work on your
machine, the audience can change the parameters and the code, the equations are LaTeX in the same file and light up the picture
next to them, and the whole talk is one Markdown file that diffs in git.

## Run it

```sh
npm install                                    # once, from the repository root
npm --workspace examples/science run dev       # the full edition, http://localhost:3030
npm --workspace examples/science run check     # lint the deck
npm --workspace examples/science run verify    # open it in Chrome and look for clipped or blurry content
```

`NIMBLEDECK_PORT_OFFSET=1650` shifts every port, so it can run next to another deck. The first run downloads Python and
the packages of `demos/requirements.txt` into uv's cache; after that it works with no network.

## The slides

| # | Slide | What it shows |
|---|---|---|
| 1 | Science, live. | Aurora and a kinetic title |
| 2 | A paper freezes the result. | The problem, in one sentence |
| 3 | Show the experiment, not the screenshot. | The idea |
| 4 | Same start. Almost. Another future. | `PyStream`: 200 Lorenz trajectories, one part in 100,000 apart, coloured by starting order. Beside it the Lorenz equations, one coloured term per coordinate, and sliders for sigma, rho and beta that the Python process really reads and the equation shows |
| 5 | Gray-Scott reaction-diffusion | `Demo`: a marimo app, three sliders, NumPy in a subprocess |
| 6 | Two chemicals. Two equations. | The Gray-Scott pair; F, k, the reaction and the diffusion are terms, and pointing at one names what it controls in the recording of slide 5 |
| 7 | Find the signal in the noise | `LiveCode`: the Fourier transform of a noisy signal; edit the frequencies |
| 8 | Fourier, term by term. | The signal, the transform and its discrete sum; the 50 Hz, 120 Hz and noise terms point at the spikes of the recorded spectrum |
| 9 | Raise the degree, watch the band | `LiveCode`: a polynomial fit with a bootstrap error band |
| 10 | The line, and its band. | The normal equations, the fitted curve and the percentile bootstrap interval, coloured like the line, the points and the band of the recorded fit |
| 11 | A neural net in plain NumPy | `LiveCode`: a tiny network learns the boundary between two rings |
| 12 | Two rings, one loss. | The network, the logistic output and the cross-entropy, one term per ring, and the decision boundary |
| 13 | A damped oscillator. | A derivation that lights one line per click, and the solution as a `Chart`, coloured like its terms |
| 14 | Typeset, not pasted. | Seven famous equations typeset big and entering in turn |
| 15 | Measured, not claimed | Three measured numbers |
| 16 | Notebook cell, two fences, a live slide | How a cell becomes a slide |
| 17 | Run it. Record it. Check it. | The workflow, as a terminal |
| 18 | No Python? It plays the recording. | The recordings, in one sentence |
| 19 | Reviewed like code | A parameter change is a one line diff |
| 20 | Your data stays on your machine. | Python runs locally, no network request |
| 21 | Show the experiment. | Closing |

## Two editions

| Edition | How | Slides |
|---|---|---|
| Full | `npm run dev` | all 21, live; slides 6, 8, 10 and 12 play the recordings next to their equations |
| Web | `npm run build:web` (static files in `dist/`) | all 21; slides 4, 5, 7, 9 and 11 play the clips in `public/recordings` because no Python runs on a static host |

`build:web` uses hash routes, removes `nimbledeck.json` (it holds the runner token) and honours `WEB_BASE` (default
`/nimbledeck/demos/science/`) and `WEB_OUT`. With the recordings missing, it would leave those five slides out.

## Recordings

`public/recordings/` holds one clip and one still per live component (`stream-lorenz`, `demo-turing`, `live-fft`,
`live-fit`, `live-net`), 0.5 to 1.7 MB each, 5.7 MB for `public/` in total. They are made by `nimbledeck record science.md`
following the scripted steps in `nimbledeck.config.json` (Lorenz speed slider to maximum, Feed rate slider, and typed
edits on the three code slides: add a 200 Hz line, raise the degree to 8, drop to 2 hidden units). Re-record after a change
to the code on a slide, because the keystrokes address lines by number. `public/posters/turing.png` is the still shown
by the Demo slide while the clip loads.

## The demos

| File | Used by | What it does |
|---|---|---|
| `demos/stream_lorenz.py` | `<PyStream name="lorenz" />` | Integrates the Lorenz system (RK4, NumPy) for an ensemble that starts on a line of length 10^-g, and streams 8 sub-steps per trajectory per frame |
| `demos/turing.py` | `<Demo name="turing" />` | marimo app; runs `demos/gray_scott.py` in a subprocess and draws the V field in the slide colours |
| `demos/gray_scott.py` | `turing.py` | Gray-Scott on a 192 by 192 periodic grid, float32 |
| `demos/science.css` | `turing.py` | Makes the marimo page transparent and light on dark |

The three `<LiveCode>` blocks are in `science.md` itself, so the code you see is the file you diff.

## What was measured

One Apple Silicon Mac, Chrome with the GPU on. Medians; read them as ratios, not promises.

- Lorenz stream, 200 trajectories: Python step 0.9 ms, 56 frames per second on screen (20 s of samples).
- Gray-Scott, 192 by 192 cells, 3,000 steps: 1.3 s for the whole subprocess, including its start.
- Live code: 0.12 to 0.29 s per run (FFT 0.15 to 0.22 s, fit 0.12 s, network 0.29 s), four loads each.
- Web edition served under `/nimbledeck/demos/science/` with no Python: slides 4 to 12 each play their clip (video time advances), media requests answer 200 or 206, no `.katex-error`, no request to another origin, and the KaTeX fonts come from the deck.
- `nimbledeck check`: 21 slides, 0 errors, 0 warnings. `nimbledeck verify`: 0 placement problems (with `NIMBLEDECK_VERIFY_PAGES=1`; four pages at once can make the live figure of the fit slide a little soft).

## Extending PyStream

The Lorenz slide needed more than the swarm demo, so `PyStream` gained optional settings (documented in
`docs/WRITING.md`): `:colors` (one colour per equal group of points), `:size` and `:fade` (dot size and trail length),
`:w` and `:h` (canvas size) and `:sliders` (labels, ranges and starting values of the three sliders). Without them it
looks and behaves as before.

## Equations

The equation slides are LaTeX in `science.md` and nothing else (see [docs/EQUATIONS.md](../../docs/EQUATIONS.md)). `\term{1}{...}`
paints a part with the first chart colour of the look, which is also the colour of the first curve of a figure, so the
equation and the picture agree in the `studio` look the recordings were filmed in. Slides 6, 8, 10 and 12 show the
recording of the live slide before them (`<Clip src="/recordings/live-fft.webm" fit="cover" position="right" />` crops the
right half, the plot) with `<Marker>` labels on the peaks, the curve or the rings. They name the clip files, so a re-recording
that keeps the names keeps the slides. Slide 4 is the only one that changes the Python: `demos/stream_lorenz.py` also
reads `sigma`, `rho` and `beta`, so moving their sliders changes the attractor and the numbers in the equation.
