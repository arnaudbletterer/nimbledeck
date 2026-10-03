<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'

// An answer grid. Static: mark the right <Choice> with `correct`. Interactive: give the quiz an `answer` letter and the
// presenter clicks an answer (or presses its number key) to get feedback: the picked answer turns good or bad, the right
// one is revealed, the others fade, and an <Explain> placed inside the quiz appears. Leaving the slide resets it.
const props = defineProps<{ answer?: string }>()
const picked = ref<string | null>(null)
const letters = ref<string[]>([])
const interactive = computed(() => !!props.answer)
const revealed = computed(() => interactive.value && picked.value !== null)
const right = computed(() => picked.value !== null && picked.value === props.answer)
const verdict = computed(() => (right.value ? 'Correct' : `Not quite. The answer is ${props.answer}.`))

provide('ndQuiz', {
  answer: computed(() => props.answer),
  picked, interactive, revealed,
  register: (l: string) => { letters.value.push(l); return () => { letters.value = letters.value.filter((x) => x !== l) } },
  pick: (l: string) => { if (interactive.value && picked.value === null) picked.value = l },
})

const active = useActive()
watch(active, (a) => { if (!a) picked.value = null })
const onKey = (e: KeyboardEvent) => {
  if (!active.value || !interactive.value || e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return   // typing a number in a field is not an answer
  const l = letters.value[Number(e.key) - 1]
  if (l && picked.value === null) { picked.value = l; e.preventDefault() }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="nd-quiz" :class="{ 'nd-revealed': revealed }" role="group" data-kind="quiz" :data-state="revealed ? (right ? 'good' : 'bad') : 'open'">
    <slot />
    <Transition name="nd-rise">
      <div v-if="revealed" class="nd-verdict" :class="right ? 'nd-good' : 'nd-bad'" aria-hidden="true">{{ verdict }}</div>
    </Transition>
    <!-- Always mounted: a live region is only announced when its text changes, not when it is inserted. -->
    <div class="nd-sr" role="status" aria-live="polite">{{ revealed ? verdict : '' }}</div>
  </div>
</template>
