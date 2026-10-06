// <LookWall>: every look of the theme as a live card.
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
const looks = JSON.parse(read('../../theme/looks.json'))

test('LookWall reads the looks from the theme, gates on the slide, restores the deck look and handles the cross-fade', () => {
  const src = read('../components/LookWall.vue'), lib = read('../composables/lookSwitch.ts')
  assert.match(src, /useActive\(\)/)
  assert.match(src, /lookIds\(/)
  assert.match(lib, /dataset\.ndLooks/)
  assert.match(lib, /startViewTransition/)
  assert.match(lib, /ndDeckVariant/)
  assert.match(src, /restore\(/)
  assert.match(src, /busy/, 'a pointerleave during the cross-fade must be ignored')
  assert.match(src, /onBeforeUnmount\(/)
  assert.match(src, /data-nd-variant/, 'each card carries its own look')
})

test('LookWall cards and ring are plain CSS, with a reduced-motion state and tokens only', () => {
  const c = section('LookWall')
  assert.match(c, /prefers-reduced-motion/)
  assert.match(c, /\.nd-lw-card/)
  assert.doesNotMatch(c, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
})

test('the look wall picks five columns for the twenty looks of the theme', () => {
  assert.ok(looks.length >= 8)
  const src = read('../components/LookWall.vue')
  assert.match(src, /Math\.sqrt\(list\.value\.length \* 1\.2\)/)
  assert.equal(Math.round(Math.sqrt(20 * 1.2)), 5)
})
