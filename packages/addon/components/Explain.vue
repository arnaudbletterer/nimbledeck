<script setup lang="ts">
import { computed, inject } from 'vue'

// The explanation panel of a <Quiz>. Inside an interactive quiz it appears once an answer is picked.
defineProps<{ letter: string }>()
const quiz = inject<any>('ndQuiz', null)
const shown = computed(() => !quiz || !quiz.interactive.value || quiz.revealed.value)
</script>

<template>
  <Transition name="nd-rise">
    <div v-if="shown" class="nd-explain"><strong>{{ letter }}</strong><div class="nd-explain-body"><slot /></div></div>
  </Transition>
</template>
