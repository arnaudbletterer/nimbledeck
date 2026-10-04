---
theme: nimbledeck
ndVariant: night
title: Motion lab
layout: full
---

<Stage full>
<At :x="0" :y="0" :w="1280" :h="720"><Aurora /></At>
<At :x="90" :y="200" :w="1100" :h="320" :z="2"><Kinetic text="Slides that move." mode="words" from="up" :stagger="90" size="xl" accent="move" /></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="90" :y="90" :w="1100" :h="140"><Kinetic text="Letters arrive one by one" mode="letters" from="blur" size="l" /></At>
<At :x="90" :y="260" :w="1100" :h="140"><Kinetic text="Rising from a line" mode="words" from="mask" size="l" accent="line" /></At>
<At :x="90" :y="430" :w="1100" :h="220"><Kinetic text="One line|then the next|and the last" mode="lines" from="scale" size="m" /></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="90" :y="120" :w="1100" :h="440">

<Typewriter lang="md" :speed="38" :delay="400">

```md
# Nimbledeck

Write the story in **Markdown**.
Add motion with a `<tag>`.
```

</Typewriter>

</At>
<At :x="90" :y="600" :w="600" :h="60"><Kinetic v-click hold text="Typed. Then chained." from="up" size="s" /></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="90" :y="100" :w="1100" :h="480"><Terminal title="nimbledeck" :lines="['$ nimbledeck check deck.md', 'ok  12 slides, no errors', '$ nimbledeck run deck.md', 'deck ready on http://localhost:3030']" /></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="0" :y="0" :w="1280" :h="720"><Aurora :intensity="1" :speed="1" /></At>
<At :x="120" :y="190" :w="320" :h="300" :z="2"><Stat value="60" suffix=" fps" label="smooth on a laptop" /></At>
<At :x="520" :y="190" :w="320" :h="300" :z="2"><Stat value="3.2" suffix="K" decimals="1" label="decks exported" :decimals="1" /></At>
<At :x="900" :y="190" :w="320" :h="300" :z="2"><Stat value="0" prefix="+" label="layout shifts" /></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="0" :y="240" :w="1280" :h="240"><Marquee :speed="60" gap="3em">

<Kinetic text="Vue" size="l" /> <Kinetic text="Slidev" size="l" accent="slidev" /> <Kinetic text="Canvas" size="l" /> <Kinetic text="WebGL" size="l" /> <Kinetic text="Python" size="l" accent="python" />

</Marquee></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="90" :y="90" :w="1100" :h="540"><Spotlight><Headline size="l" tone="dark">Move the pointer over this text. The light follows it.</Headline></Spotlight></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="290" :y="130" :w="700" :h="420"><Tilt><Terminal title="tilt" :lines="['$ hover me', 'the card leans toward the pointer']" /></Tilt></At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="0" :y="0" :w="1280" :h="720"><Shader /></At>
<At :x="90" :y="260" :w="1100" :h="200" :z="2"><Kinetic text="A shader behind the words." mode="words" from="up" :stagger="90" size="l" accent="shader" /></At>
</Stage>

---
layout: default
---

# Looks

<Stage :h="64">
<At :w="1140" :h="64"><Looks :delay="60000" /></At>
</Stage>

- Press 1 to 5 to pick a look
- Leaving the slide puts the deck's look back

---
layout: stage
---

<Stage full>
<At :w="1280" :h="720">
<Livedeck :speed="12" :delay="200" :size="22">

````md
---
layout: hero
---
# Slides that **move.**
---
layout: statement
---
# Ship it **Friday.**
````

</Livedeck>
</At>
</Stage>

---
layout: full
---

<Stage full>
<At :x="90" :y="100" :w="500" :h="120" enter="up" :delay="1200" bg="var(--nd-surface)" frame pad="30px"><Headline size="m">Arrives late</Headline></At>
<At :x="90" :y="300" :w="500" :h="120" bg="var(--nd-surface)" frame pad="30px"><Headline size="m">Always there</Headline></At>
</Stage>
