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
// Slidev loads the first slide in a chain: index.html -> entry script -> play route -> slide 1 and its components, each
// step waiting for the one before it (four round trips before the first paint). The entry script lists those files, so
// tell the browser about them up front and it fetches them in parallel with the entry script.
function preloadFirstSlide() {
  const htmlPath = resolve(out, 'index.html')
  let html = readFileSync(htmlPath, 'utf8')
  const entry = /<script type="module"[^>]* src="([^"]*assets\/index-[^"]+\.js)"/.exec(html)
  if (!entry) return console.log('preload: entry script not found, skipped')
  const prefix = entry[1].slice(0, entry[1].indexOf('assets/'))
  const js = readFileSync(resolve(out, entry[1].slice(prefix.length)), 'utf8')
  const list = /\.f=\[((?:"[^"]+",?)+)\]/.exec(js)
  const files = list ? JSON.parse(`[${list[1]}]`) : []
  const deps = (re) => (re.exec(js)?.[1] ?? '').split(',').filter(Boolean).map((i) => files[+i]).filter(Boolean)
  // The play route (the slide viewer) and the first slide, each with the dependency list Vite computed for it.
  const wanted = new Set([...deps(/import\(`\.\/slidev\/play-[^`]+`\),__vite__mapDeps\(\[([\d,]+)\]\)/), ...deps(/import\(`\.\/md-[^`]+`\),__vite__mapDeps\(\[([\d,]+)\]\)/)])
  const links = []
  for (const f of wanted) {
    if (html.includes(`${prefix}${f}"`)) continue                   // already preloaded by index.html
    if (f.endsWith('.js')) links.push(`<link rel="modulepreload" crossorigin href="${prefix}${f}">`)
    else if (f.endsWith('.css')) links.push(`<link rel="stylesheet" crossorigin href="${prefix}${f}">`)
  }
  if (!links.length) return console.log('preload: nothing to add')
  html = html.replace('</head>', `  ${links.join('\n  ')}\n</head>`)
  writeFileSync(htmlPath, html)
  console.log(`preload: ${links.length} files of the first slide added to index.html`)
}
preloadFirstSlide()
rmSync(resolve(out, 'nimbledeck.json'), { force: true })   // holds the runner token: never publish it
console.log(`web edition ready in ${out}`)
