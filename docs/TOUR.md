# Scripted tours and sounds

A tour plays a deck by itself, like a video. A slide can describe what the tour does on it: a virtual cursor glides to a
real element and clicks, drags or types, and the slide reacts exactly as it does for a viewer. A slide can also ask for
sounds. Both are plain frontmatter, no per-slide JavaScript.

```yaml
---
layout: default
tour: 8                              # the longest the slide stays, in seconds
tourScript:
  - { at: 1.2, hover: B, caption: "Which file holds the deck?" }
  - { at: 2.6, click: C }
sounds:
  - { at: 2.75, src: success, volume: 0.8 }
---
```

`nimbledeck check` validates every key below and the files of `public/`.

## Tour steps

Each step has `at` (seconds from the slide's entry) and exactly one action.

| Action | Value | Extra keys | What happens |
|---|---|---|---|
| `click` | target | | pointer and mouse events, then `click` |
| `hover` | target | | pointer over and move events |
| `drag` | target | `from`, `to` (0 to 1 along the target, default 0.1 and 0.9), `over` (seconds, default 1.2) | pointer down, moves, up; on `<input type=range>` it sets the value and fires `input` and `change` |
| `key` | key name, such as `"3"` or `"ArrowRight"` | | `keydown` and `keyup` on the focused element |
| `type` | text | `into` (target, default the first editor), `speed` (ms per character) | focuses the editor and types, CodeMirror included |
| `wait` | seconds | | nothing, keeps the slide |
| any | | `caption` | a small bubble beside the cursor, at most 48 characters |

Targets: a capital letter is a quiz choice (`B`), `text:Some words` is the smallest element holding that text (its button
or link if it has one), anything else is a CSS selector searched inside the slide. Targets are found when the step runs,
never by fixed coordinates, so scale and layout do not matter. A missing, hidden or inert target (a recording stands in for
a live editor, an offline panel) skips the step silently and the script keeps its time.

## Pacing

A slide stays until its entrance has settled (nothing finite still animating, typing or counting), plus a reading hold of
1.2 to 2.5 seconds. Bounds: at least 3 seconds, at most 6 unless `tour: <seconds>` says more. A script keeps the slide at
least until its last step ends. `tour` is therefore a maximum, and the clock's total is an estimate that corrects itself.

## Events and stopping

The tour's events are synthetic (`isTrusted` is false) and never stop it. A real key, click, wheel turn or touch does.
While a tour runs, `setPointerCapture` is a no-op for the tour's own pointer, so Compare and three.js controls work.
Reduced motion: the cursor jumps without gliding.

## Sound

Off until the viewer opts in; the browser needs a gesture, so the `AudioContext` is created by a click on a sound control
(the speaker button, or starting the tour from the big button marked "with sound"). The choice is kept in `localStorage`.

| Key | Where | Meaning |
|---|---|---|
| `sound: whoosh` | slide | one cue on entry; a name or a file of `public/` such as `/audio/theme.mp3` |
| `sounds: [{ at, src, volume }]` | slide | cues at offsets, `volume` above 0 and at most 1 |
| `ndSound: uplift` | headmatter | a music bed that plays while sound is on and ducks under cues; `uplift` or `pad`, or a file of `public/` |
| `ndSlideSound: whoosh` | headmatter | a cue on every slide change |

Built-in sounds, synthesised with the Web Audio API (no files, offline): the cues `click`, `tick`, `pop`, `whoosh`, `riser`,
`chime`, `success`, `soft-boom`, `typing`, `swell`, and the beds `uplift` and `pad`. Everything passes through a limiter and a
master gain, so stacked cues stay quiet. `<SoundToggle />` is the speaker button and `<Equalizer />` draws the real output.
`nimbledeck check` rejects a name that is neither built in nor a file.

### The beds

A bed starts with the sound switch and with the tour, fades in over 2 s, fades out over 1 s, and is not restarted by a slide
change (only a different `ndSound` replaces it). A cue ducks it by about 5 dB while it plays.

- `uplift` is the one the showcase uses: warm, optimistic and light. G major, I-V-vi-IV (G D Em C), two bars a chord, 104 bpm.
  A marimba-like arpeggio, a soft low-passed pad, a bass note on each chord root, a soft kick on beats 1 and 3 and a quiet
  shaker off the beat, in a small generated room. The score is 16 bars (about 37 s); the second 8 bars add a melody on the
  chord changes and a run into the loop point, and every bar has its own arpeggio shape, so it does not feel mechanical.
  Notes are scheduled 1.6 s ahead on the `AudioContext` clock (a timer only wakes the scheduler), so a late timer never moves a note.
- `pad` is the dark, slowly beating drone the first showcase used. It is moody on purpose; keep it for a calm, serious deck.

Your own file works too: `ndSound: /audio/theme.mp3` loops and ducks the same way.

### Measurements

`node examples/showcase/measure-sound.mjs` renders the real engine (bed, cues, ducking, limiter, master) in Chrome with an
`OfflineAudioContext`, asserts the rules below and writes two WAV files to listen to (default `/private/tmp/claude-501/uplift/`).
Last run, mono mix of the output, dBFS:

| What | Result | Rule |
|---|---|---|
| bed RMS, steady state | -31.5 dBFS | at least 14 dB under every cue peak |
| bed peak | -14.2 dBFS | no clipping |
| bed DC offset | -3.2e-5 | under 1e-3 |
| weakest cue peak (`typing`, at volume 0.8) | -14.6 dBFS | margin to the bed: 16.8 dB |
| bed under a cue | -5.3 dB | between -4 and -6 |
| bed with 9 cues, peak | -6.2 dBFS | no clipping |
| fade in | -50 dBFS in the first 0.5 s, -31 dBFS at 3 to 4 s | |
| loop, second against third pass | -141 dB difference | repeats exactly |
| loop point, largest sample step within 20 ms | 5.2e-3 against 1.4e-2 elsewhere | no click |

Cue peaks at volume 0.8, alone: `click` -13.7, `tick` -12.6, `pop` -7.6, `whoosh` -12.7, `riser` -7.0, `chime` -8.3, `success` -9.0,
`soft-boom` -6.2, `typing` -14.6, `swell` -14.5. The quiet cues (`tick`, `typing`, `whoosh`) were raised for this, and the noise
the cues use is now seeded, so a cue sounds and measures the same every time. The loop test renders at 52 kHz, where one eighth
note is exactly 15000 samples, so the passes compare sample for sample. The scheduler itself (tempo, chord changes on bar lines,
no repeated or past notes, a stalled clock) is unit tested with a fake clock in `packages/addon/test/upliftscore.test.mjs`.

## Tips for agents

- Start steps at 1 second or later: the glide takes up to 0.8 s before `at`.
- Put one cue per `sounds` entry; chain `typing` cues for long typing.
- Test with `examples/showcase/e2e-tour.mjs` (add `--full` for the per-slide timing table), and with `measure-sound.mjs` after touching a sound.
