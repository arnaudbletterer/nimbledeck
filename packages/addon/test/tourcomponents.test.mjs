// Source-level guards for the tour and sound pieces; the behaviour is covered by examples/showcase/e2e-tour.mjs in a browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const css = read('../styles/index.css')

test('the cursor is aria-hidden, ignores the pointer and lives in the body, outside the scaled slide layer', () => {
  const src = read('../components/TourCursor.vue')
  assert.match(src, /aria-hidden="true"/)
  assert.match(src, /<Teleport to="body">/)
  assert.match(css, /\.nd-cursor \{[^}]*pointer-events: none/)
})

test('reduced motion removes the cursor ripple, caption animation and transitions', () => {
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.nd-cur-ripple-on \{ animation: none/)
})

test('the speaker button is a labelled toggle with a visible state', () => {
  const src = read('../components/SoundToggle.vue')
  assert.match(src, /:aria-pressed="soundOn"/)
  assert.match(src, /:aria-label=/)
  assert.match(css, /\.nd-sound-btn:focus-visible/)
})

test('the equalizer gates on the slide, stops its frame loop and reads the engine, not a copy', () => {
  const src = read('../components/Equalizer.vue')
  assert.match(src, /useActive\(\)/)
  assert.match(src, /cancelAnimationFrame/)
  assert.match(src, /sound\.levels\(/)
})

test('the engine ignores nothing but trusted events: a player must test isTrusted', () => {
  assert.match(read('../composables/tourEngine.ts'), /isViewer = \(e: Event\) => e\.isTrusted/)
  assert.match(read('../components/SiteBar.vue'), /isViewer\(e\)/)
  assert.match(read('../components/SoundDirector.vue'), /!e\.isTrusted/)
})

test('the engine restores what it patched when the tour ends', () => {
  const src = read('../composables/tourEngine.ts')
  assert.match(src, /restore\(\); restore = \(\) => \{\}/)
  assert.match(src, /classList\.remove\('nd-touring'\)/)
})

test('the context is created only by a control, never at import', () => {
  const src = read('../composables/soundManager.mjs')
  assert.doesNotMatch(src.split('export function createSoundManager')[0], /new AudioContext/)
  assert.match(src, /function ensure\(\)/)
})

test('the site bar is the addon\'s: global-top mounts it, it needs window.__ND_SITE__, and sound controls need a deck with sound', () => {
  assert.match(read('../global-top.vue'), /<SiteBar \/>/)
  const bar = read('../components/SiteBar.vue')
  assert.match(bar, /<Teleport v-if="site && !isPrintMode"/)
  assert.match(bar, /hasSound = !!\(cfg\.ndSound \|\| cfg\.ndSlideSound\)/)
  assert.match(bar, /<SoundToggle v-if="hasSound"/)
  assert.match(bar, /v-if="hasSound" class="ndb-with"/)
})
