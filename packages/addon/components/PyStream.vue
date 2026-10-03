<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { useNimbleConfig, cssVar } from '../composables/useConfig'

// Live Python animation: a Python process computes state and streams it over a WebSocket; this component
// draws it on a canvas. Controls are sent back as JSON. See docs/WRITING.md for the wire format.
const props = defineProps<{ name: string }>()
const cv = ref<HTMLCanvasElement>()
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
    ctx.fillStyle = cssVar('--nd-bg', '#fff'); ctx.globalAlpha = 0.25; ctx.fillRect(0, 0, c.width, c.height); ctx.globalAlpha = 1
    ctx.fillStyle = cssVar('--nd-ink')
    for (let i = 0; i < m; i++) ctx.fillRect((a[2 + i * 2] * 0.25 + 0.5) * c.width, (a[3 + i * 2] * 0.25 + 0.5) * c.height, 2, 2)
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
  <div class="nd-scene" :data-fps="fps" :data-state="state" data-kind="pystream">
    <canvas ref="cv" width="1000" height="440" />
    <div v-if="state === 'offline'" class="nd-off">Python stream offline. Start everything with <code>nimbledeck run</code></div>
    <div class="nd-ctl">
      <label>particles <input v-model.number="n" type="range" min="100" max="2000" step="100" @change="send"> {{ n }}</label>
      <label>time step <input v-model.number="dt" type="range" min="0.005" max="0.05" step="0.005" @change="send"></label>
      <label>gravity <input v-model.number="g" type="range" min="0.2" max="3" step="0.1" @change="send"></label>
      <span class="nd-fps">{{ fps }} fps · Python step {{ stepMs }} ms</span>
    </div>
  </div>
</template>
