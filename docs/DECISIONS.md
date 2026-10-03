# Decisions and evidence

Every number below was measured by hand in Chrome on an Apple A18 Pro laptop (macOS), unless stated. No script produced
them, so `npm test` does not reproduce them; re-measure before relying on a figure for a different deck or machine.

## Why Slidev as the base

A real deck (17 slides: cover, agenda, dividers, bullet slides, tables, callouts, two columns, closing) was converted
from Marp to Slidev with a script. Result: zero raw HTML left, zero per-slide CSS, same visual layout. Slidev's named
layouts and slots replace hand-built HTML structures.

## Why not marimo as the deck

Tried on the same three slides. Live Python and Mermaid worked. Brand control did not: custom fonts did not load,
the logo did not show, content was vertically centred inside marimo's own card with navigation arrows, and a chart
overflowed. Slide settings are stored in a separate JSON keyed by cell position, which is fragile for agents.
marimo is still used, but as a **demo process embedded in an iframe**, where its styling does not matter.

## Why heavy work runs in a local process, not Pyodide

The target workloads are heavy Python and native executables. In-browser Python (Pyodide) was not selected: it needs a
large download, runs slower than native, and cannot use native executables. It was not benchmarked here.

## Measurements

Measured by hand on 2026-10-03; there is no script behind these numbers.

| Test | Result |
|---|---|
| Canvas scene (40 orbiting bodies) | 60 fps |
| WebGL (three.js torus knot) | 60 fps on the Apple GPU |
| Python stream, 400 particles | 57 fps, Python step 5.9 ms |
| Python stream, 1000 / 1500 / 2000 particles | 26 / 11 / 6 fps (step 38 / 95 / 159 ms) |
| Heavy computation in a subprocess, slider-driven | 800x800 grid 0.75 s, 1600x1600 grid 2.83 s |
| Slide change while a 10 s computation runs | 30 ms |
| Demo subprocess crashes | Error shown inside that demo only, deck and demo stay up |
| Demo process killed, then restarted | Offline panel, then the iframe returns on its own |
| PDF export with `--with-clicks` | 12 pages, 8 s for the 9-slide deck of the time; not re-measured on the current 28-slide example |

Smooth animation needs one Python step to fit in about 16 ms. Beyond that the frame rate follows the step time, but
the deck stays responsive.

## Bugs found by testing in a browser (all fixed, all now rules)

1. Live components kept running off screen because Slidev keeps neighbouring slides mounted. Fix: `useActive()`.
2. The WebGL scene was invisible after keyboard navigation because the element measured 0 wide while hidden. Fix:
   fixed logical size.
3. A slide loaded on its own (browser reload) lost styles that lived in another layout's `<style>`. Fix: global CSS.
4. A stream server crashed when a parameter change resized arrays mid-step. Fix: apply changes between steps.
5. Addon default tokens overrode theme variants (equal CSS priority, later load). Fix: `:where(:root)`.
6. `--remote` on the Slidev CLI opens the dev server publicly. The CLI always binds to 127.0.0.1.
7. A fixed port was already used by another application. The CLI refuses to start on a busy port.
8. Inline code and code blocks were unreadable in the dark variant (light text on Slidev's fixed light code
   background; light-mode syntax colours on a dark panel). Fix: code colours follow the tokens, and the `night`
   variant switches Slidev to its dark syntax theme. Reported by the first user to try the dark variant.

## Live code: Python in a local process

Chosen over in-browser Python (slow start, no native executables) and over embedding a notebook (does not look like the
slides). Measured: the starting code returned a figure in about 2 s cold; an edit to the result is visible about 0.6 s
after typing stops plus the run time; an infinite loop is killed at the timeout and the next run works; a newer run
replaces a stuck one in about 1.6 s; a wrong token and a foreign origin with the right token are both refused.
A warm worker pool would cut the per-run start-up but would make killing runaway code harder.

## Bugs found by `nimbledeck verify` (all fixed)

9. Live scenes in normal slides overflowed the slide by 70 px on the right and ran into the footer zone (100% width
   plus side margins). Screenshots had not made this obvious.
10. Canvases rendered at a fixed 1000 x 460 pixels and were scaled up, so they looked soft on large or high-density
    screens. They now render at the on-screen resolution.
11. The verifier itself passed silently on a hidden slide at first. A zero-size frame is now an error, loading has a
    timeout, and the tool was validated against a deliberately broken deck.

## Bug found by the interaction end-to-end test (fixed)

12. Faded quiz answers used the CSS class `nd-dim`, which `Photo` and `Clip` already use for a black overlay, so the faded
    answers became full-size overlays covering the quiz. Components share one CSS namespace: check for name clashes.

## Bug reported on a full-frame website slide (fixed)

13. An embedded page that fills the slide took the keyboard and mouse away from the presentation; only clicking a black
    margin helped, and a full-frame slide has none. Browsers do not let a page intercept keys typed inside a cross-origin
    iframe. Fix: a shield over the page (the deck keeps control) plus an in-slide control bar once the presenter chooses
    to interact. Covered by the end-to-end test.

## Known gaps

- An early `verify` run did not flag a title truncated by an ellipsis in a deliberately broken deck (`check` rejects it by
  length). `verify.mjs` now has a rule for CSS `text-overflow: ellipsis` ("text cut off") and one for clipped boxes, but this
  case was not re-tested, so do not rely on `verify` for truncated titles; `check` is the gate.

- PPTX export is one image per slide (Slidev), not editable and without animations. No tool tested provides native
  PowerPoint animations from this kind of source.
- Live content exists only in the browser. PDF export captures the current state of a running demo as a snapshot.
- Websites that forbid framing (GitHub, MDN, OpenStreetMap) cannot be embedded.
- A dev-mode console warning, "Hydration completed but contains mismatches", appears. Not investigated.
- Mermaid follows the theme tokens only for its base colour, border, text, line and font (see `docs/THEMING.md`); the
  diagram sits in a shadow root, so page CSS does not reach it.
- Windows, Firefox, Safari, offline use, presenter mode with live components and talk recording are untested.
- Slidev has a `slidev mcp` command that lets agents inspect and edit slides. Not evaluated.
