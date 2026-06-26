# The Hitchhiker's Guide to the Known Galaxy 🛸

**A real, well-researched guide to the Milky Way — written in the voice of the Guide.**

Every glowing dot on the map is a *genuine* astronomical object, placed at its
**true position** (computed from its J2000 right ascension, declination and
distance) in a real-scale 3D model of our galaxy. Click anything and the Guide —
a green-screened handheld with **DON'T PANIC** on the cover — tells you what it
is: the facts are real astronomy; the verdicts and survival tips are editorial.

Part of the [42-apps](https://42-apps.github.io/) collection, built with
[three.js](https://threejs.org). The Answer is 42; the map is the question.

🔗 **Live:** https://42-apps.github.io/42/

## What it does

- **Fly the galaxy** — a real-scale barred-spiral Milky Way: **Sagittarius A***
  (the 4-million-solar-mass black hole) glows at the centre, the **Sun** sits
  ~26,000 light-years out in the Orion Arm, and ~100 catalogued objects are
  pinned at their actual sky positions. Drag to orbit, scroll to zoom.
- **Read the Guide** — a retro Sub-Etha device renders each entry: a one-line
  verdict, a Guide-voiced write-up, a fact table, a DON'T PANIC tip, the real
  distance, and *"how long it would take at Voyager's pace."*
- **~146 entries across 8 sections** — the Solar System, the stellar
  neighbourhood, famous & spectacular stars, exoplanets, the shape of the galaxy,
  nebulae & clusters, exotic & dangerous objects (black holes, pulsars,
  magnetars), and the concepts, signals & artifacts a hitchhiker actually needs.
- **Quick-jump views** — 🌌 whole galaxy · ☀️ the Sun & its neighbours · ⚫ the
  galactic core — plus a 🎬 guided tour, search, browse-by-section, a 🎲
  Surprise-Me, and shareable deep-links (`?e=<id>`).

## How it's built

Vanilla ES modules, no build step. `index.html` + `app.css` + `app.js`
(the three.js engine) + `data/guide.js` (the corpus) + `lib/` (vendored
three.js r160 + OrbitControls).

```
python3 -m http.server 8773 --directory .
```

## Honest caveats

Distances to far objects carry real astronomical uncertainty; the spiral arms
are an artistic rendering *at true scale*, not a star-by-star survey. The
"years at Voyager's pace" figure assumes a straight-line ~17 km/s, which no
sensible hitchhiker would attempt. The prose is in the spirit of Douglas Adams;
the numbers are not.
