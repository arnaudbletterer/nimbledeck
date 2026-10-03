<script setup lang="ts">
// An image as a plain element. Fills its box; `fit` is "cover" or "contain"; `position` is the crop focus (e.g. "30% 50%").
// `dim` (0 to 1) darkens it so text on top stays readable.
withDefaults(defineProps<{ src: string; fit?: 'cover' | 'contain'; position?: string; dim?: number }>(), { fit: 'cover', position: 'center', dim: 0 })
</script>

<template>
  <div class="nd-media">
    <img class="nd-photo-img" :src="src" :style="{ objectFit: fit, objectPosition: position }">
    <div v-if="dim" class="nd-dim" :style="{ opacity: dim }" />
  </div>
</template>
