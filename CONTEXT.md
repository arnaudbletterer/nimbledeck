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
The second flagship deck, for researchers and science communicators. It shows that a research result can stay alive in the room.

**Chapter** (science deck)
A run of slides about one research field, built around one hero demo.

**Hero demo** (science deck)
The one live demo that carries a chapter: a modern research result the audience can change and watch respond, with its equations next to it.
