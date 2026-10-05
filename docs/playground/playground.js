import * as Vue from './vue.js'
import { CANVAS_BG, FALLBACK_CSS, firstImpression, hasRule, layerHtml, normalize, passes, ratio, recipe, recipeText, swatchColors } from './presets.js'

const $ = (id) => document.getElementById(id)
let data
try {
  const r = await fetch('data.json')
  if (!r.ok) throw new Error(`data.json answered ${r.status}`)
  data = await r.json()
} catch (e) {
  $('boot').textContent = `The playground could not load its data (${e.message}). Reload the page to try again.`
  throw e
}
$('boot').remove()
const reg = normalize(data)
document.head.append(Object.assign(document.createElement('style'), { textContent: data.css + (reg.fallback.motions ? '\n' + FALLBACK_CSS : '') }))
const layoutStyle = document.head.appendChild(document.createElement('style'))
const tweakStyle = document.head.appendChild(document.createElement('style'))
const reduce = matchMedia('(prefers-reduced-motion: reduce)')

// ---------- Markdown for one slide (just what a slide uses, see docs/WRITING.md) ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
function block(lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    let m
    if (!l.trim()) continue
    if (l.startsWith('```')) { const code = []; while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]); out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`) }
    else if ((m = /^(#{1,6}) (.*)/.exec(l))) out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)
    else if (/^>/.test(l)) { const q = []; while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^> ?/, '')); i--; out.push(`<blockquote><p>${inline(q.join(' '))}</p></blockquote>`) }
    else if (/^(-|\d+\.) /.test(l)) {
      const tag = /^-/.test(l) ? 'ul' : 'ol', items = []
      while (i < lines.length && (/^(-|\d+\.) /.test(lines[i]) || /^\s+\S/.test(lines[i]))) {
        if (/^\s/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim(); else items.push(lines[i].replace(/^(-|\d+\.) /, ''))
        i++
      }
      i--; out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`)
    } else { const p = [l]; while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|>|-|\d+\.|```)/.test(lines[i + 1])) p.push(lines[++i]); out.push(`<p>${inline(p.join(' '))}</p>`) }
  }
  return out.join('')
}
const fmLine = (f) => { const k = f.indexOf(':'); return [f.slice(0, k).trim(), f.slice(k + 1).replace(/#.*/, '').trim()] }
// One slide as the user writes it: optional "---" frontmatter block, then the body.
function parseSlide(raw) {
  const lines = raw.replace(/\r/g, '').split('\n'), fm = {}
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (lines[i] === '---') {
    let j = i + 1
    while (j < lines.length && lines[j] !== '---' && /^[\w-]+:/.test(lines[j])) j++
    if (lines[j] === '---') { for (const f of lines.slice(i + 1, j)) { const [k, v] = fmLine(f); fm[k] = v } i = j + 1 }
  }
  return { fm, body: lines.slice(i) }
}
const serialize = ({ fm, body }) => (Object.keys(fm).length ? `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n` : '') + body.join('\n').trim() + '\n'
// The sample deck arrives as one text: cut it into slides.
function splitDeck(md) {
  const lines = md.replace(/\r/g, '').split('\n'), out = []
  let cur = []
  const fmEnd = (from) => { let j = from; while (j < lines.length && lines[j] !== '---') { if (!/^[\w-]+:/.test(lines[j])) return -1; j++ } return j < lines.length ? j : -1 }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== '---') { cur.push(lines[i]); continue }
    if (cur.some((x) => x.trim())) { out.push(cur.join('\n')); cur = [] }
    const e = fmEnd(i + 1)
    if (e > 0) { cur.push(...lines.slice(i, e + 1)); i = e }
  }
  if (cur.some((x) => x.trim())) out.push(cur.join('\n'))
  return out.map((r) => serialize(parseSlide(r)))
}
function slots(body) {
  const named = { default: [] }; let name = 'default'
  for (const l of body) { const m = /^::([\w-]+)::$/.exec(l.trim()); if (m) { named[m[1]] = []; name = m[1] } else named[name].push(l) }
  return Object.fromEntries(Object.entries(named).map(([k, v]) => [k, block(v)]))
}
const PHOTO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="640" height="600" fill="url(#g)"/><circle cx="470" cy="170" r="70" fill="#fff" opacity=".8"/><path d="M0 600V420l180-150 150 120 120-90 190 160v140z" fill="#0f172a" opacity=".55"/></svg>').replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)


// ---------- State ----------
// The deck header (`deck`: ndVariant, ndMotion, ndBackground) is kept apart from the slide texts; a slide's own
// `motion:` and `background:` live in its frontmatter, so the slide editor shows exactly what is applied.
const KEY = 'nimbledeck-playground-v3', OLD_KEY = 'nimbledeck-playground-v2'
const originals = Object.fromEntries(Object.entries(data.layouts).map(([n, s]) => [n, s]))
const withFm = (raw, extra) => { const s = parseSlide(raw); Object.assign(s.fm, extra); return serialize(s) }
function freshState() {
  const slides = splitDeck(data.slides), fi = firstImpression(reg)
  slides[0] = withFm(slides[0], Object.fromEntries([['motion', fi.motion], ['background', fi.background]].filter(([, v]) => v)))
  return {
    slides, layouts: { ...originals }, tweaks: { accent: null, title: 52, radius: 8, foot: true, page: true },
    deck: { ndVariant: fi.ndVariant, ndMotion: fi.ndMotion ?? null, ndBackground: null, ndScrim: null }, all: { motion: false, bg: false },
  }
}
const defaults = freshState()
let S = structuredClone(defaults)
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
  const old = saved ? null : JSON.parse(localStorage.getItem(OLD_KEY) || 'null')   // the first version kept the look in `variant`
  if (saved?.slides?.length) S = { ...S, ...saved, tweaks: { ...S.tweaks, ...saved.tweaks }, layouts: { ...S.layouts, ...saved.layouts }, deck: { ...S.deck, ...saved.deck }, all: { ...S.all, ...saved.all } }
  else if (old?.slides?.length) S = { ...S, slides: old.slides, layouts: { ...S.layouts, ...old.layouts }, tweaks: { ...S.tweaks, ...old.tweaks }, deck: { ndVariant: old.variant ?? S.deck.ndVariant, ndMotion: null, ndBackground: null } }
} catch {}
if (!reg.looks.some((l) => l.id === S.deck.ndVariant)) S.deck.ndVariant = reg.looks[0].id
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch {} }
let cur = 0, tab = 'slide', tour = null   // tour: { kind, id, list, i, timer } while the Tour cycles presets on the stage
const layoutNames = () => Object.keys(S.layouts)
const lookOf = (id) => reg.looks.find((l) => l.id === id) ?? reg.looks[0]
// The look on screen: the deck's, or the one the Tour is showing.
const variantNow = () => (tour?.kind === 'look' ? tour.id : S.deck.ndVariant)
// Motion and background of one slide: its own key, else the deck's; "none" (or nothing) is no attribute at all.
const real = (v) => (v && v !== 'none' ? v : null)
function decoOf(raw, index) {
  const fm = parseSlide(raw).fm
  let motion = real(fm.motion ?? S.deck.ndMotion), bg = real(fm.background ?? S.deck.ndBackground)
  if (tour && index === cur) { if (tour.kind === 'motion') motion = tour.id; if (tour.kind === 'bg') bg = tour.id }
  const scrim = String(fm.scrim ?? S.deck.ndScrim ?? 'soft').toLowerCase()
  return { motion, bg, scrim: ['none', 'soft', 'strong'].includes(scrim) ? scrim : 'soft' }
}

// ---------- Layouts: the <template> is compiled in the browser, <style> is injected, <script> is ignored ----------
const errors = []
const cache = new Map()
function layoutComp(name) {
  const src = S.layouts[name]
  if (src === undefined) return null
  if (cache.get(name)?.src === src) return cache.get(name).c
  const tpl = /<template>([\s\S]*)<\/template>/.exec(src.replace(/<style[\s\S]*?<\/style>/g, ''))
  if (!tpl) throw new Error('A layout needs a <template> block.')
  errors.length = 0
  const render = Vue.compile(tpl[1], { onError: (e) => errors.push(e.message) })
  if (errors.length) throw new Error(errors[0])
  // `url` is what photo-right's <script> computes from `image`
  const c = { props: ['image', 'page', 'total'], render, setup: (p) => ({ currentPage: Vue.computed(() => p.page), total: Vue.computed(() => p.total), url: Vue.computed(() => p.image || PHOTO) }) }
  cache.set(name, { src, c })
  return c
}
const styleOf = () => layoutNames().map((n) => [...S.layouts[n].matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')).join('\n')
const htmlComps = new Map()
function htmlComp(html) {
  if (!htmlComps.has(html)) { if (htmlComps.size > 300) htmlComps.clear(); htmlComps.set(html, { render: Vue.compile(html) }) }
  return htmlComps.get(html)
}
const ctxApp = Vue.createApp({})
const titleOf = () => parseSlide(S.slides[0] ?? '').fm.title ?? 'Playground'
ctxApp.config.globalProperties.$slidev = { configs: { get title() { return titleOf() } } }

// The motion and background contract: both are attributes of the layout root, whatever the layout. The theme CSS owns
// the keyframes; this only sets or removes the attributes.
function setDeco(el, d) {
  const root = el.firstElementChild
  if (!root) return
  const set = (a, v) => { if (!v) root.removeAttribute(a); else if (root.getAttribute(a) !== v) root.setAttribute(a, v) }
  set('data-nd-motion', d.motion); set('data-nd-bg', d.bg); set('data-nd-scrim', d.bg ? d.scrim ?? 'soft' : null)
  if (d.motion) root.style.setProperty('--nd-ch', String(Math.max(4, (root.querySelector('h1')?.textContent ?? '').trim().length || 20)))
  if (d.motion === 'typewriter') measureTitle(root)
  bgLayer(root, d.bg)
}
// A real deck lays the background into the slide as a layer (packages/addon/slide-bottom.vue); so does the playground.
// The colours it paints with are the ones the layout paints, so a background under a dark cover is dark.
function bgLayer(root, bg) {
  let layer = root.querySelector(':scope > .nd-bgx')
  if (layer && (!bg || layer.dataset.bg !== bg)) { layer.remove(); layer = null }
  if (!bg) return
  if (!layer) {
    layer = document.createElement('div'); layer.dataset.bg = bg; layer.setAttribute('aria-hidden', 'true')
    layer.className = `nd-bgx${CANVAS_BG.has(bg) ? ' pg-approx' : ''}`
    layer.innerHTML = layerHtml(bg); root.append(layer)
  }
  tone(root, layer)
}
// Needs the slide in the document: a detached element has no computed colours (the gallery calls it again once attached).
function tone(root, layer) {
  const cs = getComputedStyle(root), opaque = cs.backgroundColor && !/rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor)
  layer.style.setProperty('--nd-bg', opaque ? cs.backgroundColor : ''); layer.style.setProperty('--nd-ink', cs.color)
}
// The typewriter preset types the title one character at a time: it needs where the text starts and how wide it is.
function measureTitle(root) {
  const title = root.querySelector('h1')
  if (!title) return
  const r = document.createRange(); r.selectNodeContents(title)
  const t = r.getBoundingClientRect(), b = title.getBoundingClientRect(), k = title.offsetWidth ? b.width / title.offsetWidth : 0
  if (!k || !t.width) return
  root.style.setProperty('--nd-tw-x', `${((t.left - b.left) / k).toFixed(1)}px`); root.style.setProperty('--nd-tw-w', `${(t.width / k + 8).toFixed(1)}px`)
}
// Play the entrance again: take the attribute off, let the browser notice, put it back.
function restart(el) {
  const root = el.firstElementChild, m = root?.getAttribute('data-nd-motion')
  if (!m) return
  root.removeAttribute('data-nd-motion'); void root.offsetWidth
  if (m === 'typewriter') measureTitle(root)
  root.setAttribute('data-nd-motion', m)
}

// Draw one slide into an element. Throws on a broken layout, so the caller decides what to show.
function draw(el, raw, index, layout, deco = decoOf(raw, index)) {
  const s = parseSlide(raw), name = layout ?? (s.fm.layout || 'default')
  const comp = layoutComp(name)
  if (!comp) throw new Error(`There is no layout called "${name}". Pick one in the Slide tab.`)
  const sl = slots(s.body), slotFns = Object.fromEntries(Object.entries(sl).map(([k, html]) => [k, () => Vue.h(htmlComp(html))]))
  const vnode = Vue.h(comp, { image: s.fm.image ? PHOTO : undefined, page: index + 1, total: S.slides.length }, slotFns)
  vnode.appContext = ctxApp._context
  Vue.render(vnode, el)
  setDeco(el, deco)
  return name
}
const clear = (el) => Vue.render(null, el)

// ---------- Scaled slide thumbnails (live: they are the real renderer at 1280 x 720) ----------
function mini(host, raw, index, layout, cls) {
  let m = host.querySelector(':scope > .mini')
  if (!m) { m = document.createElement('div'); m.className = `mini pg-root ${cls}`; host.append(m); new ResizeObserver(() => { m.style.transform = `scale(${host.clientWidth / 1280})` }).observe(host) }
  m.dataset.ndVariant = S.deck.ndVariant
  try { draw(m, raw, index, layout) } catch { clear(m) }
}

// ---------- Fine tune: the per-control tweaks (plain CSS, shown under "Fine tune") ----------
const SWATCHES = [null, '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0d9488']
function tweakCss({ pretty } = {}) {
  const t = S.tweaks, vars = []
  if (t.accent) vars.push(`--nd-accent: ${t.accent};`)
  if (t.title !== 52) vars.push(`--nd-title-size: ${t.title}px;`)
  const out = []
  const sel = pretty ? ':root' : '.pg-root[data-nd-variant]'
  if (vars.length) out.push(`${sel} { ${vars.join(' ')} }`)
  if (t.accent) out.push('.slidev-layout h1 { border-bottom-color: var(--nd-accent); }\n.slidev-layout li::marker { color: var(--nd-accent); }\n.slidev-layout blockquote { border-left: 6px solid var(--nd-accent); }')
  if (t.radius !== 8) out.push(`.slidev-layout blockquote { border-radius: ${t.radius}px; }`)
  if (!t.foot) out.push('.nd-foot { display: none; }')
  if (!t.page) out.push('.nd-page { display: none; }')
  let css = out.join('\n')
  if (!pretty) css = css.replace(/(^|\n)(\.slidev-layout|\.nd-foot|\.nd-page)/g, '$1.pg-root $2')
  return css
}


// ---------- A small editor: a transparent textarea over a highlighted copy ----------
const TOK = {
  code: /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/)|("[^"\n]*"|'[^'\n]*')|(\{\{[\s\S]*?\}\})|(<\/?[A-Za-z][\w-]*|\/?>)|(--[\w-]+|@[\w-]+|:?[a-z-]+(?==))|(-?\d+(\.\d+)?(px|em|s|%)?)/g,
  cls: ['', 'cm', 'st', 'ky', 'tg', 'at', 'nu'],
}
function hl(t, re, cls) {
  let out = '', last = 0
  for (const m of t.matchAll(re)) {
    const i = m.slice(1).findIndex((x) => x !== undefined)
    out += esc(t.slice(last, m.index)) + `<span class="${cls[i + 1]}">${esc(m[0])}</span>`; last = m.index + m[0].length
  }
  return out + esc(t.slice(last))
}
function hlSlide(t) {
  const lines = t.split('\n'); let fm = false, seen = false
  return lines.map((l) => {
    if (l === '---') { fm = !seen ? true : false; seen = true; return `<span class="cm">${l}</span>` }
    if (fm) { const k = l.indexOf(':'); return k > 0 ? `<span class="ky">${esc(l.slice(0, k))}</span>:${esc(l.slice(k + 1))}` : esc(l) }
    if (/^#{1,6} /.test(l)) return `<span class="hd">${esc(l)}</span>`
    if (/^::[\w-]+::$/.test(l.trim())) return `<span class="tg">${esc(l)}</span>`
    return esc(l).replace(/^(- |\d+\. |&gt; )/, '<span class="at">$1</span>').replace(/(\*\*[^*]+\*\*|`[^`]+`)/g, '<span class="st">$1</span>')
  }).join('\n')
}
function editor(host, lang, onInput) {
  host.innerHTML = '<pre aria-hidden="true"><code></code></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>'
  const pre = host.querySelector('pre'), code = pre.firstChild, ta = host.querySelector('textarea')
  const paint = () => { code.innerHTML = (lang === 'md' ? hlSlide(ta.value) : hl(ta.value, TOK.code, TOK.cls)) + '\n' }
  ta.addEventListener('input', () => { paint(); onInput(ta.value) })
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft })
  ta.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')) } if (e.key === 'Escape') ta.blur() })
  return { set(v) { if (ta.value !== v) { ta.value = v; paint() } }, get focused() { return document.activeElement === ta } }
}
const slideEd = editor($('ed-slide'), 'md', (v) => { S.slides[cur] = v; save(); update({ cards: true }) })
const codeEd = editor($('ed-code'), 'code', (v) => { S.layouts[curLayout()] = v; save(); update({ code: false }) })
const curLayout = () => parseSlide(S.slides[cur]).fm.layout || 'default'


// ---------- Rendering ----------
const toast = (msg) => { const t = $('toast'); t.hidden = !msg; t.textContent = msg || '' }
let lastLayoutCss = '', lastTweakCss = ''
function update(o = {}) {
  const t0 = performance.now()
  cur = Math.min(cur, S.slides.length - 1)
  const lcss = styleOf(), tcss = tweakCss()
  if (lcss !== lastLayoutCss) layoutStyle.textContent = lastLayoutCss = lcss
  if (tcss !== lastTweakCss) tweakStyle.textContent = lastTweakCss = tcss
  const v = variantNow()
  $('stage').dataset.ndVariant = v; $('frame').dataset.dark = lookOf(v).dark
  try { draw($('mount'), S.slides[cur], cur); toast('') } catch (e) { toast(e.message) }
  if (o.restart) restart($('mount'))
  $('ms').textContent = `${(performance.now() - t0).toFixed(1)} ms`
  $('count').textContent = `${cur + 1} / ${S.slides.length}`
  const look = lookOf(S.deck.ndVariant), sw = swatchColors(look.swatch)
  $('looktxt').textContent = `Look: ${look.label}`; $('lookdot').style.background = (sw.length > 2 ? sw[2] : sw[1] ?? sw[0]) ?? 'var(--acc)'   // [page, ink, accent, ...] or [page, accent]
  const name = curLayout()
  if (o.cards !== false && tab === 'slide') cards(name)
  if (o.thumbs !== false) thumbs()
  if (!slideEd.focused) slideEd.set(S.slides[cur])
  if (tab === 'code') codePane(o.code !== false)
  if (tab === 'style') {
    recipeUi()
    $('css').textContent = tweakCss({ pretty: true }) || '/* No changes yet. Move a control. */'
    if (o.gallery !== false) { clearTimeout(gtimer); gtimer = setTimeout(buildGallery, o.now ? 0 : 120) }
  }
}
function thumbs() {
  const ol = $('thumbs')
  while (ol.children.length > S.slides.length) ol.lastChild.remove()
  S.slides.forEach((raw, i) => {
    let li = ol.children[i]
    if (!li) {
      li = document.createElement('li'); li.className = 'th'
      li.innerHTML = '<div class="box"></div><span class="n"></span><span class="acts"><button data-a="dup" title="Duplicate" aria-label="Duplicate slide">&#10064;</button><button data-a="del" title="Delete" aria-label="Delete slide">&times;</button></span>'
      li.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a, i = [...ol.children].indexOf(li); if (a === 'dup') { S.slides.splice(i + 1, 0, S.slides[i]); cur = i + 1 } else if (a === 'del') { if (S.slides.length > 1) { S.slides.splice(i, 1); cur = Math.min(cur, S.slides.length - 1) } } else cur = i; save(); update({ restart: true }) }
      ol.append(li)
    }
    li.setAttribute('aria-current', i === cur); li.querySelector('.n').textContent = i + 1
    mini(li.querySelector('.box'), raw, i, undefined, 'pg-thumb')
  })
}
function cards(active) {
  const host = $('cards'); host.replaceChildren()
  const raw = S.slides[cur]
  for (const n of layoutNames()) {
    const b = document.createElement('button'); b.className = 'card'; b.setAttribute('aria-pressed', n === active)
    b.innerHTML = `<div class="box"></div><span class="l">${esc(n)}${S.layouts[n] !== originals[n] ? ' •' : ''}</span>`
    b.onclick = () => { const s = parseSlide(S.slides[cur]); s.fm.layout = n; S.slides[cur] = serialize(s); save(); update({ restart: true }) }
    host.append(b); mini(b.firstChild, raw, cur, n, 'pg-card')
  }
  const add = Object.assign(document.createElement('button'), { className: 'card new', textContent: '+ New layout' })
  add.onclick = () => { $('newform').hidden = !$('newform').hidden; $('newname').focus() }
  host.append(add)
  $('newbase').innerHTML = layoutNames().map((n) => `<option ${n === active ? 'selected' : ''}>${n}</option>`).join('')
}
function codePane(setText) {
  const n = curLayout(), has = S.layouts[n] !== undefined
  $('fname').textContent = `${n}.vue`
  $('revert').hidden = !(n in originals) || S.layouts[n] === originals[n]
  $('dup').hidden = !has
  $('codehint').textContent = has ? 'A layout is a few lines of Vue: a template with slots. Edit it and the slide updates as you type.' : `No layout called "${n}" yet. Go to the Slide tab and create it.`
  if (setText && has && !document.activeElement.closest?.('#ed-code')) codeEd.set(S.layouts[n])
}

// ---------- The recipe: the lines to paste in the deck ----------
let lastRecipe = ''
function recipeUi() {
  const r = recipe(S.deck, parseSlide(S.slides[cur]).fm)
  lastRecipe = recipeText(r)
  const paint = (lines) => lines.map((l) => {
    const k = l.indexOf(':')
    return l.startsWith('#') ? `<span class="cm">${esc(l)}</span>` : `<span class="ky">${esc(l.slice(0, k))}</span>: <span class="st">${esc(l.slice(k + 2))}</span>`
  }).join('\n')
  $('r-deck').innerHTML = paint(['# deck header', ...r.deckLines])
  $('r-slide').innerHTML = paint(['# this slide', ...(r.slideLines.length ? r.slideLines : [])]) + (r.slideLines.length ? '' : '\n<span class="cm">(inherits the deck)</span>')
}
const copier = (btn, text, idle) => async () => {
  try { await navigator.clipboard.writeText(text()); btn.textContent = 'Copied' } catch { btn.textContent = 'Select and copy' }
  setTimeout(() => (btn.textContent = idle), 1500)
}
$('copyrecipe').onclick = copier($('copyrecipe'), () => lastRecipe, 'Copy')
$('copycss').onclick = copier($('copycss'), () => tweakCss({ pretty: true }), 'Copy')

// ---------- Applying a choice: the text is the truth, so every choice writes frontmatter ----------
const SLIDE_KEY = { motion: 'motion', bg: 'background' }, DECK_KEY = { motion: 'ndMotion', bg: 'ndBackground' }
function setChoice(kind, id) {
  if (kind === 'look') { S.deck.ndVariant = id; return }
  const s = parseSlide(S.slides[cur])
  if (S.all[kind]) { S.deck[DECK_KEY[kind]] = id === 'none' ? null : id; delete s.fm[SLIDE_KEY[kind]] }
  else if (id === 'none' && !S.deck[DECK_KEY[kind]]) delete s.fm[SLIDE_KEY[kind]]
  else s.fm[SLIDE_KEY[kind]] = id
  S.slides[cur] = serialize(s)
}
function apply(kind, id) {
  setChoice(kind, id); save()
  update({ restart: kind === 'motion', now: true })
  if (tab === 'style') markPressed()
  if (kind === 'bg') say(`Background: ${labelOf('bg', id)}`)
}
const itemsOf = (k) => (k === 'look' ? reg.looks : k === 'motion' ? reg.motions : reg.backgrounds)
const labelOf = (k, id) => itemsOf(k).find((i) => i.id === id)?.label ?? id
function pressedOf(kind) {
  if (kind === 'look') return S.deck.ndVariant
  const fm = parseSlide(S.slides[cur]).fm
  return real(kind === 'motion' ? fm.motion ?? S.deck.ndMotion : fm.background ?? S.deck.ndBackground) ?? 'none'
}

// A short message on the stage (Tour, Surprise me). Buttons show only while the Tour runs.
let sayTimer = 0
function say(text, ms = 3200) {
  const b = $('tourbar'); $('tourtxt').textContent = text; b.hidden = false; b.dataset.tour = !!tour
  clearTimeout(sayTimer); if (!tour) sayTimer = setTimeout(() => { b.hidden = true }, ms)
}

// ---------- Galleries: Look, Motion, Background ----------
let gkind = 'motion', gq = '', gkey = '', gtimer = 0, live = null, liveTimer = 0
const NOUN = { look: 'looks', motion: 'motions', bg: 'backgrounds' }
const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls ?? '', ...(text !== undefined && { textContent: text }) })
function slideHtml(raw, index, layout) {
  const t = document.createElement('div')
  try { draw(t, raw, index, layout, { motion: null, bg: null }); return t.innerHTML } catch { return '' } finally { clear(t) }
}
// Why a card has no working preview here, or null.
function missing(kind, it) {
  if (it.none || (kind === 'motion' && reg.fallback.motions)) return null
  const attr = kind === 'look' ? 'variant' : kind
  return hasRule(data.css, attr, it.id) ? null : 'No CSS for it in this build'
}
function buildGallery() {
  if (tab !== 'style') return
  const host = $('gallery'), kind = gkind, items = itemsOf(kind), raw = S.slides[cur], name = curLayout()
  const fm = parseSlide(raw).fm
  // What the previews show: the slide without its own motion and background keys (those are what the cards vary).
  const bare = parseSlide(raw); delete bare.fm.motion; delete bare.fm.background
  const key = [kind, cur, serialize(bare), S.layouts[name], S.deck.ndVariant, kind === 'motion' ? real(fm.background ?? S.deck.ndBackground) : ''].join('\u0001')
  if (key === gkey && host.childElementCount) return markPressed()
  gkey = key; stopLive()
  const html = slideHtml(raw, cur, name), bg = real(fm.background ?? S.deck.ndBackground)
  const frag = document.createDocumentFragment()
  const groups = kind === 'look' ? [['Light', items.filter((l) => !l.dark)], ['Dark', items.filter((l) => l.dark)]] : [[null, items]]
  for (const [title, list] of groups) {
    if (!list.length) continue
    const sec = el('section', 'ggroup'), grid = el('div', 'ggrid')
    if (title) { const h = el('h3', '', `${title} (${list.length})`); h.id = `gg-${title}`; sec.setAttribute('aria-labelledby', h.id); sec.append(h) }
    for (const it of list) grid.append(card(kind, it, html, bg))
    sec.append(grid); frag.append(sec)
  }
  const had = G.contains(document.activeElement) ? document.activeElement.dataset.id : null   // keep the keyboard where it was
  host.replaceChildren(frag)
  setScale(); filter(); markPressed()
  for (const m of host.querySelectorAll('.pg-g')) { const r = m.firstElementChild, l = r?.querySelector(':scope > .nd-bgx'); if (l) tone(r, l) }
  if (had) host.querySelector(`.gcard[data-id="${CSS.escape(had)}"]`)?.focus({ preventScroll: true })
}
function card(kind, it, html, bg) {
  const b = el('button', `gcard${kind === 'look' ? (it.dark ? ' lk dark' : ' lk light') : ''}`), why = missing(kind, it)
  b.type = 'button'; b.dataset.id = it.id; b.tabIndex = -1; b.setAttribute('aria-pressed', 'false')
  b.dataset.text = `${it.id} ${it.label} ${it.description ?? ''}`.toLowerCase()
  const box = el('span', 'gbox'), m = el('span', 'mini pg-root pg-g')
  m.dataset.ndVariant = kind === 'look' ? it.id : S.deck.ndVariant
  m.innerHTML = html
  setDeco(m, { motion: null, bg: kind === 'bg' ? real(it.id) : kind === 'motion' ? bg : null })
  box.append(m)
  if (kind === 'motion' && !it.none && !why) box.append(Object.assign(el('span', 'play', '▶'), { ariaHidden: 'true' }))
  const name = el('span', 'gname')
  if (kind === 'look') { const sw = swatchColors(it.swatch); for (const c of sw.slice(0, 3)) { const d = el('i', 'swd'); d.style.background = c; name.append(d) } }
  name.append(it.label)
  b.append(box, name, el('span', 'gdesc', it.description ?? ''))
  if (kind === 'bg' && CANVAS_BG.has(it.id)) b.append(el('span', 'gtag', 'CSS stand-in: a canvas in a real deck'))
  if (why) { b.append(el('span', 'gtag', why)); b.dataset.missing = why }
  else if (kind === 'look' && !passes(lookGuard(it.id))) b.append(el('span', 'gtag', 'Low contrast text'))
  return b
}
function setScale() {
  const host = $('gallery'), w = host.querySelector('.gbox')?.clientWidth
  if (w) host.style.setProperty('--s', w / 1280)
}
new ResizeObserver(setScale).observe($('gallery'))
const visibleCards = () => [...$('gallery').querySelectorAll('.gcard:not([hidden])')]
function filter() {
  const host = $('gallery'), q = gq.trim().toLowerCase()
  let n = 0, total = 0
  for (const c of host.querySelectorAll('.gcard')) { total++; c.hidden = !!q && !c.dataset.text.includes(q); n += !c.hidden }
  for (const g of host.querySelectorAll('.ggroup')) g.hidden = ![...g.querySelectorAll('.gcard')].some((c) => !c.hidden)
  const shown = total - (gkind === 'look' ? 0 : 1)   // the "None" card is not a preset
  $('gcount').textContent = !total || (gkind !== 'look' && total === 1) ? `No ${NOUN[gkind]} in this build yet.` : q ? (n ? `${n} of ${total} ${NOUN[gkind]} match.` : `No ${NOUN[gkind].slice(0, -1)} matches “${gq.trim()}”. Clear the search to see all ${shown}.`) : `${shown} ${NOUN[gkind]}.`
  markPressed()
}
function markPressed() {
  const id = pressedOf(gkind), cards = visibleCards()
  let rove = null
  for (const c of $('gallery').querySelectorAll('.gcard')) {
    const on = c.dataset.id === id
    c.setAttribute('aria-pressed', on); c.tabIndex = -1
    if (on && !c.hidden) rove = c
  }
  ;(rove ?? cards[0])?.setAttribute('tabindex', '0')
  info(null)
}
// The line under the gallery: the card in focus or under the pointer, else the chosen one.
function info(card) {
  const it = itemsOf(gkind).find((i) => i.id === (card?.dataset.id ?? pressedOf(gkind)))
  const inherited = !card && gkind !== 'look' && it && !it.none && parseSlide(S.slides[cur]).fm[SLIDE_KEY[gkind]] === undefined ? ' (from the deck header)' : ''
  $('ginfo').textContent = it ? `${it.label}${inherited}: ${it.description ?? ''}${it.use ? ` Use it for: ${it.use}` : ''}` : ''
}
function hint() {
  const k = gkind
  $('allwrap').hidden = k === 'look'; $('all').checked = !!S.all[k]
  $('scrimwrap').hidden = k !== 'bg' || !reg.scrims.length; scrimUi()
  const motionNote = reduce.matches ? ' Your system asks for reduced motion: previews show the final state and nothing plays.' : ''
  $('allhint').textContent = k === 'look' ? 'A look applies to the whole deck. It writes ndVariant in the deck header.'
    : (S.all[k] ? `Writes ${DECK_KEY[k]} in the deck header. A slide with its own ${SLIDE_KEY[k]} keeps it.` : `Writes ${SLIDE_KEY[k]} on this slide only.`)
      + (k === 'bg' ? ' Aurora and Shader draw on a canvas in a real deck; here they show a CSS stand-in, marked on their cards.' : '') + (k === 'look' ? '' : motionNote)
  $('tour').disabled = k !== 'look' && reduce.matches
}
function setKind(k) {
  tourStop(false); stopLive()
  gkind = k; gq = ''; gkey = ''
  $('gq').value = ''; $('gq').placeholder = `Search ${NOUN[k]}`; $('gq').setAttribute('aria-label', `Search ${NOUN[k]}`)
  for (const b of $('gtabs').children) b.setAttribute('aria-selected', b.dataset.k === k)
  G.setAttribute('aria-labelledby', `gt-${k}`)
  $('tour').textContent = 'Tour'; hint()
  buildGallery()
}
$('gtabs').onclick = (e) => { const k = e.target.closest('button')?.dataset.k; if (k) setKind(k) }
// Tabs: only the selected one is a tab stop, the arrow keys move between them (the pattern of a WAI-ARIA tablist).
function tablist(host) {
  host.addEventListener('keydown', (e) => {
    const tabs = [...host.children], i = tabs.indexOf(document.activeElement), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (i < 0 || !d) return
    e.preventDefault(); const next = tabs[(i + d + tabs.length) % tabs.length]; next.focus(); next.click()
  })
  new MutationObserver(() => [...host.children].forEach((b) => { b.tabIndex = b.getAttribute('aria-selected') === 'true' ? 0 : -1 })).observe(host, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] })
}
tablist($('gtabs')); tablist($('tabs'))
for (const host of [$('gtabs'), $('tabs')]) [...host.children].forEach((b) => { b.tabIndex = b.getAttribute('aria-selected') === 'true' ? 0 : -1 })
$('gq').oninput = (e) => { gq = e.target.value; filter() }
// Scrim: the page colour laid over a background so the text stays readable. Soft is the default and is not written.
function scrimUi() {
  const sel = $('scrim'); if (sel.options.length !== reg.scrims.length) sel.replaceChildren(...reg.scrims.map((v) => new Option(v, v)))
  sel.value = String(parseSlide(S.slides[cur]).fm.scrim ?? S.deck.ndScrim ?? 'soft')
}
$('scrim').onchange = (e) => {
  const v = e.target.value, s = parseSlide(S.slides[cur])
  if (S.all.bg) { S.deck.ndScrim = v === 'soft' ? null : v; delete s.fm.scrim } else if (v === 'soft' && !S.deck.ndScrim) delete s.fm.scrim; else s.fm.scrim = v
  S.slides[cur] = serialize(s); save(); update({ now: true })
}
$('all').onchange = (e) => { S.all[gkind] = e.target.checked; save(); hint() }

// Live preview: only the card under the pointer or focus plays, the others stay still.
function stopLive() {
  clearInterval(liveTimer)
  if (live) { live.classList.remove('is-live'); if (gkind === 'motion') live.querySelector('.mini')?.firstElementChild?.removeAttribute('data-nd-motion') }
  live = null
}
function startLive(card) {
  if (card === live) return
  stopLive(); info(card)
  if (reduce.matches || tour || card.dataset.missing || card.dataset.id === 'none') return
  live = card; card.classList.add('is-live')
  if (gkind === 'motion') {
    const play = () => { const r = card.querySelector('.mini').firstElementChild; r.removeAttribute('data-nd-motion'); void r.offsetWidth; r.setAttribute('data-nd-motion', card.dataset.id) }
    play(); liveTimer = setInterval(play, 2600)
  }
}
const G = $('gallery')
G.addEventListener('pointerover', (e) => { const c = e.target.closest('.gcard'); if (c) startLive(c) })
G.addEventListener('pointerleave', () => { stopLive(); info(null) })
G.addEventListener('focusin', (e) => { const c = e.target.closest('.gcard'); if (c) startLive(c) })
G.addEventListener('focusout', (e) => { if (!G.contains(e.relatedTarget)) { stopLive(); info(null) } })
G.addEventListener('click', (e) => { const c = e.target.closest('.gcard'); if (c) apply(gkind, c.dataset.id) })
G.addEventListener('keydown', (e) => {
  const cs = visibleCards(), i = cs.indexOf(document.activeElement)
  if (i < 0) return
  const cols = cs.filter((c) => c.offsetTop === cs[0].offsetTop).length || 1
  const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: cs.length - 1 }[e.key]
  if (to === undefined) return
  e.preventDefault()
  const next = cs[Math.max(0, Math.min(cs.length - 1, to))]
  for (const c of cs) c.tabIndex = -1
  next.tabIndex = 0; next.focus()
})

// ---------- Surprise me: a random look, motion and background, with a contrast guard on the look ----------
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
function rgbOf(css) {
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1)
  const d = probe.getImageData(0, 0, 1, 1).data
  return d[3] ? [d[0], d[1], d[2]] : null
}
const guards = new Map()
function lookGuard(id) {
  if (!guards.has(id)) {
    const p = el('div', 'pg-root probe'); p.dataset.ndVariant = id
    p.innerHTML = ['bg', 'ink', 'muted', 'accent'].map((t) => `<i style="background-color:var(--nd-${t})"></i>`).join('')
    document.body.append(p)
    const [bg, ink, muted, accent] = [...p.children].map((i) => rgbOf(getComputedStyle(i).backgroundColor)); p.remove()
    guards.set(id, bg && ink && muted && accent ? { ink: ratio(ink, bg), muted: ratio(muted, bg), accent: ratio(accent, bg) } : { ink: 0, muted: 0, accent: 0 })
  }
  return guards.get(id)
}
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)]
function surprise() {
  tourStop(false)
  const ok = reg.looks.filter((l) => passes(lookGuard(l.id)))
  if (!ok.length) return say('No look passes the contrast guard.')
  const look = pick(ok.filter((l) => l.id !== S.deck.ndVariant).length ? ok.filter((l) => l.id !== S.deck.ndVariant) : ok)
  const motion = pick(reg.motions.filter((m) => !m.none)), bg = pick(reg.backgrounds.filter((b) => !b.none))
  setChoice('look', look.id)
  if (motion) setChoice('motion', motion.id)
  if (bg) setChoice('bg', bg.id)
  save(); update({ restart: true, now: true })
  say(`Surprise: ${[look.label, motion?.label, bg?.label].filter(Boolean).join(' + ')}. Text contrast ${lookGuard(look.id).ink.toFixed(1)}:1.`)
}
$('surprise').onclick = surprise

// ---------- Tour: step through the presets of the open gallery on the current slide ----------
function tourStart() {
  const list = itemsOf(gkind).filter((i) => !i.none)
  if (!list.length || (gkind !== 'look' && reduce.matches)) return
  stopLive()
  tour = { kind: gkind, list, i: -1, id: null }
  $('tour').textContent = 'Stop tour'
  tourStep(); tour.timer = setInterval(tourStep, 2400)
}
function tourStep() {
  tour.i = (tour.i + 1) % tour.list.length
  const it = tour.list[tour.i]; tour.id = it.id
  say(`Tour: ${it.label} (${tour.i + 1} of ${tour.list.length})`)
  update({ thumbs: false, cards: false, gallery: false, restart: tour.kind === 'motion' })
  const c = $('gallery').querySelector(`.gcard[data-id="${CSS.escape(it.id)}"]`)
  $('gallery').querySelectorAll('.touring').forEach((x) => x.classList.remove('touring')); c?.classList.add('touring'); c?.scrollIntoView({ block: 'nearest' })
}
function tourStop(keep) {
  if (!tour) return
  clearInterval(tour.timer)
  const t = tour; tour = null
  $('tourbar').hidden = true; $('tour').textContent = 'Tour'
  $('gallery').querySelectorAll('.touring').forEach((x) => x.classList.remove('touring'))
  if (keep) apply(t.kind, t.id); else update({ thumbs: false, cards: false, gallery: false, restart: t.kind === 'motion' })
}
$('tour').onclick = () => (tour ? tourStop(false) : tourStart())
$('tourstop').onclick = () => tourStop(false)
$('tourkeep').onclick = () => tourStop(true)
document.addEventListener('visibilitychange', () => { if (document.hidden) tourStop(false) })

// ---------- Controls ----------
function setTab(t, o = {}) {
  if (t !== 'style') tourStop(false)
  tab = t
  for (const b of $('tabs').children) b.setAttribute('aria-selected', b.dataset.tab === t)
  for (const p of ['slide', 'style', 'code']) $('p-' + p).hidden = p !== t
  gkey = ''
  update({ thumbs: false, now: true, ...o })
}
$('tabs').onclick = (e) => { const t = e.target.closest('button')?.dataset.tab; if (t) setTab(t) }
$('lookbtn').onclick = () => { setTab('style'); setKind('look'); $('gallery').querySelector('.gcard[tabindex="0"]')?.focus() }
$('swatches').replaceChildren(...SWATCHES.map((c) => {
  const b = document.createElement('button'); b.className = 'sw' + (c ? '' : ' auto'); if (c) b.style.background = c
  b.title = c ?? 'Use the look’s own colour'; b.setAttribute('aria-label', c ?? 'Look default colour')
  b.onclick = () => { S.tweaks.accent = c; save(); sync(); update() }; b.dataset.c = c ?? ''; return b
}))
const picker = Object.assign(document.createElement('input'), { type: 'color', value: '#2563eb', title: 'Any colour', ariaLabel: 'Pick any colour' })
picker.oninput = () => { S.tweaks.accent = picker.value; save(); sync(); update() }
$('swatches').append(picker)
function sync() {
  const t = S.tweaks
  $('title').value = t.title; $('o-title').textContent = `${t.title}px`
  $('radius').value = t.radius; $('o-radius').textContent = `${t.radius}px`
  $('foot').checked = t.foot; $('pagenum').checked = t.page
  for (const b of $('swatches').querySelectorAll('.sw')) b.setAttribute('aria-pressed', b.dataset.c === (t.accent ?? ''))
}
$('title').oninput = (e) => { S.tweaks.title = +e.target.value; save(); sync(); update({ gallery: false }) }
$('radius').oninput = (e) => { S.tweaks.radius = +e.target.value; save(); sync(); update({ gallery: false }) }
$('foot').onchange = (e) => { S.tweaks.foot = e.target.checked; save(); update({ gallery: false }) }
$('pagenum').onchange = (e) => { S.tweaks.page = e.target.checked; save(); update({ gallery: false }) }

const go = (i) => { cur = Math.max(0, Math.min(S.slides.length - 1, i)); update({ restart: true }) }
$('replay').onclick = () => restart($('mount'))
$('prev').onclick = () => go(cur - 1)
$('next').onclick = () => go(cur + 1)
$('addSlide').onclick = () => { S.slides.splice(cur + 1, 0, '# New slide\n\n- Write here\n- Pick a layout on the right\n'); cur++; save(); update({ restart: true }) }
$('revert').onclick = () => { S.layouts[curLayout()] = originals[curLayout()]; codeEd.set(S.layouts[curLayout()]); save(); update() }
$('dup').onclick = () => { setTab('slide'); $('newform').hidden = false; $('newname').value = `${curLayout()}-copy`; $('newbase').value = curLayout(); $('newname').select() }
$('newform').onsubmit = (e) => {
  e.preventDefault()
  const name = $('newname').value.trim(), base = $('newbase').value
  if (S.layouts[name] !== undefined) { $('newname').setCustomValidity('That name is taken'); $('newname').reportValidity(); return }
  S.layouts[name] = S.layouts[base].replace(new RegExp(`(slidev-layout )${base}\\b`), `$1${name}`).replace(new RegExp(`\\.${base}\\b`, 'g'), `.${name}`)
  const s = parseSlide(S.slides[cur]); s.fm.layout = name; S.slides[cur] = serialize(s)
  $('newform').hidden = true; $('newname').setCustomValidity(''); save(); update(); setTab('code'); codeEd.set(S.layouts[name])
}
$('newname').oninput = () => $('newname').setCustomValidity('')
$('reset').onclick = () => { if (!confirm('Discard all your changes and start over?')) return; tourStop(false); S = structuredClone(defaults); cache.clear(); save(); cur = 0; sync(); setKind(gkind); setTab('style', { thumbs: undefined }) }
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && tour) return tourStop(false)
  if (/^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName) || e.target.closest?.('#gallery')) return
  if (e.key === 'ArrowLeft') $('prev').click()
  if (e.key === 'ArrowRight') $('next').click()
})
new ResizeObserver(() => { $('stage').style.transform = `scale(${$('frame').clientWidth / 1280})` }).observe($('frame'))

sync(); hint(); setKind('motion'); setTab('style', { thumbs: undefined })
