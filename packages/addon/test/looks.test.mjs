// The look catalogue: packages/theme/looks.json and the theme stylesheet describe the same looks, every look is a complete token
// set, and the colours that carry text keep their contrast. `docs/THEMING.md` prints the same table (examples/theme-lab/looks-contrast.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { contrast, lookTokens, PAIRS, REQUIRED } from '../../theme/looks-lib.mjs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../../theme/styles/index.css')
const looks = JSON.parse(read('../../theme/looks.json'))
const LEGACY = ['plain', 'paper', 'night', 'studio', 'studio-light']

test('looks.json lists at least 20 looks with a unique id, a label, a description, a scheme and a 4-colour swatch', () => {
  assert.ok(looks.length >= 20, `${looks.length} looks`)
  assert.equal(new Set(looks.map((l) => l.id)).size, looks.length, 'ids are unique')
  for (const l of looks) {
    assert.match(l.id, /^[a-z][a-z-]*$/, l.id)
    assert.ok(l.label && l.description, `${l.id} needs a label and a description`)
    assert.equal(typeof l.dark, 'boolean', `${l.id}.dark`)
    assert.equal(l.swatch.length, 4, `${l.id}.swatch`)
    for (const c of l.swatch) assert.match(c, /^#[0-9a-f]{6}$/, `${l.id} swatch ${c}`)
    assert.doesNotMatch(l.description, /—|–/, `${l.id}: no dashes in prose`)
  }
  for (const id of LEGACY) assert.ok(looks.some((l) => l.id === id), `${id} stays in the catalogue`)
})

test('every look of looks.json has a complete token set in the stylesheet, and nothing else is defined', () => {
  const defined = [...css.matchAll(/\[data-nd-variant="([a-z-]+)"\]\s*\{/g)].map((m) => m[1])
  for (const id of new Set(defined)) assert.ok(looks.some((l) => l.id === id), `the stylesheet defines "${id}", which looks.json does not list`)
  for (const l of looks) {
    const t = lookTokens(css, l.id)
    for (const k of REQUIRED) assert.ok(t[k] !== undefined, `${l.id} does not define ${k}`)
  }
})

test('looks.json agrees with the stylesheet: scheme and swatch', () => {
  for (const l of looks) {
    const t = lookTokens(css, l.id)
    assert.equal(t['--nd-scheme'], l.dark ? 'dark' : 'light', `${l.id}: dark flag`)
    assert.deepEqual(l.swatch, [t['--nd-bg'], t['--nd-ink'], t['--nd-accent'], t['--nd-accent-2']], `${l.id}: swatch is bg, ink, accent, accent-2`)
  }
})

test('no look name begins with "studio" unless it is a studio look (the studio rules match by prefix)', () => {
  for (const l of looks) if (l.id.startsWith('studio')) assert.ok(['studio', 'studio-light'].includes(l.id), l.id)
})

test('text colours reach 4.5:1 in every look (7:1 in high-contrast) and chart colours reach 3:1', () => {
  const failures = []
  for (const l of looks) {
    const t = lookTokens(css, l.id)
    for (const [name, fg, bg, min] of PAIRS) {
      const need = l.id === 'high-contrast' && min === 4.5 ? 7 : min
      const r = contrast(t[fg], t[bg])
      if (r < need) failures.push(`${l.id}: ${name} ${r.toFixed(2)} < ${need}`)
    }
  }
  assert.deepEqual(failures, [])
})

test('Looks reads the scheme of a look from the stylesheet, and setup/main.ts derives the dark class from looks.json', () => {
  const main = read('../../theme/setup/main.ts')
  assert.match(main, /import looks from '\.\.\/looks\.json'/)
  assert.doesNotMatch(main, /\['night', 'studio'\]/)
  assert.match(read('../composables/lookSwitch.ts'), /--nd-scheme/)
})

test('the stylesheet fetches nothing: no remote font, image or import', () => {
  assert.doesNotMatch(css, /@import|url\(\s*["']?https?:|\/\/fonts\./i)
})
