// A deck built for a sub-path (slidev build --base /demos/showcase/) must ask for /demos/showcase/loop.mp4, not /loop.mp4.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { asset } from '../composables/asset.mjs'

test('a root-relative address follows the base path', () => {
  assert.equal(asset('/loop.mp4', '/nimbledeck/demos/showcase/'), '/nimbledeck/demos/showcase/loop.mp4')
  assert.equal(asset('/loop.mp4', '/sub'), '/sub/loop.mp4')
  assert.equal(asset('/loop.mp4', '/'), '/loop.mp4')
})

test('addresses that are not files of public/ are left alone', () => {
  for (const u of ['https://example.com/a.jpg', '//cdn.example.com/a.jpg', 'a.jpg', './a.jpg', 'data:image/png;base64,AAAA', '']) {
    assert.equal(asset(u, '/nimbledeck/demos/showcase/'), u)
  }
})

test('an address that already carries the base is not prefixed twice', () => {
  assert.equal(asset('/sub/a.jpg', '/sub/'), '/sub/a.jpg')
})

test('every component that takes a media address resolves it through asset()', () => {
  for (const f of ['Clip', 'Photo', 'Compare']) {
    const src = readFileSync(new URL(`../components/${f}.vue`, import.meta.url), 'utf8')
    assert.match(src, /asset\(/, `${f} must resolve its src against the base path`)
  }
  assert.match(readFileSync(new URL('../../theme/layouts/photo-right.vue', import.meta.url), 'utf8'), /BASE_URL/)
})
