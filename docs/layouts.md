---
hide:
  - navigation
  - toc
---

# Layouts: read one, change one, make one

A layout is a small Vue file with slots. The theme ships thirteen of them (eight base layouts and five for showcase decks), each between 5 and 15 lines. Everything they
share (fonts, title bar, tables, colours) lives in one global stylesheet that reads the `--nd-*` tokens, so a layout
only says **where things go**.

## Try it now

<div class="nd-frame nd-tall"><iframe src="../playground/" title="Nimbledeck playground" loading="lazy"></iframe></div>

[Open the playground full screen](../playground/){ .md-button .md-button--primary target="_blank" }

- **Pick a layout.** The **Slide** tab shows your slide in every layout. One click re-arranges it. The slide text
  below the cards is the whole slide: its first lines name the layout.
- **Pick a look, a motion and a background.** The **Style** tab is three galleries, **Look**, **Motion** and
  **Background**. Hover or focus a card to see your current slide play it; click to apply it. Every layout animates,
  the cover and the closing slide included. The **Your recipe** box at the top is the result: the few lines of
  frontmatter that make it happen, with a **Copy** button.
- **Not sure?** **Surprise me** draws a look, a motion and a background that keep the text readable (the look must
  reach 7:1 for body text, 4.5:1 for muted text and 3:1 for the accent). **Tour** steps through the presets of the open
  gallery on your slide; **Keep this** applies the one on screen.
- **Fine tune** (collapsed under the galleries) keeps the plain controls: accent colour, title size, rounded corners,
  footer and page number, each shown as the CSS it produces.
- **Read and change the code.** The **Code** tab holds the layout itself, a few lines of Vue. Edit it and the slide
  updates as you type. **Save as new layout** copies it under your own name.
- Add, duplicate and delete slides in the strip on the left. Your changes stay in your browser; **Start over**
  brings the originals back.

## The recipe

Three keys, two places. The look and the default motion belong to the deck; a slide can override the motion and add
a background.

The header of the first slide, for the whole deck:

```yaml
---
ndVariant: neon         # a look, see packages/theme/looks.json
ndMotion: cascade       # the motion of every slide (optional)
---
```

The header of one slide:

```yaml
---
layout: cover
motion: pop             # this slide's own motion
background: aurora      # an animated background for this slide
---
```

Motion and background are attributes of the slide's root (`data-nd-motion`, `data-nd-bg`), and the theme's stylesheet
holds the keyframes, so they work with every layout, yours included. Ids come from `packages/theme/presets.json`.
The **Every slide** switch in the playground writes the deck key (`ndMotion`, `ndBackground`) instead of the slide
key. A slide that has its own `motion:` keeps it. Under a background, `scrim: none | soft | strong` (deck: `ndScrim`)
sets how much of the page colour is laid over it to keep the text readable.

!!! note "What the playground approximates"
    It compiles each layout's `<template>` in the browser and ignores its `<script>`. It has no live components
    (`Orbit`, `Quiz`...) and no Slidev builds (`v-click`). Those work in a real deck. A background that draws on a
    canvas in a real deck shows its CSS stand-in here, and says so on its card. With the system setting "reduce
    motion" on, the previews show the final state and nothing plays.

## Anatomy of a layout

=== "default.vue"

    ```vue
    --8<-- "packages/theme/layouts/default.vue"
    ```

=== "two-cols.vue"

    ```vue
    --8<-- "packages/theme/layouts/two-cols.vue"
    ```

=== "cover.vue"

    ```vue
    --8<-- "packages/theme/layouts/cover.vue"
    ```

=== "photo-right.vue"

    ```vue
    --8<-- "packages/theme/layouts/photo-right.vue"
    ```

Three things to see:

- The root carries `slidev-layout` and a class per layout, so global CSS can target it.
- `<slot />` is where the Markdown goes. Named slots (`<slot name="right" />`) are filled with `::right::` in the deck.
- Frontmatter keys become props: `image: /a.jpg` reaches `photo-right` as `image`.

## What you write in the deck

This is the whole slide for the two-column layout:

````md
---
layout: two-cols
---

::title::

# Two columns

::default::

- left column

::right::

> a callout on the right
````

The same slide in plain HTML and CSS would be around forty lines. That gap is the point: a human or an agent writes
the short form, the layout owns the geometry, and `nimbledeck check` rejects anything outside it.

## Recipes

### 1. Change an existing layout

In the **Code** tab, open `default` and delete the two `<span>` lines: the footer and the page number are gone from every slide that
uses it. Other changes work the same way: a new class on the root, an extra element, a different slot order.
Colours are not a layout matter: pick another card in the **Look** gallery, or override the `--nd-*` tokens in a theme.

### 2. Make a new layout from a classic one

1. Open `default` in the **Code** tab and press **Save as new layout**.
2. Rename the class `default` to the new name, and add your own classes to the markup.
3. Put its CSS in the theme's `styles/index.css`, or in your deck project's own stylesheet.
4. Save the file as `layouts/<name>.vue` next to your deck. `nimbledeck check` and Slidev both pick it up.

### 3. Add motion

Most decks do not need to write any: pick a card in the **Motion** gallery and the preset animates the slide, whatever
its layout. A layout that wants a motion of its own can still write CSS, no script needed. The `my-layout` layout is an
example: a rail that grows in and bullets that fade up one after the other, until a preset is chosen (the rule carries
`:not([data-nd-motion])`, so the preset wins).

```css
.my-layout:not([data-nd-motion]) .nd-body > * { animation: ml-up .5s ease-out both; }
.my-layout:not([data-nd-motion]) .nd-body > :nth-child(2) { animation-delay: .12s; }
@keyframes ml-up { from { opacity: 0; transform: translateY(16px); } }
@media (prefers-reduced-motion: reduce) { .my-layout * { animation: none !important; } }
```

Press **Replay** to see it again. For motion that depends on the slide, use the building blocks that already exist:
`v-click` and `<v-clicks>` for builds, `<Fly>` for entrances, and the [live components](components.md) for canvas,
3D and Python.

!!! warning "Where the CSS goes in a real theme"
    Shared CSS belongs in the global stylesheet, not in a layout's `<style>`: Slidev loads a layout's styles only when it
    is first used, so a slide opened directly would lose them. The playground allows a `<style>` block so you can
    experiment in one place.

## The contract

Layouts are portable between themes because every theme implements the same eight names: `cover`, `agenda`,
`divider`, `default`, `two-cols`, `photo-right`, `closing`, `full`. Add your own beside them. See
[Themes and brands](THEMING.md).
