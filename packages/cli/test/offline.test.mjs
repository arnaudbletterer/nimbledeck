// The deck must open with no internet: nothing the theme or the scaffold ships may point at a remote host.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const theme = JSON.parse(readFileSync(new URL('../../theme/package.json', import.meta.url), 'utf8')).slidev.defaults

test('the theme loads no web fonts', () => {
  assert.equal(theme.fonts?.provider, 'none')
})

test('the theme favicon is inline, not fetched from a CDN', () => {
  assert.match(theme.favicon, /^data:/)
})
