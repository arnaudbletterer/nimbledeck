# Building a brand theme on Nimbledeck

A brand lives in its own repository and depends on Nimbledeck. Nimbledeck never contains brand fonts, logos or
company content.

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
- Brand fonts and logos keep their own licenses and stay in the brand repository, never in Nimbledeck.
