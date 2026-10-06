// Where a recording is looked for, and which file a browser plays.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isVideoResponse, RECORDING_TYPES, recordingBase, recordingCandidates } from '../composables/recording.ts'

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

test('only the types the browser can play are tried, WebM (VP9) first at equal confidence', () => {
  assert.deepEqual(recordingCandidates('/r/a', () => 'maybe'), ['/r/a.webm', '/r/a.mp4'])
  assert.deepEqual(recordingCandidates('/r/a', () => 'probably'), ['/r/a.webm', '/r/a.mp4'])
  assert.deepEqual(recordingCandidates('/r/a', (m) => (m.startsWith('video/mp4') ? 'probably' : '')), ['/r/a.mp4'])
  assert.deepEqual(recordingCandidates('/r/a', () => ''), [])
  assert.deepEqual(recordingCandidates('/r/a', () => false), [])
})

test('the type a browser is sure about beats the one it only thinks it can play (Safari: MP4)', () => {
  assert.deepEqual(recordingCandidates('/r/a', (m) => (m.startsWith('video/mp4') ? 'probably' : 'maybe')), ['/r/a.mp4', '/r/a.webm'])
  assert.deepEqual(recordingCandidates('/r/a', (m) => (m.startsWith('video/webm') ? 'probably' : 'maybe')), ['/r/a.webm', '/r/a.mp4'])
})

test('the types asked for are VP9 and H.264 High, what the recorder writes', () => {
  assert.deepEqual(RECORDING_TYPES.map((t) => [t.ext, t.mime]), [['webm', 'video/webm; codecs="vp9"'], ['mp4', 'video/mp4; codecs="avc1.640028"']])
})

test('a dev server that answers a missing file with the page is not a recording', () => {
  assert.equal(isVideoResponse(200, 'video/webm'), true)
  assert.equal(isVideoResponse(200, 'application/octet-stream'), true)   // a static host without a .webm mapping
  assert.equal(isVideoResponse(200, 'text/html; charset=utf-8'), false)
  assert.equal(isVideoResponse(404, 'video/webm'), false)
  assert.equal(isVideoResponse(200, null), false)
})
