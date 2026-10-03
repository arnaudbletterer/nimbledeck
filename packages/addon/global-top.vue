<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import CommandPalette from './components/CommandPalette.vue'
import ShortcutHelp from './components/ShortcutHelp.vue'
import { helpOpen, isEditable, paletteOpen } from './composables/palette'

// Slidev renders this layer once, outside the slides. It owns the global keys of the palette and the cheat-sheet.
function onKey(e: KeyboardEvent) {
  const typing = isEditable(e.target)
  if (e.key === 'Escape' && helpOpen.value) { helpOpen.value = false; e.preventDefault(); return }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.altKey) { e.preventDefault(); helpOpen.value = false; paletteOpen.value = !paletteOpen.value; return }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || paletteOpen.value) return
  if (e.key === '/') { e.preventDefault(); helpOpen.value = false; paletteOpen.value = true }
  else if (e.key === '?') { e.preventDefault(); helpOpen.value = !helpOpen.value }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <CommandPalette />
  <ShortcutHelp />
</template>
