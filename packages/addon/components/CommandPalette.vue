<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useNav } from '@slidev/client'
import PaletteCard from './PaletteCard.vue'
import { entriesFrom, makeSearch, paletteOpen, snippet } from '../composables/palette'

// A command palette for slides: type to fuzzy-search titles and body text, see thumbnails, Enter or click to jump.
// Open with / or Ctrl/Cmd+K. Arrow keys move, Enter goes, Esc closes. A number jumps to that slide.
const { slides, go, currentSlideNo } = useNav()
const query = ref('')
const sel = ref(0)
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
const entries = computed(() => entriesFrom(slides.value))
const search = computed(() => makeSearch(entries.value))
const hits = computed(() => search.value(query.value))
const COLS = 4, CARD = 250
const indexed = computed(() => entries.value.some((e) => e.text))

watch(paletteOpen, async (open) => {
  if (!open) return
  query.value = ''; sel.value = Math.max(0, currentSlideNo.value - 1)
  await nextTick(); input.value?.focus(); scrollToSel()
})
watch(query, () => { sel.value = 0 })
function close() { paletteOpen.value = false; (document.activeElement as HTMLElement | null)?.blur?.() }
function choose(i = sel.value) { const h = hits.value[i]; if (!h) return; close(); go(h.entry.no) }
function move(d: number) { const n = hits.value.length; if (n) { sel.value = (sel.value + d + n) % n; scrollToSel() } }
async function scrollToSel() { await nextTick(); list.value?.querySelector<HTMLElement>(`[data-i="${sel.value}"]`)?.scrollIntoView({ block: 'nearest' }) }
function key(e: KeyboardEvent) {
  const k = e.key
  if (k === 'Escape') { e.preventDefault(); close() }
  else if (k === 'Enter') { e.preventDefault(); choose() }
  else if (k === 'ArrowRight') { e.preventDefault(); move(1) }
  else if (k === 'ArrowLeft') { e.preventDefault(); move(-1) }
  else if (k === 'ArrowDown') { e.preventDefault(); move(COLS) }
  else if (k === 'ArrowUp') { e.preventDefault(); move(-COLS) }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="nd-fade">
      <div v-if="paletteOpen" class="nd-pal" data-kind="palette" @click.self="close" @keydown.stop="key" @keyup.stop @keypress.stop>
        <div class="nd-pal-panel" role="dialog" aria-label="Go to slide">
          <input ref="input" v-model="query" class="nd-pal-input" type="text" spellcheck="false" autocomplete="off"
                 placeholder="Search slides by title or text, or type a number…" aria-label="Search slides">
          <div ref="list" class="nd-pal-grid" :style="{ gridTemplateColumns: `repeat(${COLS}, ${CARD}px)` }">
            <button v-for="(h, i) in hits" :key="h.entry.no" class="nd-pal-card" :class="{ 'nd-sel': i === sel, 'nd-cur': h.entry.no === currentSlideNo }"
                    :data-i="i" :data-no="h.entry.no" @click="choose(i)" @mousemove="sel = i">
              <PaletteCard :route="h.entry.route" :width="CARD" />
              <span class="nd-pal-meta"><b>{{ h.entry.no }}</b> {{ h.entry.title || '(untitled)' }}</span>
              <span v-if="query && h.ranges.length" class="nd-pal-snip"><template v-for="(s, j) in snippet(h)" :key="j"><mark v-if="s.hit">{{ s.text }}</mark><template v-else>{{ s.text }}</template></template></span>
            </button>
            <div v-if="!hits.length" class="nd-pal-none">No slide matches "{{ query }}"</div>
          </div>
          <div class="nd-pal-foot">
            <span>↑ ↓ ← → move · Enter go · Esc close</span>
            <span v-if="!indexed">Only titles are searchable in a static build; use <code>nimbledeck run</code> to search slide text.</span>
            <span v-else>{{ hits.length }} of {{ entries.length }} slides</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
