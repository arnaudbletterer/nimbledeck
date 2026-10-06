<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useActive } from '../composables/useActive'
import { useEntered } from '../composables/useEntered'
import { bgShapes } from '../composables/bgShapes'
import Aurora from './Aurora.vue'
import Shader from './Shader.vue'

// Every motion preset and every background preset of the theme, playing at once. Each motion card is a real mini slide
// (a `.slidev-layout` root carrying `data-nd-motion="<id>"`, 1280 x 720 scaled down), so the real preset CSS plays, not a
// copy. The cards replay in a diagonal wave, then rest, then do it again; hover or click a card to replay just that one.
// Under them a row of mini backdrops (`data-nd-bg="<id>"`) keeps moving. `width` is the logical width of the wall in slide
// pixels (it is never measured), `cols` the motion columns, `looks` the looks the cards take turns in (a card of an unknown look
// simply uses the deck's own), `period` the ms between two waves, `delay` the ms before the
// first. `backgrounds="false"` leaves the backdrop row out. The slide that holds it should have no motion of its own: a
// preset moves every title and list item below its root, and the cards bring their own. Reduced motion shows every card
// finished and plays nothing.
const props = withDefaults(defineProps<{ width?: number; cols?: number; period?: number; delay?: number; backgrounds?: boolean; looks?: string[] }>(), { width: 1160, cols: 7, period: 6500, delay: 900, backgrounds: true, looks: () => ['neon', 'sunset', 'studio', 'candy', 'blueprint', 'forest', 'ocean'] })
const FALLBACK_M = 'fade-up,cascade,slide-left,slide-right,drop,zoom,zoom-out,blur-in,focus,wipe,curtain,flip,pop,rise,typewriter,glitch,spotlight,swing,rubber,parallax,count'
const FALLBACK_B = 'aurora,shader,grid,mesh,noise,dots,waves,spotlight,stars,gradient'
const GAP = 12, GAP_B = 10
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const ids = (key: 'ndMotions' | 'ndBackgrounds', fallback: string) => ((typeof document !== 'undefined' && document.documentElement.dataset[key]) || fallback).split(',')
const name = (id: string) => { const w = id.replace(/-/g, ' '); return w.charAt(0).toUpperCase() + w.slice(1) }
const motions = computed(() => ids('ndMotions', FALLBACK_M))
const bgs = computed(() => (props.backgrounds ? ids('ndBackgrounds', FALLBACK_B) : []))
const cardW = computed(() => (props.width - (props.cols - 1) * GAP) / props.cols)
const bgW = computed(() => (props.width - (bgs.value.length - 1) * GAP_B) / Math.max(1, bgs.value.length))
const cardStyle = (w: number) => ({ width: w + 'px', height: (w * 9) / 16 + 'px', '--k': w / 1280 })
// `count` and `flip` are made for cards of figures; every other preset gets a title, a list and a callout.
const cards = (id: string) => id === 'count' || id === 'flip'
const lookOf = (i: number) => props.looks[(i + 3 * Math.floor(i / props.cols)) % Math.max(1, props.looks.length)]

const active = useActive()
const on = useEntered(active)
const roots = new Map<number, HTMLElement>()
const timers = new Set<number>()
let cycle = 0
const later = (fn: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); fn() }, ms); timers.add(t) }
function stop() { clearInterval(cycle); cycle = 0; for (const t of timers) clearTimeout(t); timers.clear() }

// The typewriter preset types the title one character at a time: it needs where the text starts and how wide it is (the
// one place this component measures, as the slide layer does for a real slide).
function measureTitle(el: HTMLElement) {
  const title = el.querySelector('h1') as HTMLElement | null
  if (!title) return
  const r = document.createRange(); r.selectNodeContents(title)
  const t = r.getBoundingClientRect(), b = title.getBoundingClientRect(), k = title.offsetWidth ? b.width / title.offsetWidth : 0
  if (!k || !t.width) return
  el.style.setProperty('--nd-tw-x', `${((t.left - b.left) / k).toFixed(1)}px`); el.style.setProperty('--nd-tw-w', `${(t.width / k + 8).toFixed(1)}px`)
}
// Removing the attribute, letting the browser compute the style, and adding it back is what restarts the animations.
function play(i: number) {
  const el = roots.get(i), id = motions.value[i]
  if (!el || !id) return
  el.removeAttribute('data-nd-motion'); void el.offsetWidth
  el.style.setProperty('--nd-ch', String(Math.max(4, (el.querySelector('h1')?.textContent ?? '').trim().length || 12)))
  if (id === 'typewriter') measureTitle(el)
  el.setAttribute('data-nd-motion', id)
  const card = el.parentElement
  if (card) { card.classList.remove('nd-mw-ping'); void card.offsetWidth; card.classList.add('nd-mw-ping'); card.classList.add('nd-mw-seen') }
}
function click(i: number, e: MouseEvent) {
  if (e.detail) (e.currentTarget as HTMLElement | null)?.blur()          // a mouse click must not keep the arrow keys from turning the page
  play(i)
}
function wave() { motions.value.forEach((_, i) => later(() => play(i), ((i % props.cols) + Math.floor(i / props.cols)) * 140)) }

watch(active, (a) => {
  stop()
  if (!a) { roots.forEach((el) => { el.removeAttribute('data-nd-motion'); el.parentElement?.classList.remove('nd-mw-seen') }); return }
  if (reduce) return
  later(() => { wave(); cycle = window.setInterval(wave, props.period) }, props.delay)
}, { immediate: true, flush: 'post' })
onBeforeUnmount(stop)

const hook = (i: number) => (el: unknown) => { if (el) roots.set(i, el as HTMLElement); else roots.delete(i) }
</script>

<template>
  <div class="nd-mw" :class="{ 'nd-mw-on': on || reduce }" data-wall="motion" role="group" aria-label="Motion and background presets" :style="{ width: width + 'px' }">
    <p class="nd-mw-tag"><b>{{ motions.length }}</b> motions<span>, one line each</span></p>
    <div class="nd-mw-grid" :style="{ gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap: GAP + 'px' }">
      <button v-for="(id, i) in motions" :key="id" type="button" class="nd-mw-card" :class="{ 'nd-mw-seen': reduce }" :style="{ ...cardStyle(cardW), '--i': i }" :data-nd-variant="lookOf(i)" :aria-label="`Replay ${name(id)}`"
        @click.stop="click(i, $event)" @pointerenter="active && !reduce && play(i)" @keydown.enter.stop @keydown.space.stop>
        <div :ref="hook(i)" class="slidev-layout nd-root nd-mw-slide" :class="cards(id) ? 'numbers' : 'default'">
          <div class="nd-body">
            <h1>{{ name(id) }}</h1>
            <template v-if="!cards(id)">
              <ul><li>Markdown in</li><li>Motion out</li></ul>
              <blockquote><p>One line of frontmatter</p></blockquote>
            </template>
          </div>
          <div v-if="cards(id)" class="nd-nums nd-n4">
            <div class="nd-num"><h2>21</h2><p>motions</p></div>
            <div class="nd-num"><h2>10</h2><p>backdrops</p></div>
            <div class="nd-num"><h2>20</h2><p>looks</p></div>
            <div class="nd-num"><h2>0</h2><p>CSS lines</p></div>
          </div>
        </div>
      </button>
    </div>
    <p v-if="bgs.length" class="nd-mw-tag nd-mw-tag-b"><b>{{ bgs.length }}</b> backdrops<span>, same idea</span></p>
    <div v-if="bgs.length" class="nd-mw-bgs" :style="{ gridTemplateColumns: `repeat(${bgs.length}, ${bgW}px)`, gap: GAP_B + 'px' }">
      <div v-for="(id, i) in bgs" :key="id" class="nd-mw-bg" :style="{ ...cardStyle(bgW), '--i': i }" :data-bg-name="name(id)">
        <div class="slidev-layout nd-root nd-mw-slide nd-mw-bgslide" :data-nd-bg="active ? id : undefined" data-nd-scrim="none">
          <div v-if="active" class="nd-bgx" aria-hidden="true">
            <Aurora v-if="id === 'aurora'" :intensity="1" />
            <Shader v-else-if="id === 'shader'" :intensity="1.1" :lines="0.4" />
            <template v-else-if="id === 'stars'"><i v-for="(s, j) in bgShapes.stars" :key="j" class="nd-star" :style="{ width: s.size + 'px', height: s.size + 'px', boxShadow: s.shadow }" /></template>
            <template v-else-if="id === 'waves'"><svg v-for="(d, j) in bgShapes.waves" :key="j" class="nd-waves" viewBox="0 0 2560 720" preserveAspectRatio="none"><path :d="d" /></svg></template>
            <template v-else><i /><i /><i /></template>
          </div>
          <span class="nd-mw-bgname">{{ name(id) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
