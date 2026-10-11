// Builds the whole site into site/, deck first:
//   /                      the showcase deck (web edition), with the bar, the head and the no-script content of home.mjs
//   /docs/                 the Zensical documentation
//   /playground/           the layout playground
//   /demos/how-it-works/   the educational deck;  /demos/science/  the science deck, when examples/science exists
//   old documentation addresses (/layouts/ ...) redirect into /docs/, plus 404.html, robots.txt, sitemap.xml
// Usage: node website/build.mjs        (--serve: the documentation only, with live reload; env DEMO_BASE overrides the base path)
// The address of the site is read from zensical.toml by website/site.mjs, nowhere else.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dressDeck, firstSlidePreloads, homePage, slideTitles, writeNotFound, writeRedirects, writeRobotsAndSitemap } from './home.mjs'
import { webEdition } from '../packages/cli/src/webedition.mjs'
import { playgroundData } from './playground-data.mjs'
import { root, siteConfig } from './site.mjs'

const cfg = siteConfig()
const siteBase = cfg.base
const NO_SESSION = '{"demos":{},"streams":{}}\n'
const run = (cmd, args, cwd = root, env = {}) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// 1. The pages, staged from docs/ without the contributor notes (HANDOFF.md holds local paths, the other two link
//    to files outside docs/). Zensical empties site/ first, so the deck must be built after.
const hidden = ['HANDOFF.md', 'RELEASING.md', 'DECISIONS.md']
rmSync(resolve(root, 'site-src'), { recursive: true, force: true })
cpSync(resolve(root, 'docs'), resolve(root, 'site-src'), { recursive: true, filter: (p) => !hidden.some((h) => p.endsWith(h)) })

// The playground edits the real layouts: pack them with the theme CSS and its registries, and ship Vue next to it.
mkdirSync(resolve(root, 'site-src/playground'), { recursive: true })
writeFileSync(resolve(root, 'site-src/playground/data.json'), JSON.stringify(playgroundData()))
cpSync(resolve(root, 'node_modules/vue/dist/vue.esm-browser.prod.js'), resolve(root, 'site-src/playground/vue.js'))

if (process.argv.includes('--serve')) { run('uvx', ['zensical@0.0.67', 'serve']); process.exit(0) }
rmSync(resolve(root, 'site'), { recursive: true, force: true })
run('uvx', ['zensical@0.0.67', 'build', '--clean'])   // into site/docs (site_dir in zensical.toml)
// The playground is a page of its own, next to the documentation that embeds it.
renameSync(resolve(root, 'site/docs/playground'), resolve(root, 'site/playground'))

// 2. The deck. A static host has no fallback to index.html for /3, so the copy uses hash routes
//    (a temporary deck file; the example itself keeps its normal routes for `npm run example`).
const dir = resolve(root, 'examples/how-it-works')
const tmp = resolve(dir, '.docs-build.md')
const src = readFileSync(resolve(dir, 'how-it-works.md'), 'utf8')
// A static host runs no Python: slides that need `nimbledeck run` are left out of the web edition (they are shown on
// the "Run it locally" page instead), unless every live component on them has a recording in public/recordings.
// Slidev skips a slide whose frontmatter says `disabled: true`.
const { markdown, skipped, played } = webEdition(src, resolve(dir, 'public'))
console.log(`web edition: ${skipped.length} slides that need nimbledeck run are left out, ${played} play a recording`)
writeFileSync(tmp, markdown)
try {
  run('npx', ['slidev', 'build', '.docs-build.md', '--base', `${siteBase}demos/how-it-works/`,
    '--out', resolve(root, 'site/demos/how-it-works')], dir)
} finally {
  rmSync(tmp, { force: true })
}
// The session file written by `nimbledeck run` holds a runner token: never publish it.
writeFileSync(resolve(root, 'site/demos/how-it-works/nimbledeck.json'), NO_SESSION)   // never the runner token; empty, so no request ends in a 404

// 3. The science deck, if its package is there (it lands on its own branch). Its `build:web` script is called like the
//    showcase's (env WEB_BASE and WEB_OUT, hash routes); a package with no such script is skipped without a word.
const sci = resolve(root, 'examples/science')
const sciScripts = existsSync(resolve(sci, 'package.json')) ? JSON.parse(readFileSync(resolve(sci, 'package.json'), 'utf8')).scripts ?? {} : {}
const hasScience = !!sciScripts['build:web']
if (hasScience) {
  const out = resolve(sci, 'dist')
  run('npm', ['run', 'build:web'], sci, { WEB_BASE: `${siteBase}demos/science/`, WEB_OUT: out })
  cpSync(out, resolve(root, 'site/demos/science'), { recursive: true })
  writeFileSync(resolve(root, 'site/demos/science/nimbledeck.json'), NO_SESSION)
}
// The hosted decks get the site bar too (its tour, its clock): the addon's SiteBar shows when the page says it is on the site.
dressDeck(resolve(root, 'site/demos/how-it-works'), cfg, { hasScience, self: 'how-it-works' })
if (hasScience) dressDeck(resolve(root, 'site/demos/science'), cfg, { hasScience, self: 'science' })

// 4. The showcase deck is the front door: built for the site's root, then dressed by home.mjs.
const showcase = resolve(root, 'examples/showcase')
run('npm', ['run', 'build:web'], showcase, { WEB_BASE: siteBase, WEB_OUT: resolve(showcase, 'dist') })
cpSync(resolve(showcase, 'dist'), resolve(root, 'site'), { recursive: true })
rmSync(resolve(root, 'site/_redirects'), { force: true })   // a Netlify file
writeFileSync(resolve(root, 'site/nimbledeck.json'), NO_SESSION)   // the runner token is replaced by an empty session
const index = resolve(root, 'site/index.html')
writeFileSync(index, homePage(readFileSync(index, 'utf8'), { cfg, hasScience, titles: slideTitles(resolve(showcase, 'showcase.md')), preloads: firstSlidePreloads(resolve(root, 'site'), resolve(showcase, 'showcase.md'), siteBase) }))
writeNotFound(resolve(root, 'site'), cfg)
console.log(`redirects: ${writeRedirects(resolve(root, 'site'), cfg).join(' ')}`)
writeRobotsAndSitemap(resolve(root, 'site'), cfg, hasScience)

// 5. Every link and asset of every page must resolve inside the site.
run('node', ['website/check-links.mjs', '--check'])
console.log('site ready in site/')
