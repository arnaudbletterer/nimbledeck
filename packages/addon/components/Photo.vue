<script setup lang="ts">
// An image as a plain element. Fills its box; `fit` is "cover" or "contain"; `position` is the crop focus (e.g. "30% 50%").
// `dim` (0 to 1) darkens it so text on top stays readable.
import { computed, ref } from 'vue'
import { asset } from '../composables/asset.mjs'
const failed = ref(false)   // a remote image that cannot load (offline) gets a quiet note instead of a broken icon
const props = withDefaults(defineProps<{ src: string; fit?: 'cover' | 'contain'; position?: string; dim?: number }>(), { fit: 'cover', position: 'center', dim: 0 })
const url = computed(() => asset(props.src))   // "/a.jpg" follows the base path of the build
</script>

<template>
  <div class="nd-media">
    <img v-show="!failed" class="nd-photo-img" :src="url" @error="failed = /^https?:/.test(src)" :style="{ objectFit: fit, objectPosition: position }">
    <div v-if="failed" class="nd-site-off"><p>This image is not available offline.</p><code>{{ src }}</code></div>
    <div v-if="dim" class="nd-dim" :style="{ opacity: dim }" />
  </div>
</template>
