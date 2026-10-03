<script setup lang="ts">
// One answer of a <Quiz>: a letter badge beside the text. `correct` highlights the text (use it on the answer slide).
defineProps<{ letter: string; correct?: boolean }>()
</script>

<template>
  <div class="nd-choice" :class="{ 'nd-correct': correct }"><strong>{{ letter }}</strong><span><slot /></span></div>
</template>
