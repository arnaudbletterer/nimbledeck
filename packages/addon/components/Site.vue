<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

withDefaults(defineProps<{ url: string; frame?: boolean; caption?: boolean }>(), { frame: false, caption: false })
const { $renderContext } = useSlideContext()
const thumb = computed(() => $renderContext?.value === 'overview')   // a thumbnail must not load the website
</script>

<template>
  <div class="nd-site" :class="{ 'nd-framed': frame }">
    <div v-if="thumb" class="nd-thumb-note">{{ url }}</div>
    <FrameGuard v-else><iframe :src="url" referrerpolicy="no-referrer" /></FrameGuard>
    <div v-if="caption" class="nd-cap">Embedded site: {{ url }} <a :href="url" target="_blank">open in browser</a></div>
  </div>
</template>
