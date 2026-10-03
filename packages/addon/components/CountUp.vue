<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// A number that counts up when its slide appears: <CountUp :to="3200" suffix="K" />. Uses the display font.
const props = withDefaults(defineProps<{ to: number; duration?: number; decimals?: number; prefix?: string; suffix?: string }>(), { duration: 1200, decimals: 0, prefix: '', suffix: '' })
const v = ref(0)
let raf = 0
const text = computed(() => props.prefix + v.value.toFixed(props.decimals).replace('.', ',') + props.suffix)
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
function run() {
  cancelAnimationFrame(raf)
  if (reduce) { v.value = props.to; return }
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / props.duration)
    v.value = props.to * (1 - Math.pow(1 - p, 3))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
const active = useActive()
watch(active, (a) => { v.value = 0; if (a) run() }, { immediate: true })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <span class="nd-countup" data-kind="countup" :data-value="Math.round(v)">{{ text }}</span>
</template>
