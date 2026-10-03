<script setup lang="ts">
// A box in slide coordinates (the slide canvas is 1280x720) in which <At> children are layered freely.
// Content area of a normal slide: up to 1140 x 500. `full` makes it the whole slide (use with layout: full).
// Anything outside the box is clipped, so a child can never spill over the rest of the slide.
const props = withDefaults(defineProps<{ w?: number; h?: number; full?: boolean }>(), { w: 1140, h: 460 })
</script>

<template>
  <div class="nd-stage" :class="{ 'nd-stage-full': full }" :style="full ? undefined : { width: w + 'px', height: h + 'px' }"><slot /></div>
</template>
