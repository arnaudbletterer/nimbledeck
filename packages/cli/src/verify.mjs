import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { loadConfig } from './config.mjs'
import { splitSlides } from './slides.mjs'

const CHROME = [process.env.NIMBLEDECK_CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))

// Runs inside the page: measures the current slide against the 1280 x 720 frame.
// Content clipped by an overflow:hidden ancestor is fine; content that reaches outside the slide, enters the footer zone,
// or is silently cut off (ellipsis, clipped box) is reported.
function measure({ layoutClass }) {
  // The visible slide is the one layout with a real size (neighbouring slides are mounted but hidden at 0 x 0).
  const root = [...document.querySelectorAll('.slidev-layout')].find((e) => e.getBoundingClientRect().width > 0)
  if (!root) return { error: 'no visible slide found, nothing was verified' }
  const frame = root.getBoundingClientRect()
  const issues = []
  // Full-bleed photo columns and media are meant to reach the slide edge.
  const bleed = (el) => el.closest('.ql-photo, .nd-photo, .nd-media')
  const chrome = (el) => el.closest('.nd-foot, .nd-page, .ql-foot, .ql-foot-light, .ql-page, footer')
  const lead = /(^|\s)(cover|divider|closing|closing-photo|full)(\s|$)/.test(root.className)
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`
  const visibleRect = (el) => {
    let r = el.getBoundingClientRect()
    for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (o.overflow !== 'visible' || o.overflowX !== 'visible' || o.overflowY !== 'visible') {
        const ar = a.getBoundingClientRect()
        r = { left: Math.max(r.left, ar.left), top: Math.max(r.top, ar.top), right: Math.min(r.right, ar.right), bottom: Math.min(r.bottom, ar.bottom) }
      }
    }
    return r
  }
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || (el.className && typeof el.className === 'string' && /vclick-hidden/.test(el.className))) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) issues.push({ kind: 'text cut off', el: label(el), detail: (el.textContent || '').trim().slice(0, 60) })
    if ((cs.overflow === 'hidden') && el.scrollHeight > el.clientHeight + 2 && !el.classList.contains('nd-full') && !el.classList.contains('nd-lead') && !el.classList.contains('nd-media') && !el.classList.contains('slidev-layout'))
      issues.push({ kind: 'content clipped', el: label(el), detail: `${el.scrollHeight}px of content in ${el.clientHeight}px` })
    // Crispness: the backing store must hold the pixels the screen will show (2x device pixel ratio in `verify`).
    const dpr = window.devicePixelRatio || 1
    const soft = (what, have, need) => issues.push({ kind: 'soft (pixelated on high-resolution screens)', el: label(el), detail: `${what} ${have}px for ${need}px needed` })
    if (el.tagName === 'CANVAS' && el.width > 0) { const drawn = Math.min(r.width, (r.height * el.width) / el.height); if (el.width < drawn * dpr * 0.9) soft('canvas', el.width, Math.round(drawn * dpr)) }
    if (el.tagName === 'IMG' && el.naturalWidth > 0 && el.naturalWidth < r.width * dpr * 0.9) soft('image', el.naturalWidth, Math.round(r.width * dpr))
    if (el.tagName === 'VIDEO' && el.videoWidth > 0 && el.videoWidth < r.width * 0.9) soft('video', el.videoWidth, Math.round(r.width))   // video: 1x is the floor, 2x is advisory
    if (chrome(el)) continue
    const v = visibleRect(el)
    const out = (a, b) => Math.round(a - b)
    if (v.right > frame.right + 2) issues.push({ kind: 'overflows right', el: label(el), detail: `${out(v.right, frame.right)}px beyond the slide` })
    if (v.bottom > frame.bottom + 2) issues.push({ kind: 'overflows bottom', el: label(el), detail: `${out(v.bottom, frame.bottom)}px beyond the slide` })
    if (!lead && !bleed(el) && v.bottom > frame.bottom - 56 && v.bottom <= frame.bottom + 2 && (el.children.length === 0 || ['CANVAS', 'IMG', 'VIDEO', 'IFRAME'].includes(el.tagName)))
      issues.push({ kind: 'enters footer zone', el: label(el), detail: `bottom at ${Math.round(frame.bottom - v.bottom)}px from the slide edge` })
  }
  return { frame: [Math.round(frame.width), Math.round(frame.height)], issues }
}

export async function verifyDeck(deckPath, root, url) {
  const cfg = loadConfig(root)
  const base = url || `http://localhost:${cfg.port}`
  let chromium
  try { ({ chromium } = createRequire(join(root, 'noop.js'))('playwright-chromium')) } catch { console.error('nimbledeck verify needs playwright-chromium installed next to the deck'); return 2 }
  const slides = splitSlides(readFileSync(deckPath, 'utf8'))
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
  let total = 0
  for (let n = 1; n <= slides.length; n++) {
    process.stderr.write(`slide ${n}/${slides.length}\r`)
    try {
      // 'domcontentloaded': embedded sites and videos must not be able to stall the check.
      await page.goto(`${base}/${n}?clicks=99`, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForFunction(() => [...document.querySelectorAll('.slidev-layout')].some((e) => e.getBoundingClientRect().width > 0), null, { timeout: 15000 })
    } catch (e) { console.log(`ERROR slide ${n}: did not load (${String(e.message).split('\n')[0]})`); total++; continue }
    await page.waitForTimeout(/<(Demo|PyStream|Scene3D|Site)\b/.test(slides[n - 1].body) ? 4500 : 1200)
    const r = await page.evaluate(measure, {})
    if (r.error) { console.log(`ERROR slide ${n}: ${r.error}`); total++; continue }
    if (r.frame[0] !== 1280 || r.frame[1] !== 720) { console.log(`ERROR slide ${n}: frame is ${r.frame.join('x')}, expected 1280x720, so nothing can be trusted`); total++; continue }
    const seen = new Set()
    for (const i of r.issues) { const k = `${i.kind}|${i.el}`; if (seen.has(k)) continue; seen.add(k); console.log(`ERROR slide ${n} (line ${slides[n - 1].line}): ${i.kind}: ${i.el} (${i.detail})`); total++ }
  }
  await browser.close()
  console.log(`${slides.length} slides verified, ${total} placement problems`)
  return total ? 1 : 0
}
