// The pure score and lookahead scheduler of the `uplift` bed, driven by a fake clock.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BPM, CHORDS, LOOP_STEPS, STEPS_PER_BAR, STEPS_PER_CHORD, createScheduler, eventsAt, loopSeconds, midiHz, stepSeconds } from '../composables/upliftScore.mjs'

const collect = (sch, until, dt = 0.1) => { const all = []; for (let now = 0; now <= until; now += dt) all.push(...sch.advance(now)); return all }
const close = (a, b) => Math.abs(a - b) < 1e-9

test('the tempo is 104 bpm: an eighth note is 60/104/2 s and the loop is 16 bars', () => {
  assert.equal(BPM, 104)
  assert.ok(close(stepSeconds(), 60 / 104 / 2))
  assert.equal(LOOP_STEPS, 16 * STEPS_PER_BAR)
  assert.ok(close(loopSeconds(), 16 * 4 * 60 / 104))
})

test('the progression is I-V-vi-IV in G major, two bars each, and chords change on bar lines', () => {
  assert.deepEqual(CHORDS.map((c) => c.name), ['G', 'D', 'Em', 'C'])
  assert.equal(STEPS_PER_CHORD, 2 * STEPS_PER_BAR)
  const changes = collect(createScheduler(), loopSeconds() + 1).filter((e) => e.kind === 'pad' && e.midi === CHORDS.find((c) => c.name === e.chord).pad[0])
  assert.deepEqual(changes.slice(0, 8).map((e) => e.chord), ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'])
  assert.deepEqual(changes.slice(0, 8).map((e) => e.step), [0, 16, 32, 48, 64, 80, 96, 112])
  for (const e of changes) assert.ok(close(e.t, e.step * stepSeconds()), 'on the clock, exactly')
})

test('bass plays the chord root on every downbeat and every pitch is in G major', () => {
  const g = new Set([0, 2, 4, 6, 7, 9, 11])
  const ev = collect(createScheduler(), loopSeconds()).filter((e) => e.step < LOOP_STEPS)
  const bass = ev.filter((e) => e.kind === 'bass' && e.step % STEPS_PER_BAR === 0)
  assert.equal(bass.length, 16)
  for (const b of bass) assert.equal(b.midi, CHORDS.find((c) => c.name === b.chord).bass)
  for (const e of ev.filter((x) => x.midi != null)) assert.ok(g.has(e.midi % 12), `${e.kind} ${e.midi} is out of key`)
  assert.ok(close(midiHz(69), 440))
})

test('kick sits on beats 1 and 3, the shaker only off the beat, at most two plucks an eighth', () => {
  for (let n = 0; n < LOOP_STEPS; n++) {
    const ev = eventsAt(n), inBar = n % STEPS_PER_BAR
    if (inBar === 0 || inBar === 4) assert.ok(ev.some((e) => e.kind === 'kick'), `kick at ${n}`)
    if (inBar % 2 === 0) assert.ok(!ev.some((e) => e.kind === 'hat'), `no shaker on the beat at ${n}`)
    else assert.ok(ev.some((e) => e.kind === 'hat'), `shaker at ${n}`)
    assert.ok(ev.filter((e) => e.kind === 'pluck').length <= 2)
    for (const e of ev) assert.ok(e.vel > 0 && e.vel <= 1)
  }
})

test('the score repeats exactly after a loop, and its two passes differ so it is not mechanical', () => {
  for (let n = 0; n < LOOP_STEPS; n++) assert.deepEqual(eventsAt(n), eventsAt(n + LOOP_STEPS))
  let different = 0
  for (let n = 0; n < LOOP_STEPS / 2; n++) if (JSON.stringify(eventsAt(n)) !== JSON.stringify(eventsAt(n + LOOP_STEPS / 2))) different++
  assert.ok(different > 10, `${different} steps differ between the passes`)
  const bars = new Set()
  for (let b = 0; b < 16; b++) bars.add(JSON.stringify(Array.from({ length: 8 }, (_, i) => eventsAt(b * 8 + i).filter((e) => e.kind === 'pluck').map((e) => e.midi))))
  assert.ok(bars.size >= 12, `${bars.size} different arpeggio bars out of 16`)
})

test('the scheduler looks ahead on the clock it is given, never twice, never in the past', () => {
  const sch = createScheduler({ start: 10, lookahead: 1 })
  const first = sch.advance(10)
  assert.ok(first.every((e) => e.t >= 10 && e.t < 11))
  assert.ok(first.some((e) => e.step === 0 && e.kind === 'kick'))
  assert.deepEqual(sch.advance(10), [], 'asking again at the same time returns nothing')
  const seen = new Set(first.map((e) => `${e.step}${e.kind}${e.midi}`))
  let now = 10
  for (let i = 0; i < 200; i++) {
    now += 0.05
    for (const e of sch.advance(now)) {
      const k = `${e.step}${e.kind}${e.midi}`
      assert.ok(!seen.has(k), `duplicate ${k}`)
      seen.add(k)
      assert.ok(e.t < now + 1 && e.t >= now - 0.1)
    }
  }
})

test('a stalled clock skips the steps it missed instead of playing them in a burst', () => {
  const sch = createScheduler({ start: 0, lookahead: 1, late: 0.1 })
  sch.advance(0)
  const after = sch.advance(20)
  assert.ok(after.length > 0 && after.every((e) => e.t >= 19.9), 'only steps that are current or ahead')
  assert.ok(sch.nextStep > 60)
})

test('the tempo option changes the spacing of the steps', () => {
  const ev = collect(createScheduler({ bpm: 120 }), 5).filter((e) => e.kind === 'kick' && e.step % STEPS_PER_BAR === 0)
  assert.ok(close(ev[1].t - ev[0].t, 2), 'one bar is 2 s at 120 bpm')
})
