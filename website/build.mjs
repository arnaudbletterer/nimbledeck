// Builds the documentation site into site/: the Zensical pages, then the example deck under site/demos/.
// Usage: node website/build.mjs        (env DEMO_BASE overrides the site's base path)
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// GitHub Pages serves a project at /<repository>/. Change it if the repository or host changes.
const siteBase = process.env.DEMO_BASE ?? '/nimbledeck/'
const run = (cmd, args, cwd = root) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// 1. The pages, staged from docs/ without the contributor notes (HANDOFF.md holds local paths, the other two link
//    to files outside docs/). Zensical empties site/ first, so the deck must be built after.
const hidden = ['HANDOFF.md', 'RELEASING.md', 'DECISIONS.md']
rmSync(resolve(root, 'site-src'), { recursive: true, force: true })
cpSync(resolve(root, 'docs'), resolve(root, 'site-src'), { recursive: true, filter: (p) => !hidden.some((h) => p.endsWith(h)) })

// The playground edits the real layouts: pack them with the theme CSS and its presets, and ship Vue next to it.
const read = (...p) => readFileSync(resolve(root, ...p), 'utf8')
const layoutDir = resolve(root, 'packages/theme/layouts')
const layouts = Object.fromEntries(readdirSync(layoutDir).sort().map((f) => [f.replace(/\.vue$/, ''), read('packages/theme/layouts', f)]))
layouts['my-layout'] = read('website/presets/my-layout.vue')
const tokens = read('packages/addon/styles/index.css').match(/:where\(:root\) \{[^}]*\}/)[0]
mkdirSync(resolve(root, 'site-src/playground'), { recursive: true })
writeFileSync(resolve(root, 'site-src/playground/data.json'), JSON.stringify({
  layouts, slides: read('website/presets/slides.md'), css: `${tokens}\n${read('packages/theme/styles/index.css')}`,
}))
cpSync(resolve(root, 'node_modules/vue/dist/vue.esm-browser.prod.js'), resolve(root, 'site-src/playground/vue.js'))

if (process.argv.includes('--serve')) { run('uvx', ['zensical@0.0.67', 'serve']); process.exit(0) }
run('uvx', ['zensical@0.0.67', 'build', '--clean'])

// 2. The deck. A static host has no fallback to index.html for /3, so the copy uses hash routes
//    (a temporary deck file; the example itself keeps its normal routes for `npm run example`).
const dir = resolve(root, 'examples/how-it-works')
const tmp = resolve(dir, '.docs-build.md')
const src = readFileSync(resolve(dir, 'how-it-works.md'), 'utf8')
// A static host runs no Python: slides that need `nimbledeck run` are left out of the web edition (they are shown on
// the "Run it locally" page instead). Slidev skips a slide whose frontmatter says `disabled: true`.
const NEEDS_RUN = /<(PyStream|Demo|LiveCode)\b/
let skipped = 0
const web = src.split(/\n---\n(?=layout:)/).map((slide, i) => (i > 0 && NEEDS_RUN.test(slide) ? (skipped++, `disabled: true\n${slide}`) : slide)).join('\n---\n')
console.log(`web edition: ${skipped} slides that need nimbledeck run are left out`)
writeFileSync(tmp, web.replace(/^---\n/, '---\nrouterMode: hash\n'))
try {
  run('npx', ['slidev', 'build', '.docs-build.md', '--base', `${siteBase}demos/how-it-works/`,
    '--out', resolve(root, 'site/demos/how-it-works')], dir)
} finally {
  rmSync(tmp, { force: true })
}
// The session file written by `nimbledeck run` holds a runner token: never publish it.
rmSync(resolve(root, 'site/demos/how-it-works/nimbledeck.json'), { force: true })
console.log('site ready in site/')
