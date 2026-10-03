<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { cssVar } from '../composables/useConfig'

// Canvas 2D scene: bodies on elliptical orbits, with play/pause, scrub and speed.
// A template for "my own canvas animation": copy this file and replace draw(). Draw in the logical 1000 x 460 space;
// the canvas itself is rendered at the real on-screen resolution so it stays sharp.
const LW = 1000, LH = 460
withDefaults(defineProps<{ controls?: boolean; hud?: boolean; frame?: boolean }>(), { controls: false, hud: false, frame: false })
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const playing = ref(true)
const t = ref(0)
const speed = ref(1)
const fps = ref(0)
const { k } = useCrisp(root, { w: LW, h: LH })
let raf = 0, last = 0, frames = 0, acc = 0

function draw() {
  const c = cv.value!, g = c.getContext('2d')!
  const pw = Math.round(LW * k.value), ph = Math.round(LH * k.value)
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
  g.setTransform(k.value, 0, 0, k.value, 0, 0)
  const ink = cssVar('--nd-ink'), a2 = cssVar('--nd-accent-2'), acc1 = cssVar('--nd-accent'), line = cssVar('--nd-line')
  g.clearRect(0, 0, LW, LH)
  g.fillStyle = ink; g.beginPath(); g.arc(LW / 2, LH / 2, 14, 0, 7); g.fill()
  const cols = [ink, a2, acc1, a2, ink]
  g.lineWidth = 1
  for (let i = 0; i < 40; i++) {
    const r = 40 + i * 6, a = t.value * (2.2 / (1 + i * 0.12)) + i
    g.strokeStyle = line; g.beginPath(); g.ellipse(LW / 2, LH / 2, r * 1.5, r, 0, 0, 7); g.stroke()
    g.fillStyle = cols[i % 5]; g.beginPath(); g.arc(LW / 2 + Math.cos(a) * r * 1.5, LH / 2 + Math.sin(a) * r, 4 + (i % 3), 0, 7); g.fill()
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
  <div ref="root" class="nd-scene" :class="{ 'nd-framed': frame }" :data-fps="fps" data-kind="orbit">
    <canvas ref="cv" :width="LW" :height="LH" />
    <span v-if="hud" class="nd-hud">{{ fps }} fps</span>
    <div v-if="controls" class="nd-ctl">
      <button @click="playing = !playing">{{ playing ? 'Pause' : 'Play' }}</button>
      <label>time <input v-model.number="t" type="range" min="0" max="60" step="0.01" @input="playing = false"></label>
      <label>speed <input v-model.number="speed" type="range" min="0.1" max="4" step="0.1"></label>
    </div>
  </div>
</template>
