// Where the recording of a live component lives, and which file a browser should play. Pure functions, no Vue,
// so they can be tested on their own. See docs/RECORDING.md.

// Video types the recorder writes, in the order we prefer them at equal confidence: WebM (VP9) is smaller for the same look,
// MP4 (H.264) plays everywhere, Safari and iOS included. The same .webm may hold VP8 in an older recording: a browser that
// plays VP9 plays VP8 too, so one test per file is enough.
export const RECORDING_TYPES = [
  { ext: 'webm', mime: 'video/webm; codecs="vp9"' },
  { ext: 'mp4', mime: 'video/mp4; codecs="avc1.640028"' },
] as const

const confidence = (answer: string | boolean): number => (answer === 'probably' ? 2 : answer ? 1 : 0)

// The URL without extension. `prop` is an explicit path given on the component (`recording="/recordings/x"`), resolved like
// every other public file against the deck's base path; an absolute http(s) URL is used as it is. Without a prop it is the
// conventional place, public/recordings/<id>.
export function recordingBase(prop: string | undefined, id: string, baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  if (!prop) return `${base}recordings/${id}`
  if (/^https?:\/\//.test(prop)) return prop
  return `${base}${prop.replace(/^\/+/, '')}`
}

// The files to try, best first: only the types this browser says it can play, the ones it is sure about ("probably") before
// the ones it only thinks it can ("maybe"); the order above breaks ties.
export function recordingCandidates(base: string, canPlay: (mime: string) => string | boolean): string[] {
  return RECORDING_TYPES.map((t, i) => ({ t, i, c: confidence(canPlay(t.mime)) })).filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c || a.i - b.i).map((x) => `${base}.${x.t.ext}`)
}

// A dev server answers a missing file with the deck's index.html and status 200, so a hit counts only when it is not a web page:
// a video type, or the generic type that a static host without a .webm mapping sends.
export const isVideoResponse = (status: number, contentType: string | null): boolean => status >= 200 && status < 300 && /^(video\/|application\/octet-stream)/i.test(contentType ?? '')
