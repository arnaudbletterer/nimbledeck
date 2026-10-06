<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useNav } from '@slidev/client'
import configs from '#slidev/configs'
import { sound, soundOn } from '../composables/useSound'
import { parseSounds } from '../composables/tourScript.mjs'
import { tourState } from '../composables/tourEngine'

// The deck's music and the soundtrack of the tour (see docs/TOUR.md). Nothing is drawn.
//   headmatter   ndSound: uplift         a bed that plays while sound is on, and ducks under cues
//                ndSlideSound: whoosh    a cue on every slide change, in the tour
//   per slide    sound: pop              one cue on entry, in the tour
//                sounds: [{ at, src, volume, when }]   cues at offsets from the slide's entry, in the tour
// The cues are the soundtrack of the tour video: they play only while the tour does (`when: always` on a cue lifts that) and
// stop when the viewer takes over. Sounds for what happens on the page (a click, a landing number) come from the components.
// Sound plays only after the viewer has switched it on (see the sound engine).
const { currentPage, slides } = useNav()
const head = configs as Record<string, unknown>
let timers: number[] = []
let first = true

const clear = () => { timers.forEach(clearTimeout); timers = []; sound.stopScope('cue') }
const slideFm = () => (slides.value[currentPage.value - 1] as any)?.meta?.slide?.frontmatter ?? {}
const alwaysCues = () => parseSounds({ sound: slideFm().sound, sounds: slideFm().sounds }).cues.some((c: any) => c.when === 'always')
function enter(changed: boolean) {
  clear()
  if (!soundOn.value) { sound.stopBed(); return }
  const bed = head.ndSound as string | undefined
  if (bed) sound.startBed(bed); else sound.stopBed()
  if (!tourState.playing && !alwaysCues()) return
  const fm = slideFm()
  const { cues } = parseSounds({ sound: fm.sound, sounds: fm.sounds })
  const every = head.ndSlideSound as string | undefined
  if (every && changed && tourState.playing) cues.unshift({ at: 0, src: every, volume: 0.9, when: 'tour' })
  for (const c of cues) {
    if (c.at <= 0) sound.cue(c.src, c)
    else timers.push(window.setTimeout(() => sound.cue(c.src, c), c.at * 1000))
  }
}

watch(currentPage, () => { enter(!first); first = false })
watch(soundOn, () => enter(false))
watch(() => tourState.playing, () => enter(false))   // the tour starts: this slide's soundtrack begins; it ends: it stops

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
