// The pure part of <PyStream> (docs/WRITING.md, "Adding a streamed Python animation"): reading a frame, cutting the points into
// colour groups, and the text shown next to an extra slider.

// A binary frame is float32: [step_ms, n, x0, y0, ..., x(n-1), y(n-1)], then an optional raster block
// [count, (x, y, w, h, iw, ih) * count] followed by the RGBA bytes (iw * ih * 4) of every image in turn.
// Returns { stepMs, n, points, images }; `images` is null when the frame has no raster block (keep the last ones), else a list of
// { x, y, w, h, iw, ih, rgba } (empty: clear them). A block that does not fit in the buffer is ignored (null).
export function parseFrame(buf) {
  const a = new Float32Array(buf, 0, Math.floor(buf.byteLength / 4))
  const n = a[1], o = 2 + 2 * n
  const out = { stepMs: Math.round(a[0] * 10) / 10, n, points: a.subarray(2, o), images: null }
  if (a.length <= o) return out
  const count = a[o], images = []
  let byte = (o + 1 + 6 * count) * 4
  if (!(count >= 0) || byte > buf.byteLength) return out
  for (let i = 0; i < count; i++) {
    const [x, y, w, h, iw, ih] = a.subarray(o + 1 + 6 * i, o + 7 + 6 * i)
    if (!(iw > 0 && ih > 0) || byte + iw * ih * 4 > buf.byteLength) return out
    images.push({ x, y, w, h, iw, ih, rgba: new Uint8ClampedArray(buf, byte, iw * ih * 4) })
    byte += iw * ih * 4
  }
  out.images = images
  return out
}

// The [from, to) point ranges of the colour groups. `groups` are explicit counts (points past the last range are not drawn),
// without it the m points are cut into `colors` equal consecutive groups.
export function groupRanges(m, colors, groups) {
  const ng = groups?.length || colors, out = []
  let from = 0
  for (let g = 0; g < ng; g++) {
    const to = groups?.length ? Math.min(m, from + groups[g]) : Math.ceil((g + 1) * m / ng)
    out.push([from, to])
    from = to
  }
  return out
}

// The text next to an extra slider: its label when it has `labels`, else the number with as many decimals as its step.
export function sliderText(slider, value, formatValue) {
  if (slider.labels) return slider.labels[Math.round((value - slider.min) / slider.step)] ?? value
  return formatValue(value, (String(slider.step).split('.')[1] ?? '').length)
}
