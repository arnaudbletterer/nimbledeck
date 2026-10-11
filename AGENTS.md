# Agent guide

You are writing or editing a Nimbledeck deck. Read `docs/WRITING.md` for syntax and `docs/ARCHITECTURE.md` before
changing a component.

## Writing a deck from a document

1. One message per slide. Cover first, closing last.
2. Use only the layouts of the active theme. Never write `<div>`, `<style>` or `style=`.
   Equations are LaTeX in the Markdown (`$...$`, `$$...$$`, `\term{1}{...}` to colour a part): never hand-style them (`docs/EQUATIONS.md`).
3. Run `nimbledeck check <deck.md>`; fix every ERROR; split slides that trigger a warning.
4. Preview with `nimbledeck run <deck.md>` when a live component or demo is involved.

## Animating a slide

To animate a slide pick a preset (`motion: <id>`, `ndMotion: <id>`, `background: <id>`, see `docs/MOTION.md`); never write CSS or
compose components for common effects.

## Changing the system

- A new live component goes in `packages/addon/components/`. It must gate on `useActive()`, use `--nd-*` tokens, and
  never measure its own size (see the rules in `docs/ARCHITECTURE.md`).
- A new layout must also exist in every theme that should support it; the base layout names are a contract.
- Shared CSS goes in the global stylesheet, not in a layout's `<style>`.
- Test in a browser by loading slides directly (reload on a middle slide) and by walking with the keyboard. Both
  found real bugs that a build did not.
- Run `npm test` before finishing. It covers the CLI, the live-code runner and the pure logic of the addon composables
  (colour, highlighter, `useEntered`). A change in `packages/addon`
  (components, composables, global CSS) also needs the browser end-to-end test (`examples/how-it-works/e2e-interactions.mjs`
  against the running example), because no unit test exercises it.
- A change to a look, a layout or the shared title, body, footer or page-number CSS also needs `node examples/theme-lab/align-audit.mjs --check`. It starts
  its own sample deck (needs Chrome), measures every look against `plain` on every layout, and fails when content jumps by more than
  2 px. It is not in `npm test`. The rule and its few exceptions are in `docs/THEMING.md` ("One grid for every look").
- The showcase has its own browser test, `examples/showcase/e2e.mjs`, which CI runs too. `npm --workspace examples/showcase run e2e`
  builds the web edition, serves it under its real base path and walks every slide with the keyboard, loads each slide
  directly, measures it like `nimbledeck verify`, and checks reduced motion and a blocked network. It fails on any
  console error, any media file that does not answer 200 (a root-relative `/clip.mp4` 404s under the base path), any
  external request, or a canvas cropped by its slide. `--no-build` reuses `dist/`. `npm --workspace examples/showcase run
  e2e:full` starts `nimbledeck run` (needs uv, about one minute) and checks that LiveCode runs and PyStream streams.
  It asserts structure and behaviour, not text, so reworded slides keep passing.
- `node website/hosted-media-e2e.mjs` does the same base-path media check for the hosted example deck.
- Both web builds share `packages/cli/src/webedition.mjs`, which leaves out the slides that need `nimbledeck run`.
- A slide that should be interactive in the tour gets a `tourScript`, and `sounds` if it has sound (see `docs/TOUR.md`). Run `nimbledeck check` and `examples/showcase/e2e-tour.mjs` after changing them.
- The site bar and the tour are the addon's `SiteBar`, shown only when the page defines `window.__ND_SITE__` (the site build does it for the showcase and the hosted decks; `docs/TOUR.md`). The science deck has its own grammar test, `examples/science/coherence.mjs`, part of its `e2e.mjs`.
