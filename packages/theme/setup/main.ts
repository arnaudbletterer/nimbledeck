import { defineAppSetup } from '@slidev/types'
import configs from '#slidev/configs'

// Pick the design variant from the deck's headmatter: `ndVariant: plain | paper | night`.
export default defineAppSetup(() => {
  document.documentElement.dataset.ndVariant = String((configs as Record<string, unknown>).ndVariant ?? 'plain')
})
