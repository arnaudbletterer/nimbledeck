<script setup lang="ts">
import { computed, reactive, ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { useNimbleConfig, cssVar } from '../composables/useConfig'
import { useRecording } from '../composables/useRecording'

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
interface Slider { label: string; min: number; max: number; step: number; value: number }
const props = withDefaults(defineProps<{ name: string; controls?: boolean; hud?: boolean; frame?: boolean; color?: string; recording?: string; colors?: string[]; size?: number; fade?: number; w?: number; h?: number; sliders?: Slider[] }>(), { controls: false, hud: false, frame: false, size: 2.2, fade: 0.25, w: 1000, h: 460 })
const LW = props.w, LH = props.h
const SL: Slider[] = props.sliders ?? [
  { label: 'particles', min: 100, max: 2000, step: 100, value: 400 },
  { label: 'time step', min: 0.005, max: 0.05, step: 0.005, value: 0.02 },
  { label: 'gravity', min: 0.2, max: 3, step: 0.1, value: 1 },
]
const resolve = (c: string) => (c.startsWith('--') ? cssVar(c) : c)
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: LW, h: LH })
const state = ref<'offline' | 'live'>('offline')
const n = ref(SL[0].value), dt = ref(SL[1].value), g = ref(SL[2].value)
const fps = ref(0), stepMs = ref(0)
let ws: WebSocket | null = null, timer = 0, frames = 0, last = performance.now(), closed = true

function send() { ws?.readyState === 1 && ws.send(JSON.stringify({ n: n.value, dt: dt.value, g: g.value })) }
async function connect() {
  if (closed) return
  const port = (await useNimbleConfig()).streams[props.name]?.port
  if (!port || closed) { state.value = 'offline'; return }
  const sock = new WebSocket(`ws://127.0.0.1:${port}`)
  ws = sock
  sock.binaryType = 'arraybuffer'
  sock.onopen = () => { state.value = 'live'; send() }
  sock.onclose = () => { if (ws !== sock) return; state.value = 'offline'; fps.value = 0; timer = window.setTimeout(connect, 2000) }
  sock.onerror = () => sock.close()
  sock.onmessage = (e) => {
    const a = new Float32Array(e.data)               // [step_ms, n, x0, y0, x1, y1, ...]
    stepMs.value = Math.round(a[0] * 10) / 10
    const m = a[1], c = cv.value!, ctx = c.getContext('2d')!
    const pw = Math.round(LW * k.value), ph = Math.round(LH * k.value)
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }   // sharp at the real on-screen resolution
    ctx.setTransform(k.value, 0, 0, k.value, 0, 0)
    // Fade the previous frame towards transparent (trails without an opaque background).
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = `rgba(0,0,0,${props.fade})`; ctx.fillRect(0, 0, LW, LH); ctx.globalCompositeOperation = 'source-over'
    const cols = props.colors?.length ? props.colors.map(resolve) : [props.color ?? cssVar('--nd-ink')]
    const sz = props.size
    for (let i = 0; i < m; i++) {
      ctx.fillStyle = cols[Math.min(cols.length - 1, Math.floor(i * cols.length / m))]
      ctx.fillRect((a[2 + i * 2] * 0.25 + 0.5) * LW - sz / 2, (a[3 + i * 2] * 0.25 + 0.5) * LH - sz / 2, sz, sz)
    }
    frames++; const now = performance.now()
    if (now - last >= 1000) { fps.value = Math.round(frames * 1000 / (now - last)); frames = 0; last = now }
  }
}
function stop() { closed = true; clearTimeout(timer); const w = ws; ws = null; w?.close(); state.value = 'offline'; fps.value = 0 }
const active = useActive()
const rec = reactive(useRecording(() => `stream-${props.name}`, () => props.recording, computed(() => state.value === 'offline'), active))
watch(active, (a) => { stop(); if (a) { closed = false; connect() } }, { immediate: true })
onUnmounted(stop)
</script>

<template>
  <div ref="root" class="nd-scene" :class="{ 'nd-framed': frame }" :data-fps="fps" :data-state="state" data-kind="pystream" :data-rec-id="`stream-${name}`">
    <canvas v-show="!rec.shown" ref="cv" :width="LW" :height="LH" />
    <Recorded v-if="rec.shown" :src="rec.src!" :poster="rec.poster" :reduced="rec.reduced" />
    <div v-else-if="state === 'offline'" class="nd-off">Python stream offline. Start everything with <code>nimbledeck run</code></div>
    <span v-if="hud && !rec.shown" class="nd-hud">{{ fps }} fps · Python step {{ stepMs }} ms</span>
    <div v-if="controls && !rec.shown" class="nd-ctl">
      <label>{{ SL[0].label }} <input v-model.number="n" type="range" :min="SL[0].min" :max="SL[0].max" :step="SL[0].step" @change="send"> {{ n }}</label>
      <label>{{ SL[1].label }} <input v-model.number="dt" type="range" :min="SL[1].min" :max="SL[1].max" :step="SL[1].step" @change="send"></label>
      <label>{{ SL[2].label }} <input v-model.number="g" type="range" :min="SL[2].min" :max="SL[2].max" :step="SL[2].step" @change="send"></label>
    </div>
  </div>
</template>
