<script setup lang="ts">
import { ref } from 'vue'
import Typewriter from './Typewriter.vue'

// A window with three dots and a title that types a shell session: <Terminal title="nimbledeck" :lines="['$ npm test', 'ok 60 tests']" />.
// A line starting with "$ " is typed, any other line appears as output after a short pause. Like Typewriter, the root gets
// the class `nd-done` once everything is shown. Leaving the slide resets it.
withDefaults(defineProps<{ title?: string; lines: string[]; speed?: number; delay?: number; size?: number | string; quiet?: boolean }>(), { title: 'terminal', speed: 34, delay: 500 })
const done = ref(false)
</script>

<template>
  <div class="nd-term" :class="{ 'nd-done': done }" data-kind="terminal">
    <div class="nd-term-bar" aria-hidden="true"><span class="nd-term-dots"><i /><i /><i /></span><span class="nd-term-title">{{ title }}</span></div>
    <div class="nd-term-body"><Typewriter :text="lines.join('\n')" lang="sh" :speed="speed" :delay="delay" :size="size" :quiet="quiet" @done="(v) => (done = v)" /></div>
  </div>
</template>
