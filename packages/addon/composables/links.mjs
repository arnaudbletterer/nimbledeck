// The small store behind linked equations (docs/EQUATIONS.md). Two things travel through it:
//   a term     the id of the part of an equation the viewer points at (or the tour does), "1" for \term{1}{...};
//              a component with `highlight` answers to the ids it lists
//   a param    a named number (sigma = 10) published by a slider, shown by the \val{sigma}{10} of an equation
// Both are also announced as DOM events, `nd-term` with { id } and `nd-param` with { name, value }, so a page script can follow
// them or drive them (dispatch the same event on window).

export function createLinks(target) {
  const termFns = new Set(), paramFns = new Set(), params = new Map()
  let term = null
  const announce = (type, detail) => { try { target?.dispatchEvent(new CustomEvent(type, { detail })) } catch { /* no DOM */ } }
  const api = {
    term: () => term,
    setTerm(id) {
      const next = id == null || id === '' ? null : String(id)
      if (next === term) return
      term = next
      termFns.forEach((fn) => fn(term))
      announce('nd-term', { id: term })
    },
    onTerm(fn) { termFns.add(fn); return () => termFns.delete(fn) },
    param: (name) => params.get(name),
    allParams: () => Object.fromEntries(params),
    setParam(name, value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || params.get(name) === value) return
      params.set(name, value)
      paramFns.forEach((fn) => fn(name, value))
      announce('nd-param', { name, value })
    },
    onParam(fn) { paramFns.add(fn); return () => paramFns.delete(fn) },
  }
  // A page script can drive the store with the same events it listens to.
  target?.addEventListener?.('nd-term', (e) => { if (e.detail && 'id' in e.detail) api.setTerm(e.detail.id) })
  target?.addEventListener?.('nd-param', (e) => { if (e.detail) api.setParam(e.detail.name, e.detail.value) })
  return api
}

export const links = createLinks(typeof window !== 'undefined' ? window : undefined)

// A number as it is typeset: whole numbers as they are, others with `decimals` places (2 by default), a true minus sign.
export function formatValue(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)
  const text = Number.isInteger(value) ? String(value) : value.toFixed(decimals)
  return text.replace('-', '−')
}

// The CSS colour of a term: the leading digit of its id picks it, 1 to 4 the chart colours, 5 the accent, 6 the second accent,
// anything else the accent. "1" and "1b" share colour 1 and are still two terms, so one colour can point at two things.
export function termColor(id) {
  const n = Number(/^\d/.exec(String(id))?.[0])
  if (n >= 1 && n <= 4) return `var(--nd-chart-${n})`
  return n === 6 ? 'var(--nd-accent-2)' : 'var(--nd-accent)'
}

// `highlight` of a visualization: { "1": "x, the rate of convection" } says which terms it answers to and what to write when
// one is pointed at; a list of ids answers to them without a note.
export function parseHighlight(prop) {
  if (!prop) return {}
  if (Array.isArray(prop)) return Object.fromEntries(prop.map((id) => [String(id), '']))
  return Object.fromEntries(Object.entries(prop).map(([id, note]) => [String(id), String(note ?? '')]))
}

// Terms shown after `clicks` clicks when an equation reveals them in `order`; with no order everything is shown.
export function revealed(order, clicks) {
  if (!order?.length) return null
  return new Set(order.slice(0, Math.max(0, clicks)).map(String))
}
