# Climate and weather: why the forecast forgets, and how it is rescued

One chapter of the science deck, standalone. Hero demo: a toy atmosphere (Lorenz-96, 40 variables on a latitude circle,
forcing F = 8), a truth run, an ensemble of 20 forecasts, and an ensemble Kalman filter that can pull the ensemble back to
noisy observations. Everything is simulated. It is not a forecast, and its "model days" follow Lorenz's rough scale of five
days per time unit.

## Run it

```sh
NIMBLEDECK_PORT_OFFSET=200 node ../../../../packages/cli/bin/nimbledeck.mjs run climate.md      # live
NIMBLEDECK_PORT_OFFSET=200 node ../../../../packages/cli/bin/nimbledeck.mjs check climate.md
NIMBLEDECK_PORT_OFFSET=200 node ../../../../packages/cli/bin/nimbledeck.mjs verify climate.md   # with the deck running
NIMBLEDECK_PORT_OFFSET=200 node ../../../../packages/cli/bin/nimbledeck.mjs record climate.md   # films the stream
node build-web.mjs                                                                         # static edition, plays the clips
```

Ports: stream 19200, runner 19300, deck 3030 (plus the offset). NumPy, matplotlib and websockets only; the first run downloads
them into uv's cache, then it works offline.

## The slides

| # | Slide | Live or recorded |
|---|---|---|
| 1 | The weather forgets in two weeks. | statement, `blur-in`, `waves` background |
| 2 | Hero demo | live `PyStream`: truth and ensemble-mean Hovmoeller diagrams, error and spread on a log axis; sliders for ensemble size, observation noise, observation interval, forcing F, and assimilation on or off |
| 3 | Live code | live `LiveCode`: a complete ensemble Kalman filter (inflation, localisation, observation operator) whose error curves change when you edit a line |
| 4 | One model. One update. | Lorenz-96 and the Kalman analysis, one coloured term each, pointing at the recording of slide 2 |
| 5 | The spread should match the error. | the spread-skill relation, coloured like the curves of the recording |

Slides 2 and 3 need `nimbledeck run`. The static edition plays their recordings instead: `stream-climate-l96` (a free
forecast, then assimilation switched on, then noisier instruments; 20 s, 30 fps, lockstep) and `live-enkf` (the localisation
radius edited from 4 to 50: the filter diverges). Checked: a static build served under its base path with no Python, every
media file answers 200, no external request, no KaTeX error, `check` 0 and 0, `verify` clean.

## Files

- `demos/climate_l96_server.py`: the stream server. Frame format and the raster layer are described in its docstring and in
  `docs/WRITING.md` ("Adding a streamed Python animation"). Seeded, with the lockstep protocol, so `record` films exactly 60
  frames a second.
- `demos/l96.py`: the model and the filter, shared and documented with their references.
- `climate.md`: the slides. `nimbledeck.config.json`: stream, runner, and the scripted recording (free forecast, then
  assimilation on, then noisier instruments).

## What to say

- Without data the error of the ensemble mean and the spread of the members grow together, on a straight line of a log axis
  (an exponential), until they stop at the spread of the climate. The mean of the ensemble then fades: the forecast has
  forgotten.
- Switch assimilation on: the amber dots are observations, the mean snaps back, error and spread settle near the
  instrument noise. Raise the noise or the interval, or lower the ensemble size, and the error rises.
- In the code: inflation 1.0 doubles the error; localisation radius 50 breaks the filter (error about 4); 8 members, about 2.6;
  observing every fourth variable, about 1.8.

## Honest limits

- A toy: 40 variables, a perfect model (truth and ensemble share F), a stochastic filter with Gaussian taper in the code
  slide and Gaspari-Cohn in the stream. A real system has billions of variables and model error.
- The two-week limit is a property of the real atmosphere (Lorenz 1969; Zhang et al. 2019), not something this toy proves.
- The code slide is 34 lines; the editor shows about 28 and scrolls.
