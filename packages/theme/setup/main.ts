import { defineAppSetup } from '@slidev/types'
import configs from '#slidev/configs'

// Pick the design variant from the deck's headmatter: `ndVariant: plain | paper | night`.
export default defineAppSetup(() => {
  const variant = String((configs as Record<string, unknown>).ndVariant ?? 'plain')
  const root = document.documentElement
  root.dataset.ndVariant = variant
  // A dark variant also switches Slidev to its dark syntax theme, so highlighted code keeps its contrast.
  root.classList.toggle('dark', variant === 'night')
})
