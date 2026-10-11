// Regenerates the social preview (1280x640, the size GitHub recommends; also used as the Open Graph card of the site):
// examples/showcase/public/social.jpg. It is composed from three real slides of the showcase deck (the twenty looks, the canvas, the 3D scene)
// over the name and the tagline, so it always shows the current deck.
// Usage: node website/make-social.mjs        (builds the showcase web edition at "/", serves it, shoots slides 7, 8 and 9, composes the card)
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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const shot = {}
for (const n of [7, 8, 9]) {   // the canvas, the 3D scene, the grid of looks: the deck's slide numbers
  await page.goto(`http://127.0.0.1:${server.address().port}/#/${n}`)
  await page.mouse.move(1599, 899)   // the pointer in a corner: no hover highlight on the slide
  await page.waitForTimeout(Number(process.env.SOCIAL_WAIT) || 9000)   // the entrance animation settles and the grid's highlight rests on a card at its edge
  shot[n] = `data:image/jpeg;base64,${(await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64')}`
}
await page.setViewportSize({ width: 1280, height: 640 })
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}
body{margin:0;width:1280px;height:640px;overflow:hidden;position:relative;background:#070b14;font-family:Inter,"SF Pro Display",system-ui,-apple-system,"Segoe UI",sans-serif;color:#f4efe6}
.g1{position:absolute;left:-200px;top:-260px;width:900px;height:900px;border-radius:50%;background:radial-gradient(closest-side,rgba(35,70,170,.55),transparent)}
.g2{position:absolute;right:-180px;bottom:-320px;width:900px;height:900px;border-radius:50%;background:radial-gradient(closest-side,rgba(24,200,235,.28),transparent)}
.g3{position:absolute;right:120px;top:-300px;width:700px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(150,110,255,.25),transparent)}
.rule{position:absolute;left:84px;top:170px;width:84px;height:5px;border-radius:3px;background:linear-gradient(90deg,#22d3ee,#a78bfa)}
h1{position:absolute;left:78px;top:190px;margin:0;font-size:100px;line-height:1;letter-spacing:-3.5px;font-weight:800}
h1 b{color:#22d3ee;font-weight:800}
.tag{position:absolute;left:84px;top:330px;font-size:38px;line-height:1.25;font-weight:600;color:#c9d3ea;letter-spacing:-.5px}
.chips{position:absolute;left:84px;top:480px;display:flex;gap:10px;flex-wrap:wrap;width:640px}
.chips span{font-size:20px;font-weight:600;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#dbe4f7}
.card{position:absolute;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.18);box-shadow:0 30px 70px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.4)}
.card img{display:block;width:100%;height:100%;object-fit:cover}
.c1{left:720px;top:46px;width:490px;height:281px;transform:rotate(4deg)}
.c2{left:690px;top:250px;width:470px;height:264px;transform:rotate(-3deg)}
.c3{left:930px;top:340px;width:340px;height:191px;transform:rotate(5deg)}
.code{position:absolute;left:730px;top:470px;width:330px;padding:16px 20px;border-radius:14px;background:#0d1424;border:1px solid rgba(255,255,255,.2);box-shadow:0 24px 60px rgba(0,0,0,.6);font:600 21px/1.4 ui-monospace,"SF Mono",Menlo,Consolas,monospace;transform:rotate(-2deg);color:#8fa0c4}
.code i{font-style:normal;color:#22d3ee}.code u{text-decoration:none;color:#f4efe6}
</style>
<div class="g1"></div><div class="g2"></div><div class="g3"></div>
<div class="card c1"><img src="${shot[9]}"></div>
<div class="card c2"><img src="${shot[7]}"></div>
<div class="card c3"><img src="${shot[8]}"></div>
<div class="code"><i>layout:</i> <u>hero</u><br><i>#</i> <u>Slides that move.</u></div>
<div class="rule"></div><h1>Nimble<b>deck</b></h1>
<div class="tag">Markdown in,<br>motion out.</div>
<div class="chips"><span>Live canvas</span><span>3D</span><span>Python</span><span>20 looks</span><span>Offline</span></div>
`)
await page.waitForTimeout(500)
const jpg = await page.screenshot({ type: 'jpeg', quality: 88 })
writeFileSync(resolve(showcase, 'public/social.jpg'), jpg)
console.log(`social.jpg: 1280x640, ${(jpg.length / 1024).toFixed(0)} kB`)
await browser.close()
server.close()
rmSync(dist, { recursive: true, force: true })
