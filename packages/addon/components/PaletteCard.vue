<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SlideContainer from '@slidev/client/internals/SlideContainer.vue'
import SlideWrapper from '@slidev/client/internals/SlideWrapper.vue'
import { createFixedClicks } from '@slidev/client/composables/useClicks.ts'
import { CLICKS_MAX } from '@slidev/client/constants.ts'

// One result: a thumbnail drawn by Slidev's own renderer (with every build shown), created only when the card is on screen.
const props = defineProps<{ route: any; width: number }>()
const el = ref<HTMLElement>()
const seen = ref(false)
let io: IntersectionObserver | undefined
onMounted(() => {
  if (!('IntersectionObserver' in window)) { seen.value = true; return }
  io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen.value = true; io?.disconnect() } }, { rootMargin: '200px' })
  el.value && io.observe(el.value)
})
onUnmounted(() => io?.disconnect())
</script>

<template>
  <div ref="el" class="nd-pal-thumb" :style="{ width: width + 'px', height: Math.round(width * 9 / 16) + 'px' }">
    <SlideContainer v-if="seen" :width="width" :use-snapshot="false" class="nd-pal-slide">
      <SlideWrapper :clicks-context="createFixedClicks(route, CLICKS_MAX)" :route="route" render-context="overview" />
    </SlideContainer>
  </div>
</template>
