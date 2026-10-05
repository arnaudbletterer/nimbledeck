<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNav } from '@slidev/client'

// The bar of the hosted site: wordmark, links, slide arrows, a tour that plays the deck by itself, a progress hairline,
// and a hint on the first slide. The site build injects `window.__ND_SITE__` (see website/build.mjs); without it (the
// dev server, the PDF export, any other build) this renders nothing and takes no room.
type SiteLinks = { docs: string; playground: string; science?: string; github: string }
const site: SiteLinks | undefined = (window as unknown as { __ND_SITE__?: SiteLinks }).__ND_SITE__

const { currentPage, total, clicks, clicksTotal, hasNext, next, prev, currentSlideRoute, isPrintMode } = useNav()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touch = window.matchMedia('(pointer: coarse)').matches

const DEFAULT_DWELL = 10   // seconds a slide stays on screen in the tour, unless its frontmatter says `tour: <seconds>`
const MIN_STEP = 2.5       // seconds, floor for one click build

const playing = ref(false)
const idle = ref(false)
const moved = ref(false)   // the visitor has left the first slide: the hint goes away for good
let tourTimer = 0
let idleTimer = 0

const dwell = () => {
  const v = Number((currentSlideRoute.value?.meta as any)?.slide?.frontmatter?.tour)
  return v > 0 ? v : DEFAULT_DWELL
}
function clearTour() { clearTimeout(tourTimer); tourTimer = 0 }
function stop() { playing.value = false; clearTour() }
function schedule() {
  clearTour()
  if (!playing.value) return
  // The slide's time is shared by its click builds, so a slide with three steps does not take four times as long.
  const ms = Math.max(MIN_STEP, dwell() / (clicksTotal.value + 1)) * 1000
  tourTimer = window.setTimeout(() => { if (hasNext.value) next(); else stop() }, ms)
}
watch([currentPage, clicks, playing], schedule)
watch([currentPage, clicks], () => { if (currentPage.value > 1 || clicks.value > 0) moved.value = true })

function toggle(e: Event) {
  playing.value = !playing.value
  ;(e.currentTarget as HTMLElement).blur()   // a focused button would also react to the Space key that Slidev uses for "next"
}
function press(fn: () => void) { return (e: Event) => { stop(); fn(); (e.currentTarget as HTMLElement).blur() } }

// Any use of the deck itself pauses the tour. The bar's own controls are exempt: they handle it themselves.
const bar = ref<HTMLElement>()
const inBar = (e: Event) => !!bar.value && e.target instanceof Node && bar.value.contains(e.target)
const interact = (e: Event) => { if (!inBar(e)) stop() }
function wake() { idle.value = false; clearTimeout(idleTimer); idleTimer = window.setTimeout(() => { idle.value = true }, 2800) }
const hidden = () => { if (document.hidden) stop() }

onMounted(() => {
  if (!site) return
  window.addEventListener('keydown', interact, true)
  window.addEventListener('pointerdown', interact, true)
  window.addEventListener('wheel', interact, { passive: true })
  for (const t of ['pointermove', 'keydown', 'pointerdown', 'touchstart'] as const) window.addEventListener(t, wake, { passive: true })
  document.addEventListener('visibilitychange', hidden)
  wake()
})
onUnmounted(() => {
  window.removeEventListener('keydown', interact, true)
  window.removeEventListener('pointerdown', interact, true)
  window.removeEventListener('wheel', interact)
  for (const t of ['pointermove', 'keydown', 'pointerdown', 'touchstart'] as const) window.removeEventListener(t, wake)
  document.removeEventListener('visibilitychange', hidden)
  clearTour(); clearTimeout(idleTimer)
})

const progress = computed(() => `${(currentPage.value / total.value) * 100}%`)
const showHint = computed(() => !moved.value && !playing.value)
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
      <button class="ndb-btn ndb-tour" type="button" :aria-pressed="playing" :title="playing ? 'Pause the tour' : 'The deck plays itself, about 3 minutes'" @click="toggle">
        <span aria-hidden="true">{{ playing ? '❚❚' : '▶' }}</span> {{ playing ? 'Pause the tour' : 'Play the tour' }}
      </button>
      <span class="ndb-line" aria-hidden="true"><i :style="{ width: progress }" /></span>
    </nav>
    <p v-if="showHint" class="ndb-hint" role="note">{{ touch ? 'Swipe left to begin' : 'Press the right arrow to begin' }}</p>
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
.ndb .ndb-tour { margin-left: 6px; color: var(--nd-bg, #07090f); background: var(--nd-accent, #22d3ee); font-weight: 600; border-radius: 999px; padding: 7px 14px; }
.ndb .ndb-tour:hover:not(:disabled) { background: var(--nd-accent, #22d3ee); filter: brightness(1.12); }
.ndb .ndb-tour[aria-pressed="true"] { background: transparent; color: var(--nd-ink, #e5e7eb); border-color: var(--nd-accent, #22d3ee); }
.ndb a:focus-visible, .ndb button:focus-visible, .ndb summary:focus-visible { outline: 2px solid var(--nd-accent, #22d3ee); outline-offset: 2px; }
.ndb-line { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; pointer-events: none; }
.ndb-line i { display: block; height: 100%; background: var(--nd-gradient, var(--nd-accent, #22d3ee)); transition: width .6s ease; }

.ndb-hint { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 55; margin: 0; pointer-events: none;
  padding: 8px 16px; border-radius: 999px; font: 500 13px/1 var(--nd-font-body, system-ui, sans-serif); color: var(--nd-ink, #e5e7eb);
  background: color-mix(in srgb, var(--nd-bg, #07090f) 80%, transparent); border: 1px solid var(--nd-line, #232b42);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); animation: ndb-pulse 2.4s ease-in-out infinite; }
@keyframes ndb-pulse { 50% { opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .ndb-hint { animation: none; } }

@media (max-width: 760px) {
  .ndb .ndb-links > .ndb-wide { display: none; }
  .ndb-more { display: block; }
  .ndb-brand span { display: none; }
  .ndb-brand { margin-right: 2px; }
}
@media (max-width: 480px) {
  .ndb { padding-left: 8px; padding-right: 6px; gap: 0; }
  .ndb .ndb-btn.ndb-arrow, .ndb .ndb-count { display: none; }   /* Slidev shows its own arrows on a narrow screen */
  .ndb .ndb-tour { padding: 7px 11px; margin-left: 2px; }
  .ndb .ndb-tour { font-size: 0; }          /* the icon alone, the label stays for screen readers */
  .ndb .ndb-tour span { font-size: 13px; }
}
@media (pointer: coarse) { .ndb-hint { bottom: 64px; } .ndb .ndb-btn, .ndb-links > a, .ndb-more > summary { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; } }
@media print { .ndb, .ndb-hint { display: none; } }
</style>
