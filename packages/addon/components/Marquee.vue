<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// Slot content that scrolls sideways for ever: <Marquee :speed="40" gap="2em"> ... </Marquee>. `speed` is in slide pixels
// per second. The content is repeated enough times to fill the slide (1280 wide) and the loop is a pure CSS animation
// that is paused while the slide is off screen. It measures the width of its content, never its own box.
const props = withDefaults(defineProps<{ speed?: number; gap?: string }>(), { speed: 40, gap: '2em' })
const SLIDE = 1280
const set = ref<HTMLElement>()
const width = ref(0)
const active = useActive()
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// A hidden slide measures 0: keep the last good width (or the guess below) instead of trusting it.
const measure = () => { const w = set.value?.offsetWidth ?? 0; if (w > 0) width.value = w }
onMounted(() => { measure(); document.fonts?.ready.then(measure) })
watch(active, (a) => { if (a) nextTick(measure) })
watch(() => props.gap, () => nextTick(measure))

const copies = computed(() => Math.max(2, Math.ceil(SLIDE / (width.value || SLIDE)) + 1))
const seconds = computed(() => (width.value || 800) / Math.max(1, props.speed))
</script>

<template>
  <div class="nd-marquee" :class="{ 'nd-mq-run': active && !reduce }" :style="{ '--nd-mq-gap': gap, '--nd-mq-w': (width || 800) + 'px', '--nd-mq-t': seconds + 's' }" data-kind="marquee">
    <div class="nd-mq-track">
      <div v-for="i in copies" :key="i" :ref="(el) => { if (i === 1) set = el as HTMLElement }" class="nd-mq-set" :aria-hidden="i > 1 ? 'true' : undefined"><slot /></div>
    </div>
  </div>
</template>
