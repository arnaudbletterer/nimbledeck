import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { disableUnrecorded, isRecorded, mergeManifest, readManifest, slideComponents, writeManifest } from '../src/recordings.mjs'

test('a slide lists its live components with the names their recordings get', () => {
  const body = `# Title\n<PyStream name="nbody" controls />\n<Demo name='compute' />\n<LiveCode :auto="false" id="plot">\n\n\`\`\`python\nx = 1\n\`\`\`\n\n</LiveCode>`
  assert.deepEqual(slideComponents(body, 4).map((c) => c.id), ['stream-nbody', 'demo-compute', 'live-plot'])
})

test('a LiveCode without id is named after its slide number', () => {
  assert.deepEqual(slideComponents('<LiveCode>\n</LiveCode>', 19).map((c) => c.id), ['live-19'])
})

test('components shown inside a code fence are not components of the slide', () => {
  assert.deepEqual(slideComponents('Write:\n\n```md\n<Demo name="a" />\n```\n', 3), [])
})

test('an explicit recording path is kept, and a name that is not a plain string gives no id', () => {
  const [a, b] = slideComponents('<Demo name="a" recording="/recordings/x" />\n<PyStream :name="n" />', 1)
  assert.equal(a.recording, '/recordings/x')
  assert.equal(b.id, null)
})

const folder = () => { const pub = mkdtempSync(join(tmpdir(), 'nd-rec-')); mkdirSync(join(pub, 'recordings')); return pub }

test('the manifest keeps what is not re-recorded, replaces what is, and stays sorted', () => {
  const m = mergeManifest({ version: 1, recordings: [{ id: 'b', seconds: 8 }, { id: 'a', seconds: 8 }] }, [{ id: 'b', seconds: 3 }, { id: 'c', seconds: 5 }])
  assert.deepEqual(m.recordings.map((r) => [r.id, r.seconds]), [['a', 8], ['b', 3], ['c', 5]])
})

test('a missing or broken manifest reads as empty', () => {
  const pub = folder()
  assert.deepEqual(readManifest(join(pub, 'recordings')).recordings, [])
  writeFileSync(join(pub, 'recordings', 'index.json'), '{ nope')
  assert.deepEqual(readManifest(join(pub, 'recordings')).recordings, [])
})

test('a recording counts when the manifest lists it and a file exists', () => {
  const pub = folder(), dir = join(pub, 'recordings')
  writeManifest(dir, { version: 1, recordings: [{ id: 'demo-a' }, { id: 'demo-b' }] })
  writeFileSync(join(dir, 'demo-a.webm'), 'x')
  assert.equal(isRecorded(pub, { id: 'demo-a' }), true)
  assert.equal(isRecorded(pub, { id: 'demo-b' }), false, 'listed, but the file is gone')
  assert.equal(isRecorded(pub, { id: 'demo-c' }), false, 'not listed')
  writeFileSync(join(dir, 'free.mp4'), 'x')
  assert.equal(isRecorded(pub, { id: 'demo-z', recording: '/recordings/free' }), true, 'an explicit path needs only the file')
  assert.equal(isRecorded(pub, { id: 'demo-z', recording: '/../secret' }), false)
})

test('the web edition keeps a slide only when all its live components are recorded', () => {
  const pub = folder(), dir = join(pub, 'recordings')
  writeManifest(dir, { version: 1, recordings: [{ id: 'stream-a' }, { id: 'live-4' }] })
  for (const f of ['stream-a.webm', 'live-4.webm']) writeFileSync(join(dir, f), 'x')
  const deck = ['---\ntitle: t\n---\n\n# Cover', '---\nlayout: default\n---\n\n<PyStream name="a" />', '---\nlayout: default\n---\n\n<PyStream name="a" />\n<Demo name="b" />',
    '---\n\n<LiveCode>\n</LiveCode>', '---\nlayout: default\n---\n\n<Demo name="b" />\n', '---\n\n# plain'].join('\n')
  const { text, skipped, played } = disableUnrecorded(deck, pub)
  assert.equal(skipped, 2)
  assert.equal(played, 2)
  assert.equal((text.match(/disabled: true/g) ?? []).length, 2)
  assert.match(text, /---\ndisabled: true\nlayout: default\n---\n\n<PyStream name="a" \/>\n<Demo name="b" \/>/, 'the Demo has no recording')
  assert.match(text, /---\ndisabled: true\nlayout: default\n---\n\n<Demo name="b" \/>/)
  assert.ok(text.includes('<LiveCode id="4">'), 'a kept LiveCode keeps its name (a slide without frontmatter counts too)')
  assert.ok(!text.includes('disabled: true\n---\n\n# plain'))
})
