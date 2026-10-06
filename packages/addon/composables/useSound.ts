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
// What happened on the page, as a sound: `sfx('pop', { pitch: 200 })`. Silent and free when sound is off, rate limited, and
// every component that calls it has a `quiet` prop. The tour's synthetic events reach it too, so the video is aligned for free.
export const sfx = (name: string, o?: { volume?: number; pitch?: number; gap?: number; key?: string }) => { if (sound.enabled) sound.sfx(name, o) }
