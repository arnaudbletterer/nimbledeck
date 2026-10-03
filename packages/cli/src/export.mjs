import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { findChrome } from './chrome.mjs'

// Arguments for `slidev export`: one PDF page per build step, written next to the deck, using the Chrome that was found.
export function exportArgs(deckName, output, chrome, extra = []) {
  return ['export', deckName, '--with-clicks', '--output', output, '--executable-path', chrome, ...extra]
}

// Where the PDF goes: <deck>.pdf next to the deck file.
export const pdfPath = (deckPath) => join(dirname(deckPath), basename(deckPath).replace(/\.md$/i, '') + '.pdf')

// Export a deck to PDF with Slidev, using the Chrome found on this machine. Returns the process exit code.
export function exportDeck(deckPath, root = dirname(deckPath), extra = []) {
  const chrome = findChrome()
  if (!chrome) {
    console.error('Chrome not found. Install Google Chrome, or set NIMBLEDECK_CHROME to the path of chrome.exe / Google Chrome / chromium.')
    return 1
  }
  let slidev
  try { slidev = createRequire(join(root, 'noop.js')).resolve('@slidev/cli/bin/slidev.mjs') } catch {
    console.error('@slidev/cli not found. Run npm install in the deck folder first.')
    return 1
  }
  const out = pdfPath(deckPath)
  const r = spawnSync(process.execPath, [slidev, ...exportArgs(basename(deckPath), out, chrome, extra)], { cwd: root, stdio: 'inherit' })
  if (r.status !== 0) return r.status ?? 1
  if (!existsSync(out)) { console.error(`export finished but ${out} was not written`); return 1 }
  console.log(`PDF written: ${out}`)
  return 0
}
