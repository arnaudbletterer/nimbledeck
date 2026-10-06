// The geometry of the two background presets that need more than three empty shapes (see styles/backgrounds.css). Shared by
// the slide layer (slide-bottom.vue) and the mini backdrops of <MotionWall>, so both draw the same picture.

// Stars: a few seeded dots as box-shadows, so the field is the same on every visit and costs one element per layer.
const stars = (() => {
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  return [[70, 2], [38, 3], [16, 4]].map(([n, size]) => ({
    size,
    shadow: Array.from({ length: n }, () => `${Math.round(rnd() * 1280)}px ${Math.round(rnd() * 720)}px 0 ${rnd() < 0.5 ? 0 : 1}px var(--nd-ink)`).join(','),
  }))
})()

// Waves: three sine curves, two full periods wide so the CSS can slide them by half their width and loop without a seam.
const waves = [[34, 0.0, 600], [22, 1.7, 520], [46, 3.1, 660]].map(([a, ph, y]) => {
  let d = `M0 720 L0 ${y}`
  for (let x = 0; x <= 2560; x += 32) d += ` L${x} ${(y + a * Math.sin((x / 1280) * Math.PI * 2 * 2 + ph)).toFixed(1)}`
  return `${d} L2560 720 Z`
})

export const bgShapes = { stars, waves }
