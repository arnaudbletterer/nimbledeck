// Builds the web edition of the showcase: the slides that need `nimbledeck run` (PyStream, Demo, LiveCode) are left out.
// Usage: npm run build:web            (env WEB_BASE sets the base path, WEB_OUT the output folder; default dist/)
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const base = process.env.WEB_BASE ?? '/nimbledeck/demos/showcase/'
const out = resolve(dir, process.env.WEB_OUT ?? 'dist')
const tmp = resolve(dir, '.web-build.md')

const NEEDS_RUN = /<(PyStream|Demo|LiveCode)\b/
let skipped = 0
const src = readFileSync(resolve(dir, 'showcase.md'), 'utf8')
const web = src.split(/\n---\n(?=layout:)/)
  .map((slide, i) => (i > 0 && NEEDS_RUN.test(slide) ? (skipped++, `disabled: true\n${slide}`) : slide))
  .join('\n---\n')
console.log(`web edition: ${skipped} slides that need nimbledeck run are left out`)
// A static host has no fallback to index.html for /3, so the web copy uses hash routes.
writeFileSync(tmp, web.replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  const r = spawnSync('npx', ['slidev', 'build', '.web-build.md', '--base', base, '--out', out], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
rmSync(resolve(out, 'nimbledeck.json'), { force: true })   // holds the runner token: never publish it
console.log(`web edition ready in ${out}`)
