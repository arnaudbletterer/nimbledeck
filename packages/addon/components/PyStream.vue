<script setup lang="ts">
import { computed, reactive, ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { useNimbleConfig, cssVar } from '../composables/useConfig'
import { useRecording } from '../composables/useRecording'
import { links, formatValue } from '../composables/links.mjs'
import { parseFrame, groupRanges, sliderText } from '../composables/pystream.mjs'
import { useLinked } from '../composables/useLinked'
import { useLockstep } from '../composables/lockstep'

// Live Python animation: a Python process computes state and streams it over a WebSocket; this component
// draws it on a canvas. Controls are sent back as JSON. See docs/WRITING.md for the wire format.
// Without the process it plays the recording stream-<name> made by `nimbledeck record`.
// Optional drawing and control settings (all default to the original look):
//   colors  a list of colours (CSS colours or token names like "--nd-accent"); the points are cut into that many equal,
//           consecutive groups and each group gets one colour, so a trajectory keeps its colour
//   size    dot size in logical pixels (default 2.2);  fade  how much of the previous frame is erased each frame, 0 to 1
//           (default 0.25; smaller gives longer trails)
//   w, h    logical canvas size (default 1000 x 460); the stream's x and y in [-2, 2] map to the width and the height
//   sliders three objects {label, min, max, step, value} for the n, dt and g sliders, in that order
//   extra   more sliders {name, label, min, max, step, value}: each is sent to the process under its name (like n, dt and g) and
//           published as the parameter `name`, which a \val{name}{...} of an <Equation> shows (composables/links.mjs)
//   groups  point counts of the colour groups, in order (for example [3000, 900]); without it the points are cut into equal groups.
//           A server keeps the counts fixed and pads unused points off the canvas (x = 9)
//   sizes, alphas  one dot size (logical pixels) and one opacity (0 to 1) per group; default `size` and 1
//   values  show the number next to the dt and g sliders too (the n slider always shows it)
//   sliders: []  hides the n, dt and g sliders, so the controls are only the `extra` ones; an extra slider with
//           `labels: ['linear', 'cosine']` shows the label of its value instead of the number
//   images  none: a frame may carry raster images after its points (see docs/WRITING.md), drawn under the points
//   draw    a JSON text message a process may send before a frame, with a list of shapes drawn over the points:
//           {"draw": [ {t:"line",p:[x,y,...],c,w,a,dash}, {t:"dot",x,y,r,c,w,a}, {t:"rect",x,y,w,h,c,a},
//                      {t:"text",x,y,s,c,size,align,weight} ]}  in logical pixels (c: a CSS colour or a token like
//                    "--nd-chart-1"); each message replaces the previous list. Without it nothing changes.
//   highlight  { "1": "note" }: the terms of an <Equation> this stream answers to (a ring in the term's colour and the note)
interface Slider { label: string; min: number; max: number; step: number; value: number; labels?: string[] }
const props = withDefaults(defineProps<{ name: string; controls?: boolean; hud?: boolean; frame?: boolean; color?: string; recording?: string; colors?: string[]; size?: number; fade?: number; w?: number; h?: number; values?: boolean; groups?: number[]; sizes?: number[]; alphas?: number[]; sliders?: Slider[]; extra?: (Slider & { name: string })[]; highlight?: Record<string, string> | string[] }>(), { controls: false, hud: false, frame: false, size: 2.2, fade: 0.25, w: 1000, h: 460 })
const LW = props.w, LH = props.h
const SL: Slider[] = props.sliders ?? [
  { label: 'particles', min: 100, max: 2000, step: 100, value: 400 },
  { label: 'time step', min: 0.005, max: 0.05, step: 0.005, value: 0.02 },
  { label: 'gravity', min: 0.2, max: 3, step: 0.1, value: 1 },
]
const resolve = (c: string) => (c.startsWith('--') ? cssVar(c) : c)
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const bg = ref<HTMLCanvasElement>(), ov = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: LW, h: LH })
const state = ref<'offline' | 'live'>('offline')
const n = ref(SL[0]?.value ?? 0), dt = ref(SL[1]?.value ?? 0), g = ref(SL[2]?.value ?? 0)
const ex = reactive<Record<string, number>>(Object.fromEntries((props.extra ?? []).map((e) => [e.name, e.value])))
const touched = new Set<string>()   // an extra slider is sent only once the viewer has moved it, so the process keeps its own default until then
const { linked, linkAttrs } = useLinked(() => props.highlight)
const fps = ref(0), stepMs = ref(0)
let ws: WebSocket | null = null, timer = 0, frames = 0, last = performance.now(), closed = true
// While `nimbledeck record` films this stream in lockstep (composables/lockstep.ts), the process computes one frame per
// {tick: n} message instead of free-running, and the recorder waits for the frame before it takes the picture.
const ls = useLockstep()
let acked = false, holdHello: (() => void) | null = null, holdTick: (() => void) | null = null
const release = () => { holdHello?.(); holdHello = null; holdTick?.(); holdTick = null }
function onTick() {
  if (!ls || !acked || ws?.readyState !== 1 || holdTick) return
  holdTick = ls.hold(`stream-${props.name} (a frame from the process)`)
  ws.send(JSON.stringify({ tick: ls.n }))
}

// Optional layers (see the header): raster images under the points and shapes over them. Both keep their last content and are
// repainted when the canvas changes size, so they stay sharp at the real on-screen resolution.
interface Shape { t: string; x?: number; y?: number; w?: number; h?: number; r?: number; p?: number[]; c?: string; a?: number; dash?: number[]; s?: string; size?: number; align?: CanvasTextAlign; weight?: number | string }
interface Tile { x: number; y: number; w: number; h: number; tex: HTMLCanvasElement }
let tiles: Tile[] = []
let shapes: Shape[] = []
function layer(c: HTMLCanvasElement | undefined) {
  if (!c) return null
  const pw = Math.round(LW * k.value), ph = Math.round(LH * k.value)
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
  const ctx = c.getContext('2d')!
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(k.value, 0, 0, k.value, 0, 0)
  return ctx
}
function paintImages() {
  const ctx = layer(bg.value)
  if (!ctx) return
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
  for (const t of tiles) ctx.drawImage(t.tex, t.x, t.y, t.w, t.h)
}
// A frame without a raster block keeps the images of the last one; a block with count 0 clears them (parseFrame in composables/pystream.mjs).
function setImages(images: ReturnType<typeof parseFrame>['images']) {
  if (!images) return
  tiles = images.map((im) => {
    const tex = document.createElement('canvas')
    tex.width = im.iw; tex.height = im.ih
    tex.getContext('2d')!.putImageData(new ImageData(im.rgba, im.iw, im.ih), 0, 0)
    return { x: im.x, y: im.y, w: im.w, h: im.h, tex }
  })
  paintImages()
}
function paintShapes() {
  const ctx = layer(ov.value)
  if (!ctx) return
  for (const s of shapes) {
    const col = resolve(s.c ?? '--nd-ink')
    ctx.globalAlpha = s.a ?? 1; ctx.fillStyle = col; ctx.strokeStyle = col
    if (s.t === 'line' && s.p && s.p.length >= 4) {
      ctx.lineWidth = s.w ?? 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash(s.dash ?? [])
      ctx.beginPath(); ctx.moveTo(s.p[0], s.p[1])
      for (let i = 2; i + 1 < s.p.length; i += 2) ctx.lineTo(s.p[i], s.p[i + 1])
      ctx.stroke(); ctx.setLineDash([])
    } else if (s.t === 'dot') {
      ctx.beginPath(); ctx.arc(s.x ?? 0, s.y ?? 0, s.r ?? 3, 0, 6.2832)
      if (s.w) { ctx.lineWidth = s.w; ctx.stroke() } else ctx.fill()
    } else if (s.t === 'rect') {
      ctx.fillRect(s.x ?? 0, s.y ?? 0, s.w ?? 0, s.h ?? 0)
    } else if (s.t === 'text' && s.s != null) {
      ctx.font = `${s.weight ?? 500} ${s.size ?? 16}px ${cssVar('--nd-font-body')}`; ctx.textAlign = s.align ?? 'left'; ctx.textBaseline = 'alphabetic'
      ctx.fillText(s.s, s.x ?? 0, s.y ?? 0)
    }
  }
  ctx.globalAlpha = 1
}
function onJson(text: string) {
  let m: any
  try { m = JSON.parse(text) } catch { return }
  if (m && typeof m === 'object' && Array.isArray(m.draw)) { shapes = m.draw; paintShapes() }
}
watch(k, () => { paintImages(); paintShapes() })
function send() { ws?.readyState === 1 && ws.send(JSON.stringify({ n: n.value, dt: dt.value, g: g.value, ...(ls ? { lockstep: true } : {}), ...Object.fromEntries([...touched].map((k) => [k, ex[k]])) })) }
async function connect() {
  if (closed) return
  const port = (await useNimbleConfig()).streams[props.name]?.port
  if (!port || closed) { state.value = 'offline'; return }
  const sock = new WebSocket(`ws://127.0.0.1:${port}`)
  ws = sock
  sock.binaryType = 'arraybuffer'
  sock.onopen = () => {
    state.value = 'live'; send()
    if (ls) { acked = false; holdHello = ls.hold(`stream-${props.name} (the process did not answer {lockstep: true}: does its server know the tick protocol?)`)}
  }
  sock.onclose = () => { release(); if (ws !== sock) return; state.value = 'offline'; fps.value = 0; timer = window.setTimeout(connect, 2000) }
  sock.onerror = () => sock.close()
  sock.onmessage = (e) => {
    if (typeof e.data === 'string') { if (e.data === 'lockstep') { acked = true; holdHello?.(); holdHello = null } else if (e.data[0] === '{' && !(ls && !acked)) onJson(e.data); return }
    if (ls && !acked) return                           // a frame of the free-running start, before the process switched to ticks
    const f = parseFrame(e.data)
    stepMs.value = f.stepMs
    const a = f.points, m = f.n, c = cv.value!, ctx = c.getContext('2d')!
    const pw = Math.round(LW * k.value), ph = Math.round(LH * k.value)
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }   // sharp at the real on-screen resolution
    ctx.setTransform(k.value, 0, 0, k.value, 0, 0)
    // Fade the previous frame towards transparent (trails without an opaque background).
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = `rgba(0,0,0,${props.fade})`; ctx.fillRect(0, 0, LW, LH); ctx.globalCompositeOperation = 'source-over'
    setImages(f.images)
    const cols = props.colors?.length ? props.colors.map(resolve) : [props.color ?? cssVar('--nd-ink')]
    groupRanges(m, cols.length, props.groups).forEach(([from, to], gi) => {
      const sz = props.sizes?.[gi] ?? props.size
      ctx.fillStyle = cols[Math.min(gi, cols.length - 1)]; ctx.globalAlpha = props.alphas?.[gi] ?? 1
      for (let i = from; i < to; i++) ctx.fillRect((a[i * 2] * 0.25 + 0.5) * LW - sz / 2, (a[1 + i * 2] * 0.25 + 0.5) * LH - sz / 2, sz, sz)
    })
    ctx.globalAlpha = 1
    frames++; const now = performance.now()
    if (now - last >= 1000) { fps.value = Math.round(frames * 1000 / (now - last)); frames = 0; last = now }
    holdTick?.(); holdTick = null                      // drawn: the recorder may take its picture
  }
}
function stop() { tiles = []; shapes = []; paintImages(); paintShapes(); closed = true; clearTimeout(timer); release(); window.removeEventListener('nd-tick', onTick); const w = ws; ws = null; w?.close(); state.value = 'offline'; fps.value = 0 }
const active = useActive()
const rec = reactive(useRecording(() => `stream-${props.name}`, () => props.recording, computed(() => state.value === 'offline'), active))
watch(active, (a) => { stop(); if (a) { closed = false; if (ls) window.addEventListener('nd-tick', onTick); connect(); publish() } }, { immediate: true })
const shown = (e: Slider & { name: string }) => sliderText(e, ex[e.name], formatValue)
function publish() { for (const [name, v] of Object.entries(ex)) links.setParam(name, v) }
watch(ex, () => { if (active.value) publish() })
onUnmounted(stop)
</script>

<template>
  <div ref="root" class="nd-scene" :class="{ 'nd-framed': frame }" :data-fps="fps" :data-state="state" data-kind="pystream" :data-rec-id="`stream-${name}`" v-bind="linkAttrs">
    <canvas v-show="!rec.shown" ref="bg" :width="LW" :height="LH" />
    <canvas v-show="!rec.shown" ref="cv" :width="LW" :height="LH" />
    <canvas v-show="!rec.shown" ref="ov" :width="LW" :height="LH" />
    <Recorded v-if="rec.shown" :src="rec.src!" :poster="rec.poster" :reduced="rec.reduced" />
    <div v-else-if="state === 'offline' && !rec.pending" class="nd-off">Python stream offline. Start everything with <code>nimbledeck run</code></div>
    <span v-if="linked?.note" class="nd-linkchip">{{ linked.note }}</span>
    <span v-if="hud && !rec.shown" class="nd-hud">{{ fps }} fps<template v-if="!ls"> · Python step {{ stepMs }} ms</template></span>
    <div v-if="controls && !rec.shown" class="nd-ctl" :class="{ 'nd-ctl-many': extra?.length }">
      <template v-if="SL.length >= 3">
        <label>{{ SL[0].label }} <input v-model.number="n" type="range" :min="SL[0].min" :max="SL[0].max" :step="SL[0].step" @change="send"> {{ n }}</label>
        <label>{{ SL[1].label }} <input v-model.number="dt" type="range" :min="SL[1].min" :max="SL[1].max" :step="SL[1].step" @change="send"><template v-if="values"> {{ dt }}</template></label>
        <label>{{ SL[2].label }} <input v-model.number="g" type="range" :min="SL[2].min" :max="SL[2].max" :step="SL[2].step" @change="send"><template v-if="values"> {{ g }}</template></label>
      </template>
      <label v-for="e in extra" :key="e.name">{{ e.label }} <input v-model.number="ex[e.name]" type="range" :min="e.min" :max="e.max" :step="e.step" @input="touched.add(e.name)" @change="send"> {{ shown(e) }}</label>
    </div>
  </div>
</template>
