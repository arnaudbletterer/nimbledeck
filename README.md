# Nimbledeck

Fast to write, alive when you present.

Nimbledeck is a thin layer on top of [Slidev](https://sli.dev) for decks that need to **run things**: animations,
3D scenes, Python simulations, heavy computations in a subprocess, videos, embedded websites. The content stays
plain Markdown, so a person or an AI agent can write a deck from a document in one pass, and it diffs well in git.

## Why this exists

We wanted three things at once, and no existing tool gave all three:

1. **Content as Markdown**, easy to edit by hand, by an agent, and to review in git.
2. **A precise, maintainable brand**: a deck must look exactly right without per-slide CSS or HTML.
3. **Live content**: interaction, animation and real compute running on the presenting machine.

| Tool tried | What it gave | Why it was not enough |
|---|---|---|
| Marp | Markdown, simple themes | Layouts needed raw HTML plus a large hand-tuned CSS, and animation meant linking external files. |
| JostSlides | Python decks, rich scenes, agent rules | Slides are Python code, not Markdown. Hard to maintain by hand or to bridge from a document. |
| marimo (as a deck) | Live Python, reactive widgets | Weak brand control (fonts, logo, fixed layout), slide metadata stored by cell position. |
| Slidev alone | Markdown, named layouts, Vue components, great browser output | No story for heavy Python, no isolation of failing demos, no agent checks. |

Nimbledeck keeps Slidev's strengths and adds the missing parts. The measurements behind these choices are in
[docs/DECISIONS.md](docs/DECISIONS.md).

## What it builds on, and what it adds

Built on (all permissively licensed, see [THIRD_PARTY.md](THIRD_PARTY.md)): Slidev, Vue, three.js, Mermaid,
marimo, numpy, websockets.

| Package | What it is |
|---|---|
| `slidev-addon-nimbledeck` | Live components: `Orbit` (canvas), `Scene3D` (WebGL), `PyStream` (Python over WebSocket), `Demo` (local marimo app), `Clip` (video), `Site` (website), `Fly` (motion). Design tokens (`--nd-*`) they all follow. |
| `slidev-theme-nimbledeck` | Base themes: `plain`, `paper`, `night`. Seven layouts: `cover`, `agenda`, `divider`, `default`, `two-cols`, `photo-right`, `closing`. |
| `nimbledeck` (CLI) | `nimbledeck run` starts the deck and every demo on localhost. `nimbledeck check` lints a deck against the slide rules. |

## How it works

```
 deck.md  (Markdown + layout names + <Component /> tags)
    |
    |  nimbledeck check      rules: known layouts, short titles, no inline HTML/CSS, assets and demos exist
    v
 Slidev (browser)  <------ WebSocket / HTTP ------>  local Python processes (demos, streams, subprocesses)
    |                                                  started and stopped by `nimbledeck run`
    +-- components draw with --nd-* tokens, so any theme restyles them
```

Three ideas keep it robust:

- **Heavy work never runs in the browser.** It runs in a normal local process (Python, or an executable called
  from Python). The slide only displays it.
- **A failing demo cannot stop the talk.** Each live component probes its process, shows an offline panel when it is
  down, and reconnects by itself when it comes back.
- **Live components run only while their slide is on screen.** Slidev keeps neighbouring slides mounted, so every
  live component gates on `useActive()`.

## Quick start

Requirements: Node 20+, [uv](https://docs.astral.sh/uv/) and Python 3.12 for demos, Chrome for PDF export.

```sh
npm install
npm run example        # starts examples/how-it-works with its demos, on http://localhost:3030
npm test               # CLI tests
```

Write a deck:

```md
---
theme: nimbledeck
ndVariant: plain        # plain | paper | night
title: My talk
layout: cover
---

# My talk

#### 2026/01/01

---
layout: default
---

# A live scene

<Orbit />
```

More in [docs/WRITING.md](docs/WRITING.md). Agents: read [AGENTS.md](AGENTS.md).

## Brand themes live elsewhere

Nimbledeck contains no company content. A brand is a separate repository with its own Slidev theme that:
implements the same layout names, overrides the `--nd-*` tokens, adds brand-specific layouts, and depends on
`nimbledeck` and `slidev-addon-nimbledeck`. See [docs/THEMING.md](docs/THEMING.md). This was proven with a
throwaway consumer project: a brand with its own fonts, colours and layouts rendered the live components in its own
tokens with no changes to them.

## Status

Early. Everything described here was run in Chrome on macOS. **Not tested yet:** Windows (the CLI uses
cross-platform process handling, but it has never been run there), Firefox and Safari, offline playback, large
decks, presenter mode with live components, recording a talk. Known gaps are listed in
[docs/DECISIONS.md](docs/DECISIONS.md#known-gaps).

License: not chosen yet (to be decided by the owner). Third-party notices: [THIRD_PARTY.md](THIRD_PARTY.md).
