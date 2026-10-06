# Motion and background presets

To animate a slide, pick a preset. Do not write CSS and do not compose `<Kinetic>`, `<Aurora>` or `<Stage>` for the common
effects: one line of frontmatter does it, on every layout, and `nimbledeck check` tells you when an id is wrong.

## The three-line recipe

```md
---
theme: nimbledeck
ndVariant: studio
ndMotion: cascade        # every slide enters with this, unless it says otherwise
ndBackground: mesh       # optional, every slide gets this background
---

# A slide that uses the defaults

---
motion: pop              # this slide overrides the deck default
background: aurora
---

# A slide with its own motion and background

---
motion: none             # this slide is still
background: none
---
```

| Key | Where | Meaning |
|---|---|---|
| `ndMotion: <id>` | headmatter | motion for every slide |
| `motion: <id>` | a slide | motion of this slide; `none` turns it off |
| `ndBackground: <id>` | headmatter | background for every slide |
| `background: <id>` | a slide | background of this slide; `none` turns it off |
| `ndScrim: soft` / `scrim: strong` | headmatter / a slide | how much of the page colour is laid over the background so text stays readable: `none`, `soft` (default), `strong` |

Slidev also reads `background:` as an image or colour on some of its own layouts. The Nimbledeck layouts do not, so here it
only names a preset.

## Motion presets

A motion plays once when its slide is entered, and again on every re-entry. It moves the title, the subtitle, each paragraph,
list item, table row, quote, code block, image, figure, live component and `numbers` card, in that order, one after the other.
Elements revealed by `v-click` keep their own reveal. With `prefers-reduced-motion` the slide is simply there.

| Id | What it does | Use for |
|---|---|---|
| `fade-up` | Everything rises 56 px and fades in, one block after the other. | any slide; the safe default |
| `cascade` | The title slides in from the left out of a blur, then each block falls into place behind it. | lists and bullet slides |
| `slide-left` | Content travels 200 px from the right edge towards the left. | next step, timeline, comparison |
| `slide-right` | Content travels 200 px from the left edge towards the right. | previous step, flashback, answer |
| `drop` | Falls from above and lands with an overshoot, slightly crooked on the way down. | statement, divider, punchline |
| `zoom` | Grows from a speck out of a blur. | hero, cover, a single image |
| `zoom-out` | Starts huge and close to the camera, then settles back to size. | cover, closing |
| `blur-in` | No movement: a heavy blur resolves into the text. | quote, calm statement |
| `focus` | A camera pulling focus: content and background start blurred and enlarged, then sharpen in turn. | reveal, hero, background shown |
| `wipe` | Each block is uncovered from left to right. | table, code, image, chart |
| `curtain` | The title is let down like a curtain; blocks open from their middle outwards. | cover, statement, section |
| `flip` | Each block turns up on a hinge at its top edge, in 3D. | cards, numbers, agenda items |
| `pop` | Springs up from nothing and overshoots a little. | bullets, chips, short lists |
| `rise` | Text climbs out of a hidden line below it; blocks follow, slower. | title-led slides, hero |
| `typewriter` | The title is typed one character at a time; blocks flicker on after it. | code, terminal, technical statement |
| `glitch` | A short RGB split and jitter on entry, then still. | tech cover, section break |
| `spotlight` | The slide is dark, a soft circle of light opens from the middle and the content settles into it. | cover, closing, reveal |
| `swing` | Hangs from its top-left corner and swings into place like a sign. | callout, label, warning |
| `rubber` | Stretches and squashes like rubber before it settles. | fun deck, short list, big word |
| `parallax` | Title, body and background travel different distances at different speeds. | hero or statement over a background |
| `count` | Cards rise in turn and each big figure rolls up from behind a line. | numbers layout, key figures |

Pick by the job of the slide. Text-heavy slides: `fade-up`, `cascade`, `pop`, `wipe`. Covers and closings: `zoom-out`, `curtain`,
`spotlight`, `typewriter`. Statements: `drop`, `blur-in`, `rubber`. Numbers: `count`, `flip`. A deck reads best with one default
(`ndMotion`) and two or three slides that override it.

## Background presets

A background sits behind the content of any layout, including the dark covers (it takes the colours the layout really paints).
It exists only while its slide is on screen.

| Id | What it is |
|---|---|
| `aurora` | Soft blobs of the accent colours drifting on slow orbits (the Aurora component). |
| `shader` | Slow folds of coloured light with contour lines, drawn on the GPU (the Shader component). |
| `grid` | A fine grid drifting diagonally and fading towards the edges, over a faint glow. |
| `mesh` | Three big soft blobs of colour on slow, different orbits. |
| `noise` | Film grain flickering at about 8 fps over a faint glow. |
| `dots` | A lattice of dots drifting, with a second lattice turning slowly over it. |
| `waves` | Three layers of sine curves sliding sideways at different speeds. |
| `spotlight` | One large pool of light wandering across the slide and a smaller one answering it. |
| `stars` | Three fields of dots that twinkle and drift at different speeds. |
| `gradient` | A wide wash of the two accents turning slowly around the middle. |

Backgrounds use only the `--nd-*` tokens, so every look and every brand theme gets its own colours. A background does not
make text unreadable: the scrim keeps text at 4.5:1 or better against the local mean of the background in `studio`,
`studio-light` and `plain` (`presets-e2e.mjs` measures it). Use `scrim: strong` for a dense slide, `scrim: none` for a
decorative one.

## See them all

`<MotionWall />` plays every motion and background of this page at once, and `<LookWall />` shows every look; the showcase deck
uses both (slides 9 and 10). See [components](components.md).

## Cost

Only opacity, transforms, filters, clip-paths and masks move, so nothing is laid out again while a preset plays. Backgrounds
are CSS shapes moved by the compositor (`grid`, `mesh`, `noise`, `dots`, `waves`, `spotlight`, `stars`, `gradient`) or the
existing half-resolution canvases (`aurora`, `shader`). A slide that is not on screen has no background layer and nothing
running. `PERFORMANCE.md` has the measurements.

## The contract for tools

The presets are a fixed interface; a playground or a test can rely on it.

- `packages/theme/presets.json` lists them: `motions[]` (`id`, `label`, `description`, `use`), `backgrounds[]` (`id`, `label`,
  `description`) and `scrims[]`. A test fails when an id is in the file but not in the CSS, or the other way round.
- The slide's `.slidev-layout` root carries `data-nd-motion="<id>"`, `data-nd-bg="<id>"` and `data-nd-scrim="<level>"` while the
  slide is current (and for 0.7 s after it is left). Without a preset there is no attribute.
- **To replay a preset, remove the attribute, let the browser compute the style, and add it back.** Setting the same value
  again does nothing, and removing and re-adding in the same frame does not restart CSS animations:

  ```js
  const root = document.querySelector('.slidev-layout')
  root.removeAttribute('data-nd-motion')
  void root.offsetWidth                       // forces a style recalculation
  root.setAttribute('data-nd-motion', 'wipe')
  ```
- The CSS is in `packages/addon/styles/motion.css` and `backgrounds.css`; `packages/addon/slide-bottom.vue` sets the attributes.
- Overview, print and export render the slides without the attributes, so they show the final state.

## How it works

Slidev renders `slide-bottom.vue` inside every slide. It reads the frontmatter and the headmatter, finds the slide's
`.slidev-layout` root, and sets the attributes when the slide becomes current. All looks are CSS keyed on the attribute and
reach the parts of a slide by role (`h1`, other headings, blocks, list items and table rows, cards), with the stagger taken from
the child index (`:nth-child`), so no script touches an element. A background is a `div.nd-bgx` appended to the layout root
with `z-index: -1` inside an isolated stacking context: above the layout's own background, below all content.

## Limits

- `typewriter` types the title one character at a time; it measures the title once when the slide is entered.
- `count` rolls the figures up; it cannot count the digits of Markdown text. For a real count use `<Stat>`.
- A layout that wants presets needs a `.slidev-layout` root and `position: relative` (or none). See [THEMING.md](THEMING.md).
- Parts of a slide that animate themselves (`<Kinetic>`, `<Typewriter>`, the children of a `<Stage>`) are left alone; the
  `<Stage>` itself moves as one block.
