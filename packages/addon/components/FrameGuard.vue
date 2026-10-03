<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNav } from '@slidev/client'
import { useActive } from '../composables/useActive'

// Wraps an embedded page (an iframe). A page that fills the slide would otherwise take the keyboard and the mouse away
// from the presentation, and the browser does not let the deck intercept keys typed inside an embedded page. So the
// page starts behind a transparent shield: keys and clicks drive the deck. Click the shield to interact with the page;
// while interacting, a control bar inside the slide (previous, back to slides, next) always works, whatever the frame size.
const { next, prev } = useNav()
const interactive = ref(false)
const active = useActive()
watch(active, (a) => { if (!a) interactive.value = false })

function release() {
  interactive.value = false
  ;(document.activeElement as HTMLElement | null)?.blur?.()   // take the keyboard back from the embedded page
  window.focus()
}
function go(fn: () => void) { release(); fn() }
</script>

<template>
  <div class="nd-guard" :class="{ 'nd-live': interactive }" data-kind="guard" :data-state="interactive ? 'interactive' : 'guarded'">
    <slot />
    <div v-if="!interactive" class="nd-shield" @click.stop="interactive = true"><span class="nd-shield-hint">Click to interact</span></div>
    <div v-else class="nd-bar" role="toolbar" aria-label="Presentation controls">
      <button aria-label="Previous" @click.stop="go(prev)">‹</button>
      <button class="nd-bar-main" @click.stop="release">Back to slides</button>
      <button aria-label="Next" @click.stop="go(next)">›</button>
    </div>
  </div>
</template>
