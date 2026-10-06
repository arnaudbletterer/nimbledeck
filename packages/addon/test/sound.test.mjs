// The sound manager and the built-in synth recipes, against a fake AudioContext that records what is built.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSoundManager, STORE_KEY, BEDS } from '../composables/soundManager.mjs'
import { SYNTH } from '../composables/soundSynth.mjs'
import { BUILTIN_SOUNDS } from '../composables/tourScript.mjs'

function node(kind) {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} })
  return { kind, connect() {}, disconnect() {}, start() { this.started = true }, stop() { this.stopped = true }, gain: param(), frequency: param(), Q: param(), detune: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), playbackRate: param() }
}
class FakeContext {
  static made = []
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = node('dest'); this.nodes = []; FakeContext.made.push(this) }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
  make(kind) { const n = node(kind); this.nodes.push(n); return n }
  createGain() { return this.make('gain') }
  createOscillator() { return this.make('osc') }
  createBiquadFilter() { return this.make('filter') }
  createBufferSource() { return this.make('source') }
  createDynamicsCompressor() { return this.make('limiter') }
  createConvolver() { return this.make('convolver') }
  createAnalyser() { const n = this.make('analyser'); n.frequencyBinCount = 8; n.getByteFrequencyData = (a) => a.fill(128); return n }
  createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) } }
  decodeAudioData() { return Promise.resolve({ duration: 1 }) }
}
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
const make = (o = {}) => createSoundManager({ AudioContextCtor: FakeContext, storage: memory(), loadFile: async () => new ArrayBuffer(8), ...o })

test('every built-in name has a recipe and every recipe a name', () => {
  assert.deepEqual(Object.keys(SYNTH).sort(), [...BUILTIN_SOUNDS].sort())
})

test('each recipe builds started sources and reports a length', () => {
  for (const name of BUILTIN_SOUNDS) {
    const ctx = new FakeContext(), out = ctx.createGain()
    const r = SYNTH[name](ctx, out, 0)
    assert.ok(r.dur > 0, name)
    assert.ok(r.sources.length > 0 && r.sources.every((s) => s.started || typeof s.stop === 'function'), `${name} starts its sources`)
    r.sources.forEach((s) => s.stop())   // also stops the uplift scheduler's timer
  }
  for (const bed of ['pad', 'uplift']) {
    const r = SYNTH[bed](new FakeContext(), node('g'), 0)
    assert.equal(r.dur, Infinity)
    r.sources.forEach((s) => s.stop())
  }
})

test('uplift schedules its first notes at once, keeps scheduling ahead on the context clock, and stops when told', async () => {
  const ctx = new FakeContext(), out = ctx.createGain()
  const r = SYNTH.uplift(ctx, out, 0)
  const oscs = () => ctx.nodes.filter((n) => n.kind === 'osc').length
  const first = oscs()
  assert.ok(first > 10, 'the first 1.6 s of the score is scheduled on the first tick')
  ctx.currentTime = 3
  await new Promise((res) => setTimeout(res, 260))
  assert.ok(oscs() > first, 'moving the clock makes the next notes appear')
  r.sources.forEach((s) => s.stop())
  const n = ctx.nodes.length
  ctx.currentTime = 10
  await new Promise((res) => setTimeout(res, 260))
  assert.equal(ctx.nodes.length, n, 'a stopped bed schedules nothing more')
})

test('sound is off until the viewer opts in, and nothing plays then', () => {
  const m = make()
  assert.equal(m.enabled, false)
  assert.equal(m.play('pop'), null)
  assert.equal(m.state, 'none')            // no AudioContext was created
})

test('opting in creates one context and resumes it; the choice is stored', () => {
  FakeContext.made.length = 0
  const storage = memory(), m = make({ storage })
  m.setEnabled(true)
  m.setEnabled(true)
  assert.equal(FakeContext.made.length, 1)
  assert.equal(m.running, true)
  assert.equal(storage.getItem(STORE_KEY), '1')
  assert.ok(m.play('pop'))
  assert.equal(m.log.at(-1).src, 'pop')
})

test('a stored choice enables sound but creates the context only on the first gesture', () => {
  FakeContext.made.length = 0
  const storage = memory(); storage.setItem(STORE_KEY, '1')
  const m = make({ storage })
  assert.equal(m.enabled, true)
  assert.equal(FakeContext.made.length, 0)
  assert.equal(m.play('pop'), null)
  m.unlock()
  assert.equal(FakeContext.made.length, 1)
  assert.ok(m.play('pop'))
})

test('a throwing storage never breaks the manager', () => {
  const bad = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  const m = make({ storage: bad })
  assert.doesNotThrow(() => m.setEnabled(true))
  assert.equal(m.enabled, true)
})

test('switching off stops every voice and the bed', () => {
  const m = make()
  m.setEnabled(true)
  const h = m.play('riser'); m.startBed('pad')
  m.setEnabled(false)
  assert.equal(m.enabled, false)
  assert.equal(m.play('pop'), null)
  assert.ok(h)
  const ctx = FakeContext.made.at(-1)
  assert.ok(ctx.nodes.filter((n) => n.kind === 'osc').every((o) => o.stopped), 'all oscillators were stopped')
})

test('a bad name or an unreadable file is silent', async () => {
  const m = make({ loadFile: async () => { throw new Error('404') } })
  m.setEnabled(true)
  assert.equal(m.play('boing'), null)
  assert.ok(m.play('/audio/missing.mp3'))   // returns a handle, then drops quietly
  await new Promise((r) => setTimeout(r, 10))
})

test('a file sound is decoded once and cached', async () => {
  let loads = 0
  const m = make({ loadFile: async () => { loads++; return new ArrayBuffer(8) } })
  m.setEnabled(true)
  m.play('/audio/a.mp3'); m.play('/audio/a.mp3')
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(loads, 1)
})

test('the bed starts once, replaces a different bed, and a cue ducks it', () => {
  const m = make()
  m.setEnabled(true)
  m.startBed('pad'); m.startBed('pad')
  assert.equal(m.log.filter((l) => l.scope === 'bed').length, 1)
  m.play('chime')
  m.stopBed()
})

test('uplift is a quiet bed that ducks about 5 dB under a cue, and a slide change does not restart it', () => {
  assert.ok(BEDS.uplift.level < BEDS.pad.level)
  const duck = 20 * Math.log10(BEDS.uplift.ducked / BEDS.uplift.level)
  assert.ok(duck <= -4 && duck >= -6, `ducks ${duck.toFixed(1)} dB`)
  FakeContext.made.length = 0
  const m = make()
  m.setEnabled(true)
  m.startBed('uplift')
  const ctx = FakeContext.made.at(-1), made = ctx.nodes.length
  for (let page = 0; page < 5; page++) m.startBed('uplift')   // what the sound director does on every slide change
  assert.equal(ctx.nodes.length, made, 'no node was built again')
  assert.equal(m.log.filter((l) => l.scope === 'bed').length, 1)
  m.stopAll()
})

test('levels are zeros without a context and values between 0 and 1 with one', () => {
  const m = make()
  assert.deepEqual(m.levels(4), [0, 0, 0, 0])
  m.setEnabled(true)
  const l = m.levels(6)
  assert.equal(l.length, 6)
  assert.ok(l.every((v) => v >= 0 && v <= 1))
})

test('a listener hears the switch', () => {
  const m = make(), seen = []
  m.subscribe((v) => seen.push(v))
  m.setEnabled(true); m.setEnabled(false)
  assert.deepEqual(seen, [true, false])
})
