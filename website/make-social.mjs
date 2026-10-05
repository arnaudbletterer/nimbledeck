// Regenerates the social preview (1200x630) from the real deck: examples/showcase/public/social.jpg.
// Usage: node website/make-social.mjs        (builds the showcase web edition at "/", serves it, shoots the first slide)
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-chromium'
import { findChrome } from '../packages/cli/src/chrome.mjs'
import { root } from './site.mjs'

const showcase = resolve(root, 'examples/showcase')
const dist = resolve(showcase, 'dist-social')
const b = spawnSync('npm', ['run', 'build:web'], { cwd: showcase, stdio: 'ignore', shell: process.platform === 'win32', env: { ...process.env, WEB_BASE: '/', WEB_OUT: dist } })
if (b.status !== 0) throw new Error('showcase build failed')

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const f = join(dist, p.endsWith('/') ? `${p}index.html` : p)
  const ok = f.startsWith(dist) && existsSync(f) && statSync(f).isFile()
  res.setHeader('content-type', types[extname(f)] || 'application/octet-stream')
  res.end(ok ? readFileSync(f) : '')
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const chrome = findChrome()
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {})
const page = await browser.newPage({ viewport: { width: 1200, height: 675 } })   // the slide is 16:9: it fills the width exactly
await page.goto(`http://127.0.0.1:${server.address().port}/#/1`)
await page.waitForTimeout(4500)   // the headline animates in, the gradient settles
// 630 of the 675 rows: the headline sits in the middle of the slide, so the crop is taken evenly from top and bottom.
const jpg = await page.screenshot({ type: 'jpeg', quality: 82, clip: { x: 0, y: 22, width: 1200, height: 630 } })
writeFileSync(resolve(showcase, 'public/social.jpg'), jpg)
console.log(`social.jpg: ${(jpg.length / 1024).toFixed(0)} kB`)
await browser.close()
server.close()
rmSync(dist, { recursive: true, force: true })
