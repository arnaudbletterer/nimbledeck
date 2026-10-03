<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { cssVar } from '../composables/useConfig'

// Canvas 2D scene: bodies on elliptical orbits, with play/pause, scrub and speed.
// A template for "my own canvas animation": copy this file and replace draw().
const cv = ref<HTMLCanvasElement>()
const playing = ref(true)
const t = ref(0)
const speed = ref(1)
const fps = ref(0)
let raf = 0, last = 0, frames = 0, acc = 0

function draw() {
  const c = cv.value!, g = c.getContext('2d')!
  const W = c.width, H = c.height
  const ink = cssVar('--nd-ink'), a2 = cssVar('--nd-accent-2'), acc1 = cssVar('--nd-accent'), line = cssVar('--nd-line')
  g.clearRect(0, 0, W, H)
  g.fillStyle = ink; g.beginPath(); g.arc(W / 2, H / 2, 14, 0, 7); g.fill()
  const cols = [ink, a2, acc1, a2, ink]
  for (let i = 0; i < 40; i++) {
    const r = 40 + i * 6, a = t.value * (2.2 / (1 + i * 0.12)) + i
    g.strokeStyle = line; g.beginPath(); g.ellipse(W / 2, H / 2, r * 1.5, r, 0, 0, 7); g.stroke()
    g.fillStyle = cols[i % 5]; g.beginPath(); g.arc(W / 2 + Math.cos(a) * r * 1.5, H / 2 + Math.sin(a) * r, 4 + (i % 3), 0, 7); g.fill()
  }
}
function loop(ts: number) {
  const dt = last ? (ts - last) / 1000 : 0; last = ts
  if (playing.value) t.value += dt * speed.value
  draw()
  frames++; acc += dt
  if (acc >= 1) { fps.value = Math.round(frames / acc); frames = 0; acc = 0 }
  raf = requestAnimationFrame(loop)
}
const active = useActive()
watch(active, (a) => { cancelAnimationFrame(raf); last = 0; if (a) raf = requestAnimationFrame(loop) }, { immediate: true })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="nd-scene" :data-fps="fps" data-kind="orbit">
    <canvas ref="cv" width="1000" height="460" />
    <div class="nd-ctl">
      <button @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button>
      <label>time <input v-model.number="t" type="range" min="0" max="60" step="0.01" @input="playing = false"></label>
      <label>speed <input v-model.number="speed" type="range" min="0.1" max="4" step="0.1"></label>
      <span class="nd-fps">{{ fps }} fps</span>
    </div>
  </div>
</template>
