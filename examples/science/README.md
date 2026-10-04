# Science, live

A 15 slide deck for a three minute talk to researchers, data scientists and science communicators. The idea: a paper
freezes a result into a picture; a Nimbledeck deck keeps the experiment running in the room. NumPy does the work on your
machine, the audience can change the parameters and the code, and the whole talk is one Markdown file that diffs in git.

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
| 4 | Same start. Almost. Another future. | `PyStream`: 200 Lorenz trajectories, one part in 100,000 apart, coloured by starting order; sliders for the count, the speed and the shared digits |
| 5 | Gray-Scott reaction-diffusion | `Demo`: a marimo app, three sliders, NumPy in a subprocess |
| 6 | Find the signal in the noise | `LiveCode`: the Fourier transform of a noisy signal; edit the frequencies |
| 7 | Raise the degree, watch the band | `LiveCode`: a polynomial fit with a bootstrap error band |
| 8 | A neural net in plain NumPy | `LiveCode`: a tiny network learns the boundary between two rings |
| 9 | Measured, not claimed | Three measured numbers |
| 10 | Notebook cell, two fences, a live slide | How a cell becomes a slide |
| 11 | Run it. Record it. Check it. | The workflow, as a terminal |
| 12 | No Python? It plays the recording. | The web edition |
| 13 | Reviewed like code | A parameter change is a one line diff |
| 14 | Your data stays on your machine. | Python runs locally, no network request |
| 15 | Show the experiment. | Closing |

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
- `nimbledeck check`: 15 slides, 0 errors, 0 warnings. `nimbledeck verify`: 0 placement problems.

## Extending PyStream

The Lorenz slide needed more than the swarm demo, so `PyStream` gained optional settings (documented in
`docs/WRITING.md`): `:colors` (one colour per equal group of points), `:size` and `:fade` (dot size and trail length),
`:w` and `:h` (canvas size) and `:sliders` (labels, ranges and starting values of the three sliders). Without them it
looks and behaves as before.
