import { reactive } from 'vue'
import { GLIDE_MS, TYPE_MS, parseScript, runScript, scriptEnd, targetKind } from './tourScript.mjs'

// The scripted tour: a virtual cursor that glides to real elements of the active slide and then sends them the same
// events a hand would (pointer, mouse, input, key), so the components react exactly as they do for a viewer. The
// events are synthetic (`isTrusted` is false); a tour player must stop only on trusted ones (see `isViewer`).
// Targets are looked up at run time, never by fixed coordinates, so the slide's scale and layout do not matter.
// A step whose target is missing, hidden or inert (a recording stands in for a live editor, an offline panel) is skipped
// silently and the script keeps its time.

export interface Step { at: number; action: 'click' | 'hover' | 'drag' | 'key' | 'type' | 'wait'; target?: string; from?: number; to?: number; over?: number; key?: string; text?: string; into?: string; speed?: number; seconds?: number; caption?: string }

// What the cursor component draws.
export const cursor = reactive({ shown: false, x: 0, y: 0, down: false, caption: '', ripple: 0, gliding: false })

const POINTER = 4242   // a pointer id no real device has
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let live = false, run = 0, restore: () => void = () => {}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const frame = () => new Promise<number>((r) => requestAnimationFrame(r))
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

/** True for an event a person caused. The tour's own events are never trusted, so they never stop the tour. */
export const isViewer = (e: Event) => e.isTrusted

// Synthetic pointers are not "active" for the browser, so setPointerCapture on them throws. Components that capture the
// pointer (Compare, three's OrbitControls) must still work, so while a tour runs the call is a no-op for the tour's pointer.
function patchCapture() {
  const P = Element.prototype as any
  const orig = { set: P.setPointerCapture, rel: P.releasePointerCapture, has: P.hasPointerCapture }
  P.setPointerCapture = function (id: number) { if (id === POINTER) return; return orig.set.call(this, id) }
  P.releasePointerCapture = function (id: number) { if (id === POINTER) return; return orig.rel.call(this, id) }
  P.hasPointerCapture = function (id: number) { return id === POINTER ? true : orig.has.call(this, id) }
  return () => { P.setPointerCapture = orig.set; P.releasePointerCapture = orig.rel; P.hasPointerCapture = orig.has }
}

export function begin() {
  if (live) return
  live = true
  restore = patchCapture()
  document.documentElement.classList.add('nd-touring')
}
export function end() {
  cancel()
  if (!live) return
  live = false
  restore(); restore = () => {}
  document.documentElement.classList.remove('nd-touring')
  cursor.shown = false; cursor.down = false; cursor.caption = ''
}
export function cancel() { run++ }

/** The element that holds a slide's content, by page number. */
export const pageRoot = (page: number) => document.querySelector<HTMLElement>(`[data-slidev-no="${page}"]`) ?? document.querySelector<HTMLElement>(`.slidev-page-${page}`)

const shown = (e: Element | null): e is HTMLElement => {
  if (!e) return false
  const r = e.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && !e.closest('[inert]')
}
const EDIT = '.cm-content, [contenteditable="true"], textarea, input[type="text"], input:not([type])'

/** Find a target inside a slide: a quiz letter, `text:...`, or a CSS selector. Null when it is missing, hidden or inert. */
export function resolveTarget(root: ParentNode, spec: string): HTMLElement | null {
  const { kind, value } = targetKind(spec)
  let el: Element | null = null
  try {
    if (kind === 'letter') el = [...root.querySelectorAll('.nd-choice')].find((c) => c.querySelector('strong')?.textContent?.trim() === value) ?? null
    else if (kind === 'text') {
      const t = value.toLowerCase(), has = (e: Element) => (e.textContent ?? '').toLowerCase().includes(t)
      const deepest = [...root.querySelectorAll('*')].find((e) => has(e) && ![...e.children].some(has))
      el = deepest?.closest('button, a, [role="button"], [role="radio"], summary, label, .nd-choice') ?? deepest ?? null
    } else el = root.querySelector(value)
  } catch { el = null }   // an invalid selector skips the step
  return shown(el) ? el : null
}

function fire(el: Element, type: string, x: number, y: number, buttons = 0) {
  const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, buttons, button: buttons ? 0 : -1 }
  el.dispatchEvent(new PointerEvent(type, { ...base, pointerId: POINTER, pointerType: 'mouse', isPrimary: true, width: 1, height: 1, pressure: buttons ? 0.5 : 0 }))
  const mouse = ({ pointerover: 'mouseover', pointerenter: 'mouseenter', pointermove: 'mousemove', pointerdown: 'mousedown', pointerup: 'mouseup' } as Record<string, string>)[type]
  if (mouse) el.dispatchEvent(new MouseEvent(mouse, base))
}
function hover(el: Element, x: number, y: number) { fire(el, 'pointerover', x, y); fire(el, 'pointerenter', x, y); fire(el, 'pointermove', x, y) }

async function glide(id: number, x: number, y: number, ms: number) {
  if (!cursor.shown) { cursor.x = x + 150; cursor.y = y + 170; cursor.shown = true; await frame() }
  if (reduced() || ms < 30) { cursor.x = x; cursor.y = y; return }
  const x0 = cursor.x, y0 = cursor.y, dx = x - x0, dy = y - y0, len = Math.hypot(dx, dy)
  const cx = (x0 + x) / 2 - (dy / (len || 1)) * len * 0.12, cy = (y0 + y) / 2 + (dx / (len || 1)) * len * 0.12   // a gentle arc, as a hand moves
  const t0 = performance.now()
  cursor.gliding = true
  for (;;) {
    const p = Math.min(1, (performance.now() - t0) / ms), e = ease(p), u = 1 - e
    cursor.x = u * u * x0 + 2 * u * e * cx + e * e * x
    cursor.y = u * u * y0 + 2 * u * e * cy + e * e * y
    if (p >= 1 || id !== run) break
    await frame()
  }
  cursor.gliding = false
}

function range(el: HTMLInputElement, p: number) {
  const min = Number(el.min || 0), max = Number(el.max || 100), step = Number(el.step) || 1
  const v = Math.round((min + p * (max - min)) / step) * step
  el.value = String(Math.min(max, Math.max(min, v)))
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function press(id: number, el: HTMLElement, x: number, y: number) {
  hover(el, x, y)
  cursor.down = true
  fire(el, 'pointerdown', x, y, 1)
  if (el.matches('button, input, textarea, [tabindex], [contenteditable]')) el.focus({ preventScroll: true })
  await sleep(110)
  cursor.ripple++
  fire(el, 'pointerup', x, y)
  if (id === run) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, button: 0 }))
  await sleep(120)
  cursor.down = false
}

async function drag(id: number, el: HTMLElement, s: Step) {
  const r = el.getBoundingClientRect(), y = r.top + r.height / 2
  const at = (p: number) => r.left + r.width * p
  const slider = el instanceof HTMLInputElement && el.type === 'range'
  const from = s.from ?? 0.1, to = s.to ?? 0.9, ms = (s.over ?? 1.2) * 1000
  hover(el, at(from), y)
  cursor.down = true
  fire(el, 'pointerdown', at(from), y, 1)
  if (slider) { el.focus({ preventScroll: true }); range(el, from) }
  const t0 = performance.now()
  for (;;) {
    const p = Math.min(1, (performance.now() - t0) / ms), pos = from + (to - from) * ease(p)
    cursor.x = at(pos)
    fire(el, 'pointermove', at(pos), y, 1)
    if (slider) range(el, pos)
    if (p >= 1 || id !== run) break
    await frame()
  }
  fire(el, 'pointerup', at(to), y)
  if (slider) el.dispatchEvent(new Event('change', { bubbles: true }))
  await sleep(80)
  cursor.down = false
}

function caretToEnd(el: HTMLElement) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) { const n = el.value.length; el.setSelectionRange(n, n); return }
  const sel = getSelection(), r = document.createRange()
  r.selectNodeContents(el); r.collapse(false)
  sel?.removeAllRanges(); sel?.addRange(r)
}
async function typeText(id: number, el: HTMLElement, s: Step) {
  el.focus({ preventScroll: true })
  caretToEnd(el)
  for (const ch of s.text ?? '') {
    if (id !== run) return
    if (ch === '\n') {
      for (const t of ['keydown', 'keyup']) el.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value += ch; el.dispatchEvent(new Event('input', { bubbles: true }))
    } else document.execCommand('insertText', false, ch)   // a contenteditable such as CodeMirror reads this like typing
    await sleep(s.speed ?? TYPE_MS)
  }
}
async function keyStep(s: Step) {
  const el = (document.activeElement as HTMLElement | null) ?? document.body
  const code = /^\d$/.test(s.key!) ? `Digit${s.key}` : s.key!.length === 1 ? `Key${s.key!.toUpperCase()}` : s.key!
  for (const t of ['keydown', 'keyup']) el.dispatchEvent(new KeyboardEvent(t, { key: s.key, code, bubbles: true, cancelable: true, composed: true }))
}

/** Run the script of one slide. A newer call, `cancel()` or `end()` stops the previous run. */
export async function runSlide(page: number, steps: Step[]) {
  const id = ++run
  if (!live) return
  const t0 = performance.now()
  const root = () => pageRoot(page) ?? document.body
  const found = new Map<Step, { el: HTMLElement } | null>()
  const wanted = (s: Step) => (s.action === 'type' ? s.into ?? EDIT : s.target ?? '')
  const find = async (s: Step) => {
    if (s.action === 'key' || s.action === 'wait') return null
    const deadline = t0 + s.at * 1000
    for (;;) {
      const el = resolveTarget(root(), wanted(s))
      if (el || performance.now() >= deadline || id !== run) return el
      await sleep(80)
    }
  }
  const caption = (s: Step) => { cursor.caption = s.caption ?? '' }
  await runScript(steps, {
    now: () => performance.now(), sleep,
    glide: (s) => (s.action === 'key' || s.action === 'wait' ? 0 : GLIDE_MS),
    cancelled: () => id !== run || !live,
    async move(s) {
      const el = await find(s)
      found.set(s, el ? { el } : null)
      if (!el || id !== run) return
      const r = el.getBoundingClientRect()
      const x = s.action === 'drag' ? r.left + r.width * (s.from ?? 0.1) : r.left + r.width / 2
      const y = r.top + r.height / 2
      caption(s)
      await glide(id, x, y, Math.min(GLIDE_MS, Math.max(250, t0 + s.at * 1000 - performance.now())))
    },
    async act(s) {
      if (s.action === 'wait') return sleep(s.seconds! * 1000)
      if (s.action === 'key') return keyStep(s)
      const hit = found.get(s)
      const el = hit?.el.isConnected && shown(hit.el) ? hit.el : null
      if (!el) return
      const r = el.getBoundingClientRect(), x = cursor.x || r.left + r.width / 2, y = r.top + r.height / 2
      if (s.action === 'hover') return hover(el, x, y)
      if (s.action === 'click') return press(id, el, x, y)
      if (s.action === 'drag') return drag(id, el, s)
      if (s.action === 'type') { await press(id, el, x, y); return typeText(id, el, s) }
    },
  })
  if (id !== run) return
  await sleep(500)
  if (id === run) { cursor.shown = false; cursor.caption = '' }
}

/** The parsed script of a slide from its frontmatter: steps, and when the last one is over. Invalid steps are dropped (the checker reports them). */
export function planOf(fm: Record<string, any> | undefined) {
  const { steps } = parseScript(fm?.tourScript)
  return { steps: steps as Step[], end: scriptEnd(steps) }
}

/**
 * Has the slide finished entering? True when nothing finite is still animating inside it (CSS animations and transitions),
 * every typewriter has finished, every kinetic text is playing or done, and every number has counted up. Endless
 * animations (aurora, marquee, a caret) are ignored. It says nothing about the first moments: the caller adds a minimum.
 */
export function settled(root: Element | null): boolean {
  if (!root) return true
  const busy = document.getAnimations().some((a) => {
    const t = (a.effect as KeyframeEffect | null)?.target
    if (!t || !root.contains(t) || a.playState !== 'running') return false
    const timing = a.effect!.getComputedTiming()
    return timing.iterations !== Infinity && Number.isFinite(Number(timing.endTime))
  })
  if (busy) return false
  if (root.querySelector('.nd-typewriter:not(.nd-done)')) return false
  if (root.querySelector('.nd-kinetic:not(.nd-k-play):not(.nd-k-final):not(.slidev-vclick-hidden)')) return false
  if (root.querySelector('.nd-stat:not(.nd-on)') || root.querySelector('[data-kind="countup"][data-done="false"]')) return false
  return true
}

/** Reading time after a slide has settled: 1.2 s, a little more for a slide with a lot to read, at most 2.5 s. */
export function holdFor(root: Element | null): number {
  const chars = ((root as HTMLElement | null)?.innerText ?? '').replace(/\s+/g, ' ').length
  return Math.min(2.5, 1.2 + chars / 450)
}
