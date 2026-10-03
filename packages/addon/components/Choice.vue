<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted } from 'vue'

// One answer of a <Quiz>: a letter badge beside the text. `correct` highlights it statically (answer slide).
const props = defineProps<{ letter: string; correct?: boolean }>()
const quiz = inject<any>('ndQuiz', null)
let unregister = () => {}
onMounted(() => { unregister = quiz?.register(props.letter) ?? (() => {}) })
onUnmounted(() => unregister())

const interactive = computed(() => !!quiz?.interactive.value)
const isRight = computed(() => props.correct || (quiz?.revealed.value && quiz.answer.value === props.letter))
const isWrong = computed(() => quiz?.revealed.value && quiz.picked.value === props.letter && quiz.answer.value !== props.letter)
const isDim = computed(() => quiz?.revealed.value && !isRight.value && !isWrong.value)
const pick = () => quiz?.pick(props.letter)
</script>

<template>
  <div class="nd-choice" :class="{ 'nd-correct': isRight, 'nd-wrong': isWrong, 'nd-faded': isDim, 'nd-interactive': interactive && !quiz?.revealed.value }"
       :role="interactive ? 'button' : undefined" :tabindex="interactive ? 0 : undefined" :aria-pressed="quiz?.picked.value === letter"
       @click.stop="pick" @keydown.enter.stop.prevent="pick" @keydown.space.stop.prevent="pick">
    <strong>{{ letter }}</strong><span><slot /></span>
  </div>
</template>
