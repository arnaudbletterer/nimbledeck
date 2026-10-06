<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useActive } from './composables/useActive'
import Aurora from './components/Aurora.vue'
import Shader from './components/Shader.vue'
import { bgShapes } from './composables/bgShapes'

// Motion and background presets. Slidev renders this once inside every slide. It reads `motion` / `background` / `scrim` from the
// slide's frontmatter (falling back to the deck's `ndMotion` / `ndBackground` / `ndScrim`) and puts the answer on the slide's
// `.slidev-layout` root as `data-nd-motion`, `data-nd-bg` and `data-nd-scrim`. All the looks live in CSS keyed on those attributes
// (see styles/motion.css and styles/backgrounds.css), so a layout needs no code for them. The only script here is the
// attribute swap on entry and, for a background, the layer that holds a canvas or a few shapes.
const { $slidev, $frontmatter, $page, $renderContext } = useSlideContext()
const { currentPage } = useNav()

// A preset id is a bare word. Anything else (a path, a URL, a colour: `background:` is also Slidev's image key) is not ours.
const pick = (v: unknown) => { const s = String(v ?? '').trim().toLowerCase(); return /^[a-z][a-z0-9-]*$/.test(s) && s !== 'none' && s !== 'false' ? s : '' }
const conf = () => $slidev.configs as Record<string, unknown>
const motion = computed(() => pick($frontmatter.motion ?? conf().ndMotion))
const bg = computed(() => pick($frontmatter.background ?? conf().ndBackground))
const scrim = computed(() => { const s = String($frontmatter.scrim ?? conf().ndScrim ?? '').trim().toLowerCase(); return ['none', 'soft', 'strong'].includes(s) ? s : 'soft' })

// Overview, print and export render slides too; they show the final state, so they get no attributes at all.
const live = computed(() => ['slide', 'presenter'].includes(String($renderContext?.value ?? 'slide')))
const current = computed(() => $page.value === currentPage.value)
const active = useActive()

const anchor = ref<HTMLElement>()
const host = ref<HTMLElement | null>(null)   // the slide's .slidev-layout
const tone = ref({ bg: '', ink: '' })        // the colours the layout really paints, for a background laid under them
let mo: MutationObserver | undefined

// The layout is a sibling of this component, and it may mount after us (Slidev loads slides lazily).
function find() {
  const el = anchor.value?.parentElement?.querySelector(':scope > .slidev-layout') as HTMLElement | null | undefined
  if (el) { host.value = el; mo?.disconnect(); mo = undefined }
  return !!el
}
onMounted(() => {
  if (find() || !anchor.value?.parentElement) return
  mo = new MutationObserver(find)
  mo.observe(anchor.value.parentElement, { childList: true })
})

function readTone(el: HTMLElement) {
  const cs = getComputedStyle(el)
  const opaque = cs.backgroundColor && !/rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor)
  tone.value = { bg: opaque ? cs.backgroundColor : '', ink: cs.color }
}

// Setting the same attribute again does not restart a CSS animation. Removing it, letting the browser compute the style, and
// adding it back does: that is also how a slide replays on re-entry, and how a playground replays a preset.
function replay(el: HTMLElement, name: string, value: string, between?: () => void) {
  el.removeAttribute(name); void el.offsetWidth; between?.(); el.setAttribute(name, value)
}
// Where the title's text starts and how wide it is, in slide units, so the typewriter preset can reveal it a character at a time.
function measureTitle(el: HTMLElement, title: HTMLElement | null) {
  if (!title) return
  const r = document.createRange(); r.selectNodeContents(title)
  const t = r.getBoundingClientRect(), b = title.getBoundingClientRect()
  const k = title.offsetWidth ? b.width / title.offsetWidth : 0          // the slide's scale on screen
  if (!k || !t.width) return
  el.style.setProperty('--nd-tw-x', `${((t.left - b.left) / k).toFixed(1)}px`)
  el.style.setProperty('--nd-tw-w', `${(t.width / k + 8).toFixed(1)}px`)
}
function clear(el: HTMLElement) {
  for (const a of ['data-nd-motion', 'data-nd-bg', 'data-nd-scrim']) el.removeAttribute(a)
  for (const v of ['--nd-ch', '--nd-tw-x', '--nd-tw-w']) el.style.removeProperty(v)
}

let timer = 0
watch([host, live, current, motion, bg, scrim], () => {
  const el = host.value; if (!el) return
  clearTimeout(timer)
  if (!live.value) { clear(el); return }
  if (!current.value) {
    // The slide is leaving: keep its look while it fades out, then drop the attributes so the next visit replays.
    timer = window.setTimeout(() => { if (!current.value) clear(el) }, 700)
    return
  }
  readTone(el)
  const title = el.querySelector('h1') as HTMLElement | null
  el.style.setProperty('--nd-ch', String(Math.max(4, (title?.textContent ?? '').trim().length || 20)))   // the typewriter preset types this many characters
  if (motion.value) replay(el, 'data-nd-motion', motion.value, motion.value === 'typewriter' ? () => measureTitle(el, title) : undefined)
  else el.removeAttribute('data-nd-motion')
  if (bg.value) { replay(el, 'data-nd-bg', bg.value); el.setAttribute('data-nd-scrim', scrim.value) } else { el.removeAttribute('data-nd-bg'); el.removeAttribute('data-nd-scrim') }
}, { flush: 'post', immediate: true })
onBeforeUnmount(() => { clearTimeout(timer); mo?.disconnect() })

// The background layer exists only while the slide is on screen (or fading out), so an idle slide costs nothing.
const layer = computed(() => !!host.value && !!bg.value && live.value && active.value)

const { stars, waves } = bgShapes
</script>

<template>
  <span ref="anchor" hidden />
  <Teleport v-if="layer" :to="host!">
    <div class="nd-bgx" :style="{ '--nd-bg': tone.bg || undefined, '--nd-ink': tone.ink || undefined }" aria-hidden="true">
      <Aurora v-if="bg === 'aurora'" :intensity="0.75" />
      <Shader v-else-if="bg === 'shader'" :intensity="0.5" :lines="0.2" />
      <template v-else-if="bg === 'stars'"><i v-for="(s, i) in stars" :key="i" class="nd-star" :style="{ width: s.size + 'px', height: s.size + 'px', boxShadow: s.shadow }" /></template>
      <template v-else-if="bg === 'waves'"><svg v-for="(d, i) in waves" :key="i" class="nd-waves" viewBox="0 0 2560 720" preserveAspectRatio="none"><path :d="d" /></svg></template>
      <template v-else><i /><i /><i /></template>
    </div>
  </Teleport>
</template>
