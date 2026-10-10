<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { cssVar } from '../composables/useConfig'
import { links, termColor } from '../composables/links.mjs'
import { bins, binomialTable, drawFrom, interval, moe, responding, rng, se, summary } from '../composables/risk.mjs'

// Thousands of polls of the same population, drawn as one histogram that builds up while you watch. Each poll asks n people
// and reports the share who say A; the population really is p percent for A. Move a slider and every poll is redrawn at once
// (the same random numbers are reused, so the histogram morphs instead of jumping); let go and the polls are taken again.
// The bias slider is a poll that cannot reach everybody: that percentage of A supporters would rather not answer. More polls,
// or bigger ones, never bring such a histogram back to the truth.
//   <At :x="70" :y="120" :w="1140" :h="580"><Polls :w="1140" :h="580" /></At>
// Give it a box of exactly its own w and h (logical slide units). `controls` shows the sliders; without them the values are still
// shown and follow another <Polls>, through the parameters it publishes: riskpolln, riskpollp, riskpollgap, riskpollpolls
// (the sliders) and riskpollse, riskpollmoe (in points), riskpollwrong, riskpollmiss (in percent), for the \val{riskpollse}{1.6}
// of an <Equation>. The drawing answers to the terms of an <Equation>, `terms` says which: the true share p (default term 1),
// the standard error (2), the 95 percent margin 1.96 SE (3) and the sample size n (4). The histogram is a simulation of exact
// binomial draws, not data; a label says so.
interface Group { truth: string; se: string; moe: string; n: string }
const props = withDefaults(defineProps<{ w?: number; h?: number; controls?: boolean; p?: number; n?: number; polls?: number; gap?: number; terms?: Partial<Group>; seed?: number }>(),
  { w: 1140, h: 580, controls: true, p: 52, n: 1000, polls: 2000, gap: 0, seed: 5 })
const T = computed<Group>(() => ({ truth: '1', se: '2', moe: '3', n: '4', ...props.terms }))
const NS = [50, 100, 200, 400, 800, 1000, 1500, 2000, 3000, 5000, 10000]
const nearest = (v: number) => NS.reduce((b, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(NS[b] / v)) ? i : b), 0)
const LO = 0.35, HI = 0.7, BW = 0.005, NB = Math.round((HI - LO) / BW), MAXPOLLS = 6000

const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: props.w, h: props.h })
const nI = ref(nearest(props.n)), pPct = ref(props.p), gapPct = ref(props.gap), count = ref(props.polls)
const n = computed(() => NS[nI.value])
const q = computed(() => responding(pPct.value / 100, gapPct.value / 100))   // the share the poll really samples from
const wide = computed(() => props.w >= 900)

// the same uniform numbers for every setting, so that a slider morphs the histogram; a new round (Poll again) takes new ones
let round = 0, U = new Float64Array(MAXPOLLS)
const draws = () => { const r = rng(props.seed * 1009 + round * 7919); for (let i = 0; i < MAXPOLLS; i++) U[i] = r() }
draws()
const results = new Float64Array(MAXPOLLS)
const hist = new Uint32Array(NB)
let shown = 0, filled = 0, speed = 0
function simulate() {
  const t = binomialTable(n.value, q.value)
  for (let i = 0; i < MAXPOLLS; i++) results[i] = drawFrom(t, U[i]) / n.value
  hist.fill(0); filled = 0
}
function fill() {
  const upto = Math.min(count.value, Math.floor(shown))
  if (upto > filled) { bins(results.subarray(filled, upto), upto - filled, LO, HI, BW, hist); filled = upto }
}

const stats = ref({ ahead: 0, covered: 0, mean: 0, sd: 0 })
const wrong = computed(() => (pPct.value > 50 ? 1 - stats.value.ahead : stats.value.ahead) * 100)
const miss = computed(() => (1 - stats.value.covered) * 100)
const seP = computed(() => se(pPct.value / 100, n.value) * 100)
const moeP = computed(() => moe(pPct.value / 100, n.value) * 100)
const fmt = (v: number) => Math.round(v).toLocaleString('en-US')
const pts = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1))
const sharePct = (v: number) => (Math.round(v * 1000) / 10).toString()

// ---- geometry ----
const geo = computed(() => {
  const w = props.w, h = props.h, ctl = props.controls ? 112 : 92, statsH = 84, axisH = 34, stripH = 50
  const yb = h - ctl - 12 - statsH - axisH, yt = stripH + 14
  return { ax0: 22, ax1: w - 22, yt, yb, strip: stripH, statsY: yb + axisH + 6, statsH, ctlY: h - ctl + 8, ctlH: ctl }
})
const X = (s: number) => geo.value.ax0 + ((s - LO) / (HI - LO)) * (geo.value.ax1 - geo.value.ax0)

// ---- the term that is pointed at ----
const term = ref<string | null>(links.term())
const offTerm = links.onTerm((t: string | null) => { term.value = t })
const which = computed(() => (term.value === null ? null : (Object.entries(T.value).find(([, v]) => v === term.value)?.[0] ?? null)))
const NOTE = computed<Record<string, string>>(() => ({
  truth: `the true share: ${pPct.value}%`,
  se: `one standard error: ${pts(seP.value)} points`,
  moe: `95% margin of error: ${pts(moeP.value)} points`,
  n: `each poll asks ${fmt(n.value)} people`,
}))

// ---- drawing ----
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let raf = 0, last = 0, yMaxCur = 0
const emph = { truth: 1, se: 1, moe: 1, n: 1 } as Record<string, number>
function frame(now: number) {
  raf = 0
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now
  let busy = false
  if (shown < count.value) { shown = Math.min(count.value, shown + speed * dt); busy = shown < count.value; fill(); stats.value = summary(results, Math.floor(shown), n.value, pPct.value / 100) }
  for (const key of Object.keys(emph)) {
    const want = which.value === null || which.value === key ? 1 : 0.2
    const nx = reduced ? want : emph[key] + (want - emph[key]) * 0.2
    if (Math.abs(nx - want) > 0.01) busy = true
    emph[key] = Math.abs(nx - want) <= 0.01 ? want : nx
  }
  paint(now)
  if (which.value !== null && !reduced) busy = true
  if ((busy || Math.abs(yMaxCur - yTarget()) > 0.5) && active.value) raf = requestAnimationFrame(frame)
  else last = 0
}
const kick = () => { if (active.value && !raf) raf = requestAnimationFrame(frame) }
const peakCount = () => { const sd = se(q.value, n.value); return (count.value * BW) / (sd * Math.sqrt(2 * Math.PI)) }
const yTarget = () => Math.max(peakCount(), ...hist) * 1.14
const normal = (x: number, m: number, sd: number) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))

function paint(now: number) {
  const cvs = cv.value
  if (!cvs) return
  const g = cvs.getContext('2d')!, pw = Math.round(props.w * k.value), ph = Math.round(props.h * k.value)
  if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph }
  g.setTransform(k.value, 0, 0, k.value, 0, 0)
  g.clearRect(0, 0, props.w, props.h)
  const L = geo.value, ink = cssVar('--nd-ink'), muted = cssVar('--nd-muted'), line = cssVar('--nd-line')
  const A = cssVar('--nd-chart-1'), B = cssVar('--nd-chart-2'), c4 = cssVar('--nd-chart-4'), font = cssVar('--nd-font-body', 'sans-serif')
  const colOf = (id: string) => cssVar(`--nd-chart-${/^\d/.exec(id)?.[0] ?? 1}`)
  const tTruth = colOf(T.value.truth), tSe = colOf(T.value.se), tMoe = colOf(T.value.moe), tN = colOf(T.value.n)
  yMaxCur = reduced ? yTarget() : yMaxCur + (yTarget() - yMaxCur) * 0.25
  const yMax = Math.max(1, yMaxCur), H = L.yb - L.yt, bw = (L.ax1 - L.ax0) / NB, p = pPct.value / 100, sd = se(q.value, n.value)
  const Y = (cnt: number) => L.yb - (cnt / yMax) * H
  g.textBaseline = 'alphabetic'

  // the 95 percent margin around the truth, behind the bars
  const mo = moe(p, n.value)
  g.globalAlpha = (0.07 + (which.value === 'moe' ? 0.12 + 0.05 * Math.sin(now / 220) : 0)) * (which.value && which.value !== 'moe' ? 0.5 : 1)
  g.fillStyle = tMoe; g.fillRect(X(p - mo), L.yt, X(p + mo) - X(p - mo), H)
  g.globalAlpha = 1

  // axis and ticks
  g.strokeStyle = line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L.ax0, L.yb + 0.5); g.lineTo(L.ax1, L.yb + 0.5); g.stroke()
  g.fillStyle = muted; g.font = `500 15px ${font}`; g.textAlign = 'center'
  for (let s = 0.4; s <= 0.7001; s += 0.05) { g.fillText(`${Math.round(s * 100)}%`, X(s), L.yb + 22); g.fillRect(X(s) - 0.5, L.yb, 1, 5) }

  // the bars: polls that put A ahead in one colour, the others in another
  const dim = which.value === null ? 1 : 0.55
  for (let b = 0; b < NB; b++) {
    if (!hist[b]) continue
    const x = L.ax0 + b * bw, top = Y(hist[b]), mid = LO + (b + 0.5) * BW, col = mid >= 0.5 ? A : B
    g.globalAlpha = (mid >= 0.5 ? 0.92 : 0.82) * dim; g.fillStyle = col
    g.beginPath(); g.roundRect(x + 1, top, bw - 2, L.yb - top, [3, 3, 0, 0]); g.fill()
  }
  g.globalAlpha = 1

  // the theory: a normal curve with the standard error of the polls
  g.strokeStyle = ink; g.globalAlpha = 0.8; g.lineWidth = 2; g.beginPath()
  for (let i = 0; i <= 160; i++) {
    const s = LO + (i / 160) * (HI - LO), y = Y(count.value * BW * normal(s, q.value, sd))
    if (i === 0) g.moveTo(X(s), y); else g.lineTo(X(s), y)
  }
  g.stroke(); g.globalAlpha = 1

  // 50 percent
  g.setLineDash([5, 6]); g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 1.5
  g.beginPath(); g.moveTo(X(0.5), L.yt - 4); g.lineTo(X(0.5), L.yb); g.stroke(); g.setLineDash([]); g.globalAlpha = 1
  g.fillStyle = muted; g.font = `600 14px ${font}`; g.textAlign = 'center'; if (wide.value) g.fillText('50%: a tie', X(0.5), L.yt - 10)

  // the truth
  g.globalAlpha = emph.truth; g.strokeStyle = which.value === 'truth' ? tTruth : ink; g.lineWidth = which.value === 'truth' ? 4 : 3
  g.beginPath(); g.moveTo(X(p), L.yt - 4); g.lineTo(X(p), L.yb); g.stroke()
  g.fillStyle = which.value === 'truth' ? tTruth : ink; g.beginPath(); g.moveTo(X(p), L.yb + 1); g.lineTo(X(p) - 7, L.yb + 11); g.lineTo(X(p) + 7, L.yb + 11); g.fill()
  g.font = `700 16px ${font}`; g.textAlign = p >= 0.5 ? 'left' : 'right'
  g.fillText(`truth ${pPct.value}%`, X(p) + (p >= 0.5 ? 10 : -10), L.yt + 6)
  g.globalAlpha = 1

  // where the polls centre, when the sample is biased
  if (gapPct.value > 0) {
    const x = X(q.value)
    g.fillStyle = c4; g.strokeStyle = c4; g.lineWidth = 2; g.beginPath(); g.moveTo(x, L.yb + 1); g.lineTo(x - 7, L.yb + 11); g.lineTo(x + 7, L.yb + 11); g.fill()
    g.font = `700 16px ${font}`; g.textAlign = q.value >= p ? 'left' : 'right'
    g.fillText(`polls centre on ${sharePct(q.value)}%`, x + (q.value >= p ? 10 : -10), L.yt + 28)
  }

  // one standard error and the 95 percent margin, drawn as brackets above the peak
  const by = Math.max(L.yt + 52, Y(count.value * BW * normal(q.value, q.value, sd) * 0.62))
  const bracket = (lo: number, hi: number, col: string, a: number, label: string, y: number) => {
    g.globalAlpha = a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3
    g.beginPath(); g.moveTo(X(lo), y); g.lineTo(X(hi), y); g.moveTo(X(lo), y - 7); g.lineTo(X(lo), y + 7); g.moveTo(X(hi), y - 7); g.lineTo(X(hi), y + 7); g.stroke()
    g.font = `700 17px ${font}`; g.textAlign = 'center'; g.fillText(label, X((lo + hi) / 2), y - 12); g.globalAlpha = 1
  }
  if (which.value === 'se') bracket(q.value - sd, q.value + sd, tSe, 1, `±1 SE = ${pts(seP.value)} points`, by)
  if (which.value === 'moe') bracket(p - mo, p + mo, tMoe, 1, `±${pts(moeP.value)} points`, by)
  if (which.value === 'n') {
    const lo = Math.max(LO, q.value - 1.96 * sd), hi = Math.min(HI, q.value + 1.96 * sd)
    bracket(lo, hi, tN, 1, `95% of polls land here`, by)
  }

  // the one poll a reader sees, with its own margin of error
  const x0 = results[0], [ilo, ihi] = interval(x0, n.value), sy = L.strip / 2 + 2
  const lit = which.value === 'n' ? 1 : 0.9
  g.globalAlpha = lit; g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3
  g.beginPath(); g.moveTo(X(ilo), sy); g.lineTo(X(ihi), sy); g.moveTo(X(ilo), sy - 6); g.lineTo(X(ilo), sy + 6); g.moveTo(X(ihi), sy - 6); g.lineTo(X(ihi), sy + 6); g.stroke()
  g.beginPath(); g.arc(X(x0), sy, 7, 0, 6.2832); g.fill()
  g.font = `600 16px ${font}`
  const txt = wide.value ? `one poll, as printed: ${sharePct(x0)}% ± ${pts(moe(x0, n.value) * 100)}` : `one poll: ${sharePct(x0)}% ± ${pts(moe(x0, n.value) * 100)}`
  const tw = g.measureText(txt).width, right = X(ihi) + 14 + tw <= L.ax1
  g.textAlign = 'left'; g.fillText(txt, right ? X(ihi) + 14 : Math.max(L.ax0, X(ilo) - 14 - tw), sy + 5)
  g.globalAlpha = 1

  g.fillStyle = muted; g.font = `500 14px ${font}`; g.textAlign = 'right'
  if (wide.value) { g.textAlign = 'left'; g.fillText(`simulation: ${fmt(Math.floor(shown))} of ${fmt(count.value)} polls, ${fmt(n.value)} people each`, L.ax0, L.yt + 6) }
}

// ---- parameters ----
const names = { riskpolln: n, riskpollp: pPct, riskpollgap: gapPct, riskpollpolls: count }
function publish() {
  links.setParam('riskpolln', n.value); links.setParam('riskpollp', pPct.value); links.setParam('riskpollgap', gapPct.value); links.setParam('riskpollpolls', count.value)
  links.setParam('riskpollse', Math.round(seP.value * 100) / 100); links.setParam('riskpollmoe', Math.round(moeP.value * 100) / 100)
  links.setParam('riskpollwrong', Math.round(wrong.value * 10) / 10); links.setParam('riskpollmiss', Math.round(miss.value * 10) / 10)
}
let offParam = () => {}
function adopt(name: string, value: number) {
  if (name === 'riskpolln' && value !== n.value) nI.value = nearest(value)
  else if (name === 'riskpollp' && value !== pPct.value) pPct.value = value
  else if (name === 'riskpollgap' && value !== gapPct.value) gapPct.value = value
  else if (name === 'riskpollpolls' && value !== count.value) count.value = value
}

// A slider moved: the polls are redrawn with the same random numbers, all at once. Let go: the polls are taken again, building up.
function recompute(instant: boolean) {
  simulate()
  if (instant || reduced) { shown = count.value } else { shown = 0; speed = count.value / 1.5 }
  fill(); stats.value = summary(results, Math.floor(shown), n.value, pPct.value / 100)
  if (active.value) publish()
  kick()
}
watch([nI, pPct, gapPct, count], () => recompute(true))
watch([which, term, () => props.w, () => props.h, k], kick)
const replay = () => { shown = 0; hist.fill(0); filled = 0; speed = count.value / 1.5; if (reduced) shown = count.value; fill(); kick() }
const again = () => { round++; draws(); simulate(); replay(); stats.value = summary(results, Math.floor(shown), n.value, pPct.value / 100); publish() }

const active = useActive()
watch(active, (a) => {
  cancelAnimationFrame(raf); raf = 0; offParam(); last = 0
  if (!a) return
  for (const [name, r] of Object.entries(names)) { const v = links.param(name); if (v !== undefined && v !== r.value) adopt(name, v) }
  offParam = links.onParam(adopt)
  simulate(); yMaxCur = 0; replay(); publish()
}, { immediate: true })
onUnmounted(() => { cancelAnimationFrame(raf); offParam(); offTerm() })

const note = computed(() => (which.value ? NOTE.value[which.value] : ''))
const sentence = computed(() => `${fmt(count.value)} simulated polls of ${fmt(n.value)} people, true share ${pPct.value} percent${gapPct.value ? `, ${gapPct.value} percent of A supporters not answering` : ''}. ${pts(wrong.value)} percent of polls name the wrong winner.`)
</script>

<template>
  <div ref="root" class="nd-polls" :class="{ 'nd-polls-wide': wide }" :style="{ width: w + 'px', height: h + 'px' }" data-kind="polls" :data-wrong="wrong.toFixed(1)" role="group" :aria-label="sentence">
    <canvas ref="cv" aria-hidden="true" />
    <span v-if="note" class="nd-linkchip nd-polls-chip" :style="{ '--nd-tc': termColor(term!) }">{{ note }}</span>
    <button v-if="controls" class="nd-polls-again" @click="again">Poll again</button>
    <div class="nd-polls-stats" :style="{ top: geo.statsY + 'px', height: geo.statsH + 'px' }" aria-hidden="true">
      <div><b>{{ pts(wrong) }}%</b><small>of polls name the wrong winner</small></div>
      <div><b>±{{ pts(moeP) }}</b><small>points: the 95% margin of error</small></div>
      <div :class="{ 'nd-polls-bad': miss > 20 }"><b>{{ fmt(miss) }}%</b><small>of polls miss the truth within their margin</small></div>
    </div>
    <div class="nd-polls-ctl" :style="{ top: geo.ctlY + 'px', height: geo.ctlH + 'px', '--nd-cols': 4 }">
      <label><span>Sample size</span><b>{{ fmt(n) }}</b><small>people per poll</small>
        <input v-if="controls" v-model.number="nI" type="range" min="0" :max="NS.length - 1" step="1" aria-label="Sample size" @change="recompute(false)"></label>
      <label><span>True share</span><b>{{ pPct }}%</b><small>of the population says A</small>
        <input v-if="controls" v-model.number="pPct" type="range" min="40" max="60" step="0.5" aria-label="True share" @change="recompute(false)"></label>
      <label><span>Polls</span><b>{{ fmt(count) }}</b><small>simulated polls</small>
        <input v-if="controls" v-model.number="count" type="range" min="100" max="5000" step="100" aria-label="Number of polls" @change="recompute(false)"></label>
      <label><span>Bias</span><b>{{ gapPct }}%</b><small>of A supporters do not answer</small>
        <input v-if="controls" v-model.number="gapPct" type="range" min="0" max="20" step="1" aria-label="Bias" @change="recompute(false)"></label>
    </div>
  </div>
</template>
