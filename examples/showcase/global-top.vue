<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNav } from '@slidev/client'
import SoundToggle from 'slidev-addon-nimbledeck/components/SoundToggle.vue'
import { begin, end, holdFor, isViewer, pageRoot, planOf, runSlide, settled } from 'slidev-addon-nimbledeck/composables/tourEngine'
import { setSound, sound, soundOn } from 'slidev-addon-nimbledeck/composables/useSound'

// The bar of the hosted site: wordmark, links, slide arrows, a tour that plays the deck by itself, a progress hairline,
// and a hint on the first slide. The site build injects `window.__ND_SITE__` (see website/build.mjs); without it (the
// dev server, the PDF export, any other build) this renders nothing and takes no room.
//
// The tour paces itself. A slide stays until its entrance has settled (nothing finite is still animating, typing or
// counting) plus a short reading hold, so a quiet slide goes fast and a rich one keeps its time. `tour: <seconds>` in a
// slide's frontmatter is the longest it may stay; `tourScript` (see docs/TOUR.md) keeps it at least until its last step is over.
type SiteLinks = { docs: string; playground: string; science?: string; github: string }
const site: SiteLinks | undefined = (window as unknown as { __ND_SITE__?: SiteLinks }).__ND_SITE__

const { currentPage, total, clicks, clicksTotal, hasNext, next, prev, go, slides, currentSlideRoute, isPrintMode } = useNav()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touch = window.matchMedia('(pointer: coarse)').matches

const MIN_SLIDE = 3        // seconds, the shortest a slide stays
const MAX_SLIDE = 6        // seconds, the longest it stays unless its frontmatter says `tour: <seconds>`
const MIN_STEP = 2         // seconds, floor for one click build of a slide that has several
const GUESS = 4.2          // seconds, what the clock assumes for a slide it has not seen yet and that has no `tour:`
const MARGIN = 0.3         // seconds a script keeps the slide after its last step (the reading hold comes on top)
const TICK = 100           // ms, how often the tour looks at the slide

const playing = ref(false)
const idle = ref(false)
const moved = ref(false)   // the visitor has left the first slide: the hint goes away for good
const tourSound = ref(true)   // the big button's "with sound": what starting the tour does to the sound
let ticker = 0
let idleTimer = 0

const fmOf = (route: any) => route?.meta?.slide?.frontmatter ?? {}
const explicit = (route: any) => { const v = Number(fmOf(route).tour); return v > 0 ? v : 0 }
const minOf = (route: any) => Math.max(MIN_SLIDE, planOf(fmOf(route)).end + MARGIN)
const maxOf = (route: any) => Math.max(explicit(route) || MAX_SLIDE, minOf(route))
const guess = (route: any) => Math.min(maxOf(route), Math.max(minOf(route), explicit(route) ? explicit(route) * 0.85 : GUESS))
// The tour is a video: it has a length, and a clock. Slides already played count for the time they took; the others for
// a guess, so the length is known up front and corrects itself as the tour goes (the elapsed time never goes back).
const spent = ref<Record<number, number>>({})
const stepStart = ref(0)
const slideStart = ref(0)
const now = ref(0)
let clock = 0
const before = computed(() => (slides.value as any[]).slice(0, currentPage.value - 1).reduce((a, r, i) => a + (spent.value[i + 1] ?? guess(r)), 0))
const inSlide = computed(() => (playing.value ? Math.max(0, (now.value - slideStart.value) / 1000) : 0))
const elapsed = computed(() => before.value + inSlide.value)
const length = computed(() => {
  const list = slides.value as any[]
  const later = list.slice(currentPage.value).reduce((a, r) => a + guess(r), 0)
  return before.value + Math.max(inSlide.value, guess(list[currentPage.value - 1])) + later
})
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
const atEnd = computed(() => !hasNext.value)

let settledAt = 0, holdMs = 0
function stop() { playing.value = false; clearInterval(ticker); clearInterval(clock); end() }
// One line per slide for whoever measures the pacing: window.addEventListener('nd-tour-slide', ...).
function report(why: string) {
  const t = (performance.now() - slideStart.value) / 1000
  spent.value = { ...spent.value, [currentPage.value]: t }
  window.dispatchEvent(new CustomEvent('nd-tour-slide', { detail: { page: currentPage.value, spent: t, settled: settledAt ? (settledAt - slideStart.value) / 1000 : null, why } }))
}
function advance(why: string) {
  if (!hasNext.value) { report(why); stop(); return }
  if (clicks.value >= clicksTotal.value) report(why)
  settledAt = 0
  next()
}
function tick() {
  now.value = performance.now()
  if (!playing.value) return
  const route = currentSlideRoute.value, steps = clicksTotal.value + 1, last = clicks.value >= clicksTotal.value
  const ts = (now.value - stepStart.value) / 1000, t = (now.value - slideStart.value) / 1000
  const max = steps === 1 ? maxOf(route) : Math.max(MIN_STEP, maxOf(route) / steps)
  const min = steps === 1 ? minOf(route) : MIN_STEP
  if (ts >= max) return advance('max')
  const root = pageRoot(currentPage.value)
  if (ts >= min && (!last || t >= minOf(route)) && settled(root)) {
    if (!settledAt) { settledAt = now.value; holdMs = holdFor(root) * 1000 }
    if (now.value - settledAt >= holdMs) advance('settled')
  } else settledAt = 0
}
// A new slide, a new click build, or the tour starting: restart the clock of the step, and play the script on a new slide.
function enter(newSlide: boolean) {
  settledAt = 0
  stepStart.value = now.value = performance.now()
  if (newSlide) {
    slideStart.value = now.value
    runSlide(currentPage.value, planOf(fmOf(currentSlideRoute.value)).steps)
  }
}
watch(currentPage, () => { if (playing.value) enter(true) })
watch(clicks, () => { if (playing.value) enter(false) })
watch([currentPage, clicks], () => { if (currentPage.value > 1 || clicks.value > 0) moved.value = true })

let soundApplied = false
function play(gesture = true) {
  if (atEnd.value) { go(1); spent.value = {} }   // a finished tour plays again from the start
  if (gesture && !soundApplied) { soundApplied = true; if (tourSound.value) setSound(true) }
  begin()
  playing.value = true
  enter(true)
  clearInterval(clock); clearInterval(ticker)
  clock = window.setInterval(() => { now.value = performance.now() }, 200)
  ticker = window.setInterval(tick, TICK)
}
function toggle(e?: Event) {
  if (playing.value) stop(); else play()
  ;(e?.currentTarget as HTMLElement | undefined)?.blur()   // a focused button would also react to the Space key that Slidev uses for "next"
}
function press(fn: () => void) { return (e: Event) => { stop(); fn(); (e.currentTarget as HTMLElement).blur() } }
function pickSound(e: Event) { tourSound.value = !tourSound.value; if (!playing.value && soundOn.value !== tourSound.value) setSound(tourSound.value); (e.currentTarget as HTMLElement).blur() }
watch(soundOn, (v) => { tourSound.value = v })

// Any use of the deck itself pauses the tour. The bar's own controls are exempt: they handle it themselves. The tour's own
// events are synthetic (isTrusted is false) and never count: only a key, a click, a wheel turn or a touch by the viewer does.
const bar = ref<HTMLElement>()
const inBar = (e: Event) => !!bar.value && e.target instanceof Node && bar.value.contains(e.target)
const interact = (e: Event) => { if (isViewer(e) && !inBar(e)) stop() }
function wake() { idle.value = false; clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { idle.value = true }, 2800) }
const hidden = () => { if (document.hidden) stop() }

onMounted(() => {
  if (!site) return
  tourSound.value = sound.enabled || (() => { try { return localStorage.getItem('nimbledeck:sound') !== '0' } catch { return true } })()
  window.addEventListener('keydown', interact, true)
  window.addEventListener('pointerdown', interact, true)
  window.addEventListener('wheel', interact, { passive: true })
  window.addEventListener('touchstart', interact, { passive: true })
  for (const t of ['pointermove', 'keydown', 'pointerdown', 'touchstart'] as const) window.addEventListener(t, wake, { passive: true })
  document.addEventListener('visibilitychange', hidden)
  wake()
  if (new URLSearchParams(location.search).has('tour')) window.setTimeout(() => play(false), 600)   // /?tour starts the video by itself, with no gesture, so without sound
})
onUnmounted(() => {
  window.removeEventListener('keydown', interact, true)
  window.removeEventListener('pointerdown', interact, true)
  window.removeEventListener('wheel', interact)
  window.removeEventListener('touchstart', interact)
  for (const t of ['pointermove', 'keydown', 'pointerdown', 'touchstart'] as const) window.removeEventListener(t, wake)
  document.removeEventListener('visibilitychange', hidden)
  stop(); clearTimeout(idleTimer)
})

const progress = computed(() => (playing.value || elapsed.value > 0 ? `${Math.min(100, (elapsed.value / length.value) * 100)}%` : `${(currentPage.value / total.value) * 100}%`))
const showHint = computed(() => !moved.value && !playing.value && currentPage.value === 1)   // a deep link to another slide shows no big button
const links = computed(() => [
  { label: 'Docs', href: site!.docs },
  { label: 'Playground', href: site!.playground },
  ...(site!.science ? [{ label: 'Science deck', href: site!.science }] : []),
  { label: 'GitHub', href: site!.github, external: true },
])
</script>

<template>
  <Teleport v-if="site && !isPrintMode" to="body">
    <nav ref="bar" class="ndb" :class="{ 'ndb-idle': idle && !playing, 'ndb-calm': reduced }" aria-label="Nimbledeck site">
      <a class="ndb-brand" :href="site.docs.replace(/docs\/$/, '')" aria-label="Nimbledeck, first slide">
        <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true"><rect width="32" height="32" rx="7" fill="currentColor" opacity=".16" /><path d="M9 21a4 4 0 0 1 1.4-7.7A6 6 0 0 1 22 14.5a3.2 3.2 0 0 1 0 6.5z" fill="currentColor" /></svg>
        <span>Nimbledeck</span>
      </a>
      <span class="ndb-links">
        <a class="ndb-docs" :href="site.docs">Docs</a>
        <a v-for="l in links.slice(1)" :key="l.label" class="ndb-wide" :href="l.href" :target="l.external ? '_blank' : undefined" :rel="l.external ? 'noopener' : undefined">{{ l.label }}</a>
        <details class="ndb-more">
          <summary aria-label="More links">More</summary>
          <span class="ndb-menu">
            <a v-for="l in links.slice(1)" :key="l.label" :href="l.href" :target="l.external ? '_blank' : undefined" :rel="l.external ? 'noopener' : undefined">{{ l.label }}</a>
          </span>
        </details>
      </span>
      <span class="ndb-grow" />
      <button class="ndb-btn ndb-arrow" type="button" aria-label="Previous slide" :disabled="currentPage === 1 && clicks === 0" @click="press(prev)($event)">&#8592;</button>
      <span class="ndb-count" aria-live="off">{{ currentPage }} / {{ total }}</span>
      <button class="ndb-btn ndb-arrow" type="button" aria-label="Next slide" :disabled="!hasNext" @click="press(next)($event)">&#8594;</button>
      <SoundToggle class="ndb-snd-btn" />
      <button class="ndb-btn ndb-tour" type="button" :aria-pressed="playing" :title="playing ? 'Pause the tour' : 'Watch the deck play itself, about ' + mmss(length)" @click="toggle">
        <span class="ndb-ico" aria-hidden="true">{{ playing ? '❚❚' : atEnd && moved ? '↻' : '▶' }}</span>
        <span class="ndb-label">{{ playing ? 'Pause' : atEnd && moved ? 'Replay the tour' : 'Play the tour' }}</span>
        <span class="ndb-time" aria-hidden="true">{{ mmss(playing || elapsed > 0 ? elapsed : length) }}<template v-if="playing || elapsed > 0"> / {{ mmss(length) }}</template></span>
      </button>
      <span class="ndb-line" aria-hidden="true"><i :style="{ width: progress }" /></span>
    </nav>
    <!-- While the tour plays, the real pointer is kept off the slide: the tour's own cursor does the pointing, so where the mouse was
         left cannot hover or click anything. A real click here (or any key, wheel or touch) takes over and ends the tour. -->
    <div v-if="playing" class="ndb-shield" aria-hidden="true"><span class="ndb-take">Click anywhere to take over</span></div>
    <div v-if="showHint" class="ndb-cta">
      <button class="ndb-play" type="button" @click="toggle">
        <span class="ndb-play-ico" aria-hidden="true">&#9654;</span>
        <span>Watch the tour{{ tourSound ? ', with sound' : '' }}</span>
        <span class="ndb-play-time" aria-hidden="true">{{ mmss(length) }}</span>
      </button>
      <button class="ndb-with" type="button" role="switch" :aria-checked="tourSound" @click="pickSound">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5z" fill="currentColor" stroke="none" /><path v-if="tourSound" d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.6 7.6 0 0 1 0 10.8" /><path v-else d="M16.2 9.6l4.6 4.8M20.8 9.6l-4.6 4.8" /></svg>
        {{ tourSound ? 'With sound' : 'Without sound' }}
      </button>
      <p class="ndb-hint" role="note">{{ touch ? 'or swipe left to browse' : 'or press the right arrow to browse' }}</p>
    </div>
  </Teleport>
</template>

<style>
.ndb {
  position: fixed; inset: 0 0 auto 0; height: var(--nd-site-bar-h, 40px); z-index: 60;
  display: flex; align-items: center; gap: 4px; padding: 0 10px 1px 12px; box-sizing: border-box;
  font: 500 13px/1 var(--nd-font-body, system-ui, sans-serif); color: var(--nd-ink, #e5e7eb);
  background: color-mix(in srgb, var(--nd-bg, #07090f) 78%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(1.4); backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid var(--nd-line, #232b42);
  transition: opacity .5s ease;
}
.ndb-idle { opacity: .55; }
.ndb:hover, .ndb:focus-within { opacity: 1; }
.ndb-calm, .ndb-calm * { transition: none !important; }
.ndb a, .ndb summary { color: inherit; text-decoration: none; }
.ndb-brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: -0.02em; font-size: 14px; margin-right: 10px; color: var(--nd-accent, #22d3ee) !important; }
.ndb-brand span { color: var(--nd-ink, #e5e7eb); }
.ndb-links { display: inline-flex; align-items: center; gap: 2px; position: relative; }
.ndb-links > a, .ndb-more > summary { padding: 8px 10px; border-radius: 8px; color: var(--nd-muted, #9aa3b8); cursor: pointer; list-style: none; }
.ndb-links > a:hover, .ndb-more > summary:hover { color: var(--nd-ink, #e5e7eb); background: color-mix(in srgb, var(--nd-ink, #fff) 8%, transparent); }
.ndb-docs { color: var(--nd-ink, #e5e7eb) !important; }
.ndb-more { display: none; }
.ndb-more > summary::-webkit-details-marker { display: none; }
.ndb-menu { position: absolute; top: calc(100% + 6px); left: 0; display: flex; flex-direction: column; min-width: 150px; padding: 6px; border-radius: 12px;
  background: var(--nd-surface, #111627); border: 1px solid var(--nd-line, #232b42); box-shadow: 0 14px 40px -12px rgb(0 0 0 / .6); }
.ndb-menu a { padding: 10px 12px; border-radius: 8px; }
.ndb-menu a:hover { background: color-mix(in srgb, var(--nd-ink, #fff) 8%, transparent); }
.ndb-grow { flex: 1; }
.ndb-count { min-width: 3.6em; text-align: center; color: var(--nd-muted, #9aa3b8); font-variant-numeric: tabular-nums; }
.ndb .ndb-btn { font: inherit; color: inherit; background: transparent; border: 1px solid transparent; border-radius: 8px; padding: 7px 10px; cursor: pointer; }
.ndb .ndb-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--nd-ink, #fff) 8%, transparent); }
.ndb .ndb-btn:disabled { opacity: .35; cursor: default; }
.ndb .ndb-tour { margin-left: 6px; color: var(--nd-bg, #07090f); background: var(--nd-accent, #22d3ee); font-weight: 600; border-radius: 999px; padding: 7px 14px; display: inline-flex; align-items: center; gap: 8px; }
.ndb-time { font-variant-numeric: tabular-nums; opacity: .75; font-weight: 500; min-width: 2.6em; text-align: right; }
.ndb .ndb-tour:hover:not(:disabled) { background: var(--nd-accent, #22d3ee); filter: brightness(1.12); }
.ndb .ndb-tour[aria-pressed="true"] { background: transparent; color: var(--nd-ink, #e5e7eb); border-color: var(--nd-accent, #22d3ee); }
.ndb a:focus-visible, .ndb button:focus-visible, .ndb summary:focus-visible { outline: 2px solid var(--nd-accent, #22d3ee); outline-offset: 2px; }
.ndb-line { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none; }
.ndb-line i { display: block; height: 100%; background: var(--nd-gradient, var(--nd-accent, #22d3ee)); transition: width .6s ease; }

.ndb-shield { position: fixed; inset: var(--nd-site-bar-h, 40px) 0 0 0; z-index: 58; cursor: none; background: transparent; touch-action: none; }
.ndb-take { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 6px 14px; border-radius: 999px; font: 500 12px/1 var(--nd-font-body, system-ui, sans-serif);
  color: var(--nd-muted, #9aa3b8); background: color-mix(in srgb, var(--nd-bg, #07090f) 72%, transparent); border: 1px solid var(--nd-line, #232b42);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); opacity: 0; animation: ndb-take 6s ease .8s both; pointer-events: none; }
@keyframes ndb-take { 0%, 100% { opacity: 0; } 15%, 80% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ndb-take { animation: none; opacity: 1; } }
.ndb-cta { position: fixed; right: 40px; bottom: 36px; z-index: 55; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }   /* the hero text is on the left */
.ndb-play { display: inline-flex; align-items: center; gap: 12px; padding: 14px 26px 14px 18px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--nd-accent, #22d3ee) 60%, transparent);
  font: 600 17px/1 var(--nd-font-body, system-ui, sans-serif); letter-spacing: -0.01em; color: var(--nd-bg, #07090f); background: var(--nd-accent, #22d3ee); cursor: pointer;
  box-shadow: 0 10px 40px -8px var(--nd-accent, #22d3ee); animation: ndb-glow 2.6s ease-in-out infinite; }
.ndb-play:hover { filter: brightness(1.1); transform: translateY(-1px); }
.ndb-play-ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: color-mix(in srgb, var(--nd-bg, #07090f) 88%, transparent); color: var(--nd-accent, #22d3ee); font-size: 12px; padding-left: 2px; }
@keyframes ndb-glow { 50% { box-shadow: 0 10px 56px -2px var(--nd-accent, #22d3ee); } }
.ndb-play-time { font-weight: 500; opacity: .7; font-variant-numeric: tabular-nums; font-size: 14px; }
.ndb-with { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; cursor: pointer; font: 500 12.5px/1 var(--nd-font-body, system-ui, sans-serif); color: var(--nd-muted, #9aa3b8);
  background: color-mix(in srgb, var(--nd-bg, #07090f) 70%, transparent); border: 1px solid var(--nd-line, #232b42); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.ndb-with[aria-checked="true"] { color: var(--nd-accent, #22d3ee); border-color: color-mix(in srgb, var(--nd-accent, #22d3ee) 45%, transparent); }
.ndb-with:hover { color: var(--nd-ink, #e5e7eb); }
.ndb-with:focus-visible { outline: 2px solid var(--nd-accent, #22d3ee); outline-offset: 2px; }
.ndb-hint { margin: 0; pointer-events: none; padding: 5px 12px; border-radius: 999px; font: 500 12px/1 var(--nd-font-body, system-ui, sans-serif); color: var(--nd-muted, #9aa3b8);
  background: color-mix(in srgb, var(--nd-bg, #07090f) 70%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
@keyframes ndb-pulse { 50% { opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .ndb-play { animation: none; } }

@media (max-width: 760px) {
  .ndb-cta { left: 50%; right: auto; transform: translateX(-50%); align-items: center; }
  .ndb .ndb-links > .ndb-wide { display: none; }
  .ndb-more { display: block; }
  .ndb-brand span { display: none; }
  .ndb-brand { margin-right: 2px; }
}
@media (max-width: 480px) {
  .ndb { padding-left: 8px; padding-right: 6px; gap: 0; }
  .ndb .ndb-btn.ndb-arrow, .ndb .ndb-count { display: none; }   /* Slidev shows its own arrows on a narrow screen */
  .ndb .ndb-tour { padding: 7px 11px; margin-left: 2px; gap: 6px; }
  .ndb .ndb-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }   /* icon and clock only, the label stays for screen readers */
}
@media (pointer: coarse) { .ndb-cta { bottom: 64px; } .ndb .ndb-btn, .ndb-links > a, .ndb-more > summary { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; } }
@media print { .ndb, .ndb-cta, .ndb-shield { display: none; } }
</style>
