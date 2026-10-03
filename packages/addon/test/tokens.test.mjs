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

test('chart fallbacks are neutral tokens, not a brand colour', () => {
  assert.doesNotMatch(read('../components/Chart.vue'), /#e8cdba/i)
})

test('CountUp takes its decimal separator from a prop, "." by default', () => {
  const src = read('../components/CountUp.vue')
  assert.match(src, /decimal: '\.'/)
  assert.doesNotMatch(src, /replace\('\.', ','\)/)
})
