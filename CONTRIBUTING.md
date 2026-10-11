# Contributing

Thanks for helping. Nimbledeck is small on purpose: the simplest change that meets the real need is the best one.

## Set up

You need Node 20 or newer and [uv](https://docs.astral.sh/uv/) (it fetches Python 3.12 by itself). See
[docs/run-locally.md](docs/run-locally.md).

```sh
npm install
npm test                 # the CLI, the live-code runner and the pure logic of the addon
```

## Before you open a pull request

- Read [AGENTS.md](AGENTS.md): it lists, per kind of change, which extra check to run.
  - A change in `packages/addon` needs the browser test `examples/how-it-works/e2e-interactions.mjs`.
  - A change to a look, a layout or the shared title, body, footer or page-number CSS needs
    `node examples/theme-lab/align-audit.mjs --check`.
  - A deck change needs `nimbledeck check <deck.md>` with no error.
- Test in a browser: load a slide directly (reload on a middle slide) and walk the deck with the keyboard.
- The site builds with `npm run docs:build`, and its link check must report 0 problems.
- Keep the site offline-first: no remote font, script or image.

## Commits and pull requests

- One logical change per commit, with a [conventional commit](https://www.conventionalcommits.org) message
  (`feat(addon): ...`, `fix(science): ...`, `docs: ...`).
- Explain why, not only what.
- Never write raw `<div>`, `<style>` or `style=` in a deck: use the layouts, components and presets (see
  [docs/WRITING.md](docs/WRITING.md)).

## License

By contributing you agree that your work is released under the [MIT license](LICENSE).
