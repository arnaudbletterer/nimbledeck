import assert from 'node:assert/strict'
import test from 'node:test'
import { loadConfig, validateConfig, validateRecordings } from '../src/config.mjs'
import { encodeArgs, findFfmpeg, frameGeometry, keyName, parseRecordArgs, planTargets, Timeline, typingDelay } from '../src/record.mjs'

test('record options are parsed and checked', () => {
  assert.deepEqual(parseRecordArgs([]), { slides: [], seconds: 8, width: 1280, out: null, url: null })
  const o = parseRecordArgs(['--slide', '11', '19', '--seconds', '10', '--width', '1920', '--out', 'public/r', '--url', 'http://localhost:3030'])
  assert.deepEqual([o.slides, o.seconds, o.width, o.out, o.url], [[11, 19], 10, 1920, 'public/r', 'http://localhost:3030'])
  assert.deepEqual(parseRecordArgs(['--slide', '3', '--slide', '5']).slides, [3, 5])
  assert.throws(() => parseRecordArgs(['--slide']), /slide numbers/)
  assert.throws(() => parseRecordArgs(['--seconds', 'abc']), /needs a number/)
  assert.throws(() => parseRecordArgs(['--seconds', '0']), /from 1 to/)
  assert.throws(() => parseRecordArgs(['--width', '100']), /--width/)
  assert.throws(() => parseRecordArgs(['--url', 'file:///etc']), /--url/)
  assert.throws(() => parseRecordArgs(['--fast']), /unknown option/)
})

const slides = (...bodies) => bodies.map((body) => ({ body }))

test('targets are the slides with live components, or only the listed ones', () => {
  const s = slides('# a', '<PyStream name="x" />', '# b', '<Demo name="y" />\n<LiveCode>\n</LiveCode>')
  assert.deepEqual(planTargets(s).map((t) => [t.slide, t.comps.map((c) => c.id)]), [[2, ['stream-x']], [4, ['demo-y', 'live-4']]])
  assert.deepEqual(planTargets(s, [4]).map((t) => t.slide), [4])
  assert.throws(() => planTargets(s, [1]), /slide 1 has no/)
  assert.throws(() => planTargets(s, [9]), /does not exist/)
})

test('a component on several slides is filmed once, on the first; two on one slide must be told apart', () => {
  const s = slides('<PyStream name="x" />', '<PyStream name="x" />\n<Demo name="y" />')
  assert.deepEqual(planTargets(s).map((t) => [t.slide, t.comps.map((c) => c.id)]), [[1, ['stream-x']], [2, ['demo-y']]])
  assert.throws(() => planTargets(slides('<LiveCode id="a">\n</LiveCode>\n<LiveCode id="a">\n</LiveCode>')), /two components called live-a/)
})

test('the timeline plays irregular frames at a steady rate, holding the last one on a still screen', () => {
  const t = new Timeline(10)
  t.add(100.00, 'a'); t.add(100.02, 'b'); t.add(100.35, 'c')   // slots 0 (a then b), 3 (c)
  assert.deepEqual(t.frames(0.6), ['b', 'b', 'b', 'c', 'c', 'c'])
  assert.equal(new Timeline().frames(1), null)
})

test('the video is the component box, scaled with the slide width', () => {
  assert.deepEqual(frameGeometry({ x: 100.4, y: 50, width: 1000.2, height: 500 }, 1280), { crop: { x: 100, y: 50, w: 1001, h: 500 }, w: 500, h: 250 })
  assert.deepEqual(frameGeometry({ x: 0, y: 0, width: 2560, height: 1440 }, 2560), { crop: { x: 0, y: 0, w: 2560, h: 1440 }, w: 2560, h: 1440 })
  const g = frameGeometry({ x: 2000, y: 0, width: 900, height: 100 }, 1280)
  assert.equal(g.crop.w, 560, 'a box that leaves the capture is cut at its edge')
})

test('ffmpeg is told to write VP8 webm and faststart H.264 mp4, even sizes, 30 fps', () => {
  const g = frameGeometry({ x: 0, y: 0, width: 1000, height: 500 }, 1280)
  const webm = encodeArgs('webm', g, 'o.webm'), mp4 = encodeArgs('mp4', g, 'o.mp4')
  assert.ok(webm.includes('libvpx') && webm.at(-1) === 'o.webm')
  assert.ok(mp4.includes('libx264') && mp4.includes('+faststart') && mp4.includes('yuv420p') && mp4.at(-1) === 'o.mp4')
  for (const a of [webm, mp4]) assert.ok(a.includes('30') && /scale=\d*[02468]:\d*[02468]:/.test(a.join(' ')))
})

test('ffmpeg is found on the PATH and in the Playwright cache, newest build first', () => {
  const files = new Set(['/usr/bin/ffmpeg', '/c/ms-playwright/ffmpeg-1011/ffmpeg-linux', '/c/ms-playwright/ffmpeg-1009/ffmpeg-linux'])
  const f = findFfmpeg({ platform: 'linux', env: { PATH: '/bin:/usr/bin', PLAYWRIGHT_BROWSERS_PATH: '/c/ms-playwright' }, exists: (p) => files.has(p), list: () => ['chromium-1', 'ffmpeg-1009', 'ffmpeg-1011'] })
  assert.deepEqual(f, { bundled: '/c/ms-playwright/ffmpeg-1011/ffmpeg-linux', system: '/usr/bin/ffmpeg' })
  const none = findFfmpeg({ platform: 'win32', env: { PATH: 'C:/x' }, exists: () => false, list: () => { throw new Error('no cache') } })
  assert.deepEqual(none, { bundled: null, system: null })
})

test('typing pauses at word ends and line ends, and "Mod" is Cmd on a Mac and Ctrl elsewhere', () => {
  const mid = typingDelay('a', () => 0.5), end = typingDelay('\n', () => 0.5)
  assert.ok(mid < 120 && end > 400)
  assert.equal(keyName('Mod+Enter'), 'ControlOrMeta+Enter')
  assert.equal(keyName('Escape'), 'Escape')
})

const rec = (recordings, extra = {}) => validateRecordings(recordings, { streams: { nbody: {} }, demos: { compute: {} }, ...extra }).join('\n')

test('recordings in the config are validated with clear messages', () => {
  const ok = { 'stream-nbody': { seconds: 10, steps: [{ wait: 800 }, { set: 'gravity', value: 2 }] }, 'live-3': { steps: [{ type: 'x = 1', replace: true }, { key: 'ControlOrMeta+Enter' }] }, 'demo-compute': { steps: [{ click: 'Run' }] } }
  assert.equal(rec(ok), '')
  assert.equal(rec(undefined), '')
  assert.match(rec([]), /must be an object/)
  assert.match(rec({ nbody: {} }), /live-<id>, stream-<name> or demo-<name>/)
  assert.match(rec({ 'stream-other': {} }), /no stream called "other"/)
  assert.match(rec({ 'demo-nope': {} }), /no demo called "nope"/)
  assert.match(rec({ 'live-1': { seconds: 99 } }), /recordings.live-1.seconds.*1 to 60/)
  assert.match(rec({ 'live-1': { secs: 5 } }), /unknown key/)
  assert.match(rec({ 'live-1': { steps: [{}] } }), /steps\[0\]: needs exactly one of.*found none/)
  assert.match(rec({ 'live-1': { steps: [{ wait: 1, key: 'A' }] } }), /found wait and key/)
  assert.match(rec({ 'live-1': { steps: [{ wait: -1 }] } }), /wait: must be a number of milliseconds/)
  assert.match(rec({ 'live-1': { steps: [{ type: '' }] } }), /type: must be a non-empty text/)
  assert.match(rec({ 'stream-nbody': { steps: [{ type: 'x' }] } }), /only a live-<id> recording has an editor/)
  assert.match(rec({ 'live-1': { steps: [{ key: 'Control +Enter' }] } }), /key: .* must look like/)
  assert.match(rec({ 'stream-nbody': { steps: [{ set: 'gravity' }] } }), /value: a number is needed/)
  assert.match(rec({ 'stream-nbody': { steps: [{ set: 'gravity', value: 1, replace: true }] } }), /replace: not used by "set"/)
  assert.match(rec({ 'demo-compute': { steps: [{ click: ' ' }] } }), /click: must be the text of a button/)
  assert.match(rec({ 'live-1': { steps: 'wait' } }), /steps: must be a list/)
})

test('validateConfig reports recording problems too', () => {
  const cfg = { ...loadConfig('/nonexistent'), recordings: { 'live-1': { seconds: 0 } } }
  assert.match(validateConfig(cfg, '/nonexistent').join('\n'), /recordings.live-1.seconds/)
})
