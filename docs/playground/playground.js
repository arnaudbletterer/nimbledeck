import * as Vue from './vue.js'

const $ = (id) => document.getElementById(id)
const data = await (await fetch('data.json')).json()
document.head.append(Object.assign(document.createElement('style'), { textContent: data.css }))
const layoutStyle = document.head.appendChild(document.createElement('style'))
const tweakStyle = document.head.appendChild(document.createElement('style'))

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
const KEY = 'nimbledeck-playground-v2'
const originals = Object.fromEntries(Object.entries(data.layouts).map(([n, s]) => [n, s]))
const defaults = { slides: splitDeck(data.slides), layouts: { ...originals }, tweaks: { accent: null, title: 52, radius: 8, foot: true, page: true, motion: 'none' }, variant: 'plain' }
let S = structuredClone(defaults)
try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved?.slides?.length) S = { ...S, ...saved, tweaks: { ...S.tweaks, ...saved.tweaks }, layouts: { ...S.layouts, ...saved.layouts } } } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch {} }
let cur = 0, tab = 'slide'
const layoutNames = () => Object.keys(S.layouts)

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
  const c = { props: ['image', 'page', 'total'], render, setup: (p) => ({ currentPage: Vue.computed(() => p.page), total: Vue.computed(() => p.total) }) }
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

// Draw one slide into an element. Throws on a broken layout, so the caller decides what to show.
function draw(el, raw, index, layout) {
  const s = parseSlide(raw), name = layout ?? (s.fm.layout || 'default')
  const comp = layoutComp(name)
  if (!comp) throw new Error(`There is no layout called "${name}". Pick one in the Slide tab.`)
  const sl = slots(s.body), slotFns = Object.fromEntries(Object.entries(sl).map(([k, html]) => [k, () => Vue.h(htmlComp(html))]))
  const vnode = Vue.h(comp, { image: s.fm.image ? PHOTO : undefined, page: index + 1, total: S.slides.length }, slotFns)
  vnode.appContext = ctxApp._context
  Vue.render(vnode, el)
  return name
}
const clear = (el) => Vue.render(null, el)

// ---------- Scaled slide thumbnails (live: they are the real renderer at 1280 x 720) ----------
function mini(host, raw, index, layout, cls) {
  let m = host.querySelector(':scope > .mini')
  if (!m) { m = document.createElement('div'); m.className = `mini pg-root ${cls}`; host.append(m); new ResizeObserver(() => { m.style.transform = `scale(${host.clientWidth / 1280})` }).observe(host) }
  m.dataset.ndVariant = S.variant
  try { draw(m, raw, index, layout) } catch { clear(m) }
}

// ---------- Look and style controls ----------
const LOOKS = { plain: '#2563eb', paper: '#9a3412', night: '#38bdf8' }
const SWATCHES = [null, '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0d9488']
const MOTIONS = { none: 'None', fade: 'Fade up', slide: 'Slide in', zoom: 'Zoom' }
const MOTION_CSS = {
  none: '',
  fade: `@keyframes pg-fade { from { opacity: 0; transform: translateY(16px); } }\n.pg-root .nd-body > *, .pg-root .nd-lead-inner > * { animation: pg-fade .5s ease-out both; }`,
  slide: `@keyframes pg-slide { from { opacity: 0; transform: translateX(-40px); } }\n.pg-root .nd-body > *, .pg-root .nd-lead-inner > * { animation: pg-slide .5s ease-out both; }`,
  zoom: `@keyframes pg-zoom { from { opacity: 0; transform: scale(.92); } }\n.pg-root .nd-body > *, .pg-root .nd-lead-inner > * { animation: pg-zoom .45s ease-out both; }`,
}
const STAGGER = [2, 3, 4, 5].map((n) => `.pg-root .nd-body > :nth-child(${n}) { animation-delay: ${(n - 1) * 0.1}s; }`).join('\n')
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
  if (t.motion !== 'none') out.push(MOTION_CSS[t.motion] + '\n' + STAGGER + '\n@media (prefers-reduced-motion: reduce) { .pg-root * { animation: none !important; } }')
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
function update(o = {}) {
  const t0 = performance.now()
  cur = Math.min(cur, S.slides.length - 1)
  layoutStyle.textContent = styleOf(); tweakStyle.textContent = tweakCss()
  $('stage').dataset.ndVariant = S.variant
  try { draw($('mount'), S.slides[cur], cur); toast('') } catch (e) { toast(e.message) }
  $('ms').textContent = `${(performance.now() - t0).toFixed(1)} ms`
  $('count').textContent = `${cur + 1} / ${S.slides.length}`
  const name = curLayout()
  if (o.cards !== false) cards(name)
  if (o.thumbs !== false) thumbs()
  if (!slideEd.focused) slideEd.set(S.slides[cur])
  if (tab === 'code') codePane(o.code !== false)
  if (tab === 'style') $('css').textContent = tweakCss({ pretty: true }) || '/* No changes yet. Move a control. */'
}
function thumbs() {
  const ol = $('thumbs')
  while (ol.children.length > S.slides.length) ol.lastChild.remove()
  S.slides.forEach((raw, i) => {
    let li = ol.children[i]
    if (!li) {
      li = document.createElement('li'); li.className = 'th'
      li.innerHTML = '<div class="box"></div><span class="n"></span><span class="acts"><button data-a="dup" title="Duplicate" aria-label="Duplicate slide">&#10064;</button><button data-a="del" title="Delete" aria-label="Delete slide">&times;</button></span>'
      li.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a, i = [...ol.children].indexOf(li); if (a === 'dup') { S.slides.splice(i + 1, 0, S.slides[i]); cur = i + 1 } else if (a === 'del') { if (S.slides.length > 1) { S.slides.splice(i, 1); cur = Math.min(cur, S.slides.length - 1) } } else cur = i; save(); update() }
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
    b.onclick = () => { const s = parseSlide(S.slides[cur]); s.fm.layout = n; S.slides[cur] = serialize(s); save(); update() }
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

// ---------- Controls ----------
function setTab(t) {
  tab = t
  for (const b of $('tabs').children) b.setAttribute('aria-selected', b.dataset.tab === t)
  for (const p of ['slide', 'style', 'code']) $('p-' + p).hidden = p !== t
  update({ thumbs: false, cards: false })
}
$('tabs').onclick = (e) => { const t = e.target.closest('button')?.dataset.tab; if (t) setTab(t) }
function segment(host, items, get, set, dot) {
  host.replaceChildren(...Object.entries(items).map(([k, label]) => {
    const b = document.createElement('button'); b.setAttribute('role', 'radio'); b.dataset.k = k
    b.innerHTML = (dot ? `<i class="dot" style="background:${dot[k]}"></i>` : '') + esc(label); b.onclick = () => { set(k); mark() }; return b
  }))
  const mark = () => host.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.k === get()))
  mark()
}
segment($('looks'), { plain: 'Plain', paper: 'Paper', night: 'Night' }, () => S.variant, (k) => { S.variant = k; save(); update() }, LOOKS)
segment($('motion'), MOTIONS, () => S.tweaks.motion, (k) => { S.tweaks.motion = k; save(); update(); replay() })
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
$('title').oninput = (e) => { S.tweaks.title = +e.target.value; save(); sync(); update() }
$('radius').oninput = (e) => { S.tweaks.radius = +e.target.value; save(); sync(); update() }
$('foot').onchange = (e) => { S.tweaks.foot = e.target.checked; save(); update() }
$('pagenum').onchange = (e) => { S.tweaks.page = e.target.checked; save(); update() }
$('copycss').onclick = async () => { try { await navigator.clipboard.writeText(tweakCss({ pretty: true })); $('copycss').textContent = 'Copied' } catch { $('copycss').textContent = 'Select and copy' } setTimeout(() => ($('copycss').textContent = 'Copy'), 1500) }

function replay() { clear($('mount')); requestAnimationFrame(() => update({ thumbs: false, cards: false })) }
$('replay').onclick = replay
$('prev').onclick = () => { cur = Math.max(0, cur - 1); update() }
$('next').onclick = () => { cur = Math.min(S.slides.length - 1, cur + 1); update() }
$('addSlide').onclick = () => { S.slides.splice(cur + 1, 0, '# New slide\n\n- Write here\n- Pick a layout on the right\n'); cur++; save(); update() }
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
$('reset').onclick = () => { if (!confirm('Discard all your changes and start over?')) return; S = structuredClone(defaults); cache.clear(); save(); cur = 0; sync(); segment($('looks'), { plain: 'Plain', paper: 'Paper', night: 'Night' }, () => S.variant, (k) => { S.variant = k; save(); update() }, LOOKS); segment($('motion'), MOTIONS, () => S.tweaks.motion, (k) => { S.tweaks.motion = k; save(); update(); replay() }); setTab('slide'); update() }
document.addEventListener('keydown', (e) => { if (/^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName)) return; if (e.key === 'ArrowLeft') $('prev').click(); if (e.key === 'ArrowRight') $('next').click() })
new ResizeObserver(() => { $('stage').style.transform = `scale(${$('frame').clientWidth / 1280})` }).observe($('frame'))

sync(); setTab('slide'); update()
