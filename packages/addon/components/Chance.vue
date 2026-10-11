<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { cssVar } from '../composables/useConfig'
import { links, termColor } from '../composables/links.mjs'
import { assign, counts, oneIn, ppv, shuffled, FN, FP, TN, TP } from '../composables/risk.mjs'
import { COMMON, nearestCommon, say, sentence, timesIn100 } from '../composables/chance.mjs'

// Why a positive test is often wrong, in pictures with words for labels. One component, four pictures (`mode`), one colour for each idea:
// sick is the pink chart colour, healthy is grey, "tested positive" is the amber ring (or the amber frame round a crowd of positives).
//   crowd   10,000 dots, one per person. `steps` clicks reveal, one at a time: the sick (step 1), the sick who test positive (2), the
//           healthy who test positive too, the false alarms (3). `from` is the step the slide starts at.
//   rows    the people who test positive as two rows of dots: the sick (10), the false alarms (100). `steps` clicks reveal row two.
//   pile    everyone who tests positive, gathered: sick dots and healthy dots, and how many in 100 are really sick. Its groups answer to
//           the terms of an <Equation> (`terms`, default sick-and-positive 3, healthy-and-positive 4, all positives 1).
//   play    a pile with sliders (`controls`: "prevalence" or "accuracy") and a sentence that follows them.
// The numbers are expected counts of 10,000 people, not a random draw: 1 in 1,000 is exactly 10 sick people. A simulation, and it says so.
//   <At :x="70" :y="60" :w="560" :h="600"><Chance mode="crowd" :w="560" :h="600" :steps="1" /></At>
const props = withDefaults(defineProps<{
  mode?: 'crowd' | 'rows' | 'pile' | 'play'; w?: number; h?: number; steps?: number; from?: number
  prev?: number; sens?: number; spec?: number; controls?: 'prevalence' | 'accuracy' | 'none'; terms?: { tp?: string; fp?: string; pos?: string }; seed?: number
}>(), { mode: 'crowd', w: 560, h: 600, steps: 0, from: 0, prev: 0.001, sens: 0.99, spec: 0.99, controls: 'none', seed: 11 })
const T = computed(() => ({ tp: '3', fp: '4', pos: '1', ...props.terms }))
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: props.w, h: props.h })
const active = useActive()

// ---- clicks: one per step, counted like the reveal of an <Equation> ----
const { $clicksContext: clicks } = useSlideContext()
const info = props.steps > 0 ? clicks?.calculateSince('+1', props.steps) : null
const token = Math.random().toString(36).slice(2)
if (info) clicks!.register(token, info)
const step = computed(() => (info ? props.from + Math.max(0, Math.min(props.steps, clicks!.current - info.start + 1)) : props.from))

// ---- the sliders ----
const prevI = ref(nearestCommon(props.prev)), sens = ref(Math.round(props.sens * 1000) / 10), spec = ref(Math.round(props.spec * 1000) / 10)
const prevalence = computed(() => (props.controls === 'prevalence' ? COMMON[prevI.value] : props.prev))
const pSens = computed(() => (props.controls === 'accuracy' ? sens.value / 100 : props.sens))
const pSpec = computed(() => (props.controls === 'accuracy' ? spec.value / 100 : props.spec))

const N = 10000, cols = 100
const rankSick = new Uint32Array(N), byScore = shuffled(N, props.seed + 1)
shuffled(N, props.seed).forEach((person, rank) => { rankSick[person] = rank })
const status = new Uint8Array(N)
const c = computed(() => counts(N, prevalence.value, pSens.value, pSpec.value))
const fmt = (v: number) => Math.round(v).toLocaleString('en-US')
const right = computed(() => timesIn100(prevalence.value, pSens.value, pSpec.value))
const words = computed(() => sentence(props.controls === 'prevalence' ? 'prevalence' : 'accuracy', prevalence.value, pSens.value, pSpec.value))
const ariaLabel = computed(() => (props.mode === 'crowd' ? 'A crowd of 10,000 dots, one for each person. Ten of them are sick.'
  : props.mode === 'rows' ? 'Of 110 people who test positive, 10 are sick and 100 are healthy: false alarms.'
  : `Everyone who tests positive: ${fmt(c.value.pos)} people, ${fmt(c.value.tp)} of them sick. ${words.value}`))

// ---- the term, or the group, that is pointed at (pile) ----
const term = ref<string | null>(links.term())
const off = links.onTerm((t: string | null) => { term.value = t })
const group = computed(() => (term.value === null ? null : (Object.entries(T.value).find(([, v]) => v === term.value)?.[0] ?? null)))
const NOTE: Record<string, string> = { tp: 'sick, test positive', fp: 'healthy, test positive: a false alarm', pos: 'everyone who tests positive' }
const note = computed(() => (group.value ? NOTE[group.value] : ''))

// ---- geometry, in the logical units of the box ----
const side = computed(() => props.mode === 'play')
const sq = computed(() => Math.min(props.w, props.h - 96))
const pileBox = computed(() => (side.value
  ? { x: 12, y: 44, w: props.w - 472, h: props.h - 44 - 56 }
  : { x: 12, y: 44, w: props.w - 24, h: props.h - 44 - 124 }))
const readBox = computed(() => (side.value
  ? { left: props.w - 420 + 'px', top: '0px', width: '420px' }
  : { left: '0px', top: props.h - 112 + 'px', width: props.w + 'px' }))
const rowP = computed(() => Math.min(36, props.w / 21))
const rowsY = computed(() => ({ a: 40, b: 40 + rowP.value + 26 + 40 }))   // top of the sick row and of the healthy rows (a label sits above each)

// ---- drawing ----
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const lv = { sick: 0, tp: 0, fp: 0, a: 0, b: 0, tpL: 1, fpL: 1 }   // eased 0..1 levels of what is shown; tpL and fpL are brightness when a term is lit
let raf = 0
const colours = () => ({ ink: cssVar('--nd-ink'), muted: cssVar('--nd-muted'), sick: cssVar('--nd-chart-3'), pos: cssVar('--nd-chart-4') })
const ease = (cur: number, want: number) => { const n = reduced ? want : cur + (want - cur) * 0.14; return Math.abs(n - want) < 0.004 ? want : n }

function draw(): boolean {
  const cvs = cv.value
  if (!cvs) return false
  const g = cvs.getContext('2d')!, pw = Math.round(props.w * k.value), ph = Math.round(props.h * k.value)
  if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph }
  g.setTransform(k.value, 0, 0, k.value, 0, 0)
  g.clearRect(0, 0, props.w, props.h)
  const col = colours(), s = step.value, cc = c.value
  const prev = { ...lv }
  const lit = group.value
  lv.sick = ease(lv.sick, s >= 1 ? 1 : 0); lv.tp = ease(lv.tp, s >= 2 ? 1 : 0); lv.fp = ease(lv.fp, s >= 3 ? 1 : 0)
  lv.a = ease(lv.a, s >= 1 ? 1 : 0); lv.b = ease(lv.b, s >= 2 ? 1 : 0)
  lv.tpL = ease(lv.tpL, !lit || lit === 'tp' || lit === 'pos' ? 1 : 0.15); lv.fpL = ease(lv.fpL, !lit || lit === 'fp' || lit === 'pos' ? 1 : 0.15)
  let moving = (Object.keys(lv) as (keyof typeof lv)[]).some((x) => lv[x] !== prev[x])
  if (props.mode === 'crowd') {
    const sz = sq.value, pitch = sz / cols
    const at = (i: number) => [(i % cols + 0.5) * pitch, (Math.floor(i / cols) + 0.5) * pitch]
    g.fillStyle = col.muted; g.globalAlpha = 0.5; g.beginPath()
    for (let i = 0; i < N; i++) if ((status[i] !== TP && status[i] !== FN) || lv.sick < 1) { const [x, y] = at(i); g.moveTo(x + pitch * 0.3, y); g.arc(x, y, pitch * 0.3, 0, 6.2832) }
    g.fill()
    // the false alarms: a grey dot in an amber ring
    if (lv.fp > 0) {
      g.strokeStyle = col.pos; g.lineWidth = 1.5; g.globalAlpha = lv.fp; g.beginPath()
      for (let i = 0; i < N; i++) if (status[i] === FP) { const [x, y] = at(i); const r = pitch * (0.9 + (1 - lv.fp) * 2); g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832) }
      g.stroke()
    }
    // the sick: big pink dots with a soft halo, growing in
    if (lv.sick > 0) {
      for (let i = 0; i < N; i++) {
        if (status[i] !== TP && status[i] !== FN) continue
        const [x, y] = at(i), r = pitch * (0.5 + 1.1 * lv.sick)
        g.globalAlpha = 0.22 * lv.sick; g.fillStyle = col.sick; g.beginPath(); g.arc(x, y, r * 2.6, 0, 6.2832); g.fill()
        g.globalAlpha = lv.sick; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill()
        if (status[i] === TP && lv.tp > 0) { g.globalAlpha = lv.tp; g.strokeStyle = col.pos; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, r + 3 + (1 - lv.tp) * 14, 0, 6.2832); g.stroke() }
      }
    }
    g.globalAlpha = 1
  } else if (props.mode === 'rows') {
    const p = rowP.value, r = p * 0.3, ring = p * 0.47
    const rows: [number, number, number, number, string][] = [[cc.tp, 10, rowsY.value.a, lv.a, col.sick], [cc.fp, 20, rowsY.value.b, lv.b, col.muted]]
    for (const [n, per, y0, a, fill] of rows) {
      for (let j = 0; j < n; j++) {
        const x = (j % per + 0.5) * p, y = y0 + (Math.floor(j / per) + 0.5) * p
        g.globalAlpha = a; g.fillStyle = fill; g.beginPath(); g.arc(x, y, r * (0.4 + 0.6 * a), 0, 6.2832); g.fill()
        g.strokeStyle = col.pos; g.lineWidth = 2; g.beginPath(); g.arc(x, y, ring, 0, 6.2832); g.stroke()
      }
    }
    g.globalAlpha = 1
  } else {
    // everyone who tests positive, gathered in an amber frame: the sick first, then the healthy (false alarms)
    const P = pileBox.value, pos = cc.pos
    if (pos > 0) {
      let p = Math.min(40, Math.sqrt(P.w * P.h / pos)), cl = 1, rw = 1
      for (; p > 2.5; p -= 0.5) { cl = Math.max(1, Math.floor(P.w / p)); rw = Math.ceil(pos / cl); if (rw * p <= P.h) break }
      const r = Math.max(1.2, p * 0.38)
      const fw = Math.min(cl, pos) * p, fh = rw * p, pad = 8
      g.globalAlpha = 0.9; g.strokeStyle = col.pos; g.lineWidth = 2.5; g.beginPath(); g.roundRect(P.x - pad, P.y - pad, fw + 2 * pad, fh + 2 * pad, 14); g.stroke()
      for (const [from, to, fill, a] of [[0, cc.tp, col.sick, lv.tpL], [cc.tp, pos, col.muted, lv.fpL * 0.85]] as [number, number, string, number][]) {
        g.fillStyle = fill; g.globalAlpha = a; g.beginPath()
        for (let j = from; j < to; j++) { const x = P.x + (j % cl + 0.5) * p, y = P.y + (Math.floor(j / cl) + 0.5) * p; g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832) }
        g.fill()
      }
      g.globalAlpha = 1
    }
  }
  return moving
}
function frame() { raf = 0; if (draw() && active.value) raf = requestAnimationFrame(frame) }
const kick = () => { if (active.value && !raf) raf = requestAnimationFrame(frame) }

function refresh() {
  const next = assign(new Uint8Array(N), rankSick, byScore, c.value) as Uint8Array
  for (let i = 0; i < N; i++) status[i] = next[i]
  kick()
}
watch([prevI, sens, spec], () => { refresh(); if (active.value) publish() })
watch([step, group, () => props.w, () => props.h, k], kick)

// ---- numbers shared with an <Equation>: \val{risktp}{10}, \val{riskfp}{100}, \val{riskppv}{9} ----
function publish() {
  links.setParam('riskprev', prevalence.value * 100); links.setParam('risktp', c.value.tp); links.setParam('riskfp', c.value.fp)
  links.setParam('riskpos', c.value.pos); links.setParam('riskppv', ppv(prevalence.value, pSens.value, pSpec.value) * 100)
}
watch(active, (a) => {
  cancelAnimationFrame(raf); raf = 0
  if (!a) { if (!reduced) { lv.sick = lv.tp = lv.fp = lv.a = lv.b = 0 }; return }
  refresh()
  if (props.mode === 'pile') publish()
}, { immediate: true })
onUnmounted(() => { cancelAnimationFrame(raf); off(); if (info) clicks!.unregister(token) })

// ---- the words under and beside the pictures ----
const legend = computed(() => {
  const L: { cls: string; text: string; show: boolean }[] = []
  if (props.mode === 'crowd') {
    L.push({ cls: 'healthy', text: `Healthy: ${fmt(c.value.healthy)}`, show: true })
    L.push({ cls: 'sick', text: `Sick: ${fmt(c.value.sick)}`, show: step.value >= 1 })
    L.push({ cls: 'pos', text: step.value >= 3 ? `Test positive: ${fmt(c.value.pos)}` : `Test positive: ${fmt(c.value.tp)}`, show: step.value >= 2 })
  } else {
    L.push({ cls: 'sick', text: 'Really sick', show: true })
    L.push({ cls: 'healthy', text: 'Healthy: a false alarm', show: true })
  }
  return L.filter((e) => e.show)
})
const oneInText = computed(() => oneIn(prevalence.value))
</script>

<template>
  <div ref="root" class="nd-chance" :class="['nd-chance-' + mode]" :style="{ width: w + 'px', height: h + 'px' }" data-kind="chance" :data-right="right" :data-step="step" role="group" :aria-label="ariaLabel">
    <canvas ref="cv" aria-hidden="true" />
    <template v-if="mode === 'crowd'">
      <div class="nd-chance-cap" :style="{ top: sq + 14 + 'px', width: sq + 'px' }">{{ fmt(c.n) }} people, one dot each</div>
      <ul class="nd-chance-key" :style="{ top: sq + 52 + 'px' }" aria-hidden="true">
        <li v-for="e in legend" :key="e.cls" :class="'nd-chance-' + e.cls"><i />{{ e.text }}</li>
      </ul>
    </template>
    <template v-else-if="mode === 'rows'">
      <div class="nd-chance-label" :style="{ top: '0px' }" :class="{ 'nd-chance-hide': step < 1 }"><i class="nd-chance-sick" />Sick people who test positive: <b>{{ fmt(c.tp) }}</b></div>
      <div class="nd-chance-label" :style="{ top: rowsY.b - 38 + 'px' }" :class="{ 'nd-chance-hide': step < 2 }"><i class="nd-chance-healthy" />Healthy people who test positive too: <b>{{ fmt(c.fp) }}</b></div>
      <div class="nd-chance-ringkey nd-chance-pos"><i />The amber ring means the test said positive.</div>
    </template>
    <template v-else>
      <div class="nd-chance-cap nd-chance-cap-top" :style="{ top: '0px', width: pileBox.w + 'px' }">Everyone who tests positive: {{ fmt(c.pos) }} people</div>
      <span v-if="note" class="nd-linkchip" :style="{ '--nd-tc': termColor(term!), left: pileBox.w / 2 + 'px', top: pileBox.h + 52 + 'px' }">{{ note }}</span>
      <div class="nd-chance-read" :style="readBox">
        <div class="nd-chance-big"><b>{{ right }}</b><span> in 100</span></div>
        <div class="nd-chance-bigcap">positive tests are really sick</div>
        <p v-if="mode === 'play'" class="nd-chance-say" aria-live="polite">{{ words }}</p>
        <p v-else class="nd-chance-say">{{ oneInText }} people are sick</p>
        <template v-if="mode === 'play' && controls === 'prevalence'">
          <label><span>How common is the condition?</span><b>{{ oneInText }} people</b>
            <input v-model.number="prevI" type="range" min="0" :max="COMMON.length - 1" step="1" aria-label="How common is the condition"></label>
        </template>
        <template v-else-if="mode === 'play' && controls === 'accuracy'">
          <label><span>Catches sick people</span><b>{{ say(sens) }} of 100 sick</b>
            <input v-model.number="sens" type="range" min="50" max="100" step="1" aria-label="How many sick people the test catches"></label>
          <label><span>Clears healthy people</span><b>{{ say(spec) }} of 100 healthy</b>
            <input v-model.number="spec" type="range" min="90" max="100" step="0.1" aria-label="How many healthy people the test clears"></label>
        </template>
      </div>
      <ul v-if="mode === 'play'" class="nd-chance-key nd-chance-key-flow" aria-hidden="true">
        <li v-for="e in legend" :key="e.cls" :class="'nd-chance-' + e.cls"><i />{{ e.text }}</li>
      </ul>
    </template>
  </div>
</template>
