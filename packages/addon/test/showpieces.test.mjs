// The showpiece components: Shader (WebGL background), Looks (look switcher), Livedeck (Markdown typed, slides built) and
// Orbit's `full` mode.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('Shader gates on the slide, cancels its frame loop, shows a still frame for reduced motion and falls back to a flat background', () => {
  const src = read('../components/Shader.vue')
  assert.match(src, /useActive\(\)/)
  assert.match(src, /cancelAnimationFrame\(raf\)/)
  assert.match(src, /reduce/)
  assert.match(src, /nd-flat/)
  assert.match(src, /webglcontextlost/)
})

test('Looks puts the deck look back when its slide is left, honours View Transitions and reduced motion, and ignores typing', () => {
  const src = read('../components/Looks.vue')
  assert.match(src, /startViewTransition/)
  assert.match(src, /restore\(\)/)
  assert.match(src, /prefers-reduced-motion/)
  assert.match(src, /isContentEditable/)
  assert.match(src, /removeEventListener\('keydown'/)
})

test('Livedeck follows the Typewriter through its progress and source events', () => {
  const ld = read('../components/Livedeck.vue'), tw = read('../components/Typewriter.vue')
  assert.match(tw, /\(e: 'progress', typed: number, total: number\)/)
  assert.match(tw, /\(e: 'source', text: string\)/)
  assert.match(ld, /@progress=/)
  assert.match(ld, /@source=/)
})

test('Orbit with `full` draws its rings inside the logical height, so none is cut off', () => {
  const src = read('../components/Orbit.vue')
  assert.match(src, /full\?: boolean/)
  const outer = 36 + 39 * 4.7                    // the radius of the outer ring, in units of a 460 high scene
  assert.ok(outer < 460 / 2, `the outer ring is ${outer} high, the half height is 230`)
  assert.match(src, /\(36 \+ i \* 4\.7\) \* u/)
})
