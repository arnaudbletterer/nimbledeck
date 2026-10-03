<script setup lang="ts">
defineProps<{ src: string }>()
</script>

<template>
  <video class="nd-clip" :src="src" autoplay muted loop controls playsinline />
</template>
