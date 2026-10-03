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
5. **Tune the checker** in `nimbledeck.config.json` (for example a shorter `maxTitle` if the brand's title bar is
   narrow).

## Verified with a throwaway consumer

A project with its own `slidev-theme-brand` (two layouts, its own colours and fonts), dependencies on `nimbledeck`
and `slidev-addon-nimbledeck`, and a deck using `<Orbit />`:

- `nimbledeck check` validated the deck against the brand's own layouts and limits and caught an unknown layout.
- The Orbit component ran at 60 fps drawn in the brand's colours, with no change to the component.

## Known limits

- Mermaid diagrams use their default palette; a theme-level `setup/mermaid.ts` was not picked up in testing.
  A deck can provide its own `setup/mermaid.ts`.
- Brand fonts and logos keep their own licenses and stay in the brand repository, never in Nimbledeck.
