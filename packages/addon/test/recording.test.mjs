// Where a recording is looked for, and which file a browser plays.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isVideoResponse, recordingBase, recordingCandidates } from '../composables/recording.ts'

test('the conventional place follows the deck base path', () => {
  assert.equal(recordingBase(undefined, 'stream-nbody', '/'), '/recordings/stream-nbody')
  assert.equal(recordingBase(undefined, 'live-19', '/nimbledeck/demos/x/'), '/nimbledeck/demos/x/recordings/live-19')
  assert.equal(recordingBase(undefined, 'demo-a', '/sub'), '/sub/recordings/demo-a', 'a base without its trailing slash still works')
})

test('an explicit path is resolved like any public file; a full URL is left alone', () => {
  assert.equal(recordingBase('/recordings/mine', 'x', '/nimbledeck/demos/x/'), '/nimbledeck/demos/x/recordings/mine')
  assert.equal(recordingBase('clips/mine', 'x', '/'), '/clips/mine')
  assert.equal(recordingBase('https://example.org/a', 'x', '/b/'), 'https://example.org/a')
})

test('only the types the browser can play are tried, WebM first', () => {
  const both = recordingCandidates('/r/a', () => 'maybe')
  assert.deepEqual(both, ['/r/a.webm', '/r/a.mp4'])
  assert.deepEqual(recordingCandidates('/r/a', (m) => (m.startsWith('video/mp4') ? 'probably' : '')), ['/r/a.mp4'])
  assert.deepEqual(recordingCandidates('/r/a', () => ''), [])
})

test('a dev server that answers a missing file with the page is not a recording', () => {
  assert.equal(isVideoResponse(200, 'video/webm'), true)
  assert.equal(isVideoResponse(200, 'text/html; charset=utf-8'), false)
  assert.equal(isVideoResponse(404, 'video/webm'), false)
  assert.equal(isVideoResponse(200, null), false)
})
