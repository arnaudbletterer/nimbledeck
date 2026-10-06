<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { sfx } from '../composables/useSound'

// A number that counts up when its slide appears: <CountUp :to="3200" suffix="K" />. Uses the display font.
// `delay` waits that many ms before counting (to stagger several numbers). `decimal` is the decimal separator: "." by default, "," for a French deck (<CountUp :to="3.5" :decimals="1" decimal="," />).
const props = withDefaults(defineProps<{ to: number; duration?: number; decimals?: number; prefix?: string; suffix?: string; decimal?: string; delay?: number; quiet?: boolean }>(), { duration: 1200, decimals: 0, prefix: '', suffix: '', decimal: '.', delay: 0 })
const v = ref(0)
const done = ref(false)   // the number has reached its value; a tour waits for it
let raf = 0, timer = 0
const text = computed(() => props.prefix + v.value.toFixed(props.decimals).replace('.', props.decimal) + props.suffix)
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
function run() {
  cancelAnimationFrame(raf); clearTimeout(timer)
  if (reduce) { v.value = props.to; done.value = true; return }
  const go = () => {
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / props.duration)
      v.value = props.to * (1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(step); else { done.value = true; if (!props.quiet) sfx('pop', { volume: 0.3, pitch: 300, gap: 120 }) }   // a soft pop when the number lands
    }
    raf = requestAnimationFrame(step)
  }
  if (props.delay > 0) timer = window.setTimeout(go, props.delay); else go()
}
const active = useActive()
watch(active, (a) => { v.value = 0; done.value = false; if (a) run(); else { cancelAnimationFrame(raf); clearTimeout(timer) } }, { immediate: true })
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer) })
</script>

<template>
  <span class="nd-countup" data-kind="countup" :data-done="done" :data-value="Math.round(v)">{{ text }}</span>
</template>
