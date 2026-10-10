# Everyday AI, live

One chapter of the science deck: how image generators and chatbots work, for the general public, with two small models that
really run on the laptop. Both are toys: a few thousand to 145,000 numbers, trained on made-up data, plain NumPy. Neither is
a real image model or a real chatbot, and the slides say so.

## Run it

```sh
NIMBLEDECK_PORT_OFFSET=47 node ../../../../packages/cli/bin/nimbledeck.mjs run ai.md   # from this folder; offset only to avoid clashes
node ../../../../packages/cli/bin/nimbledeck.mjs check ai.md
node ../../../../packages/cli/bin/nimbledeck.mjs record ai.md                          # re-films public/recordings
node build-web.mjs                                                                      # static edition, plays the recordings
```

Ports: stream 19600, runner 19700 (add the offset). Everything is prefixed `ai-`.

## The slides

| # | Slide | What it is |
|---|---|---|
| 1 | Everyday AI | Statement, aurora background, blur-in |
| 2 | Noise becomes a picture | `PyStream` `ai-diffusion`, live: a picture of 2,800 points is destroyed into noise (the forward process), then a new one is generated from fresh noise by the trained network, with the network's answer as arrows. Sliders: steps (4 to 120), schedule (linear, cosine), guidance (0 to 6), prompt (anything, smiley, spiral, AI) |
| 3 | Reverse diffusion | `LiveCode`: the reverse sampler in 22 lines, the same network. Edit the steps, the schedule line, the guidance, the fresh-noise term |
| 4 | Add noise. Learn to undo it. | The forward marginal and the reverse step of Ho et al. 2020, four coloured terms linked to the recording of slide 2 |
| 5 | Attention | `LiveCode`: two layers of scaled dot-product attention on "the cat chased the mouse because it was hungry", as two heatmaps. Swap a word or the temperature |
| 6 | Every word asks and answers | softmax(QK^T / sqrt(d)) V, four coloured terms, next to the recording of slide 5 |

## What is real

- `demos/aitoy/aitoy/diffusion.py`: a noise predictor (3 hidden layers of 256, 145,432 numbers) trained by
  `demos/train_diffusion.py` (hand-written backpropagation, Adam, 40,000 steps, fresh points every step) on three made-up
  point clouds (`shapes.py`). It takes the point, the noise level (log-SNR) and the prompt. The prompt is dropped 20% of the
  time, so guidance (Ho and Salimans 2022) is the real classifier-free formula `e_u + g (e_c - e_u)`. Because it sees the noise
  level, not a step index, any schedule and any number of steps work (a respaced DDPM sampler, Nichol and Dhariwal 2021).
- `demos/aitoy/aitoy/attention.py`: word and position vectors of 16 numbers, two attention layers with residual connections,
  a linear read-out of "it". 2,176 numbers, trained by `demos/train_attention.py` on sentences of one shape
  ("the A chased the B because it was ADJ") to say who "it" is. Layer 1 makes "it" look at the adjective, layer 2 makes it look
  at the animal the adjective points to. It knows 23 words and one sentence pattern.
- Nothing is faked: the reverse trajectory is computed by `stream_ai_diffusion.py` with the same network, a step per network
  evaluation, in a worker thread while the forward process plays.

## Recordings

`public/recordings/` holds three clips (WebM, MP4, still) made by `nimbledeck record ai.md`: `stream-ai-diffusion` (17 s,
60 fps lockstep, steps dragged from 40 to 8 at the end), `live-ai-sampler` (the steps edited to 6, then 100) and
`live-ai-attention` (the word hungry changed to scared, then the temperature to 3). Slides 4 and 6 play the first and the
last next to their equations, and the web edition plays all three. Re-record after changing the code of slide 3 or 5: the
scripted keystrokes address lines by number.

## Why a package

The live-code runner runs each snippet in an isolated process with no access to the deck folder, so the trained weights ship
as a tiny editable package, `demos/aitoy`, listed in `demos/requirements.txt` (`-e ./demos/aitoy`). The slide code does
`from aitoy import diffusion`, like any library.

## PyStream extension

`<PyStream>` gained `groups`, `sizes`, `alphas`, `:sliders="[]"` and `labels` on extra sliders (documented in
`docs/WRITING.md`). The diffusion stream uses four groups: the cloud, the arrows, a time track and the part travelled.

## Retraining

```sh
uv run --python 3.12 --with numpy python demos/train_diffusion.py 40000    # about 7 minutes on an idle laptop
uv run --python 3.12 --with numpy python demos/train_attention.py 400      # 2 seconds
```
