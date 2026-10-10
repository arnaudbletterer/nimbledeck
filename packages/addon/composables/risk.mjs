// The arithmetic behind <Crowd> and <Polls>, kept apart from the components so it can be tested without a browser.
// Probabilities are numbers in [0, 1] everywhere here; the components convert from and to percent.

// A small seeded generator (mulberry32): the same seed gives the same crowd and the same polls on every machine.
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A random permutation of 0..n-1 (Fisher-Yates).
export function shuffled(n, seed) {
  const r = rng(seed), a = Uint32Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t }
  return a
}

// ---- Screening: a crowd, a condition, a test ----

export const TN = 0, FP = 1, FN = 2, TP = 3   // status of a person: healthy and negative, healthy and positive (false alarm), sick and negative (missed), sick and positive

// Expected numbers of people in each group, as whole people (natural frequencies): n people, a fraction `prev` is sick, the test
// catches a fraction `sens` of them and wrongly flags a fraction 1 - `spec` of the healthy.
export function counts(n, prev, sens, spec) {
  const sick = Math.round(n * prev), healthy = n - sick
  const tp = Math.round(sick * sens), fp = Math.round(healthy * (1 - spec))
  return { n, sick, healthy, tp, fn: sick - tp, fp, tn: healthy - fp, pos: tp + fp }
}

// P(sick | positive) by Bayes' theorem, from the probabilities (not from the rounded counts).
export function ppv(prev, sens, spec) {
  const hit = sens * prev, alarm = (1 - spec) * (1 - prev)
  return hit + alarm > 0 ? hit / (hit + alarm) : 0
}

// P(healthy | negative).
export function npv(prev, sens, spec) {
  const ok = spec * (1 - prev), miss = (1 - sens) * prev
  return ok + miss > 0 ? ok / (ok + miss) : 0
}

// Give every person a status. `rankSick[i]` is the rank of person i in the order of getting sick (a permutation), `byScore` lists
// the people in the order the test would flag them (another permutation): the first `tp` sick people in that order test positive,
// and so do the first `fp` healthy ones. Raising `prev` only turns more people sick, so dots keep their place as a slider moves.
export function assign(status, rankSick, byScore, c) {
  let tp = c.tp, fp = c.fp
  for (let k = 0; k < byScore.length; k++) {
    const i = byScore[k]
    if (rankSick[i] < c.sick) { if (tp > 0) { status[i] = TP; tp-- } else status[i] = FN }
    else if (fp > 0) { status[i] = FP; fp-- } else status[i] = TN
  }
  return status
}

// "1 in 1,000" for a prevalence of 0.001.
export function oneIn(prev) {
  if (!(prev > 0)) return ''
  const k = 1 / prev
  return `1 in ${k >= 10 ? Math.round(k).toLocaleString('en-US') : (Math.round(k * 10) / 10).toString()}`
}

// ---- Polls: sampling a proportion ----

// Standard error of a sample proportion: sqrt(p (1 - p) / n).
export const se = (p, n) => Math.sqrt(p * (1 - p) / n)

// Margin of error at 95 percent: 1.96 standard errors.
export const moe = (p, n) => 1.96 * se(p, n)

// The share of respondents who say A when a fraction `gap` of the A supporters would rather not answer (everyone else answers).
// A supporter answers with probability 1 - gap, a non-supporter with probability 1, so the poll sees q instead of p.
export function responding(p, gap) {
  const a = p * (1 - gap)
  return a / (a + (1 - p))
}

// The cumulative distribution of Binomial(n, q), built outwards from the mode so that no term underflows (n up to 10^5).
export function binomialTable(n, q) {
  const qq = Math.min(1 - 1e-9, Math.max(1e-9, q)), r = qq / (1 - qq)
  const w = new Float64Array(n + 1), mode = Math.min(n, Math.floor((n + 1) * qq))
  w[mode] = 1
  for (let k = mode; k < n; k++) w[k + 1] = w[k] * ((n - k) / (k + 1)) * r
  for (let k = mode; k > 0; k--) w[k - 1] = w[k] * (k / (n - k + 1)) / r
  let s = 0
  for (let k = 0; k <= n; k++) s += w[k]
  let acc = 0
  for (let k = 0; k <= n; k++) { acc += w[k] / s; w[k] = acc }
  w[n] = 1
  return w
}

// The number of successes for a uniform u in [0, 1): the smallest k whose cumulative probability reaches u.
export function drawFrom(table, u) {
  let lo = 0, hi = table.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (table[mid] >= u) hi = mid; else lo = mid + 1 }
  return lo
}

// What a reader of one poll would compute: the 95 percent interval of a result x from n answers.
export function interval(x, n) {
  const h = moe(x, n)
  return [x - h, x + h]
}

// Summary of a list of poll results (shares in [0, 1]) of n answers each, against the true share p.
export function summary(results, count, n, p) {
  let ahead = 0, covered = 0, sum = 0, sq = 0
  for (let k = 0; k < count; k++) {
    const x = results[k], [lo, hi] = interval(x, n)
    if (x > 0.5) ahead++
    if (lo <= p && p <= hi) covered++
    sum += x; sq += x * x
  }
  const mean = count ? sum / count : 0
  return { ahead: count ? ahead / count : 0, covered: count ? covered / count : 0, mean, sd: count ? Math.sqrt(Math.max(0, sq / count - mean * mean)) : 0 }
}

// Counts of results per bin of width `width` from `lo` (results outside the range go into the first or last bin).
export function bins(results, count, lo, hi, width, into) {
  const m = Math.round((hi - lo) / width), out = into ?? new Uint32Array(m)
  for (let k = 0; k < count; k++) out[Math.min(m - 1, Math.max(0, Math.floor((results[k] - lo) / width)))]++
  return out
}
