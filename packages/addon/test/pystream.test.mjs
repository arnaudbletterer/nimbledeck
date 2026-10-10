// The pure part of <PyStream>: frame parsing (points and the raster block), colour groups, slider text.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrame, groupRanges, sliderText } from '../composables/pystream.mjs'
import { formatValue } from '../composables/links.mjs'

const f32 = (...v) => Buffer.from(new Float32Array(v).buffer)
const frame = (head, ...rest) => { const b = Buffer.concat([f32(...head), ...rest]); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }

test('a frame of points only has no images: the last ones stay', () => {
  const f = parseFrame(frame([3.26, 2, -1, 0.5, 1, 2]))
  assert.equal(f.stepMs, 3.3)
  assert.equal(f.n, 2)
  assert.deepEqual([...f.points], [-1, 0.5, 1, 2])
  assert.equal(f.images, null)
})

test('a raster block gives each image its rectangle and its RGBA bytes, in order', () => {
  const px = Buffer.from([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255])   // 2 x 2
  const px2 = Buffer.from([9, 9, 9, 255])                                                // 1 x 1
  const f = parseFrame(frame([1, 1, 0, 0], f32(2, 10, 20, 100, 50, 2, 2, 0, 0, 30, 30, 1, 1), px, px2))
  assert.equal(f.images.length, 2)
  const im = f.images[0]
  assert.deepEqual([im.x, im.y, im.w, im.h, im.iw, im.ih], [10, 20, 100, 50, 2, 2])
  assert.deepEqual([...im.rgba], [...px])
  assert.deepEqual([...f.images[1].rgba], [...px2])
})

test('count 0 clears the images, a block that does not fit is ignored', () => {
  assert.deepEqual(parseFrame(frame([1, 0], f32(0))).images, [])
  assert.equal(parseFrame(frame([1, 0], f32(1, 0, 0, 10, 10, 4, 4), Buffer.alloc(10))).images, null)
  assert.equal(parseFrame(frame([1, 0], f32(1, 0, 0, 10, 10, 0, 4))).images, null)
  assert.equal(parseFrame(frame([1, 0], f32(-3))).images, null)
})

test('without groups the points are cut into equal consecutive colour groups', () => {
  assert.deepEqual(groupRanges(10, 2), [[0, 5], [5, 10]])
  assert.deepEqual(groupRanges(7, 3), [[0, 3], [3, 5], [5, 7]])
  for (let i = 0; i < 7; i++) assert.equal(groupRanges(7, 3).findIndex(([a, b]) => i >= a && i < b), Math.floor(i * 3 / 7))   // the original rule
  assert.deepEqual(groupRanges(5, 1), [[0, 5]])
})

test('explicit group counts win over the number of colours; unused points are not drawn', () => {
  assert.deepEqual(groupRanges(100, 2, [30, 20]), [[0, 30], [30, 50]])
  assert.deepEqual(groupRanges(40, 2, [30, 20]), [[0, 30], [30, 40]])
  assert.deepEqual(groupRanges(10, 1, [30, 20]), [[0, 10], [10, 10]])
})

test('an extra slider shows its label, or its number with the decimals of its step', () => {
  const lab = { min: 0, max: 1, step: 1, labels: ['linear', 'cosine'] }
  assert.equal(sliderText(lab, 1, formatValue), 'cosine')
  assert.equal(sliderText(lab, 7, formatValue), 7)
  assert.equal(sliderText({ min: 0, max: 1, step: 0.05 }, 0.5, formatValue), formatValue(0.5, 2))
  assert.equal(sliderText({ min: 0, max: 9, step: 1 }, 4, formatValue), formatValue(4, 0))
})
