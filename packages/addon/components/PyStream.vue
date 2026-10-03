<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { useNimbleConfig, cssVar } from '../composables/useConfig'

// Live Python animation: a Python process computes state and streams it over a WebSocket; this component
// draws it on a canvas. Controls are sent back as JSON. See docs/WRITING.md for the wire format.
const props = withDefaults(defineProps<{ name: string; controls?: boolean; hud?: boolean; frame?: boolean; color?: string }>(), { controls: false, hud: false, frame: false })
const LW = 1000, LH = 460
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { w: LW, h: LH })
const state = ref<'offline' | 'live'>('offline')
const n = ref(400), dt = ref(0.02), g = ref(1)
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
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, LW, LH); ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = props.color ?? cssVar('--nd-ink')
    for (let i = 0; i < m; i++) ctx.fillRect((a[2 + i * 2] * 0.25 + 0.5) * LW, (a[3 + i * 2] * 0.25 + 0.5) * LH, 2.2, 2.2)
    frames++; const now = performance.now()
    if (now - last >= 1000) { fps.value = Math.round(frames * 1000 / (now - last)); frames = 0; last = now }
  }
}
function stop() { closed = true; clearTimeout(timer); const w = ws; ws = null; w?.close(); state.value = 'offline'; fps.value = 0 }
const active = useActive()
watch(active, (a) => { stop(); if (a) { closed = false; connect() } }, { immediate: true })
onUnmounted(stop)
</script>

<template>
  <div ref="root" class="nd-scene" :class="{ 'nd-framed': frame }" :data-fps="fps" :data-state="state" data-kind="pystream">
    <canvas ref="cv" :width="LW" :height="LH" />
    <div v-if="state === 'offline'" class="nd-off">Python stream offline. Start everything with <code>nimbledeck run</code></div>
    <span v-if="hud" class="nd-hud">{{ fps }} fps · Python step {{ stepMs }} ms</span>
    <div v-if="controls" class="nd-ctl">
      <label>particles <input v-model.number="n" type="range" min="100" max="2000" step="100" @change="send"> {{ n }}</label>
      <label>time step <input v-model.number="dt" type="range" min="0.005" max="0.05" step="0.005" @change="send"></label>
      <label>gravity <input v-model.number="g" type="range" min="0.2" max="3" step="0.1" @change="send"></label>
    </div>
  </div>
</template>
