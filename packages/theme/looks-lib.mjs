// Helpers for the look catalogue (looks.json and the theme stylesheet): read the tokens of one look out of the CSS, and WCAG contrast.
// Used by the tests (packages/addon/test/looks.test.mjs) and by examples/theme-lab/looks-contrast.mjs. Not shipped to the browser.

/** Every token a look must define. Fonts, gradient and title settings count: a look that forgets one inherits plain's. */
export const REQUIRED = [
  '--nd-scheme', '--nd-bg', '--nd-ink', '--nd-muted', '--nd-accent', '--nd-accent-2', '--nd-surface', '--nd-line', '--nd-node-border',
  '--nd-cover-bg', '--nd-cover-fg', '--nd-chart-1', '--nd-chart-2', '--nd-chart-3', '--nd-chart-4',
  '--nd-good', '--nd-bad', '--nd-good-ink', '--nd-bad-ink',
  '--nd-font-body', '--nd-font-display', '--nd-font-mono', '--nd-gradient', '--nd-title-transform', '--nd-title-size',
]

/** [name, foreground token, background token, minimum ratio]. 4.5 is WCAG AA for text (7 in high-contrast); 3 is for chart marks. */
export const PAIRS = [
  ['ink on page', '--nd-ink', '--nd-bg', 4.5],
  ['muted on page', '--nd-muted', '--nd-bg', 4.5],
  ['accent on page', '--nd-accent', '--nd-bg', 4.5],
  ['ink on surface', '--nd-ink', '--nd-surface', 4.5],
  ['muted on surface', '--nd-muted', '--nd-surface', 4.5],
  ['accent on surface', '--nd-accent', '--nd-surface', 4.5],
  ['cover text on cover', '--nd-cover-fg', '--nd-cover-bg', 4.5],
  ['page on ink (table head)', '--nd-bg', '--nd-ink', 4.5],
  ['page on accent (look chip)', '--nd-bg', '--nd-accent', 4.5],
  ['ink on right answer', '--nd-ink', '--nd-good', 4.5],
  ['ink on wrong answer', '--nd-ink', '--nd-bad', 4.5],
  ['right answer mark', '--nd-good-ink', '--nd-good', 4.5],
  ['wrong answer mark', '--nd-bad-ink', '--nd-bad', 4.5],
  ['chart 1 on page', '--nd-chart-1', '--nd-bg', 3],
  ['chart 2 on page', '--nd-chart-2', '--nd-bg', 3],
  ['chart 3 on page', '--nd-chart-3', '--nd-bg', 3],
  ['chart 4 on page', '--nd-chart-4', '--nd-bg', 3],
]

/** The tokens of one look, merged from every rule that targets it. `plain` is also the `:root` default. */
export function lookTokens(css, id) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = {}
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim())
    if (!selectors.includes(`[data-nd-variant="${id}"]`)) continue
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);?/g)) tokens[d[1]] = d[2].trim()
  }
  return tokens
}

const channel = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
export function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) throw new Error(`not a #rrggbb colour: ${hex}`)
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
