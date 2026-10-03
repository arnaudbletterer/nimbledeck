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
- Run `npm test` before finishing. It covers only the CLI and the live-code runner. A change in `packages/addon`
  (components, composables, global CSS) also needs the browser end-to-end test (`examples/how-it-works/e2e-interactions.mjs`
  against the running example), because no unit test exercises it.
