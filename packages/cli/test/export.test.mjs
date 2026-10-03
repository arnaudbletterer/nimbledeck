import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { exportArgs, pdfPath } from '../src/export.mjs'

test('the PDF goes next to the deck and drops the .md extension', () => {
  assert.equal(pdfPath(join('decks', 'talk.md')), join('decks', 'talk.pdf'))
  assert.equal(pdfPath(join('x', 'Talk.MD')), join('x', 'Talk.pdf'))
})

test('slidev export is asked for one page per click, with the found Chrome and the output path', () => {
  const a = exportArgs('talk.md', '/d/talk.pdf', '/usr/bin/chromium', ['--range', '1-3'])
  assert.deepEqual(a, ['export', 'talk.md', '--with-clicks', '--output', '/d/talk.pdf', '--executable-path', '/usr/bin/chromium', '--range', '1-3'])
})
