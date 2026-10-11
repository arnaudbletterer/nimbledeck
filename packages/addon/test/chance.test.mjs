// The words of <Chance>: the sentence follows the sliders, and the numbers in it are the ones of Bayes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMMON, nearestCommon, say, sentence, timesIn100 } from '../composables/chance.mjs'

test('the starting point of the story: 1 in 1,000, a 99 percent test, right 9 times in 100', () => {
  assert.equal(COMMON[nearestCommon(0.001)], 0.001)
  assert.equal(timesIn100(0.001, 0.99, 0.99), '9')
  assert.equal(sentence('prevalence', 0.001, 0.99, 0.99), 'If 1 in 1,000 people were sick, a positive test would be right about 9 times in 100.')
})

test('the sentence of the slide, 1 in 100: half', () => {
  assert.equal(sentence('prevalence', 0.01, 0.99, 0.99), 'If 1 in 100 people were sick, a positive test would be right about 50 times in 100.')
})

test('the accuracy sentence names both halves of the test in plain words', () => {
  const s = sentence('accuracy', 0.001, 0.8, 0.999)
  assert.match(s, /catches 80 of 100 sick people/)
  assert.match(s, /clears 99\.9 of 100 healthy people/)
  assert.match(s, /about 44 times in 100/)
})

test('a very rare condition says "less than 1", a perfect test says 100', () => {
  assert.equal(timesIn100(0.0001, 0.9, 0.9), 'less than 1')
  assert.equal(timesIn100(0.5, 1, 1), '100')
  assert.equal(say(99), '99')
  assert.equal(say(99.9), '99.9')
})

test('the prevalence steps are ordered and cover 1 in 10,000 to 1 in 2', () => {
  assert.deepEqual([...COMMON].sort((a, b) => a - b), COMMON)
  assert.equal(COMMON[0], 1 / 10000)
  assert.equal(COMMON.at(-1), 0.5)
})
