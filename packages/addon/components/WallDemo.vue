<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { replayPreset, resetWall, wall } from '../composables/wallState'
import BgLayer from './BgLayer.vue'
import Typewriter from './Typewriter.vue'

// The slide's own half of a wall: what a click on a card of <MotionWall> or <LookWall> shows on the slide itself.
//   kind="motion"  (put it on the slide itself, NOT inside a <Stage>: a preset leaves everything under a Stage alone; `x` and `y` place it)
//                  a title, the label of what was applied, and the typed frontmatter. They sit in one `.slidev-layout` root that
//                  carries `data-nd-motion`, so the REAL preset plays on them, again on every click.
//   kind="bg"      a full-slide layer that shows the clicked background for a few seconds (place it in an <At :w="1280" :h="720"> first).
//   kind="look"    the label `ndVariant: <id>` of the look the slide has taken.
// The slide that holds it needs `motion: none`, or its own preset would move these a second time. Reduced motion shows the
// label and the text at once and plays nothing.
const props = withDefaults(defineProps<{ kind?: 'motion' | 'bg' | 'look'; title?: string; x?: number; y?: number }>(), { kind: 'motion', title: 'One line.|Any motion.', x: 64, y: 20 })
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const active = useActive()
const root = ref<HTMLElement>()
const lines = computed(() => props.title.split('|'))
const ndVariant = () => (typeof document !== 'undefined' && document.documentElement.dataset.ndVariant) || 'plain'
const code = computed(() => `motion: ${wall.motion}\nbackground: ${wall.bg}\nndVariant: ${wall.look || ndVariant()}`)

watch(active, (a) => {
  if (!a) return
  resetWall(); wall.look = ndVariant()      // a slide that is entered starts clean (a slide that is left must not reset the next one)
  wall.label = props.kind === 'look' ? `ndVariant: ${wall.look}` : 'motion: pop'
  if (props.kind === 'motion' && !reduce) setTimeout(() => root.value && replayPreset(root.value, wall.motion), 60)
}, { immediate: true })
watch(() => wall.n, (n) => { if (n > 0 && props.kind === 'motion' && !reduce && root.value) replayPreset(root.value, wall.motion) }, { flush: 'post' })
</script>

<template>
  <div v-if="kind === 'motion'" class="nd-wd nd-wd-abs" data-wall="demo" :style="{ left: x + 'px', top: y + 'px' }">
    <div ref="root" class="slidev-layout nd-wd-root">
      <h1><span v-for="(l, i) in lines" :key="i">{{ l }}</span></h1>
      <p :key="wall.k" class="nd-wd-pill" :class="{ 'nd-wd-pop': wall.k > 0 && !reduce }">{{ wall.label }}</p>
      <Typewriter :text="code" lang="md" :speed="14" :delay="200" :size="28" :caret="false" />
    </div>
  </div>
  <div v-else-if="kind === 'bg'" class="nd-wd-bgwrap" :class="{ 'nd-wd-bgon': wall.bgOn }" data-wall="backdrop">
    <div class="slidev-layout nd-wd-bg" :data-nd-bg="wall.bgOn ? wall.bg : undefined" data-nd-scrim="soft"><BgLayer v-if="active && wall.bgOn" :id="wall.bg" /></div>
  </div>
  <div v-else class="nd-wd" data-wall="look"><p :key="wall.k" class="nd-wd-pill" :class="{ 'nd-wd-pop': wall.k > 1 && !reduce }">{{ wall.label }}</p><p class="nd-wd-hint">Hover to preview. Click to keep.</p></div>
</template>
