// Checks the hosted web edition of the example deck the way website/build.mjs ships it: built for the real base path
// (/nimbledeck/demos/how-it-works/), served under that path, every slide opened by its hash route. Every image, video, font,
// script and style the deck asks for must answer 200: a root-relative "/clip.mp4" 404s as soon as the deck is not at the
// root of its host, and nothing in a build or a root-served test notices.
// Usage: node website/hosted-media-e2e.mjs [--no-build]
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findChrome } from '../packages/cli/src/chrome.mjs'
import { splitSlides } from '../packages/cli/src/slides.mjs'
import { NEEDS_RUN, webEdition } from '../packages/cli/src/webedition.mjs'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const dir = join(root, 'examples/how-it-works')
const base = '/nimbledeck/demos/how-it-works/'
const dist = join(dir, 'dist-hosted')
const { chromium } = createRequire(join(dir, 'noop.js'))('playwright-chromium')

const src = readFileSync(join(dir, 'how-it-works.md'), 'utf8')
const total = splitSlides(src).filter((s, i) => i === 0 || !NEEDS_RUN.test(s.body)).length
if (!process.argv.includes('--no-build')) {
  const tmp = join(dir, '.hosted-build.md')
  writeFileSync(tmp, webEdition(src).markdown)
  const slidev = createRequire(join(dir, 'noop.js')).resolve('@slidev/cli/bin/slidev.mjs')
  const b = spawnSync(process.execPath, [slidev, 'build', '.hosted-build.md', '--base', base, '--out', dist], { cwd: dir, stdio: 'ignore' })
  rmSync(tmp, { force: true })
  if (b.status !== 0) { console.log('FAIL  slidev build failed'); process.exit(1) }
}
rmSync(join(dist, 'nimbledeck.json'), { force: true })

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let f = p.startsWith(base) ? resolve(dist, p.slice(base.length)) : null
  if (f && existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
  if (!f || !(f === dist || f.startsWith(dist + sep)) || !existsSync(f)) { res.statusCode = 404; return res.end('not found') }
  res.setHeader('content-type', types[extname(f)] || 'application/octet-stream')
  res.end(readFileSync(f))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const origin = `http://127.0.0.1:${server.address().port}`

const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const bad = [], seen = new Set()
page.on('response', (r) => {
  if (!r.url().startsWith(origin)) return
  if (['image', 'media', 'font', 'script', 'stylesheet'].includes(r.request().resourceType())) seen.add(r.url())
  if (![200, 206, 304].includes(r.status())) bad.push(`${r.status()} ${r.url()}`)
})
for (let n = 1; n <= total; n++) {
  await page.goto(`${origin}${base}#/${n}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout: 15000 })
  await page.waitForTimeout(500)
}
await browser.close(); server.close()
const ok = bad.length === 0 && seen.size > 0
console.log(`${ok ? 'PASS' : 'FAIL'}  ${total} slides under ${base}: ${seen.size} media and asset files requested${bad.length ? ', failing: ' + [...new Set(bad)].join(' | ') : ', all answer 200'}`)
process.exit(ok ? 0 : 1)
