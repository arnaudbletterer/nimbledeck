import * as Vue from './vue.js'

const $ = (id) => document.getElementById(id)
const data = await (await fetch('data.json')).json()
document.head.append(Object.assign(document.createElement('style'), { textContent: data.css }))
const layoutStyle = document.head.appendChild(document.createElement('style'))

// Files: the slides, then one tab per layout. Edits are kept in this browser only.
const KEY = 'nimbledeck-playground-v1'
const originals = { 'slides.md': data.slides, ...Object.fromEntries(Object.entries(data.layouts).map(([n, s]) => [`${n}.vue`, s])) }
let files = { ...originals }
try { Object.assign(files, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(files)) } catch {} }
const state = Vue.reactive({ page: 1, total: 1, nonce: 0 })
let current = 'slides.md', slide = 0, variant = 'plain'

// --- A small Markdown reader: just what a slide uses (see docs/WRITING.md) ---
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
function parseSlides(md) {
  const lines = md.replace(/\r/g, '').split('\n'), slides = []
  let cur = { fm: {}, body: [] }
  const isFm = (from) => { let j = from; while (j < lines.length && lines[j] !== '---') { if (!/^[\w-]+:/.test(lines[j])) return -1; j++ } return j < lines.length ? j : -1 }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== '---') { cur.body.push(lines[i]); continue }
    if (!cur.body.some((x) => x.trim()) && !Object.keys(cur.fm).length) { const end = isFm(i + 1); if (end > 0) { for (const f of lines.slice(i + 1, end)) { const k = f.indexOf(':'); cur.fm[f.slice(0, k)] = f.slice(k + 1).replace(/#.*/, '').trim() } i = end; continue } }
    slides.push(cur); cur = { fm: {}, body: [] }
    const end = isFm(i + 1); if (end > 0) { for (const f of lines.slice(i + 1, end)) { const k = f.indexOf(':'); cur.fm[f.slice(0, k)] = f.slice(k + 1).replace(/#.*/, '').trim() } i = end }
  }
  slides.push(cur)
  return slides.filter((s) => s.body.some((x) => x.trim()) || Object.keys(s.fm).length)
}
function slots(body) {
  const named = { default: [] }; let name = 'default'
  for (const l of body) { const m = /^::([\w-]+)::$/.exec(l.trim()); if (m) { named[m[1]] = []; name = m[1] } else named[name].push(l) }
  return Object.fromEntries(Object.entries(named).map(([k, v]) => [k, block(v)]))
}
const PHOTO = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="640" height="600" fill="url(#g)"/><circle cx="470" cy="170" r="70" fill="#fff" opacity=".8"/><path d="M0 600V420l180-150 150 120 120-90 190 160v140z" fill="#0f172a" opacity=".55"/></svg>').replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)

// --- Layout files: <template> is compiled in the browser, <style> is injected, <script> is ignored ---
const errors = []
function compile(src) {
  const tpl = /<template>([\s\S]*)<\/template>/.exec(src.replace(/<style[\s\S]*?<\/style>/g, ''))
  if (!tpl) throw new Error('A layout needs a <template> block.')
  const render = Vue.compile(tpl[1], { onError: (e) => errors.push(e.message) })
  return {
    props: ['image'], render,
    setup: () => ({ currentPage: Vue.computed(() => state.page), total: Vue.computed(() => state.total) }),
  }
}
const styleOf = (src) => [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
const comps = new Map(), cache = new Map()
function layoutComp(name) {
  const src = files[`${name}.vue`]
  if (src === undefined) return null
  if (cache.get(name)?.src !== src) { errors.length = 0; const c = compile(src); if (errors.length) throw new Error(errors[0]); cache.set(name, { src, c }) }
  return cache.get(name).c
}
function htmlComp(html) {
  const hit = comps.get(html)
  if (hit) return hit
  const c = { render: Vue.compile(html) }
  if (comps.size > 200) comps.clear()
  comps.set(html, c); return c
}

// --- The preview app: one root component that renders the current slide through its layout ---
const view = Vue.shallowRef(null)
const app = Vue.createApp({ render: () => (view.value ? Vue.h(Vue.Fragment, { key: state.nonce }, [view.value()]) : null) })
app.config.globalProperties.$slidev = { configs: { get title() { return titleOf() } } }
let deckTitle = 'Playground'
const titleOf = () => deckTitle
app.mount($('mount'))

function setMsg(text, err) { const m = $('msg'); m.textContent = text; m.className = err ? 'err' : '' }
function render() {
  const t0 = performance.now()
  try {
    const slides = parseSlides(files['slides.md'])
    if (!slides.length) throw new Error('No slide yet.')
    deckTitle = slides[0].fm.title ?? 'Playground'
    slide = Math.min(slide, slides.length - 1)
    state.total = slides.length; state.page = slide + 1
    const s = slides[slide], name = s.fm.layout || 'default'
    const comp = layoutComp(name)
    if (!comp) throw new Error(`Unknown layout "${name}". Tabs: ${Object.keys(files).filter((f) => f.endsWith('.vue')).map((f) => f.slice(0, -4)).join(', ')}`)
    layoutStyle.textContent = Object.keys(files).filter((f) => f.endsWith('.vue')).map((f) => styleOf(files[f])).join('\n')
    const sl = slots(s.body), props = s.fm.image ? { image: PHOTO } : {}
    const slotFns = Object.fromEntries(Object.entries(sl).map(([k, html]) => [k, () => Vue.h(htmlComp(html))]))
    view.value = () => Vue.h(comp, props, slotFns)
    $('stage').dataset.ndVariant = variant
    $('count').textContent = `Slide ${state.page} of ${state.total} (layout: ${name})`
    setMsg(current.endsWith('.vue') ? 'Template compiled. <script> blocks are ignored here; $slidev.configs.title, currentPage and total are provided.' : 'Slides rendered.')
    $('ms').textContent = `${(performance.now() - t0).toFixed(1)} ms`
  } catch (e) { setMsg(e.message, true) }
}
let queued = false
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render() }) } }

// --- UI ---
function tabs() {
  const t = $('tabs'); t.replaceChildren()
  for (const f of Object.keys(files)) {
    const b = Object.assign(document.createElement('button'), { textContent: f, role: 'tab' })
    b.setAttribute('aria-selected', f === current); b.onclick = () => { current = f; if (f.endsWith('.vue')) slide = Math.max(0, parseSlides(files['slides.md']).findIndex((x) => (x.fm.layout || 'default') === f.slice(0, -4))); tabs(); $('src').value = files[f]; render() }
    t.append(b)
  }
  const add = Object.assign(document.createElement('button'), { textContent: '+ Duplicate as new layout', className: 'add', title: 'Copy the open layout under a new name' })
  add.onclick = () => {
    const base = current.endsWith('.vue') ? current.slice(0, -4) : 'default'
    const name = (prompt('Name of the new layout (letters, digits, dashes)', `${base}-copy`) || '').trim()
    if (!/^[a-z][\w-]*$/i.test(name) || files[`${name}.vue`] !== undefined) return setMsg('Pick a new name made of letters, digits and dashes.', true)
    files[`${name}.vue`] = files[`${base}.vue`].replace(new RegExp(`(slidev-layout )${base}\\b`), `$1${name}`)
    current = `${name}.vue`; save(); tabs(); $('src').value = files[current]; render()
  }
  t.append(add)
}
$('src').addEventListener('input', (e) => { files[current] = e.target.value; save(); schedule() })
$('src').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return
  e.preventDefault(); const t = e.target, s = t.selectionStart
  t.setRangeText('  ', s, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input'))
})
$('variant').onchange = (e) => { variant = e.target.value; render() }
$('prev').onclick = () => { slide = Math.max(0, slide - 1); render() }
$('next').onclick = () => { slide += 1; render() }
$('replay').onclick = () => { state.nonce++ }
$('reset').onclick = () => { if (confirm('Discard all your edits?')) { files = { ...originals }; save(); current = 'slides.md'; tabs(); $('src').value = files[current]; render() } }
document.addEventListener('keydown', (e) => { if (e.target.id === 'src') return; if (e.key === 'ArrowLeft') $('prev').click(); if (e.key === 'ArrowRight') $('next').click() })
new ResizeObserver(() => { $('stage').style.transform = `scale(${$('frame').clientWidth / 1280})` }).observe($('frame'))

// Open on the tab named in the address: playground/#default.vue
const want = decodeURIComponent(location.hash.slice(1))
if (files[want] !== undefined) current = want
tabs(); $('src').value = files[current]; render()
