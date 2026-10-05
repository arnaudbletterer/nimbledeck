// Where the recording of a live component lives, and which file a browser should play. Pure functions, no Vue,
// so they can be tested on their own. See docs/RECORDING.md.

// Video types in the order we prefer them: WebM first (what `nimbledeck record` always writes), then MP4 for Safari.
export const RECORDING_TYPES = [
  { ext: 'webm', mime: 'video/webm; codecs="vp8"' },
  { ext: 'mp4', mime: 'video/mp4; codecs="avc1.42E01E"' },
] as const

// The URL without extension. `prop` is an explicit path given on the component (`recording="/recordings/x"`), resolved like
// every other public file against the deck's base path; an absolute http(s) URL is used as it is. Without a prop it is the
// conventional place, public/recordings/<id>.
export function recordingBase(prop: string | undefined, id: string, baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  if (!prop) return `${base}recordings/${id}`
  if (/^https?:\/\//.test(prop)) return prop
  return `${base}${prop.replace(/^\/+/, '')}`
}

// The files to try, best first: only the types this browser says it can play.
export function recordingCandidates(base: string, canPlay: (mime: string) => string | boolean): string[] {
  return RECORDING_TYPES.filter((t) => canPlay(t.mime)).map((t) => `${base}.${t.ext}`)
}

// A dev server answers a missing file with the deck's index.html and status 200, so a hit counts only when it is not a web page:
// a video type, or the generic type that a static host without a .webm mapping sends.
export const isVideoResponse = (status: number, contentType: string | null): boolean => status >= 200 && status < 300 && /^(video\/|application\/octet-stream)/i.test(contentType ?? '')
