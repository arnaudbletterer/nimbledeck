import { cssVar } from './useConfig'

export type RGB = [number, number, number]

let probe: CanvasRenderingContext2D | null = null

// Any CSS colour a token can hold (hex, rgb(), a name) to [r, g, b] in 0..255: the canvas normalises it for us.
export function rgbOf(token: string, fallback = '#000'): RGB {
  probe ??= document.createElement('canvas').getContext('2d')!
  probe.fillStyle = '#000'
  probe.fillStyle = cssVar(token, fallback)
  const s = String(probe.fillStyle)
  if (s[0] === '#') { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const m = s.match(/[\d.]+/g)
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0]
}

export const luma = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

export function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

export function fromHsl([h, s, l]: [number, number, number]): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

/** The colour turned `deg` degrees around the hue wheel (a neighbour of a token that still belongs to it). */
export const hueShift = (c: RGB, deg: number): RGB => { const [h, s, l] = toHsl(c); return fromHsl([(h + deg + 360) % 360, s, l]) }

export const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB
export const rgba = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
