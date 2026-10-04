# Components gallery

Every component is a Vue tag you write in a slide. They fill the box they are given, take their colours from the
`--nd-*` tokens (so any theme restyles them), and run only while their slide is on screen.
The syntax and every option are in [Writing a deck](WRITING.md#live-components).

!!! tip "See them move"
    All of the components below appear in the [live example deck](demos/how-it-works/){ target="_blank" }.
    Which ones work without a local Python process is listed on the [live demos](demos.md) page.

## Motion and graphics

<div class="nd-cards" markdown>

<div markdown>
### `<Orbit />`
A canvas animation with optional play, pause, scrub and speed controls. A template for your own canvas scene.
</div>

<div markdown>
### `<Scene3D />`
A three.js WebGL scene you can drag to rotate. A template for your own 3D scene.
</div>

<div markdown>
### `<Fly>`
Entrance motion for text and elements. Respects the system "reduce motion" setting.
</div>

<div markdown>
### `<CountUp :to="3200" suffix="K" />`
A number that counts up when its slide appears.
</div>

<div markdown>
### `<Countdown :seconds="20" />`
A circular timer that starts with the slide. Click to pause.
</div>

<div markdown>
### `<Flip>`
A card that flips on click, with `#front` and `#back` content.
</div>

</div>

## Media and data

<div class="nd-cards" markdown>

<div markdown>
### `<Clip src="/a.mp4" />`
A looping video with `fit`, `dim` and `controls`.
</div>

<div markdown>
### `<Photo src="/a.jpg" />`
An image with `fit`, `position` and `dim`. `nimbledeck verify` warns when it is too small for its box.
</div>

<div markdown>
### `<Compare before after />`
Before and after images with a draggable divider. Arrow keys work too.
</div>

<div markdown>
### `<Chart type="bar" />`
Bar, line, pie and doughnut charts coloured by the theme and animated on entry.
</div>

<div markdown>
### `<Headline>`
Large display text for impact slides, in sizes `xl`, `l` and `m`.
</div>

<div markdown>
### `<Site url="..." />`
A website in a frame, behind a shield so it never swallows the arrow keys.
</div>

</div>

## Live code and Python

<div class="nd-cards" markdown>

<div markdown>
### `<LiveCode>`
Edit Python next to its result. Printed text and every matplotlib figure update as you type.
</div>

<div markdown>
### `<PyStream name="nbody" />`
A Python process streaming state to a canvas over a WebSocket, at up to 60 frames per second.
</div>

<div markdown>
### `<Demo name="compute" />`
A local [marimo](https://marimo.io) app in the slide, with an offline panel when its process is down.
</div>

</div>

## Interaction

<div class="nd-cards" markdown>

<div markdown>
### `<Quiz answer="B">`
The presenter clicks an answer (or presses 1 to 4). The right one is revealed, the rest fade, the explanation appears.
</div>

<div markdown>
### `<Stage>` and `<At>`
Layer any of the above, and text, in one 1280 by 720 coordinate space. `v-click` makes an element appear on click.
</div>

</div>

## Example: a quiz

````md
---
layout: default
---

# Which layout has no title bar?

<Stage>
<At :w="1140" :h="460">
<Quiz answer="B">
<Choice letter="A">default</Choice>
<Choice letter="B">full</Choice>
<Choice letter="C">agenda</Choice>
<Explain letter="B">

`full` has no title bar or footer: the slot fills the slide.

</Explain>
</Quiz>
</At>
</Stage>
````

## Example: text over a live canvas

````md
---
layout: full
---

<Stage full>
<At :w="1280" :h="720"><Orbit /></At>
<At :x="80" :y="520" :z="2" bg="var(--nd-bg)">

**Text over a live canvas.**

</At>
</Stage>
````

## Layouts

| Layout | Use for |
|---|---|
| `cover`, `closing` | first and last slide |
| `agenda` | three to eight items |
| `divider` | section break |
| `default` | bullets, tables, callouts |
| `two-cols` | two parallel columns |
| `photo-right` | an idea plus a photo |
| `full` | a full-frame element: website, animation, video |

## Three looks

Set `ndVariant` in the deck header to `plain`, `paper` or `night`. Layouts do not change, only the tokens do.
To build your own brand look, see [Themes and brands](THEMING.md).
