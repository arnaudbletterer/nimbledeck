# Nimbledeck: domain language

A glossary only. How things work is in `docs/`.

**Deck**
A presentation written as one Markdown file, shown in a browser.

**Slide**
One message of a deck. It picks a **layout** and may pick a **motion preset** and a **background**.

**Layout**
A named arrangement of a slide (cover, default, split, hero...). The base names are a contract between themes.

**Look**
A complete visual identity of a deck, chosen with `ndVariant` (plain, studio, editorial...). A look changes colours, type and decoration, never the grid.

**Motion preset**
A named, ready-made entrance animation for a slide (`motion: cascade`). Authors pick one, they never write CSS for it.

**Live component**
A tag that runs something in the slide (a canvas, a 3D scene, a Python stream, an editor with a result).

**Recording**
A short video of a live component made by `nimbledeck record`. It stands in for the live component wherever the Python process is not reachable, for example on the hosted site.

**Lockstep recording**
A recording whose frames are taken at exact 1/60 s steps of virtual time instead of in real time, so its frame rate does not depend on the machine.

**Tour**
The deck playing itself like a video, with a clock, a cursor that performs scripted interactions, and a soundtrack. A real key, click, wheel or touch by the viewer ends it.

**Showcase**
The deck that sells Nimbledeck itself. It is the front page of the site.

**Science deck**
The second flagship deck, for a general audience: one idea, why a positive test is often wrong, told as a story with a guess, a reveal and pictures the viewer plays with. It needs no Python and cites its sources.

**Predict then reveal** (science deck)
The teaching device: the viewer commits to a guess (a quiz) before the deck shows the answer and the picture that explains it.
