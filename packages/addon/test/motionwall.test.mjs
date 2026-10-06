// <MotionWall>: every motion and background preset playing at once.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../styles/index.css')
const section = (name) => {
  const a = css.indexOf(`/* ==== Motion toolkit: ${name} ====`)
  assert.ok(a >= 0, `${name} has no section in the stylesheet`)
  const b = css.indexOf('/* ==== ', a + 10)
  return css.slice(a, b < 0 ? undefined : b)
}
const presets = JSON.parse(read('../../theme/presets.json'))

test('MotionWall plays the real presets: a slide root per card, replayed by removing and re-adding the attribute', () => {
  const src = read('../components/MotionWall.vue')
  assert.match(src, /useActive\(\)/)
  assert.match(src, /class="slidev-layout/)
  assert.match(src, /removeAttribute\('data-nd-motion'\)/)
  assert.match(src, /setAttribute\('data-nd-motion', id\)/)
  assert.match(src, /data-nd-bg/)
  assert.match(src, /onBeforeUnmount\(stop\)/)
  assert.match(src, /clearTimeout\(t\)/)
  assert.match(src, /prefers-reduced-motion/)
  assert.doesNotMatch(src, /data-kind/, 'a data-kind on the wall would exclude every card from the presets')
  assert.match(section('MotionWall'), /prefers-reduced-motion/)
  assert.doesNotMatch(section('MotionWall'), /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
})

test('the ids MotionWall falls back to are the ones of presets.json, and the theme publishes them on <html>', () => {
  const src = read('../components/MotionWall.vue')
  const fb = (n) => new RegExp(`const FALLBACK_${n} = '([^']+)'`).exec(src)[1].split(',')
  assert.deepEqual(fb('M'), presets.motions.map((m) => m.id))
  assert.deepEqual(fb('B'), presets.backgrounds.map((b) => b.id))
  const main = read('../../theme/setup/main.ts')
  assert.match(main, /dataset\.ndMotions/)
  assert.match(main, /dataset\.ndBackgrounds/)
  assert.match(main, /dataset\.ndLooks/)
})

test('the slide layer and MotionWall draw the stars and waves from one source', () => {
  assert.match(read('../slide-bottom.vue'), /composables\/bgShapes/)
  assert.match(read('../components/MotionWall.vue'), /composables\/bgShapes/)
})
