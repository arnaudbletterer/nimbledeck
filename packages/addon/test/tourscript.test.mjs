// The tour vocabulary (parser and validator), the target resolution rules and the scheduler, run against a fake clock.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILTIN_SOUNDS, parseScript, parseSounds, runScript, scriptEnd, soundKind, stepLength, targetKind } from '../composables/tourScript.mjs'

test('a script is parsed into sorted, normalised steps', () => {
  const r = parseScript([
    { at: 5, drag: '.nd-compare', from: 0.15, to: 0.85, over: 2 },
    { at: 1.5, click: 'B', caption: 'Pick an answer' },
    { at: 9, key: 3 },
    { at: 10, type: 'hello', into: '.cm-content' },
    { at: 2, hover: '.x' },
    { at: 7, wait: 1 },
  ])
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.steps.map((s) => s.at), [1.5, 2, 5, 7, 9, 10])
  assert.equal(r.steps[0].caption, 'Pick an answer')
  assert.equal(r.steps[4].key, '3')
  assert.equal(r.steps[2].over, 2)
})

test('drag gets defaults for from, to and over', () => {
  const [s] = parseScript([{ at: 1, drag: 'input' }]).steps
  assert.deepEqual([s.from, s.to, s.over], [0.1, 0.9, 1.2])
})

test('mistakes are reported with the step number', () => {
  const bad = (step, re) => { const r = parseScript([step]); assert.match(r.errors.join('\n'), re); assert.deepEqual(r.steps, []) }
  bad({ at: 1, clik: 'B' }, /step 1: unknown key 'clik'/)
  bad({ click: 'B' }, /'at' must be a number/)
  bad({ at: -1, click: 'B' }, /'at' must be a number/)
  bad({ at: 'soon', click: 'B' }, /'at' must be a number/)
  bad({ at: 1 }, /exactly one action.*none/)
  bad({ at: 1, click: 'B', hover: 'x' }, /exactly one action.*click and hover/)
  bad({ at: 1, click: '' }, /needs a target/)
  bad({ at: 1, click: 'B', from: 0.2 }, /'from' does not go with 'click'/)
  bad({ at: 1, drag: 'x', from: 2 }, /'from' is a position/)
  bad({ at: 1, drag: 'x', over: 0 }, /'over' is a duration/)
  bad({ at: 1, wait: 0 }, /'wait' must be/)
  bad({ at: 1, key: '' }, /'key' must be a key name/)
  bad({ at: 1, type: '' }, /text to type/)
  bad({ at: 1, type: 'a', speed: 2 }, /'speed'/)
  bad({ at: 1, click: 'B', caption: 'x'.repeat(60) }, /caption/)
  assert.match(parseScript('click').errors[0], /must be a list/)
  assert.match(parseScript(['click']).errors[0], /expected/)
})

test('a step after the end of the slide is a warning, not an error', () => {
  const r = parseScript([{ at: 12, click: 'A' }], { seconds: 8 })
  assert.deepEqual(r.errors, [])
  assert.match(r.warnings[0], /starts at 12 s, after the slide's 8 s/)
})

test('step lengths add up to the end of the script', () => {
  const steps = parseScript([{ at: 1, click: 'A' }, { at: 3, drag: 'x', over: 2 }, { at: 4, type: 'abcd', speed: 100 }]).steps
  assert.equal(stepLength(steps[1]), 2)
  assert.equal(stepLength(steps[2]), 0.4)
  assert.equal(scriptEnd(steps), 5)
  assert.equal(scriptEnd([]), 0)
})

test('targets: a capital letter is a quiz choice, text: a text match, the rest a selector', () => {
  assert.deepEqual(targetKind('C'), { kind: 'letter', value: 'C' })
  assert.deepEqual(targetKind('text:Studio light'), { kind: 'text', value: 'Studio light' })
  assert.deepEqual(targetKind('.nd-compare'), { kind: 'css', value: '.nd-compare' })
  assert.deepEqual(targetKind('AB'), { kind: 'css', value: 'AB' })
})

test('sounds: built-in names, files of public/ and everything else', () => {
  for (const n of BUILTIN_SOUNDS) assert.equal(soundKind(n).kind, 'builtin')
  assert.equal(soundKind('/audio/theme.mp3').kind, 'file')
  assert.equal(soundKind('/a/b.OGG').kind, 'file')
  for (const bad of ['boing', '/audio/theme.txt', 'audio/theme.mp3', '//cdn.example.com/a.mp3', 'https://x.test/a.mp3', 3, undefined]) assert.equal(soundKind(bad).kind, 'invalid')
  assert.ok(BUILTIN_SOUNDS.length >= 11)
})

test('sound and sounds become one sorted list of cues', () => {
  const r = parseSounds({ sound: 'whoosh', sounds: [{ at: 4, src: 'chime', volume: 0.5 }, { at: 2.5, src: '/audio/x.mp3' }] })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.cues, [{ at: 0, src: 'whoosh', volume: 1, when: 'tour' }, { at: 2.5, src: '/audio/x.mp3', volume: 1, when: 'tour' }, { at: 4, src: 'chime', volume: 0.5, when: 'tour' }])
})

test('sound mistakes: unknown name, bad volume, bad keys, cue after the slide', () => {
  const e = (o, re) => assert.match(parseSounds(o).errors.join('\n'), re)
  e({ sound: 'boing' }, /'boing' is neither a built-in sound/)
  e({ bed: 'nope.mp3' }, /ndSound/)
  e({ sounds: [{ at: 1, src: 'pop', volume: 2 }] }, /volume/)
  e({ sounds: [{ at: 1, src: 'pop', vol: 1 }] }, /unknown key 'vol'/)
  e({ sounds: [{ src: 'pop' }] }, /'at' must be/)
  e({ sounds: 'pop' }, /must be a list/)
  assert.match(parseSounds({ sounds: [{ at: 9, src: 'pop' }] }, { seconds: 6 }).warnings[0], /after the slide's 6 s/)
})

// A clock where sleeping only moves time forward: the scheduler's order and timing can be asserted exactly.
function fakeClock() {
  let t = 0
  return { now: () => t, sleep: async (ms) => { t += ms }, at: () => t }
}

test('the scheduler glides, then acts exactly at `at`, in order', async () => {
  const c = fakeClock(), events = []
  const steps = parseScript([{ at: 3, click: 'A' }, { at: 1, hover: '.x' }]).steps
  await runScript(steps, { ...c, glide: () => 800, move: async (s) => events.push(['move', s.at, c.at()]), act: async (s) => events.push(['act', s.at, c.at()]) })
  assert.deepEqual(events, [['move', 1, 200], ['act', 1, 1000], ['move', 3, 2200], ['act', 3, 3000]])
})

test('a late step runs at once and the next keeps its time', async () => {
  const c = fakeClock(), events = []
  const steps = parseScript([{ at: 1, drag: 'x', over: 3 }, { at: 2, click: 'A' }]).steps
  await runScript(steps, { ...c, glide: () => 0, act: async (s) => { events.push([s.action, c.at()]); if (s.action === 'drag') await c.sleep(3000) } })
  assert.deepEqual(events, [['drag', 1000], ['click', 4000]])
})

test('a step at 0 with a long glide does not wait for a negative time', async () => {
  const c = fakeClock(), at = []
  await runScript(parseScript([{ at: 0.2, click: 'A' }]).steps, { ...c, glide: () => 800, move: async () => at.push(c.at()), act: async () => at.push(c.at()) })
  assert.deepEqual(at, [0, 200])
})

test('cancelling stops the script before the next step', async () => {
  const c = fakeClock(), seen = []
  let stop = false
  await runScript(parseScript([{ at: 1, click: 'A' }, { at: 2, click: 'B' }]).steps, { ...c, cancelled: () => stop, act: async (s) => { seen.push(s.target); stop = true } })
  assert.deepEqual(seen, ['A'])
})

test('a cue is tour-only unless it says when: always', () => {
  const r = parseSounds({ sounds: [{ at: 1, src: 'pop' }, { at: 2, src: 'pop', when: 'always' }] })
  assert.deepEqual(r.cues.map((c) => c.when), ['tour', 'always'])
  assert.match(parseSounds({ sounds: [{ at: 1, src: 'pop', when: 'never' }] }).errors[0], /'when' is tour/)
})
