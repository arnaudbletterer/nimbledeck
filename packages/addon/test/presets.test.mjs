// The registry of presets (packages/theme/presets.json) and the CSS must name the same ids, and the docs must list them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const registry = JSON.parse(read('../../theme/presets.json'))
const motionCss = read('../styles/motion.css'), bgCss = read('../styles/backgrounds.css')
const idsIn = (css, attr) => new Set([...css.matchAll(new RegExp(`\\[${attr}="([a-z0-9-]+)"\\]`, 'g'))].map((m) => m[1]))
const same = (a, b) => ({ onlyRegistry: [...a].filter((x) => !b.has(x)), onlyCss: [...b].filter((x) => !a.has(x)) })

test('every motion id in the registry has CSS, and every CSS preset is in the registry', () => {
  assert.deepEqual(same(new Set(registry.motions.map((m) => m.id)), idsIn(motionCss, 'data-nd-motion')), { onlyRegistry: [], onlyCss: [] })
})

test('every background id in the registry has CSS, and every CSS background is in the registry', () => {
  assert.deepEqual(same(new Set(registry.backgrounds.map((m) => m.id)), idsIn(bgCss, 'data-nd-bg')), { onlyRegistry: [], onlyCss: [] })
})

test('the registry is well formed: unique ids, a label and a description, at least 16 motions and 8 backgrounds', () => {
  for (const [kind, min] of [['motions', 16], ['backgrounds', 8]]) {
    const list = registry[kind]
    assert.ok(list.length >= min, `${kind}: at least ${min}`)
    assert.equal(new Set(list.map((p) => p.id)).size, list.length, `${kind}: ids are unique`)
    for (const p of list) {
      assert.match(p.id, /^[a-z][a-z0-9-]*$/)
      assert.ok(p.label && p.description, `${p.id} needs a label and a description`)
      if (kind === 'motions') assert.ok(p.use, `${p.id} needs a recommended use`)
    }
  }
  assert.deepEqual(registry.scrims, ['none', 'soft', 'strong'])
})

test('docs/MOTION.md shows every preset', () => {
  const doc = read('../../../docs/MOTION.md')
  for (const p of [...registry.motions, ...registry.backgrounds]) assert.ok(doc.includes('`' + p.id + '`'), `docs/MOTION.md must mention ${p.id}`)
})

test('the presets keep the rules: backwards fill only, no hard-coded colour, v-click and reduced motion respected', () => {
  const css = motionCss + bgCss
  assert.doesNotMatch(css, /animation-fill-mode:\s*(both|forwards)|\bforwards\b/, 'a held keyframe would override the element and v-click reveals')
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, 'colours come from the --nd-* tokens')
  assert.match(motionCss, /slidev-vclick-target/)
  assert.match(motionCss, /prefers-reduced-motion: reduce/)
  assert.match(bgCss, /prefers-reduced-motion: reduce/)
})

test('slide-bottom.vue only swaps attributes and mounts a layer: no frame loop of its own', () => {
  const src = read('../slide-bottom.vue')
  assert.doesNotMatch(src, /requestAnimationFrame|setInterval/)
  for (const a of ['data-nd-motion', 'data-nd-bg']) assert.ok(src.includes(a))
})
