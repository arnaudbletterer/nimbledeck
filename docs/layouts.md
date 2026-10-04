---
hide:
  - navigation
  - toc
---

# Layouts: read one, change one, make one

A layout is a small Vue file with slots. The theme ships eight of them, each between 5 and 15 lines. Everything they
share (fonts, title bar, tables, colours) lives in one global stylesheet that reads the `--nd-*` tokens, so a layout
only says **where things go**.

## Try it now

<div class="nd-frame nd-tall"><iframe src="playground/" title="Nimbledeck playground" loading="lazy"></iframe></div>

[Open the playground full screen](playground/){ .md-button .md-button--primary target="_blank" }

- **Pick a layout.** The **Slide** tab shows your slide in every layout. One click re-arranges it. The slide text
  below the cards is the whole slide: its first lines name the layout.
- **Restyle it.** The **Style** tab has colour, title size, rounded corners, footer, page number and entrance motion.
  Each control is plain CSS, shown underneath so you can paste it in your theme.
- **Read and change the code.** The **Code** tab holds the layout itself, a few lines of Vue. Edit it and the slide
  updates as you type. **Save as new layout** copies it under your own name.
- Add, duplicate and delete slides in the strip on the left. Switch between the `plain`, `paper` and `night` looks at
  the top. Your changes stay in your browser; **Start over** brings the originals back.

!!! note "What the playground approximates"
    It compiles each layout's `<template>` in the browser and ignores its `<script>`. It has no live components
    (`Orbit`, `Quiz`...) and no Slidev builds (`v-click`). Those work in a real deck.

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
Colours are not a layout matter: switch the **Look** menu to `night`, or override the `--nd-*` tokens in a theme.

### 2. Make a new layout from a classic one

1. Open `default` in the **Code** tab and press **Save as new layout**.
2. Rename the class `default` to the new name, and add your own classes to the markup.
3. Put its CSS in the theme's `styles/index.css`, or in your deck project's own stylesheet.
4. Save the file as `layouts/<name>.vue` next to your deck. `nimbledeck check` and Slidev both pick it up.

### 3. Add motion

CSS animation in a layout needs no script. The `my-layout` layout is an example: a rail that grows in and bullets that
fade up one after the other.

```css
.my-layout .nd-body > * { animation: ml-up .5s ease-out both; }
.my-layout .nd-body > :nth-child(2) { animation-delay: .12s; }
@keyframes ml-up { from { opacity: 0; transform: translateY(16px); } }
@media (prefers-reduced-motion: reduce) { .my-layout * { animation: none !important; } }
```

Press **Replay motion** to see it again; the Style tab adds the same kind of motion without writing CSS. For motion that depends on the slide, use the building blocks that already exist:
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
