<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useNav } from '@slidev/client'
import configs from '#slidev/configs'
import { sound, soundOn } from '../composables/useSound'
import { parseSounds } from '../composables/tourScript.mjs'

// Plays the sounds a deck asks for in its frontmatter (see docs/TOUR.md). Nothing is drawn.
//   headmatter   ndSound: uplift         a bed that plays while sound is on, and ducks under cues
//                ndSlideSound: whoosh    a cue on every slide change
//   per slide    sound: pop              one cue on entry
//                sounds: [{ at, src, volume }]   cues at offsets from the slide's entry
// The cues start from the slide's entry, in the tour and when browsing by hand, and stop when the slide is left.
// Sound plays only after the viewer has switched it on (see the sound engine).
const { currentPage, slides } = useNav()
const head = configs as Record<string, unknown>
let timers: number[] = []
let first = true

const clear = () => { timers.forEach(clearTimeout); timers = []; sound.stopScope('cue') }
function enter(changed: boolean) {
  clear()
  if (!soundOn.value) { sound.stopBed(); return }
  const bed = head.ndSound as string | undefined
  if (bed) sound.startBed(bed); else sound.stopBed()
  const fm = (slides.value[currentPage.value - 1] as any)?.meta?.slide?.frontmatter ?? {}
  const { cues } = parseSounds({ sound: fm.sound, sounds: fm.sounds })
  const every = head.ndSlideSound as string | undefined
  if (every && changed) cues.unshift({ at: 0, src: every, volume: 0.9 })
  for (const c of cues) {
    if (c.at <= 0) sound.play(c.src, { volume: c.volume })
    else timers.push(window.setTimeout(() => sound.play(c.src, { volume: c.volume }), c.at * 1000))
  }
}

watch(currentPage, () => { enter(!first); first = false })
watch(soundOn, () => enter(false))

// A viewer who left sound on in an earlier visit: the browser lets the context start only on a gesture, so wait for one.
const unlock = (e: Event) => { if (!e.isTrusted) return; const had = sound.state !== 'none'; sound.unlock(); if (!had && sound.state !== 'none') enter(false) }
onMounted(() => {
  first = false
  window.addEventListener('keydown', unlock, true)
  window.addEventListener('pointerdown', unlock, true)
  if (soundOn.value && sound.state !== 'none') enter(false)
})
onUnmounted(() => { window.removeEventListener('keydown', unlock, true); window.removeEventListener('pointerdown', unlock, true); clear(); sound.stopBed() })
</script>

<template><span hidden /></template>
