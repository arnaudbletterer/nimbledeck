import { ref } from 'vue'
import { createSoundManager } from './soundManager.mjs'

// The one sound engine of the page, and a reactive flag for controls. Off until the viewer opts in (see soundManager.mjs).
export const sound = createSoundManager()
export const soundOn = ref(sound.enabled)
sound.subscribe((v: boolean) => { soundOn.value = v })
export const setSound = (on: boolean) => sound.setEnabled(on)
export const toggleSound = () => sound.setEnabled(!sound.enabled)
// For tests and the console: window.__ndSound.log lists the cues that were started, .state is the AudioContext state.
;(globalThis as any).__ndSound = sound
