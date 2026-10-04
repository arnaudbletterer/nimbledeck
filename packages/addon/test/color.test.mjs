// The colour helpers behind Aurora and the other canvas components: conversions must round-trip and stay in range, or a
// token turns into the wrong colour on screen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// color.ts imports './useConfig' without an extension, which Vite resolves and Node does not.
registerHooks({
  resolve(spec, ctx, next) {
    try { return next(spec, ctx) } catch (e) { if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(`${spec}.ts`, ctx); throw e }
  },
})
const { luma, toHsl, fromHsl, hueShift, mix, rgba, rgbOf } = await import('../composables/color.ts')

const close = (a, b, eps = 1) => a.every((v, i) => Math.abs(v - b[i]) <= eps)

test('hsl round-trips the primaries, greys and an arbitrary colour', () => {
  for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [0, 0, 0], [255, 255, 255], [128, 128, 128], [31, 111, 235], [200, 90, 10]]) {
    assert.ok(close(fromHsl(toHsl(c)), c), `${c} -> ${toHsl(c)} -> ${fromHsl(toHsl(c))}`)
  }
})

test('toHsl reports hue in degrees, and a grey has no saturation', () => {
  assert.deepEqual(toHsl([255, 0, 0]), [0, 1, 0.5])
  assert.equal(Math.round(toHsl([0, 255, 0])[0]), 120)
  assert.equal(Math.round(toHsl([0, 0, 255])[0]), 240)
  assert.equal(toHsl([90, 90, 90])[1], 0)
  const h = toHsl([255, 0, 128])[0]
  assert.ok(h >= 0 && h < 360, `hue ${h} stays in [0, 360)`)
})

test('hueShift turns around the wheel, wraps both ways and keeps lightness', () => {
  assert.ok(close(hueShift([255, 0, 0], 120), [0, 255, 0]))
  assert.ok(close(hueShift([255, 0, 0], -120), [0, 0, 255]))
  assert.ok(close(hueShift([255, 0, 0], 360), [255, 0, 0]))
  assert.ok(close(hueShift([255, 0, 0], -480), hueShift([255, 0, 0], -120)), 'shifts of more than a turn wrap')
  const c = [40, 120, 200]
  assert.ok(Math.abs(toHsl(hueShift(c, 77))[2] - toHsl(c)[2]) < 0.01)
  assert.deepEqual(hueShift([90, 90, 90], 100), [90, 90, 90], 'a grey stays grey')
})

test('mix blends channel by channel, with the ends exact and results rounded', () => {
  assert.deepEqual(mix([0, 0, 0], [255, 100, 50], 0), [0, 0, 0])
  assert.deepEqual(mix([0, 0, 0], [255, 100, 50], 1), [255, 100, 50])
  assert.deepEqual(mix([0, 0, 0], [255, 100, 50], 0.5), [128, 50, 25])
  assert.ok(mix([10, 20, 30], [40, 50, 60], 0.33).every(Number.isInteger))
})

test('luma orders black, grey and white, and weights green above blue', () => {
  assert.equal(luma([0, 0, 0]), 0)
  assert.ok(Math.abs(luma([255, 255, 255]) - 1) < 1e-9)
  assert.ok(luma([0, 255, 0]) > luma([255, 0, 0]) && luma([255, 0, 0]) > luma([0, 0, 255]))
})

test('rgba formats a CSS colour and defaults to opaque', () => {
  assert.equal(rgba([1, 2, 3]), 'rgba(1, 2, 3, 1)')
  assert.equal(rgba([1, 2, 3], 0.25), 'rgba(1, 2, 3, 0.25)')
})

// rgbOf asks the canvas to normalise a CSS colour; a stand-in canvas that answers like Chrome does (#rrggbb when opaque,
// rgba() when not) is enough to test the parsing around it.
function withDom(tokens, normalise) {
  let value = ''
  const ctx = { get fillStyle() { return normalise(value) }, set fillStyle(v) { value = v } }
  globalThis.document = { documentElement: {}, createElement: () => ({ getContext: () => ctx }) }
  globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => tokens[n] ?? '' })
}
test('rgbOf reads an opaque token (hex) and a translucent one (rgba)', () => {
  withDom({ '--nd-a': '#1f6feb', '--nd-b': 'rgba(10, 20, 30, 0.5)' }, (v) => v)
  assert.deepEqual(rgbOf('--nd-a'), [31, 111, 235])
  assert.deepEqual(rgbOf('--nd-b'), [10, 20, 30])
})

test('rgbOf falls back when the token is missing, and to black when nothing parses', () => {
  withDom({}, (v) => v)
  assert.deepEqual(rgbOf('--nd-missing', '#ff0000'), [255, 0, 0])
  assert.deepEqual(rgbOf('--nd-missing'), [0, 0, 0])
  withDom({ '--nd-x': 'garbage' }, () => 'garbage')
  assert.deepEqual(rgbOf('--nd-x'), [0, 0, 0])
})
