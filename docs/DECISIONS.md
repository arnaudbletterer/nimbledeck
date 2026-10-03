# Decisions and evidence

Every number below was measured in Chrome on an Apple A18 Pro laptop (macOS) unless stated.

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
| PDF export with `--with-clicks` (9 slides) | 12 pages, 8 s |

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

## Bug found by the interaction end-to-end test (fixed)

12. Faded quiz answers used the CSS class `nd-dim`, which `Photo` and `Clip` already use for a black overlay, so the faded
    answers became full-size overlays covering the quiz. Components share one CSS namespace: check for name clashes.

## Bugs found by `nimbledeck verify` (all fixed)

9. Live scenes in normal slides overflowed the slide by 70 px on the right and ran into the footer zone (100% width
   plus side margins). Screenshots had not made this obvious.
10. Canvases rendered at a fixed 1000 x 460 pixels and were scaled up, so they looked soft on large or high-density
    screens. They now render at the on-screen resolution.
11. The verifier itself passed silently on a hidden slide at first. A zero-size frame is now an error, loading has a
    timeout, and the tool was validated against a deliberately broken deck.

## Known gaps

- `verify` did not flag a title truncated by an ellipsis in a deliberately broken deck (`check` rejects it by length).

- PPTX export is one image per slide (Slidev), not editable and without animations. No tool tested provides native
  PowerPoint animations from this kind of source.
- Live content exists only in the browser. PDF export captures the current state of a running demo as a snapshot.
- Websites that forbid framing (GitHub, MDN, OpenStreetMap) cannot be embedded.
- A dev-mode console warning, "Hydration completed but contains mismatches", appears. Not investigated.
- Mermaid does not follow theme tokens yet.
- Windows, Firefox, Safari, offline use, presenter mode with live components and talk recording are untested.
- Slidev has a `slidev mcp` command that lets agents inspect and edit slides. Not evaluated.
