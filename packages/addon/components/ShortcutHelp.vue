<script setup lang="ts">
import { watch } from 'vue'
import { helpOpen } from '../composables/palette'

// The keyboard cheat-sheet: Slidev's keys and the ones Nimbledeck adds. Open with ?
// The list below is hard-coded: it does not read Slidev's shortcut setup, so update it when a key changes.
const groups = [
  { title: 'Move through the deck', rows: [
    ['Space, →, Page Down', 'Next (shows the next build first)'],
    ['Shift+Space, ←, Page Up', 'Previous'],
    ['↓, Shift+→', 'Next slide (skips builds)'],
    ['↑, Shift+←', 'Previous slide'],
  ] },
  { title: 'Find and view', rows: [
    ['/  or  Ctrl/Cmd+K', 'Command palette: search slides by text, with thumbnails'],
    ['g', 'Go to a slide by number or title'],
    ['o  or  `', 'Overview of all slides'],
    ['f', 'Fullscreen'],
    ['d', 'Dark mode'],
    ['Esc', 'Close palette, overview or this help'],
    ['?', 'This cheat-sheet'],
  ] },
  { title: 'Interactive slides', rows: [
    ['1 to 4', 'Pick a quiz answer'],
    ['Click, Enter', 'Pick an answer, flip a card, start or pause a countdown'],
    ['Drag, ← →', 'Move a before/after slider'],
    ['Click a website or demo', 'Interact with it; use the bar to go back to the slides'],
    ['Esc (in the code editor)', 'Leave the editor so the arrows move the deck again'],
    ['Cmd/Ctrl+Enter (in the editor)', 'Run the code now'],
  ] },
  { title: 'Presenting', rows: [
    ['/presenter/<n> in the address bar', 'Presenter view with notes and timer (also in the toolbar)'],
    ['/overview/ , /export/', 'Slide overview page, export page'],
  ] },
]
const close = () => { helpOpen.value = false }
// Give the keyboard back to whatever had it before the sheet opened.
let opener: HTMLElement | null = null
watch(helpOpen, (open) => {
  if (open) opener = document.activeElement as HTMLElement | null
  else { opener?.focus?.(); opener = null }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="nd-fade">
      <div v-if="helpOpen" class="nd-pal nd-help" data-kind="help" @click.self="close" @keydown.stop @keyup.stop>
        <div class="nd-pal-panel nd-help-panel" role="dialog" aria-label="Keyboard shortcuts">
          <h2>Keyboard shortcuts</h2>
          <div class="nd-help-cols">
            <section v-for="g in groups" :key="g.title">
              <h3>{{ g.title }}</h3>
              <dl><template v-for="r in g.rows" :key="r[0]"><dt><kbd>{{ r[0] }}</kbd></dt><dd>{{ r[1] }}</dd></template></dl>
            </section>
          </div>
          <div class="nd-pal-foot"><span>Press ? or Esc to close</span></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
