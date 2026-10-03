<script setup lang="ts">
withDefaults(defineProps<{ url: string; frame?: boolean; caption?: boolean }>(), { frame: false, caption: false })
</script>

<template>
  <div class="nd-site" :class="{ 'nd-framed': frame }">
    <FrameGuard><iframe :src="url" referrerpolicy="no-referrer" /></FrameGuard>
    <div v-if="caption" class="nd-cap">Embedded site: {{ url }} <a :href="url" target="_blank">open in browser</a></div>
  </div>
</template>
