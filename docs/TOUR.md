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
The speaker says what it does: "Sound: music, plus effects when you click or when the tour plays".

There are three kinds of sound.

1. **Music**: `ndSound: uplift` in the headmatter is a bed that plays while sound is on, in both modes, and ducks under cues.
2. **Effects**, driven by what happens on the page, so they are aligned by construction and sound for a real viewer too:
   the quiz answer (success, or a soft tick when wrong), a click on a look or motion card or a Looks chip (a pop whose pitch
   follows the card), typing in Typewriter, Terminal and Livedeck (a key sound per character typed), a Stat landing (a soft
   pop), the Compare divider crossing each tenth (a tick), a Kinetic title starting (a pluck), a Livedeck slide appearing and
   a LiveCode run finishing. The tour's synthetic events trigger the same sounds, so the video is aligned too. Every one
   goes through `sfx(name, { volume, pitch })` of `useSound`, costs nothing when sound is off, is rate limited, and every
   component has a `quiet` prop to turn its effects off.
3. **Soundtrack of the tour**: frontmatter cues for the video only. They play while the tour plays and stop when the viewer
   takes over.

| Key | Where | Meaning |
|---|---|---|
| `sound: whoosh` | slide | one soundtrack cue on entry; a name or a file of `public/` such as `/audio/theme.mp3` |
| `sounds: [{ at, src, volume, when }]` | slide | soundtrack cues at offsets; `volume` above 0 and at most 1; `when: always` plays the cue outside the tour too (default `tour`) |
| `ndSound: uplift` | headmatter | the music bed |
| `ndSlideSound: whoosh` | headmatter | a soundtrack cue on every slide change in the tour |

Write a soundtrack cue only for something no component makes a sound for (a whoosh between slides, a swell, the finale). A
cue that repeats a click or a typed character drifts out of step; let the component's own sound do it.

Built-in sounds, synthesised with the Web Audio API (no files, offline): `click`, `tick`, `pop`, `whoosh`, `riser`, `chime`,
`success`, `soft-boom`, `pluck`, `typing`, `swell`, `finale`, `pad`, `uplift`. Everything passes through a limiter and a master
gain, so stacked cues stay quiet. `<SoundToggle />` is the speaker button and `<Equalizer />` draws the real output.

## Ending a deck

`<NextSteps />` on a closing slide shows link cards read from `window.__ND_SITE__`: docs, playground, the science deck when
the site has one, GitHub, and "Replay the tour" (it sends `nd-tour-replay`, which the site bar answers by going to slide 1 and
playing). Without `__ND_SITE__` only the GitHub card shows. A tour script may `hover` a card but never clicks a link.

## Tips for agents

- Start steps at 1 second or later: the glide takes up to 0.8 s before `at`.
- Put one cue per `sounds` entry; chain `typing` cues for long typing.
- Test with `examples/showcase/e2e-tour.mjs` (add `--full` for the per-slide timing table), and with `measure-sound.mjs` after touching a sound.
