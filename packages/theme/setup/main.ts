import { defineAppSetup } from '@slidev/types'
import configs from '#slidev/configs'
import looks from '../looks.json'
import presets from '../presets.json'

// Pick the design variant from the deck's headmatter: `ndVariant: <id>`, any id of looks.json (plain, paper, night, studio,
// studio-light, editorial, swiss, neon, ...).
export default defineAppSetup(() => {
  const variant = String((configs as Record<string, unknown>).ndVariant ?? 'plain')
  const root = document.documentElement
  root.dataset.ndVariant = variant
  // The ids of every look, for the Looks component (`looks="all"`).
  root.dataset.ndLooks = looks.map((l) => l.id).join(',')
  // The ids of every motion and background preset, for the walls (<MotionWall />).
  root.dataset.ndMotions = presets.motions.map((m) => m.id).join(',')
  root.dataset.ndBackgrounds = presets.backgrounds.map((b) => b.id).join(',')
  // A dark variant also switches Slidev to its dark syntax theme, so highlighted code keeps its contrast.
  root.classList.toggle('dark', looks.some((l) => l.id === variant && l.dark))
})
