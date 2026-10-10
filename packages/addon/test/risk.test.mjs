// The arithmetic of <Crowd> and <Polls>: Bayes by hand, natural frequencies, the binomial table, the standard error.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assign, binomialTable, bins, counts, drawFrom, FN, FP, interval, moe, npv, oneIn, ppv, responding, rng, se, shuffled, summary, TN, TP } from '../composables/risk.mjs'

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`)

test('Bayes: a 99 percent accurate test on a 1 in 1000 condition is right 9 percent of the time', () => {
  close(ppv(0.001, 0.99, 0.99), 0.00099 / (0.00099 + 0.00999))
  assert.equal(Math.round(ppv(0.001, 0.99, 0.99) * 100), 9)
})

test('Bayes: with half the crowd sick and a perfect test, a positive is always sick', () => {
  close(ppv(0.5, 1, 1), 1)
  close(ppv(0.5, 0.9, 0.9), 0.9)
  close(npv(0.5, 0.9, 0.9), 0.9)
})

test('natural frequencies: 10 000 people, 10 sick, 10 caught, 100 false alarms', () => {
  const c = counts(10000, 0.001, 0.99, 0.99)
  assert.deepEqual(c, { n: 10000, sick: 10, healthy: 9990, tp: 10, fn: 0, fp: 100, tn: 9890, pos: 110 })
})

test('the groups always add up to the crowd', () => {
  for (const [prev, sens, spec] of [[0.02, 0.5, 0.8], [0.3, 0.77, 0.93], [0.0002, 1, 1], [0.5, 0.9, 0.999]]) {
    const c = counts(10000, prev, sens, spec)
    assert.equal(c.tp + c.fn + c.fp + c.tn, c.n)
    assert.equal(c.pos, c.tp + c.fp)
  }
})

test('a seeded permutation is a permutation, and repeats', () => {
  const a = shuffled(1000, 7), b = shuffled(1000, 7)
  assert.deepEqual([...a], [...b])
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 1000 }, (_, i) => i))
})

test('assign: every person gets one status, in the right numbers, and dots stay put as the prevalence rises', () => {
  const n = 10000, rankSick = shuffled(n, 1), byScore = shuffled(n, 2)
  const at = (prev) => { const c = counts(n, prev, 0.9, 0.95); const s = assign(new Uint8Array(n), rankSick, byScore, c); return { c, s } }
  const { c, s } = at(0.05)
  const tally = [0, 0, 0, 0]
  for (const v of s) tally[v]++
  assert.deepEqual(tally, [c.tn, c.fp, c.fn, c.tp])
  // a sick person at 5 percent is still sick at 6 percent
  const more = at(0.06).s
  let lost = 0
  for (let i = 0; i < n; i++) if ((s[i] === TP || s[i] === FN) && !(more[i] === TP || more[i] === FN)) lost++
  assert.equal(lost, 0)
})

test('oneIn reads a prevalence as a natural frequency', () => {
  assert.equal(oneIn(0.001), '1 in 1,000')
  assert.equal(oneIn(0.5), '1 in 2')
  assert.equal(oneIn(0.3), '1 in 3.3')
})

test('standard error and margin of error: n = 1000, p = 0.52', () => {
  close(se(0.52, 1000), 0.015798, 1e-5)
  close(moe(0.52, 1000), 0.030964, 1e-5)
  assert.equal(Math.round(moe(0.5, 1000) * 1000) / 10, 3.1)   // the famous plus or minus 3 points
  close(se(0.5, 100) / se(0.5, 400), 2)                       // four times the people, half the error
})

test('a biased sample sees q, not p', () => {
  close(responding(0.52, 0), 0.52)
  close(responding(0.52, 0.1), 0.468 / (0.468 + 0.48))
  assert.ok(responding(0.52, 0.1) < 0.5)
})

test('the binomial table has the right mean and variance, and stays finite for large n', () => {
  for (const [n, q] of [[10, 0.3], [1000, 0.52], [10000, 0.49], [100000, 0.5]]) {
    const t = binomialTable(n, q)
    assert.equal(t[n], 1)
    let mean = 0, second = 0, prev = 0
    for (let k = 0; k <= n; k++) { const p = t[k] - prev; prev = t[k]; mean += k * p; second += k * k * p }
    close(mean, n * q, 1e-6 * n)
    close(second - mean * mean, n * q * (1 - q), 1e-4 * n)
  }
})

test('drawing from the table: the sample mean and spread of 20000 polls match the theory', () => {
  const n = 1000, p = 0.52, t = binomialTable(n, p), r = rng(3), xs = new Float64Array(20000)
  for (let k = 0; k < xs.length; k++) xs[k] = drawFrom(t, r()) / n
  const s = summary(xs, xs.length, n, p)
  close(s.mean, p, 0.001)
  close(s.sd, se(p, n), 0.0006)
  close(s.covered, 0.95, 0.01)          // 95 percent of the intervals contain the truth
  close(s.ahead, 0.897, 0.01)           // 1 - Phi(-0.02 / 0.0158): about one poll in ten calls the wrong winner
})

test('a biased sample never converges to the truth: the intervals miss it more and more', () => {
  const p = 0.52, q = responding(p, 0.1), cover = []
  for (const n of [100, 1000, 10000]) {
    const t = binomialTable(n, q), r = rng(5), xs = new Float64Array(5000)
    for (let k = 0; k < xs.length; k++) xs[k] = drawFrom(t, r()) / n
    cover.push(summary(xs, xs.length, n, p).covered)
  }
  assert.ok(cover[0] > cover[1] && cover[1] > cover[2], `coverage ${cover}`)
  assert.ok(cover[2] < 0.05)
})

test('bins put every result in a bin, and the edges catch the tails', () => {
  const out = bins([0.25, 0.35, 0.36, 0.55, 0.99], 5, 0.3, 0.7, 0.1)
  assert.deepEqual([...out], [3, 0, 1, 1])
  assert.equal(out.reduce((a, b) => a + b, 0), 5)
  assert.deepEqual(interval(0.5, 1000).map((v) => Math.round(v * 1000) / 1000), [0.469, 0.531])
})

test('Crowd and Polls gate on the slide, use the tokens and publish prefixed parameters', () => {
  for (const f of ['Crowd.vue', 'Polls.vue']) {
    const src = readFileSync(new URL(`../components/${f}`, import.meta.url), 'utf8')
    assert.match(src, /useActive\(\)/, `${f} must gate on useActive`)
    assert.match(src, /useCrisp/, `${f} must render at the real resolution`)
    assert.match(src, /cssVar\('--nd-/, `${f} must read colours from the tokens`)
    assert.match(src, /setParam\('risk/, `${f} must publish risk-prefixed parameters`)
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b/, `${f} must not hard-code colours`)
  }
})
