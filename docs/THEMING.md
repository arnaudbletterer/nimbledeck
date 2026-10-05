# Building a brand theme on Nimbledeck

A brand lives in its own repository and depends on Nimbledeck. Nimbledeck never contains brand fonts, logos or
company content.

## Looks and showcase layouts in the base theme

`ndVariant` picks the look: `plain`, `paper`, `night`, and the keynote pair `studio` (near-black blue, warm off-white
ink, cyan to violet accent) and `studio-light` (the same identity on a warm white page). Both use system font stacks
only (SF Pro, Inter, system-ui, with a tight tracking and heavy weight for display type), so a deck works offline.
`studio` is dark: the theme switches Slidev to its dark code theme for it, and Mermaid follows. Text contrast is at least
7:1 for body and muted text on `studio`, and at least 4.5:1 everywhere on `studio-light`.

Besides the eight base layouts the theme ships five for showcase decks: `hero`, `statement`, `split`, `stage` and
`numbers` (slots and content in [WRITING.md](WRITING.md)). They are extras: a brand theme does not have to implement them,
and a deck that uses them is portable only to themes that do. `nimbledeck check` and `verify` know their classes and treat
`hero`, `statement`, `split` and `stage` as lead layouts (no title bar, no footer).

The studio looks add a few things a deck can use by name, all in the theme's global stylesheet: `class: nd-grid` in a slide's
frontmatter adds a faint drifting grid; `transition: nd-zoom` is a calm blur-and-scale transition; `statement`, `split` and
`closing` take an optional `::bg::` slot like `hero`; the word classes `[text]{.nd-name}` (mono accent), `[text]{.nd-quiet}` (muted) and
`[text]{.nd-outline}` (a ghost display word for a `<Marquee>` band) work in Markdown; a hairline along the bottom edge fills as the
deck advances (`global-bottom.vue`, shown by the studio looks only); and the quiz and the `numbers` cards are restyled
as large cards.

`package.json` sets the slide transition to `fade-out`, a short cross-fade. A deck can override it with `transition:` in
its headmatter. Live components still gate on `useActive()`, which follows the current page, not the transition.

## Layout of a brand repository

```
brand-repo/
  package.json              depends on: @slidev/cli, nimbledeck, slidev-addon-nimbledeck, slidev-theme-<brand>
  nimbledeck.config.json    limits and demos for this brand's decks
  theme/                    the package slidev-theme-<brand>
    package.json            keywords: slidev-theme; slidev.defaults.addons: ["slidev-addon-nimbledeck"]
    layouts/*.vue           the layouts (same names as the base theme, plus brand-specific ones)
    styles/index.css        fonts, brand tokens (--nd-*), and ALL shared layout CSS
    public/ or assets       fonts, logos (the brand's own licenses)
  decks/*.md                `theme: <brand>`
```

## The contract

1. **Implement the eight base layout names** so decks are portable between themes: `cover`, `agenda`, `divider`,
   `default`, `two-cols`, `photo-right`, `closing`, `full` (no chrome; the slot fills the slide, clipped to it). Brand-only layouts may be added.
2. **Override the tokens** (`--nd-bg`, `--nd-ink`, `--nd-accent`, ...). The live components follow automatically.
3. **Keep shared CSS global** (`styles/index.css`), not in a layout's `<style>`.
4. **List the addon** in the theme's `slidev.defaults.addons` so decks need only `theme: <brand>`.
5. **Tune the checker** in `nimbledeck.config.json` (for example a shorter `limits.maxTitle` if the brand's title bar is
   narrow). If the brand has its own cover-like layout names or its own footer and photo classes, also set
   `leadLayouts` (layouts that need no `# title`) and `verify.chrome` / `verify.bleed` (CSS selectors for slide furniture
   and full-bleed media), so the generic CLI never needs brand names. See the table in `docs/ARCHITECTURE.md`.

## Presets for free

Motion and background presets (see [MOTION.md](MOTION.md)) live in the addon: `slide-bottom.vue` sets `data-nd-motion`, `data-nd-bg`
and `data-nd-scrim` on the slide's `.slidev-layout` root, and the CSS reaches titles, blocks, list items, rows and cards by role. A
brand theme that lists the addon gets them with no code. A brand layout must have a `.slidev-layout` root (optionally
`position: relative`), paint its own background on that root, and keep the title as an `h1`. The background layer takes the colours
the root really paints, so a dark cover stays dark.

## Name your palette, and make emphasis controllable

Convention used by the Quartier Latin theme (worth copying): define the brand palette once as named tokens with a
prefix of your own (that theme uses `--ql-noir`, `--ql-optima-blue`, ...), define the `--nd-*` tokens from them, and make
every rule refer to the names instead of repeating hex values. Plain hex appears only where a value is defined once: the
palette itself and a few derived neutrals (`--nd-muted`, `--nd-line`, the quiz tints `--nd-good` and `--nd-bad`). Make recurring styling behaviour controllable through variables at three levels: a deck-wide headmatter key read in the
theme's `setup/main.ts` (a `data-*` attribute on `<html>`), a per-slide `class:` that redefines the variables, and per-word classes
(`[text]{.name}`, which works because Slidev's MDC syntax is on). The Quartier Latin theme does this for emphasis: **bold** and
*italic* are highlight chips by default, switchable to plain or swapped. Keep rules low-specificity (`:where(...)`) so components
can override them.

## Verified with a throwaway consumer

A project with its own `slidev-theme-brand` (two layouts, its own colours and fonts), dependencies on `nimbledeck`
and `slidev-addon-nimbledeck`, and a deck using `<Orbit />`:

- `nimbledeck check` validated the deck against the brand's own layouts and limits and caught an unknown layout.
- The Orbit component ran at 60 fps drawn in the brand's colours, with no change to the component.

## Known limits

- Mermaid: the base theme's `setup/mermaid.ts` is applied (checked on 2026-10-03: a node's fill equals `--nd-surface`
  and the font is `--nd-font-body`). It maps only the base colour, border, text, line and font to the tokens, and reads
  them when each diagram renders. A brand theme gets this only by shipping its own `setup/mermaid.ts`, since a theme
  does not inherit another theme's setup files. A deck can provide one too.
- Fonts must be self-hosted. The base theme sets Slidev's `fonts.provider` to `none`, so no stylesheet is fetched from
  Google Fonts and a deck opens with no internet (a hanging font stylesheet blocks the first paint). A brand that wants a
  web font ships the files in its own `public/` folder, declares them with `@font-face` in `styles/index.css`, and keeps
  a system font after them in `--nd-font-body`. Do not set `fonts.provider: google` in a brand or a deck. The default
  favicon is inline for the same reason; a brand can point `favicon` at a file in its `public/` folder.
- Brand fonts and logos keep their own licenses and stay in the brand repository, never in Nimbledeck.
