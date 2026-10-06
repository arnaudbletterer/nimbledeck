// The store behind linked equations: terms pointed at, parameters shown as numbers (docs/EQUATIONS.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLinks, formatValue, parseHighlight, revealed, termColor } from '../composables/links.mjs'

test('a term is announced once, to every listener, and can be cleared', () => {
  const l = createLinks()
  const seen = []
  const off = l.onTerm((id) => seen.push(id))
  l.setTerm(1); l.setTerm('1'); l.setTerm('2'); l.setTerm(null); l.setTerm('')
  assert.deepEqual(seen, ['1', '2', null])
  off(); l.setTerm('3')
  assert.deepEqual(seen, ['1', '2', null])
  assert.equal(l.term(), '3')
})

test('a parameter keeps its last value and ignores what is not a finite number', () => {
  const l = createLinks()
  const seen = []
  l.onParam((n, v) => seen.push([n, v]))
  l.setParam('sigma', 10); l.setParam('sigma', 10); l.setParam('rho', 28.5)
  l.setParam('beta', NaN); l.setParam('beta', '2'); l.setParam('beta', Infinity)
  assert.deepEqual(seen, [['sigma', 10], ['rho', 28.5]])
  assert.deepEqual(l.allParams(), { sigma: 10, rho: 28.5 })
  assert.equal(l.param('beta'), undefined)
})

test('the store follows and announces the nd-term and nd-param DOM events', () => {
  const target = new EventTarget()
  const l = createLinks(target)
  const out = []
  target.addEventListener('nd-term', (e) => out.push(['term', e.detail.id]))
  target.addEventListener('nd-param', (e) => out.push(['param', e.detail.name, e.detail.value]))
  l.setTerm('2'); l.setParam('F', 0.04)
  target.dispatchEvent(new CustomEvent('nd-term', { detail: { id: '3' } }))
  target.dispatchEvent(new CustomEvent('nd-param', { detail: { name: 'k', value: 0.06 } }))
  assert.equal(l.term(), '3')
  assert.equal(l.param('k'), 0.06)
  assert.deepEqual(out.slice(0, 2), [['term', '2'], ['param', 'F', 0.04]])
})

test('numbers are typeset as whole numbers, fixed decimals and a true minus', () => {
  assert.equal(formatValue(10), '10')
  assert.equal(formatValue(8 / 3), '2.67')
  assert.equal(formatValue(8 / 3, 3), '2.667')
  assert.equal(formatValue(-0.5, 1), '−0.5')
  assert.equal(formatValue(NaN), 'NaN')
})

test('term ids 1 to 4 take the chart colours, the rest an accent', () => {
  assert.equal(termColor('1'), 'var(--nd-chart-1)')
  assert.equal(termColor(4), 'var(--nd-chart-4)')
  assert.equal(termColor('6'), 'var(--nd-accent-2)')
  assert.equal(termColor('x'), 'var(--nd-accent)')
})

test('highlight is an object of notes or a list of ids', () => {
  assert.deepEqual(parseHighlight({ 1: 'x' }), { 1: 'x' })
  assert.deepEqual(parseHighlight([1, '2']), { 1: '', 2: '' })
  assert.deepEqual(parseHighlight(undefined), {})
})

test('a reveal order shows one more term per click, or everything with no order', () => {
  assert.deepEqual([...revealed(['1', 2, '3'], 2)], ['1', '2'])
  assert.equal(revealed(['1'], -1).size, 0)
  assert.equal(revealed([], 5), null)
})

test('the theme trusts only the two KaTeX commands the macros need, and defines the macros', () => {
  const src = readFileSync(new URL('../../theme/setup/katex.ts', import.meta.url), 'utf8')
  assert.match(src, /new Set\(\['\\\\htmlClass', '\\\\htmlData'\]\)/)
  assert.doesNotMatch(src, /trust:\s*true/)
  assert.match(src, /'\\\\term'/)
  assert.match(src, /'\\\\val'/)
})
