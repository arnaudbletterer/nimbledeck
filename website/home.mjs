// The pieces of the deck-first site that are not built by Slidev or Zensical: the home page's head and no-script content,
// the old-address redirects, the 404 page, robots.txt and the sitemap. All of them are plain strings, so they work on any OS.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { splitSlides } from '../packages/cli/src/slides.mjs'
import { webEdition } from '../packages/cli/src/webedition.mjs'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const TITLE = 'Nimbledeck: Markdown slides that run things'
export const DESCRIPTION = 'Nimbledeck turns a Markdown file into a deck with live animation, 3D, charts, video and Python. This page is one: press the right arrow, or play the tour.'
const SUMMARY = [
  'This page is a Nimbledeck deck, built from a single Markdown file.',
  'Nimbledeck is a thin layer on top of Slidev for decks that need to run things.',
  'The slides hold motion text, a canvas, 3D, a chart, a quiz, a before and after, and video.',
  'A check command lints the Markdown and a verify command reports clipped content.',
  'Everything runs in the browser and works with no connection.',
]

// Slide titles for people who do not run scripts: the first heading of each slide, else the text of its first Kinetic.
// The slides left out of the web edition are left out here too (the same webEdition() decides).
export function slideTitles(deckFile) {
  const src = readFileSync(deckFile, 'utf8')
  const { skipped } = webEdition(src, join(dirname(deckFile), 'public'))
  return splitSlides(src)
    .filter((_, i) => !skipped.includes(i + 1))
    .map((s) => (s.body.match(/^#{1,2} (.+)$/m) ?? s.body.match(/<Kinetic[^>]*\btext="([^"]+)"/) ?? [])[1])
    .map((t, i) => t ?? `Slide ${i + 1}`)
}

// The chunks of the components on the first slide, so the browser fetches them with the main script instead of after it.
export function firstSlidePreloads(siteDir, deckFile, base) {
  const first = splitSlides(readFileSync(deckFile, 'utf8'))[0].body
  const names = new Set([...first.matchAll(/<([A-Z]\w+)/g)].map((m) => m[1]))
  const assets = join(siteDir, 'assets')
  return readdirSync(assets).filter((f) => f.endsWith('.js') && names.has(f.replace(/-[\w-]+\.js$/, '')))
    .map((f) => `<link rel="modulepreload" crossorigin href="${base}assets/${f}">`)
}

// The page script that turns the site bar on (the addon's SiteBar renders nothing without it). A hosted deck other than the front door
// calls it too, through `dressDeck`.
export const siteScript = (links) => `<script>window.__ND_SITE__=${JSON.stringify(links)};document.documentElement.classList.add('nd-site-bar')</script>`

// Gives a built deck (its folder under site/) the site bar: the same links as the front door, minus a link to the deck itself.
export function dressDeck(dir, cfg, { hasScience, self }) {
  const file = join(dir, 'index.html')
  const links = { docs: `${cfg.base}docs/`, playground: `${cfg.base}playground/`, github: cfg.github, ...(hasScience && self !== 'science' ? { science: `${cfg.base}demos/science/` } : {}) }
  writeFileSync(file, readFileSync(file, 'utf8').replace('</head>', `${siteScript(links)}</head>`))
}

// Takes the index.html that Slidev wrote and makes it the site's front door.
export function homePage(html, { cfg, titles, hasScience, preloads = [] }) {
  const url = cfg.url
  const links = { docs: `${cfg.base}docs/`, playground: `${cfg.base}playground/`, github: cfg.github, ...(hasScience ? { science: `${cfg.base}demos/science/` } : {}) }
  const head = `
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nimbledeck">
<meta property="og:title" content="${esc(TITLE)}">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${url}social.jpg">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta property="og:image:alt" content="Nimbledeck: Markdown in, motion out, with three slides of the showcase deck: twenty looks, a live canvas and a 3D scene.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(TITLE)}">
<meta name="twitter:description" content="${esc(DESCRIPTION)}">
<meta name="twitter:image" content="${url}social.jpg">
<meta name="theme-color" content="#07090f">
${preloads.join('\n')}
${siteScript(links)}
<style>.nd-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}</style>
`
  const body = `
<noscript>
<h1>Nimbledeck: Markdown slides that run things</h1>
<ul>${SUMMARY.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
<p>The deck needs JavaScript. <a href="${links.docs}">Read the documentation</a> or <a href="${cfg.github}">see the code on GitHub</a>.</p>
</noscript>
<main class="nd-sr" aria-label="Outline of the deck">
<h1>${esc(TITLE)}</h1>
<p>${esc(SUMMARY.slice(0, 2).join(' '))}</p>
<ol>${titles.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
<p><a href="${links.docs}">Documentation</a>, <a href="${links.playground}">layout playground</a>, <a href="${cfg.github}">GitHub</a></p>
</main>
`
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, '')
    .replace('</head>', `${head}</head>`)
    .replace('<body>', `<body>${body}`)
}

const page = (title, inner, extraHead = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>${extraHead}
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1f2328}a{color:#1d4ed8}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#e5e7eb}a{color:#7fb4ff}}</style>
</head><body>${inner}</body></html>
`

// The documentation used to live at the root: /layouts/ is now /docs/layouts/. One stub per documentation page.
export function writeRedirects(siteDir, cfg) {
  const docs = join(siteDir, 'docs')
  const skip = new Set(['assets', 'search', 'playground'])
  const made = []
  for (const e of readdirSync(docs, { withFileTypes: true })) {
    if (!e.isDirectory() || skip.has(e.name) || !existsSync(join(docs, e.name, 'index.html'))) continue
    const to = `${cfg.base}docs/${e.name}/`
    const dir = join(siteDir, e.name)
    if (existsSync(join(dir, 'index.html'))) continue   // never overwrite a real page
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), page('Moved', `<p>This page moved to <a href="${to}">${to}</a>.</p>`,
      `<meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${cfg.origin}${to}"><meta name="robots" content="noindex"><script>location.replace(${JSON.stringify(to)}+location.hash)</script>`))
    made.push(e.name)
  }
  return made
}

export function writeNotFound(siteDir, cfg) {
  writeFileSync(join(siteDir, '404.html'), page('Page not found',
    `<h1>Page not found</h1><p>Nothing lives at this address. Start from <a href="${cfg.base}">the deck</a> or <a href="${cfg.base}docs/">the documentation</a>.</p>`))
}

export function writeRobotsAndSitemap(siteDir, cfg, hasScience) {
  const docsDir = join(siteDir, 'docs')
  const skip = new Set(['assets', 'search', 'playground'])
  const docPages = readdirSync(docsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skip.has(e.name) && existsSync(join(docsDir, e.name, 'index.html'))).map((e) => `docs/${e.name}/`)
  const paths = ['', 'docs/', ...docPages, 'playground/', 'demos/how-it-works/', ...(hasScience ? ['demos/science/'] : [])]
  writeFileSync(join(siteDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${cfg.url}${p}</loc></url>`).join('\n')}\n</urlset>\n`)
  writeFileSync(join(siteDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${cfg.url}sitemap.xml\n`)
}
