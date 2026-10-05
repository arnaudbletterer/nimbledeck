# Agent guide

You are writing or editing a Nimbledeck deck. Read `docs/WRITING.md` for syntax and `docs/ARCHITECTURE.md` before
changing a component.

## Writing a deck from a document

1. One message per slide. Cover first, closing last.
2. Use only the layouts of the active theme. Never write `<div>`, `<style>` or `style=`.
3. Run `nimbledeck check <deck.md>`; fix every ERROR; split slides that trigger a warning.
4. Preview with `nimbledeck run <deck.md>` when a live component or demo is involved.

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
