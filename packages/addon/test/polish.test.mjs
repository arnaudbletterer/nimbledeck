// The additions that polish the motion toolkit: staggered entrances, card styling on At, Compare labels and sweep,
// Aurora hue and centre, Stat and CountUp delay, Kinetic delay and muted tone, and a slide that lingers while it fades out.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../styles/index.css')

test('At takes enter, delay, frame, radius and pad, gates the entrance on the slide and skips it for reduced motion', () => {
  const src = read('../components/At.vue')
  for (const p of ['enter', 'delay', 'frame', 'radius', 'pad']) assert.match(src, new RegExp(`\\b${p}\\?:`), `At needs a ${p} prop`)
  assert.match(src, /useEntered\(useActive\(\)\)/)
  assert.match(src, /reduce/)
  assert.match(css, /\.nd-at-enter\.nd-at-in \{[^}]*var\(--nd-at-delay/)
})

test('Compare has labels, a sweep that is gated, cancelled and skipped for reduced motion, and a name for assistive tech', () => {
  const src = read('../components/Compare.vue')
  assert.match(src, /beforeLabel\?: string/)
  assert.match(src, /sweep\?: boolean/)
  assert.match(src, /useActive\(\)/)
  assert.match(src, /onBeforeUnmount\(stopSweep\)/)
  assert.match(src, /!reduce/)
  assert.match(src, /:aria-label="label"/)
  assert.doesNotMatch(css.split('/* Before / after slider. */')[1].split('.nd-countup')[0], /rgba?\(/, 'the compare handle takes its colours from the tokens')
})

test('Aurora takes hue, cx and cy; Stat and CountUp take delay; Kinetic takes delay and a muted tone', () => {
  assert.match(read('../components/Aurora.vue'), /hue\?: number; cx\?: number; cy\?: number/)
  assert.match(read('../components/Stat.vue'), /delay\?: number/)
  assert.match(read('../components/CountUp.vue'), /delay\?: number/)
  const k = read('../components/Kinetic.vue')
  assert.match(k, /'muted'/)
  assert.match(k, /delay\?: number/)
  assert.match(css, /\.nd-k-tone-muted/)
  assert.match(css, /var\(--nd-k-delay, 0ms\)/)
})

test('useActive keeps a slide active for a short while after it is left, and clears its timer', () => {
  const src = read('../composables/useActive.ts')
  assert.match(src, /LINGER_MS/)
  assert.match(src, /onBeforeUnmount\(\(\) => clearTimeout\(timer\)\)/)
})
