<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// A circular countdown that starts when its slide appears. Click to pause or restart. Emits `done` at zero.
const props = withDefaults(defineProps<{ seconds?: number; autostart?: boolean }>(), { seconds: 30, autostart: true })
const emit = defineEmits<{ done: [] }>()
const left = ref(props.seconds)
const running = ref(false)
let raf = 0, last = 0
const R = 54, C = 2 * Math.PI * R
const dash = computed(() => C * (1 - left.value / props.seconds))
const label = computed(() => Math.ceil(left.value))

function tick(ts: number) {
  const dt = last ? (ts - last) / 1000 : 0; last = ts
  left.value = Math.max(0, left.value - dt)
  if (left.value <= 0) { running.value = false; emit('done'); return }
  raf = requestAnimationFrame(tick)
}
function start() { cancelAnimationFrame(raf); last = 0; running.value = true; raf = requestAnimationFrame(tick) }
function stop() { cancelAnimationFrame(raf); running.value = false }
function toggle() { if (left.value <= 0) { left.value = props.seconds; start() } else if (running.value) stop(); else start() }
const active = useActive()
watch(active, (a) => { stop(); left.value = props.seconds; if (a && props.autostart) start() }, { immediate: true })
onUnmounted(stop)
</script>

<template>
  <button class="nd-countdown" :class="{ 'nd-done': left <= 0, 'nd-urgent': left > 0 && left <= 5 }" data-kind="countdown" :data-left="label" @click.stop="toggle" :aria-label="`${label} seconds left`">
    <svg viewBox="0 0 120 120"><circle class="nd-ring-bg" cx="60" cy="60" :r="R" /><circle class="nd-ring" cx="60" cy="60" :r="R" :stroke-dasharray="C" :stroke-dashoffset="dash" /></svg>
    <span class="nd-count">{{ label }}</span>
  </button>
</template>
