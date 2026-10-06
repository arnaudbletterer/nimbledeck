# Building a brand theme on Nimbledeck

A brand lives in its own repository and depends on Nimbledeck. Nimbledeck never contains brand fonts, logos or
company content.

## Looks in the base theme

`ndVariant` picks the look of a whole deck, and the `Looks` component shows the same slide in several of them. There are
twenty looks, listed with their colours in `packages/theme/looks.json`; the checker rejects an
`ndVariant` that is not in that file. Every look is a complete set of `--nd-*` tokens plus a few rules of its own (title weight
and rule, callout shape, table style, list marker, code block, cover), so a look is a character, not only a palette. Fonts are
system stacks, never downloaded, so every look works offline. A look that needs a face a machine does not have falls back
through its stack (Didot, then Bodoni, then Georgia, for example).

| Look | Scheme | Personality | Best for |
|---|---|---|---|
| `plain` | light | White page, ink, one blue accent. The neutral default. | Documentation, anything where the content leads |
| `paper` | light | Warm paper, Georgia, a rust accent. | Essays, reading material, the humanities |
| `night` | dark | Slate blue-black with a sky-blue accent. | Dark rooms, engineering talks |
| `studio` | dark | Keynote dark: near-black blue, cyan to violet, heavy tight type, progress hairline. | Launches, demos, conference keynotes |
| `studio-light` | light | The studio identity on a warm white page. | The same talks in a bright room |
| `editorial` | light | Serif display on warm paper, double rules, small-caps kickers, pull-quote callouts. | Long-form talks, research, anything magazine-like |
| `swiss` | light | White, black and one red; huge grotesk, a heavy rule over each title, red covers, square bullets. | Design talks, pitches, one strong message |
| `neon` | dark | Near-black with electric magenta and cyan, glowing titles, a perspective grid on covers. | Lightning talks, music, games, creative technology |
| `terminal` | dark | Green phosphor on black, monospace everywhere, scan lines, a blinking caret after each title. | Developer talks, command-line tools, security |
| `blueprint` | dark | Deep blue drafting paper with a measured grid, uppercase lettering, a framed cover. | Architecture, hardware, systems design |
| `sunset` | dark | Deep plum with a coral to gold glow and a setting sun on covers. | Stories, community talks, events |
| `ocean` | light | Airy seafoam page, deep-water covers with a wave line, blue and teal. | Health, travel, sustainability, product overviews |
| `forest` | dark | Deep green with leaf and amber accents, leaf-shaped corners. | Nature, wellbeing, sustainability |
| `mono` | light | Grayscale brutalism: black title bars, thick borders, hard offset shadows, grayscale media. | Manifestos, design critique, zines |
| `candy` | light | Playful pastel, rounded type, bubbly corners, dotted rules. | Workshops, teaching, community events |
| `gold` | dark | Black and gold, Didone capitals with wide tracking, a fine frame. | Galas, awards, premium brands |
| `newsprint` | light | Grey newsprint, condensed black headlines, serif text, thick-thin rules, a dotted cover. | Retrospectives, journalism, front-page summaries |
| `slate-pro` | light | Corporate and calm: slate neutrals, one blue, a short accent bar under titles. | Business reviews, steering committees, consulting |
| `high-contrast` | dark | White on black with yellow, 7:1 or better for all text, larger footer and muted text, thick outlines and focus rings. | Large rooms, projectors, low-vision audiences, accessibility policies |
| `print` | light | Ink-friendly for PDF handouts: white page, thin black rules, no gradients, grayscale media. | Printed slides and handouts |

Dark looks also switch Slidev to its dark syntax theme, so highlighted code keeps its contrast. The theme derives this from the
`dark` flag of `looks.json` (`setup/main.ts`); the `Looks` component reads the same fact from the `--nd-scheme` token of the look.

### Contrast

WCAG contrast ratios, computed from the colours in the stylesheet by `examples/theme-lab/looks-contrast.mjs`, and checked by
`packages/addon/test/looks.test.mjs` (4.5:1 for every text pair, 7:1 for all of `high-contrast`, 3:1 for chart marks). Each
cell is the lowest ratio of its group.

| Look | Body | Muted | Accent | On surface | Cover | Answers | Charts |
|---|---:|---:|---:|---:|---:|---:|---:|
| `plain` | 15.8 | 5.2 | 5.2 | 4.7 | 17.7 | 4.7 | 4.8 |
| `paper` | 14.6 | 5.8 | 6.8 | 5.0 | 14.6 | 4.7 | 4.8 |
| `night` | 14.4 | 7.0 | 8.3 | 5.7 | 19.3 | 5.6 | 6.6 |
| `studio` | 17.2 | 7.9 | 11.0 | 7.1 | 17.5 | 5.6 | 7.3 |
| `studio-light` | 17.7 | 5.8 | 6.6 | 5.3 | 17.7 | 5.1 | 4.6 |
| `editorial` | 15.4 | 5.3 | 6.6 | 4.7 | 15.4 | 5.9 | 4.3 |
| `swiss` | 18.9 | 7.0 | 5.5 | 6.1 | 5.5 | 5.5 | 3.4 |
| `neon` | 17.7 | 9.2 | 6.3 | 8.6 | 20.4 | 6.1 | 6.3 |
| `terminal` | 16.5 | 10.2 | 18.1 | 9.4 | 17.0 | 7.1 | 10.9 |
| `blueprint` | 13.0 | 8.0 | 9.7 | 6.8 | 15.0 | 6.3 | 6.8 |
| `sunset` | 16.4 | 10.4 | 7.8 | 9.1 | 15.5 | 6.7 | 6.4 |
| `ocean` | 14.0 | 5.6 | 5.5 | 5.1 | 12.9 | 5.1 | 4.3 |
| `forest` | 15.3 | 8.6 | 9.5 | 7.0 | 16.5 | 6.6 | 6.4 |
| `mono` | 16.8 | 7.9 | 16.8 | 9.3 | 16.8 | 14.0 | 3.6 |
| `candy` | 13.2 | 6.2 | 5.1 | 5.7 | 10.9 | 4.6 | 3.6 |
| `gold` | 16.5 | 8.7 | 9.4 | 8.2 | 17.0 | 8.0 | 4.3 |
| `newsprint` | 14.3 | 6.8 | 5.4 | 6.0 | 14.3 | 6.0 | 3.5 |
| `slate-pro` | 17.1 | 6.7 | 6.4 | 6.1 | 17.1 | 5.5 | 4.5 |
| `high-contrast` | 21.0 | 15.9 | 16.6 | 14.0 | 21.0 | 9.4 | 8.3 |
| `print` | 21.0 | 10.4 | 9.9 | 9.3 | 21.0 | 17.5 | 4.3 |

Each cell is the lowest ratio of its group: Body is ink on the page, Muted is muted text on the page, On surface is ink and muted on the card colour, Answers covers the quiz tints, Charts is the weakest of the four chart colours on the page.

Two states are meant to be dimmer. A faded answer in a finished quiz keeps 60 percent opacity in every look but `high-contrast`
(85 percent there), because fading is how a quiz says "not this one"; a right or wrong answer is also marked by a glyph and a border,
so colour is never the only signal.

### One grid for every look

Changing the look must not make content jump. The shared rules fix the grid, and a look only changes how things are drawn:

- The title bar is one box in every look: 88 px high, its text starting 70 px from the left edge (`--nd-h1-padx`, 70 px by default),
  its rule on the bottom edge (`--nd-h1-rule`, any style or width, drawn inside the box). Body blocks start 26 px below it, with the
  same 70 px side gutters. A look that wants a bar above the title draws it inside the box (`box-shadow: inset`), never with a
  border or padding of its own.
- Line boxes do not follow the font size: the subtitle (`h4`) has a 60 px line box, a callout 39 px and table cells 36 px, so a
  smaller or larger face does not move what follows. List text starts 29 px inside the gutter.
- The footer is anchored 70 px from the left and 16 px from the bottom, the page number 28 px from the right and 14 px from the
  bottom, in every look. Their size and style are free.
- The lead layouts (`cover`, `divider`, `closing`, `statement` centred, `hero` and `split` flush left) keep their own composition
  and the alignment of `plain`.

What may differ is character: rule styles, fonts, colours, weights, ornaments, callout and table styling, the size of display type.

Intentional exceptions, listed in `EXCEPTIONS` of `examples/theme-lab/align-audit.mjs`:

| Look | Exception | Why |
|---|---|---|
| `swiss` | `cover`, `divider`, `closing` and `statement` titles are flush left | The grid look: everything hangs from one left edge |
| `slate-pro` | `cover`, `divider` and `closing` titles are flush left | Corporate decks read from the left |
| `high-contrast` | A list, callout or table below the first body block starts up to 9 px lower | Its text is 27 px, larger on purpose |

Check it with `node examples/theme-lab/align-audit.mjs --check` (not part of `npm test`: it needs a browser). It serves
`examples/theme-lab/align.md`, one slide per layout, and for every look of `looks.json` compares the boxes of the title, its rule,
the first body block, a list item, a callout, a table, the footer and the page number with `plain`, within 2 px. Without `--check` it
prints the deviations as a table (look, layout, element, dx, dy, dwidth); `--looks a,b` limits it to some looks.

### Choosing and showing looks

```yaml
---
theme: nimbledeck
ndVariant: editorial
---
```

`<Looks />` steps through a curated tour (plain, paper, night, studio light, studio, editorial, swiss, neon) when its slide
appears. `<Looks :looks="['terminal', 'blueprint', 'gold']" />` tours the ones you name, and `<Looks looks="all" />` offers all
twenty (give it a few rows of height). Keys 1 to 9 pick a look, and the deck's own look returns when you leave the slide.

### Adding a look to the base theme

1. Add a block `[data-nd-variant="id"] { ... }` at the end of `packages/theme/styles/index.css`, inside the look catalogue. It
   must define every token that `packages/theme/looks-lib.mjs` lists as required (colours, chart colours, quiz tints, fonts, gradient,
   title size and transform, `--nd-scheme`). Do not start an id with `studio`: the studio rules match by prefix.
2. Set the optional knobs that shape the shared rules: `--nd-h1-weight`, `--nd-h1-tracking`, `--nd-h1-rule` (the line under a title),
   `--nd-h1-padx` (keep 70 px), `--nd-h4-*` (subtitle), `--nd-bullet` and `--nd-marker-color`, `--nd-callout-radius`, `--nd-callout-bg`,
   `--nd-callout-box` and `--nd-callout-bar`, `--nd-th-bg`, `--nd-th-ink`, `--nd-th-rule`, `--nd-zebra`, `--nd-td-rule`,
   `--nd-code-bg`, `--nd-code-border`, `--nd-code-radius`, `--nd-card-radius`, `--nd-card-border`, `--nd-page-image`,
   `--nd-cover-image`, `--nd-closing-image`, `--nd-body-size`, `--nd-faded-opacity`. With none set, the result is the plain look.
3. Add the rules that give the look its character, each prefixed with `[data-nd-variant="id"]` so they win over the shared rules.
4. Add the entry (`id`, `label`, `description`, `dark`, `swatch` = page, ink, accent, accent 2) to `looks.json`.
5. Run `npm test`. It fails if the two disagree, if a token is missing or if a text pair falls under its ratio.
6. Run `node examples/theme-lab/align-audit.mjs --check` (see "One grid for every look"), then look at it: start the sample deck (`NIMBLEDECK_PORT_OFFSET=700 nimbledeck run looks.md` in `examples/theme-lab`) and run
   `node looks-shots.mjs http://localhost:3730 shots --looks id`. It writes a screenshot of each of the 18 slides under that look,
   a contact sheet, and lists any text that is cut off or leaves the slide. Read the PNGs.

### Known limits of the looks

- `Aurora` and `Shader` draw in the accent colours, so their hue follows the look. A black accent has no hue, so `mono` and `print`
  turn live backgrounds (`.nd-bg`) and the photo of `photo-right` to grayscale with a CSS filter.
- Mermaid reads the tokens when a diagram first renders and Slidev then caches the drawing, so a diagram keeps the colours of the look
  it was first drawn in until the page is reloaded. The `Looks` tour changes the look under such a diagram without redrawing it.
- Titles are one line: a title too long for its look is cut with an ellipsis, as in every look. Looks with wide letters
  (`gold`, `blueprint`, `newsprint`, `terminal`) fit about 38 to 40 characters, which is what the checker allows.
- Photos keep their colours except in `mono` and `print`.

## Showcase layouts

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
