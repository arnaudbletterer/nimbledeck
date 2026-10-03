<script setup lang="ts">
defineProps<{ url: string }>()
</script>

<template>
  <div class="nd-site">
    <iframe :src="url" referrerpolicy="no-referrer" />
    <div class="nd-cap">Embedded site: {{ url }} <a :href="url" target="_blank">open in browser</a></div>
  </div>
</template>
