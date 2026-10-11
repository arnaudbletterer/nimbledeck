# Equations

Write an equation the way you would in a paper, as LaTeX in the Markdown. The theme sets it, colours it from the look and
links it to the picture next to it. You never style an equation by hand.

## Write it

`$...$` is an equation inside a sentence, `$$...$$` is one on its own line:

````md
The model is $y = ax + b$, fitted by least squares:

$$
\hat{\boldsymbol\beta} = (X^\top X)^{-1} X^\top \mathbf y
$$
````

[KaTeX](https://katex.org) typesets them when the deck is built. Its fonts ship with the deck and are served from its own
files, so a deck with equations still opens on a train: no font, script or style is fetched. A mistake in the LaTeX shows as
a red `.katex-error` box in place of the equation, not a blank slide.

A display equation is 46 px high on the 1280 by 720 slide and takes its colour from the look, so it reads in all twenty looks,
including `high-contrast` (7:1) and `print`. Inline equations follow the size of the text.

Rules that keep an equation readable:

- One equation, or one short group, per slide. Put the picture it explains next to it.
- Display equations stay at 28 px or more. A longer one goes on two lines with `aligned`:

````md
$$
\begin{aligned}
\dot x &= \sigma\,(y - x) \\
\dot y &= x\,(\rho - z) - y
\end{aligned}
$$
````

- `nimbledeck check` does not count LaTeX as text, as HTML or as bullets, so a slide of maths is not warned about its length.
  A dollar sign that is not maths (`$ npm test`, `it costs $5`) is still text.

## Colour a term, link it

`\term{n}{...}` colours part of an equation and gives it a name:

````md
$$
\dot x = \term{1}{\sigma\,(y - x)} \qquad
\dot z = \term{3}{x y - \beta z}
$$
````

- `n` is a number from 1 to 4. It picks the chart colour of the look (`--nd-chart-1` to `--nd-chart-4`), the same colours a
  `<Chart>` and a matplotlib figure of a live-code slide use, so an equation and the curve it describes match. 5 is the
  accent colour, 6 the second accent. A coloured term also has a tinted background and a rule under it, so it stays visible in
  a look whose first chart colour is the ink.
- `n` is also the name of the term. Two parts with the same `n` are one term and light up together. To give two parts one
  colour but two names, add letters: `\term{1}{...}` and `\term{1b}{...}` are both colour 1.
- The colour is for the term, never decoration: use it where the picture has the same colour. A recording keeps the colours
  of the look it was filmed in, so a recorded slide matches only in that look.

`\term` and `\val` (below) are macros of the theme; `\d` stands for an upright d, as in `\int f\,\d x`. KaTeX is allowed to
trust two commands only, `\htmlClass` and `\htmlData`, which the macros use. Raw HTML and `\htmlStyle` are not available.

## `<Equation>`: point at a term, reveal it, make a number live

Wrap a `$$` block in `<Equation>` (blank lines around the block) to make its terms respond:

````md
<Equation label="Gray-Scott, the feed and kill terms" align="left" :size="34">

$$
\partial_t v = D_v \nabla^2 v + u v^2 - (\term{1}{F} + \term{2}{k})\,v
$$

</Equation>
````

| Prop | What it does |
|---|---|
| `label` | The reading for a screen reader, in words. The LaTeX is hidden from assistive technology when a label is set (the numbers of a live equation would be stale in it), so always write one. |
| `size` | Size of a display equation in slide pixels (46 by default). |
| `align` | `center` (default) or `left`. Use `left` in a column that starts at the 70 px margin. |
| `reveal` | A list of term names, shown one per click in that order: `:reveal="['1', '2']"`. Terms not in the list are always shown. |
| `params`, `decimals` | The starting values of the live numbers, and how many decimals to show (a number, or one per name). |

What it does:

- **Pointing.** Move the pointer over a term, or let a tour hover it, and the other terms recede. Nothing is clicked, and
  the typesetting never moves.
- **Pictures.** A picture answers to the term that is pointed at, in two ways (below).
- **Live numbers.** `\val{sigma}{10}` is a number that follows the parameter `sigma`; `10` is what shows until something
  sets it. Any component can set a parameter. A `<PyStream>` does it for its `extra` sliders.
- **Revealing.** `reveal` lights terms one click at a time, so a long equation can be built while you talk.
  Clicks of a `$$ {1|2|all}` block in the same slide come after those of `reveal`: terms first, then lines.

It animates nothing of its own and costs nothing on a slide that is not on screen. With reduced motion the terms change at once.

## Link it to a picture

Two ways, both drawn by the page, so they show over a live component and over its recording:

1. `highlight` on `<PyStream>`, `<LiveCode>`, `<Demo>`, `<Chart>` or `<Scene3D>`: a ring in the term's colour around the
   component, and a note in its corner. `:highlight="{ 1: 'x, left to right', 2: 'y, not drawn' }"`; a list of names
   (`:highlight="['1', '2']"`) gives the ring without a note.
2. `<Marker term="1">50 Hz</Marker>` inside an `<At>`: a label that appears at an exact place (a peak, an axis, a curve)
   while its term is pointed at. `term` takes one name or a list.

````md
<Stage full>
<At :x="70" :y="290" :w="560">
<Equation label="..." align="left">

$$ x(t) = \term{1}{\sin 2\pi\,50\,t} + \term{2}{\sin 2\pi\,120\,t} $$

</Equation>
</At>
<At :x="640" :y="58" :w="600" :h="604" frame><Clip src="/recordings/live-fft.webm" fit="cover" position="right" /></At>
<At :x="806" :y="300"><Marker term="1">50 Hz</Marker></At>
<At :x="950" :y="300"><Marker term="2">120 Hz</Marker></At>
</Stage>
````

Under the hood the two are one small store with two DOM events: `nd-term` (`detail: { id }`) and `nd-param`
(`detail: { name, value }`). A page script can dispatch them to drive a deck, or listen to follow it. The tour needs
nothing special: a `hover` step on `.nd-t1` points at term 1 (`.nd-t1b` for `1b`), and a `hover` on `.nd-eq` points at nothing.

## Live numbers from a slider

`<PyStream>` takes `extra`, more sliders whose values go to the Python process with `n`, `dt` and `g` and are published as
parameters:

````md
<PyStream name="lorenz" controls :extra="[{ name: 'sigma', label: 'σ', min: 0, max: 30, step: 0.5, value: 10 },
  { name: 'rho', label: 'ρ', min: 0, max: 60, step: 1, value: 28 }]" />

<Equation label="Lorenz parameters" :params="{ sigma: 10, rho: 28 }">

$\sigma = \val{sigma}{10}, \quad \rho = \val{rho}{28}$

</Equation>
````

Move a slider and the number in the equation changes while you drag; a tour `drag` step does the same. An extra slider is
sent to the process only once someone moves it, so the process keeps its own default until then. In the web edition the
slider is not there, and the equation shows the starting values. A `<Demo>` is a page in an iframe and does not share its
sliders with the slide, so use pointing and `highlight` there.

## Derive it line by line

Slidev's own line highlight works on a `$$` block with `aligned`: each click lights the next range of lines and dims the rest.

````md
$$ {1|2|3|all}
\begin{aligned}
&\ddot x + 2\zeta\omega_0\,\dot x + \omega_0^2\,x = 0 \\
&x = e^{\lambda t} \;\Rightarrow\; \lambda^2 + 2\zeta\omega_0\,\lambda + \omega_0^2 = 0 \\
&\lambda = -\zeta\omega_0 \pm i\,\omega_d
\end{aligned}
$$
````

Start each line with `&` so they align on the left. Put it inside `<Equation>` to colour terms in it as well. A tour script
advances it with `{ at: 3, key: "ArrowRight" }` steps.

## Copy and paste

A slide with one famous equation:

````md
---
layout: default
---

# Euler's identity

$$ \term{1}{e^{i\pi}} + \term{2}{1} = 0 $$
````

A pairing: the equation on the left, a chart on the right, both coloured by the look.

````md
---
layout: full
---

<Stage full>
<At :x="70" :y="250" :w="560">
<Equation label="Damped oscillator" align="left" :size="38">

$$ \term{1}{x(t)} = \term{2}{e^{-\zeta\omega_0 t}}\cos\omega_d t $$

</Equation>
</At>
<At :x="660" :y="150" :w="560" :h="400">
<Chart type="line" :highlight="{ 1: 'x(t)', 2: 'decay' }" :names="['x(t)', 'decay']"
  :labels="Array.from({ length: 61 }, (_, i) => (i % 10 === 0 ? i / 10 + ' s' : ''))"
  :data="[Array.from({ length: 61 }, (_, i) => Math.exp(-0.5 * i / 10) * Math.cos(5 * i / 10)),
          Array.from({ length: 61 }, (_, i) => Math.exp(-0.5 * i / 10))]" />
</At>
</Stage>
````

A line chart of more than 30 points is drawn without dots and keeps every label; write `''` for the labels you want blank.

The science deck (`examples/science/science.md`) uses it for Bayes' rule written in words, with its coloured terms lighting the
groups of dots of a `<Chance mode="pile">` next to it.

## Limits

- Terms 1 to 4 take the chart colours of the look, and each look defines its own, so a deck's colours change with `ndVariant`.
- `\val` replaces the text of one number. It does not typeset a new formula, so keep a `\val` to a number.
- The picture of a recorded component does not change when a term is pointed at, only the ring and the markers over it do.
- Offline: KaTeX renders at build time and nothing is fetched. See [Working offline](OFFLINE.md).
