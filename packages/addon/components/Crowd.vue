<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { cssVar } from '../composables/useConfig'
import { links, termColor } from '../composables/links.mjs'
import { assign, counts, FN, FP, oneIn, ppv, shuffled, TN, TP } from '../composables/risk.mjs'

// A crowd that is tested for something rare: one dot per person, coloured by the truth (sick or healthy) and by the test result.
// Three sliders (prevalence, sensitivity, specificity) change the crowd at once, and the people who test positive are gathered on
// their own, so "how likely is a positive to be right?" is a count of dots, not a formula. The numbers are expected counts
// (natural frequencies), not a random draw: 10 000 people at 1 in 1,000 are 10 sick, always.
//   <At :x="70" :y="130" :w="1140" :h="560"><Crowd :w="1140" :h="560" /></At>
// Give it a box of exactly its own w and h (logical slide units). `controls` shows the sliders (without them the three numbers are
// still shown and follow another <Crowd>: the crowd publishes the parameters riskprev, risksens, riskspec (in percent), riskpos,
// risktp, riskfp (people) and riskppv (percent), which \val{riskppv}{9} of an <Equation> shows). A wide box (w >= 900) puts the
// crowd on the left and the positives on the right; a narrower one stacks them.
// The groups answer to the terms of an <Equation>, `terms` says which: the true positives (default term 3), the false alarms (4),
// the missed cases (2), all positives (1) and the healthy negatives (5). Pointing at a term, or at a dot, lights its group and
// dims the rest. Colours are the chart tokens of the look: term n is --nd-chart-n, like the \term{n}{...} of the equation.
interface Group { tp: string; fp: string; fn: string; pos: string; tn: string }
const props = withDefaults(defineProps<{ w?: number; h?: number; n?: number; controls?: boolean; prev?: number; sens?: number; spec?: number; terms?: Partial<Group>; seed?: number }>(),
  { w: 1140, h: 560, n: 10000, controls: true, prev: 0.1, sens: 99, spec: 99, seed: 11 })
const T = computed<Group>(() => ({ tp: '3', fp: '4', fn: '2', pos: '1', tn: '5', ...props.terms }))
const PREV = [0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 30, 40, 50]   // percent: a log-like scale you can land on
const nearest = (v: number) => PREV.reduce((b, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(PREV[b] / v)) ? i : b), 0)

const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: props.w, h: props.h })
const prevI = ref(nearest(props.prev)), sens = ref(props.sens), spec = ref(props.spec)
const prevPct = computed(() => PREV[prevI.value])

const N = props.n, cols = Math.round(Math.sqrt(N))
const rankSick = new Uint32Array(N), byScore = shuffled(N, props.seed + 1)
shuffled(N, props.seed).forEach((person, rank) => { rankSick[person] = rank })
const status = new Uint8Array(N), born = new Float64Array(N)
let started = false

const c = computed(() => counts(N, prevPct.value / 100, sens.value / 100, spec.value / 100))
const exact = computed(() => ppv(prevPct.value / 100, sens.value / 100, spec.value / 100) * 100)
const fmt = (v: number) => Math.round(v).toLocaleString('en-US')
const pct = (v: number) => (v >= 10 || v === 0 ? String(Math.round(v)) : v >= 1 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/0$/, ''))
const pctIn = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

// ---- geometry, in the logical units of the box ----
const wide = computed(() => props.w >= 900)
const geo = computed(() => {
  const w = props.w, h = props.h, ctl = props.controls ? 112 : 92
  if (wide.value) {
    const s = h - ctl - 40, x = s + 64
    return { s, crowd: { x: 0, y: 0 }, pile: { x, y: 36, w: w - x, h: Math.round(s * 0.36) }, read: { x, y: 36 + Math.round(s * 0.36) + 30, w: w - x }, ctl: { y: h - ctl + 8, h: ctl } }
  }
  const s = Math.min(Math.round(w * 0.5), 280), px = s + 28
  return { s, crowd: { x: 0, y: 0 }, pile: { x: 0, y: s + 52, w, h: h - ctl - s - 52 - 108 }, read: { x: px, y: 0, w: w - px }, ctl: { y: h - ctl + 8, h: ctl } }
})
const place = (r: { x: number; y: number; w?: number }) => ({ left: r.x + 'px', top: r.y + 'px', ...(r.w ? { width: r.w + 'px' } : {}) })

// ---- the term, or the dot, that is pointed at ----
const term = ref<string | null>(links.term())
const off = links.onTerm((t: string | null) => { term.value = t })
const groupOf = (id: string | null) => (id === null ? null : (Object.entries(T.value).find(([, v]) => v === id)?.[0] ?? null))
const group = computed(() => groupOf(term.value))
const NOTE: Record<string, string> = { tp: 'sick, test positive', fp: 'healthy, test positive: a false alarm', fn: 'sick, test negative: missed', pos: 'everyone who tests positive', tn: 'healthy, test negative' }
const lit = computed<number[]>(() => ({ tp: [TP], fp: [FP], fn: [FN], pos: [TP, FP], tn: [TN] } as Record<string, number[]>)[group.value ?? ''] ?? [])
const ownTerm = ref(false)   // a term set by the pointer over this component, so only this component clears it

// ---- drawing ----
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const level = [1, 1, 1, 1]   // how bright each status is drawn: 1 normal, below 1 receding; follows its target smoothly
let raf = 0
function colours() {
  return { ink: cssVar('--nd-ink'), muted: cssVar('--nd-muted'), tp: cssVar('--nd-chart-3'), fp: cssVar('--nd-chart-4'), fn: cssVar('--nd-chart-2'), ring: cssVar('--nd-chart-1'), line: cssVar('--nd-line'), font: cssVar('--nd-font-body', 'sans-serif') }
}
function draw(now: number): boolean {
  const cvs = cv.value
  if (!cvs) return false
  const g = cvs.getContext('2d')!, pw = Math.round(props.w * k.value), ph = Math.round(props.h * k.value)
  if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph }
  g.setTransform(k.value, 0, 0, k.value, 0, 0)
  g.clearRect(0, 0, props.w, props.h)
  const col = colours(), L = geo.value, cc = c.value
  const colorOf = [col.muted, col.fp, col.fn, col.tp]
  // brightness targets: with a term lit, its groups stay at 1 and the others recede
  let moving = false
  for (let s = 0; s < 4; s++) {
    const want = lit.value.length === 0 || lit.value.includes(s) ? 1 : 0.16
    const next = reduced ? want : level[s] + (want - level[s]) * 0.22
    if (Math.abs(next - want) > 0.004) moving = true
    level[s] = Math.abs(next - want) <= 0.004 ? want : next
  }
  const pulse = lit.value.length && !reduced ? 0.5 + 0.5 * Math.sin(now / 260) : 0
  // the crowd
  const pitch = L.s / cols, ox = L.crowd.x, oy = L.crowd.y
  const rBase = pitch * 0.3, rBig = pitch * 0.52
  g.globalAlpha = level[TN] * 0.34; g.fillStyle = colorOf[TN]; g.beginPath()
  for (let i = 0; i < N; i++) if (status[i] === TN) { const x = ox + (i % cols + 0.5) * pitch, y = oy + (Math.floor(i / cols) + 0.5) * pitch; g.moveTo(x + rBase, y); g.arc(x, y, rBase, 0, 6.2832) }
  g.fill()
  for (const s of [FN, FP, TP]) {
    const on = lit.value.includes(s), a = level[s], grow = 1 + (on ? 0.5 + 0.35 * pulse : 0)
    for (let pass = 0; pass < 2; pass++) {
      g.fillStyle = colorOf[s]; g.beginPath()
      for (let i = 0; i < N; i++) {
        if (status[i] !== s) continue
        const x = ox + (i % cols + 0.5) * pitch, y = oy + (Math.floor(i / cols) + 0.5) * pitch
        const age = (now - born[i]) / 520, flash = age >= 0 && age < 1 ? (1 - age) * (1 - age) * 2.4 : 0
        if (flash > 0) moving = true
        const r = pass === 0 ? pitch * (1.6 + flash * 1.4 + (on ? 0.8 + pulse : 0)) : rBig * grow * (1 + flash)
        g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832)
      }
      g.globalAlpha = a * (pass === 0 ? 0.2 : 1); g.fill()
    }
  }
  g.globalAlpha = 1
  // the people who tested positive, gathered: sick first, then the false alarms
  const P = L.pile, pos = cc.pos
  if (pos > 0) {
    let p = Math.min(34, Math.sqrt(P.w * P.h / pos)), cl = 1, rw = 1
    for (; p > 3; p -= 0.5) { cl = Math.max(1, Math.floor(P.w / p)); rw = Math.ceil(pos / cl); if (rw * p <= P.h) break }
    const r = p * 0.4
    const ring = group.value === 'pos'
    if (ring) {
      const wcl = Math.min(cl, pos) * p, hrw = rw * p
      g.globalAlpha = 0.9; g.strokeStyle = col.ring; g.lineWidth = 2; g.beginPath(); g.roundRect(P.x - 12, P.y - 12, wcl + 24, hrw + 24, 18); g.stroke()
    }
    for (const s of [TP, FP]) {
      g.fillStyle = colorOf[s]; g.globalAlpha = level[s]
      g.beginPath()
      const from = s === TP ? 0 : cc.tp, to = s === TP ? cc.tp : pos
      for (let j = from; j < to; j++) { const x = P.x + (j % cl + 0.5) * p, y = P.y + (Math.floor(j / cl) + 0.5) * p; g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832) }
      g.fill()
    }
    g.globalAlpha = 1
  }
  return moving || lit.value.length > 0
}
function frame(now: number) { raf = 0; if (draw(now) && active.value) raf = requestAnimationFrame(frame) }
const kick = () => { if (active.value && !raf) raf = requestAnimationFrame(frame) }

function refresh(flash = true) {
  const next = assign(new Uint8Array(N), rankSick, byScore, c.value) as Uint8Array
  const now = performance.now()
  for (let i = 0; i < N; i++) {
    if (flash && started && next[i] !== status[i] && (next[i] === TP || next[i] === FP || next[i] === FN) && !reduced) born[i] = now
    status[i] = next[i]
  }
  started = true
  kick()
}

// ---- parameters shared with <Equation> and with other crowds ----
const names = { riskprev: prevPct, risksens: sens, riskspec: spec }
function publish() {
  links.setParam('riskprev', prevPct.value); links.setParam('risksens', sens.value); links.setParam('riskspec', spec.value)
  links.setParam('riskpos', c.value.pos); links.setParam('risktp', c.value.tp); links.setParam('riskfp', c.value.fp); links.setParam('riskppv', exact.value)
}
let offParam = () => {}
function adopt(name: string, value: number) {
  if (name === 'riskprev' && value !== prevPct.value) prevI.value = nearest(value)
  else if (name === 'risksens' && value !== sens.value) sens.value = value
  else if (name === 'riskspec' && value !== spec.value) spec.value = value
}
watch([prevI, sens, spec], () => { refresh(); if (active.value) publish() })
watch([group, term, () => props.w, () => props.h, k], kick)

// ---- pointing at a dot ----
function pointer(e: PointerEvent) {
  const cvs = cv.value
  if (!cvs || !active.value) return
  const r = cvs.getBoundingClientRect(), sc = r.width / props.w
  const x = (e.clientX - r.left) / sc - geo.value.crowd.x, y = (e.clientY - r.top) / sc - geo.value.crowd.y
  if (x < 0 || y < 0 || x >= geo.value.s || y >= geo.value.s) { leave(); return }
  const i = Math.floor(y / (geo.value.s / cols)) * cols + Math.floor(x / (geo.value.s / cols))
  const id = ({ [TP]: T.value.tp, [FP]: T.value.fp, [FN]: T.value.fn, [TN]: T.value.tn } as Record<number, string>)[status[i]]
  ownTerm.value = true; links.setTerm(id)
}
function leave() { if (ownTerm.value) { ownTerm.value = false; links.setTerm(null) } }
function hoverGroup(id: string | null) { ownTerm.value = id !== null; links.setTerm(id) }

const active = useActive()
watch(active, (a) => {
  cancelAnimationFrame(raf); raf = 0; offParam()
  if (!a) { leave(); return }
  for (const [name, r] of Object.entries(names)) { const v = links.param(name); if (v !== undefined && v !== r.value) adopt(name, v) }
  offParam = links.onParam(adopt)
  refresh(false); publish(); kick()
}, { immediate: true })
onUnmounted(() => { cancelAnimationFrame(raf); offParam(); off() })

const sentence = computed(() => `Of ${fmt(c.value.n)} people, ${fmt(c.value.sick)} are sick. ${fmt(c.value.pos)} test positive, and ${fmt(c.value.tp)} of those are sick: ${pct(exact.value)} percent.`)
const note = computed(() => (group.value ? NOTE[group.value] : ''))
const KEY = computed(() => [
  { id: 'tp', cls: 'tp', n: c.value.tp, text: 'sick, test positive' },
  { id: 'fp', cls: 'fp', n: c.value.fp, text: 'healthy, false alarm' },
  { id: 'fn', cls: 'fn', n: c.value.fn, text: 'sick, missed' },
  { id: 'tn', cls: 'tn', n: c.value.tn, text: 'healthy, test negative' },
])
</script>

<template>
  <div ref="root" class="nd-crowd" :class="{ 'nd-crowd-wide': wide }" :style="{ width: w + 'px', height: h + 'px' }" data-kind="crowd" :data-ppv="exact.toFixed(1)" role="group" :aria-label="sentence">
    <canvas ref="cv" aria-hidden="true" @pointermove="pointer" @pointerleave="leave" />
    <span v-if="note" class="nd-linkchip nd-crowd-chip" :style="{ '--nd-tc': termColor(term!), left: geo.s / 2 + 'px', top: geo.s + 6 + 'px' }">{{ note }}</span>
    <div class="nd-crowd-cap" :style="place({ x: geo.crowd.x, y: geo.crowd.y + geo.s + 10, w: geo.s })">{{ fmt(c.n) }} people, one dot each</div>
    <div v-if="wide" class="nd-crowd-cap nd-crowd-cap-top" :style="place({ x: geo.pile.x, y: 0, w: geo.pile.w })">Everyone who tests positive: {{ fmt(c.pos) }}</div>
    <div class="nd-crowd-read" :style="place(geo.read)" aria-hidden="true">
      <div class="nd-crowd-big"><b class="nd-crowd-tp">{{ fmt(c.tp) }}</b> of <b>{{ fmt(c.pos) }}</b> positives are sick</div>
      <div class="nd-crowd-pct"><span>{{ pct(exact) }}</span><i>%</i></div>
      <ul class="nd-crowd-key">
        <li v-for="e in KEY" :key="e.id" :class="'nd-crowd-' + e.cls" @pointerenter="hoverGroup(T[e.id as keyof Group])" @pointerleave="hoverGroup(null)"><i /><b>{{ fmt(e.n) }}</b> {{ e.text }}</li>
      </ul>
    </div>
    <div class="nd-crowd-ctl" :class="{ 'nd-crowd-still': !controls }" :style="{ top: geo.ctl.y + 'px', height: geo.ctl.h + 'px' }">
      <label><span>Prevalence</span><b>{{ pctIn(prevPct) }}%</b><small>{{ oneIn(prevPct / 100) }} is sick</small>
        <input v-if="controls" v-model.number="prevI" type="range" min="0" :max="PREV.length - 1" step="1" aria-label="Prevalence"></label>
      <label><span>Sensitivity</span><b>{{ pctIn(sens) }}%</b><small>of the sick test positive</small>
        <input v-if="controls" v-model.number="sens" type="range" min="50" max="100" step="0.5" aria-label="Sensitivity"></label>
      <label><span>Specificity</span><b>{{ pctIn(spec) }}%</b><small>of the healthy test negative</small>
        <input v-if="controls" v-model.number="spec" type="range" min="80" max="100" step="0.1" aria-label="Specificity"></label>
    </div>
  </div>
</template>
