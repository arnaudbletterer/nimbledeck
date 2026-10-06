<script setup lang="ts">
import { soundOn, toggleSound } from '../composables/useSound'

// The speaker button: sound is off until the viewer turns it on (a click is the gesture the browser needs). The label
// shows on hover and focus. `<SoundToggle label />` keeps the label visible. The state is stored by the sound engine.
defineProps<{ label?: boolean }>()
const HELP = 'Sound: music, plus effects when you click or when the tour plays'
</script>

<template>
  <button type="button" class="nd-sound-btn" :class="{ 'nd-sound-on': soundOn, 'nd-sound-label': label }" :aria-pressed="soundOn" :aria-label="(soundOn ? 'Sound on, switch off. ' : 'Sound off, switch on. ') + HELP" :title="HELP" data-kind="sound-toggle" @click.stop="toggleSound(); ($event.currentTarget as HTMLElement).blur()">
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5z" fill="currentColor" stroke="none" />
      <template v-if="soundOn"><path d="M16 9.2a4 4 0 0 1 0 5.6" /><path d="M18.6 6.6a7.6 7.6 0 0 1 0 10.8" /></template>
      <template v-else><path d="M16.2 9.6l4.6 4.8" /><path d="M20.8 9.6l-4.6 4.8" /></template>
    </svg>
    <span class="nd-sound-text">{{ soundOn ? 'Sound on' : 'Sound off' }}</span>
  </button>
</template>
