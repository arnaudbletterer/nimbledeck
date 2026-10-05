// What the playground knows about looks, motions and backgrounds, without touching the page: the registries of the
// theme (packages/theme/presets.json and looks.json, packed into data.json by website/playground-data.mjs), the
// fallback used while a registry is missing, and the small pure helpers around them.

// Used when a registry is not in data.json: the five looks the theme always had, and three motions with keyframes of
// their own (FALLBACK_CSS), so the playground still works on a theme that ships no preset library.
export const FALLBACK = {
  looks: [
    { id: 'plain', label: 'Plain', description: 'White page, blue accent, no decoration.', dark: false, swatch: ['#ffffff', '#2563eb'] },
    { id: 'paper', label: 'Paper', description: 'Warm paper, serif type, rust accent.', dark: false, swatch: ['#faf6ee', '#9a3412'] },
    { id: 'night', label: 'Night', description: 'Dark slate with a sky-blue accent.', dark: true, swatch: ['#0f172a', '#38bdf8'] },
    { id: 'studio', label: 'Studio', description: 'Near-black keynote, cyan and violet.', dark: true, swatch: ['#07090f', '#22d3ee'] },
    { id: 'studio-light', label: 'Studio light', description: 'Warm off-white keynote, violet accent.', dark: false, swatch: ['#f7f6f2', '#6d28d9'] },
  ],
  motions: [
    { id: 'fade', label: 'Fade up', description: 'Each block rises and fades in.', use: 'Any slide.' },
    { id: 'slide', label: 'Slide in', description: 'Blocks arrive from the left.', use: 'Lists and steps.' },
    { id: 'zoom', label: 'Zoom', description: 'Blocks grow into place.', use: 'Titles and statements.' },
  ],
  backgrounds: [],
}

// Keyframes for the fallback motions. They follow the same contract as the real presets: the attribute sits on the
// layout root and every content block below it moves, whatever the layout.
const BLOCKS = 'h1, h4, p:not(blockquote p), li, blockquote, pre, table, img'
const fb = (id, frames, dur) => `@keyframes pgf-${id} { from { ${frames} } }\n.pg-root [data-nd-motion="${id}"] :is(${BLOCKS}) { animation: pgf-${id} ${dur}s cubic-bezier(.2,.8,.2,1) both; }`
export const FALLBACK_CSS = [
  fb('fade', 'opacity: 0; transform: translateY(40px);', 0.7),
  fb('slide', 'opacity: 0; transform: translateX(-120px);', 0.7),
  fb('zoom', 'opacity: 0; transform: scale(.5);', 0.6),
  '.pg-root [data-nd-motion] :is(p:not(blockquote p), li, blockquote, pre, table) { animation-delay: .15s; }',
].join('\n')

const list = (x, key) => (Array.isArray(x) ? x : Array.isArray(x?.[key]) ? x[key] : null)
const NONE = (what) => ({ id: 'none', label: 'None', description: `No ${what}.`, none: true })

// One object for the page: the lists to show (each motion and background list starts with "None"), and whether the
// theme brought its own (fallback false) or the playground fills in (fallback true).
export function normalize(data) {
  const motions = list(data.presets, 'motions'), backgrounds = list(data.presets, 'backgrounds'), looks = list(data.looks, 'looks')
  return {
    fallback: { motions: !motions, looks: !looks },
    looks: (looks ?? FALLBACK.looks).map((l) => ({ ...l, label: l.label ?? l.id, dark: !!l.dark })),
    motions: [NONE('motion'), ...(motions ?? FALLBACK.motions)],
    backgrounds: [NONE('animated background'), ...(backgrounds ?? FALLBACK.backgrounds)],
  }
}

// A swatch is a colour, a list of colours, or an object of colours: give back a list.
export function swatchColors(sw) {
  const all = typeof sw === 'string' ? [sw] : Array.isArray(sw) ? sw : sw && typeof sw === 'object' ? Object.values(sw) : []
  return all.filter((c) => typeof c === 'string')
}

// Does the theme CSS have a rule for this id? (a preset listed in the registry but without CSS is shown as such)
export const hasRule = (css, attr, id) => new RegExp(`data-nd-${attr}=["']?${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'\\]\\s,)]|$)`).test(css)

// The first id of `prefs` that exists in `items`, else the fallback.
const firstOf = (items, prefs, fallback) => prefs.find((p) => items.some((i) => i.id === p)) ?? fallback

// What the playground opens on: a bold preset on a dark look, so the first thing seen moves.
export function firstImpression(reg) {
  const real = (xs) => xs.filter((x) => !x.none)
  const look = firstOf(reg.looks, ['neon', 'studio', 'night'], (reg.looks.find((l) => l.dark) ?? reg.looks[0]).id)
  const motions = real(reg.motions), bgs = real(reg.backgrounds)
  return {
    ndVariant: look,
    ndMotion: firstOf(motions, ['cascade', 'fade'], motions[0]?.id),
    motion: firstOf(motions, ['pop', 'zoom'], motions[0]?.id),
    background: firstOf(bgs, ['aurora'], bgs[0]?.id),
  }
}

// The recipe: the lines to write in the deck header and on the slide.
export function recipe(deck, fm) {
  const deckLines = [`ndVariant: ${deck.ndVariant}`, deck.ndMotion && `ndMotion: ${deck.ndMotion}`, deck.ndBackground && `ndBackground: ${deck.ndBackground}`].filter(Boolean)
  const slideLines = [fm.motion && `motion: ${fm.motion}`, fm.background && `background: ${fm.background}`].filter(Boolean)
  return { deckLines, slideLines }
}
export const recipeText = ({ deckLines, slideLines }) => ['# deck header', ...deckLines, ...(slideLines.length ? ['', '# this slide', ...slideLines] : [])].join('\n')

// WCAG relative luminance and contrast ratio of two [r, g, b] colours (0 to 255).
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
export const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
// What a look must reach to be drawn by Surprise me: body text 7:1, muted text 4.5:1, accent 3:1 (all on the page colour).
export const GUARD = { ink: 7, muted: 4.5, accent: 3 }
export const passes = (r) => r.ink >= GUARD.ink && r.muted >= GUARD.muted && r.accent >= GUARD.accent
