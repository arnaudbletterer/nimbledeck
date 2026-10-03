// `verify` takes its furniture and bleed selectors from the config: tested in a real browser page when Chrome is available.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test, { after, before } from 'node:test'
import { loadConfig } from '../src/config.mjs'
import { measure } from '../src/verify.mjs'

const CHROME = [process.env.NIMBLEDECK_CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p))
let browser, page
before(async () => {
  try {
    const { chromium } = createRequire(fileURLToPath(import.meta.url))('playwright-chromium')
    browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  } catch { browser = null }
})
after(() => browser?.close())

const html = (cls) => `<style>body{margin:0}.slidev-layout{position:relative;width:1280px;height:720px;}.edge{position:absolute;left:0;right:0;bottom:20px;height:20px;background:#ccc}</style>
<div class="slidev-layout ${cls}"><div class="edge brand-bar"></div></div>`
const issues = async (cls, cfg) => { await page.setContent(html(cls)); return (await page.evaluate(measure, { chrome: cfg.verify.chrome, bleed: cfg.verify.bleed, lead: cfg.leadLayouts })).issues }

const footer = (r) => r.some((i) => i.kind === 'enters footer zone')

test('the default selectors are the generic theme classes, so a brand class is not exempt', async (t) => {
  if (!browser) return t.skip('no browser available')
  const cfg = loadConfig('/nonexistent')
  assert.ok(cfg.verify.chrome.includes('.nd-foot') && !cfg.verify.chrome.some((s) => s.includes('ql-')))
  assert.ok(footer(await issues('default', cfg)))
})

test('configured chrome, bleed and lead layouts exempt an element from the footer zone check', async (t) => {
  if (!browser) return t.skip('no browser available')
  const base = loadConfig('/nonexistent')
  assert.equal(footer(await issues('default', { ...base, verify: { ...base.verify, chrome: ['.brand-bar'] } })), false)
  assert.equal(footer(await issues('default', { ...base, verify: { ...base.verify, bleed: ['.brand-bar'] } })), false)
  assert.equal(footer(await issues('brandcover', { ...base, leadLayouts: ['brandcover'] })), false)
  assert.equal(footer(await issues('brandcover', base)), true)
})
