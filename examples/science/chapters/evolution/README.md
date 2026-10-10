# Evolution, live

One chapter of the science deck: natural selection made visible. A population of 1,200 dots moves across a fitness landscape
(two traits on the axes, warm colour is fit). Each generation the parents are drawn in proportion to fitness and the children
mutate. The audience moves the sliders and the cloud climbs a peak, spreads over several, gets stuck on a small one, or chases a
peak that moves.

It is a simulation model: asexual individuals, two heritable traits, a made-up landscape, a fixed population size. It is not
a claim about any real species. Two peaks occupied at once are two lineages, not two species.

## Run it

```sh
NIMBLEDECK_PORT_OFFSET=40 node ../../../../packages/cli/bin/nimbledeck.mjs run evolution.md     # http://localhost:3070
node ../../../../packages/cli/bin/nimbledeck.mjs check evolution.md
node ../../../../packages/cli/bin/nimbledeck.mjs record evolution.md                            # re-film the clips
node build-web.mjs                                                                              # static edition in dist/
```

The first run downloads Python, NumPy, SciPy and matplotlib into uv's cache; after that it works offline. Ports: streams 19400 to
19402, runner 19500 (plus the offset).

## The slides

| # | Slide | What it shows |
|---|---|---|
| 1 | Copy. Mutate. Filter. Repeat. | The hook (motion `focus`, background `shader`) |
| 2 | Dots climb a landscape. | Hero: `PyStream evo-landscape`. Eight sliders (population, mutation, selection, ruggedness, environment, competition, heritability, start). Live plots of mean fitness and trait variance. The replicator-mutator equation, with p, w and M pointing at the picture |
| 3 | The whole model in 22 lines | `LiveCode`: the fitness function and the selection step. Add a peak, set `compete=0.9`, change the selection scheme |
| 4 | The response to selection. | Breeder's equation R = h^2 S. `PyStream evo-breeder` draws S and R as arrows on the landscape and prints R / S, which follows the heritability slider |
| 5 | The mean, exactly. | The Price equation. `PyStream evo-price` draws its selection term, its transmission term and their sum, and the sliders show the mutation-selection balance |

## What is live and what is recorded

All five slides are live under `nimbledeck run`. The web edition plays the clips of `public/recordings`: `stream-evo-landscape`
(a climb, a split under competition, a chase after the landscape turns), `stream-evo-breeder`, `stream-evo-price` and
`live-evo-code` (a peak added, then `compete` set to 0.9). They are filmed by `nimbledeck record` following the steps in
`nimbledeck.config.json`; re-record after changing the code on slide 3, because its keystrokes address lines by number.

## Files

| File | What it does |
|---|---|
| `demos/evo_core.py` | The model (landscape, Wright-Fisher generation, competition, heritability, mutation bias, rotation), the views and the stream server with the lockstep protocol |
| `demos/stream_evo*.py` | Three thin entry points, one per stream |
| `public/recordings/` | The clips and stills |

## Checks of the mathematics

The model measures the terms of the equations it draws, and they hold: the Price identity (change of the mean = selection term +
transmission term) to 1e-16 in every generation; R / S equals the heritability slider (1.0, 0.5 and 0.2 gave 1.0, 0.5 and 0.18
over 25 generations). Standard forms are cited in the speaker notes: Hofbauer and Sigmund 1998 and Nowak 2006 (replicator-mutator),
Lush 1937 and Falconer and Mackay 1996 (breeder's equation), Price 1970 and Frank 2012 (Price equation).

## The PyStream extension

`PyStream` gained two optional JSON messages (documented in `docs/WRITING.md`): a `field` painted under the points (the heat map)
and a `draw` list of lines, dots, rectangles and text painted over them (the plots and arrows). A stream that sends neither is
unchanged.
