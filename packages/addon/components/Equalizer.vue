<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useCrisp } from '../composables/useCrisp'
import { cssVar } from '../composables/useConfig'
import { sound, soundOn } from '../composables/useSound'

// An equalizer drawn from the real sound output (the engine's analyser): <Equalizer :bars="24" />. It rests as a row of
// small dots while nothing plays, or while sound is off, and leaps with the sound that plays on the slide. Colours are
// tokens. Logical size 1000 x 220 by default (`w`, `h`); the canvas is rendered at the real on-screen resolution.
const props = withDefaults(defineProps<{ bars?: number; w?: number; h?: number }>(), { bars: 28, w: 1000, h: 220 })
const root = ref<HTMLElement>()
const cv = ref<HTMLCanvasElement>()
const { k } = useCrisp(root, { get w() { return props.w }, get h() { return props.h } })
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const peak = ref(0)
let raf = 0, level: number[] = []

function draw() {
  const c = cv.value!, g = c.getContext('2d')!
  const pw = Math.round(props.w * k.value), ph = Math.round(props.h * k.value)
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
  g.setTransform(k.value, 0, 0, k.value, 0, 0)
  g.clearRect(0, 0, props.w, props.h)
  const live = sound.levels(props.bars)
  if (level.length !== props.bars) level = new Array(props.bars).fill(0)
  const step = props.w / props.bars, bw = step * 0.56
  const a1 = cssVar('--nd-accent'), a2 = cssVar('--nd-accent-2'), line = cssVar('--nd-line')
  const grad = g.createLinearGradient(0, props.h, 0, 0)
  grad.addColorStop(0, a1); grad.addColorStop(1, a2)
  let top = 0
  for (let i = 0; i < props.bars; i++) {
    level[i] += (live[i] - level[i]) * (live[i] > level[i] ? 0.5 : 0.14)   // quick attack, slow fall
    top = Math.max(top, level[i])
    const hgt = Math.max(bw, level[i] * props.h * 0.96), x = i * step + (step - bw) / 2, y = (props.h - hgt) / 2
    g.fillStyle = level[i] > 0.02 ? grad : line
    g.beginPath(); g.roundRect(x, y, bw, hgt, bw / 2); g.fill()
  }
  peak.value = Math.round(top * 100)
}
function loop() { draw(); raf = requestAnimationFrame(loop) }
const active = useActive()
watch(active, (a) => { cancelAnimationFrame(raf); raf = 0; if (a) raf = requestAnimationFrame(loop) }, { immediate: true })
onUnmounted(() => cancelAnimationFrame(raf))
const text = computed(() => (soundOn.value ? 'Equalizer of the sound playing now' : 'Equalizer, sound is off'))
</script>

<template>
  <div ref="root" class="nd-eq" data-kind="equalizer" :data-peak="peak" role="img" :aria-label="text" :class="{ 'nd-eq-calm': reduce }">
    <canvas ref="cv" :width="w" :height="h" />
  </div>
</template>
