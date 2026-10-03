<script setup lang="ts">
// The follow-up panel that explains the right answer: a large letter badge and a paragraph.
defineProps<{ letter: string }>()
</script>

<template>
  <div class="nd-explain"><strong>{{ letter }}</strong><div class="nd-explain-body"><slot /></div></div>
</template>
