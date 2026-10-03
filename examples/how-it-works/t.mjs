import { chromium } from 'playwright-chromium'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 160)))
const variant = process.argv[2] || 'plain'
const slides = process.argv[3] ? process.argv[3].split(',').map(Number) : [1, 2, 3, 4, 5, 9, 10, 11, 12, 14]
for (const n of slides) {
  await p.goto(`http://localhost:3030/${n}?clicks=99`); await p.waitForTimeout(n >= 9 && n <= 14 ? 5500 : 2500)
  await p.screenshot({ path: `../../out/shots/${variant}-${String(n).padStart(2, '0')}.png` })
  if (n === 10 || n === 9 || n === 11 || n === 12) {
    const k = await p.evaluate(() => [...document.querySelectorAll('[data-kind]')].map(e => `${e.dataset.kind}:${e.dataset.fps ?? e.dataset.state}`).join(' '))
    console.log(`slide ${n}:`, k)
  }
}
console.log('variant attr:', await p.evaluate(() => document.documentElement.dataset.ndVariant))
console.log('errors:', [...new Set(errs)].filter(e => !e.includes('FloatingVue')).slice(0, 6))
await b.close()
