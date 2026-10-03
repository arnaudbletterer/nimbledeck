<script setup lang="ts">
// Large display text for impactful slides. `size` xl | l | m; `tone` light (white, for dark images) | dark.
withDefaults(defineProps<{ size?: 'xl' | 'l' | 'm'; tone?: 'light' | 'dark'; align?: 'left' | 'center' | 'right' }>(), { size: 'xl', tone: 'light', align: 'left' })
</script>

<template>
  <div class="nd-headline" :class="[`nd-h-${size}`, `nd-tone-${tone}`]" :style="{ textAlign: align }"><slot /></div>
</template>
