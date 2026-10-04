// Builds the web edition of the showcase: the slides that need `nimbledeck run` (PyStream, Demo, LiveCode) are left out.
// Usage: npm run build:web            (env WEB_BASE sets the base path, WEB_OUT the output folder; default dist/)
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitSlides } from '../../packages/cli/src/slides.mjs'

const dir = dirname(fileURLToPath(import.meta.url))
const base = process.env.WEB_BASE ?? '/nimbledeck/demos/showcase/'
const out = resolve(dir, process.env.WEB_OUT ?? 'dist')
const tmp = resolve(dir, '.web-build.md')

const NEEDS_RUN = /<(PyStream|Demo|LiveCode)\b/
const src = readFileSync(resolve(dir, 'showcase.md'), 'utf8')
// splitSlides knows fenced code (a Markdown example holding `---` is not a slide break) and reports the line of each slide's
// opening `---`; `disabled: true` goes right after it.
const lines = src.split('\n')
const hits = splitSlides(src).map((s, i) => ({ i, line: s.line, body: s.body })).filter((s) => s.i > 0 && NEEDS_RUN.test(s.body))
for (const { line } of hits.reverse()) lines.splice(line, 0, 'disabled: true')
console.log(`web edition: ${hits.length} slides that need nimbledeck run are left out`)
// A static host has no fallback to index.html for /3, so the web copy uses hash routes.
writeFileSync(tmp, lines.join('\n').replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  const r = spawnSync('npx', ['slidev', 'build', '.web-build.md', '--base', base, '--out', out], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
rmSync(resolve(out, 'nimbledeck.json'), { force: true })   // holds the runner token: never publish it
console.log(`web edition ready in ${out}`)
