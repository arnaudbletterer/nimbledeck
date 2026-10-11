// The plain words and the steps behind <Chance>, kept apart from the component so they can be tested without a browser.
// Probabilities are numbers in [0, 1]. The arithmetic itself is in risk.mjs.
import { oneIn, ppv } from './risk.mjs'

// How common the condition is, as a slider you can land on: 1 person in 10,000 up to 1 in 2.
export const COMMON = [1 / 10000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 200, 1 / 100, 1 / 50, 1 / 20, 1 / 10, 1 / 5, 1 / 3, 1 / 2]

// The index of the step nearest to a prevalence (on a log scale, so 1 in 1,000 is itself).
export function nearestCommon(prev) {
  let best = 0
  COMMON.forEach((v, i) => { if (Math.abs(Math.log(v / prev)) < Math.abs(Math.log(COMMON[best] / prev))) best = i })
  return best
}

// How many positive tests in 100 are real, in words: "9", "52", "less than 1". Never "0", and "100" only when it is one.
export function timesIn100(prev, sens, spec) {
  const v = ppv(prev, sens, spec) * 100
  if (v < 0.5) return 'less than 1'
  if (v >= 99.5 && v < 100) return 'nearly 100'
  return String(Math.round(v))
}

// A number of a slider as people say it: 99, 99.9, 80.
export const say = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

// The one sentence under a play picture. `kind` is the slider the slide lets you move.
export function sentence(kind, prev, sens, spec) {
  const right = timesIn100(prev, sens, spec)
  if (kind === 'prevalence') return `If ${oneIn(prev)} people were sick, a positive test would be right about ${right} times in 100.`
  return `A test that catches ${say(Math.round(sens * 1000) / 10)} of 100 sick people and clears ${say(Math.round(spec * 1000) / 10)} of 100 healthy people is right about ${right} times in 100 when it says positive.`
}
