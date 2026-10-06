// Components take their colours from the --nd-* tokens, so a theme can restyle them, and take no locale from the code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the stylesheet declares the state ink tokens and uses them instead of raw reds', () => {
  const css = read('../styles/index.css')
  assert.match(css, /--nd-good-ink:\s*#2f6b4f/)
  assert.match(css, /--nd-bad-ink:\s*#9b3a37/)
  assert.doesNotMatch(css, /#c0392b|#b03030/, 'use var(--nd-bad-ink) for error and urgent states')
})

test('every look sets its own chart palette and state tints, so none falls back to the addon defaults', async () => {
  const { lookTokens } = await import('../../theme/looks-lib.mjs')
  const theme = read('../../theme/styles/index.css')
  for (const l of JSON.parse(read('../../theme/looks.json'))) {
    const t = lookTokens(theme, l.id)
    for (const k of ['--nd-chart-1', '--nd-chart-2', '--nd-chart-3', '--nd-chart-4', '--nd-good', '--nd-bad', '--nd-good-ink', '--nd-bad-ink', '--nd-node-border', '--nd-font-mono'])
      assert.ok(t[k], `${l.id} must define ${k}`)
  }
})

test('chart fallbacks are neutral tokens, not a brand colour', () => {
  assert.doesNotMatch(read('../components/Chart.vue'), /#e8cdba/i)
})

test('CountUp takes its decimal separator from a prop, "." by default', () => {
  const src = read('../components/CountUp.vue')
  assert.match(src, /decimal: '\.'/)
  assert.doesNotMatch(src, /replace\('\.', ','\)/)
})

test('the motion toolkit takes every colour from the tokens', () => {
  const css = read('../styles/index.css').split('/* ==== Motion toolkit')[1] ?? ''
  assert.ok(css.length > 0, 'the motion toolkit section is missing from the stylesheet')
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, 'use var(--nd-*) and color-mix() in the motion CSS')
  for (const f of ['Kinetic', 'Typewriter', 'Terminal', 'Aurora', 'Stat', 'Marquee', 'Spotlight', 'Tilt', 'Shader', 'Livedeck', 'Looks', 'LookWall', 'MotionWall']) {
    assert.doesNotMatch(read(`../components/${f}.vue`), /['"`]#[0-9a-f]{3,8}['"`]/i, `${f} must read its colours from the tokens, not hard-code a hex value`)
  }
})
