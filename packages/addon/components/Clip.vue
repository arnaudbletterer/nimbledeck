<script setup lang="ts">
// A video as a plain element. Fills its box; `fit` is "cover" (crop) or "contain" (letterbox). No controls by default.
// `dim` (0 to 1) darkens it so text on top stays readable.
withDefaults(defineProps<{ src: string; fit?: 'cover' | 'contain'; controls?: boolean; loop?: boolean; muted?: boolean; autoplay?: boolean; dim?: number }>(),
  { fit: 'contain', controls: false, loop: true, muted: true, autoplay: true, dim: 0 })
</script>

<template>
  <div class="nd-media">
    <video class="nd-clip" :src="src" :style="{ objectFit: fit }" :autoplay="autoplay" :muted="muted" :loop="loop" :controls="controls" playsinline />
    <div v-if="dim" class="nd-dim" :style="{ opacity: dim }" />
  </div>
</template>
