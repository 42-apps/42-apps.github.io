# A short history of life on earth

A living, 4.5-billion-year atlas of our planet and all life on it — on one interactive 3D globe.
Start at a ball of molten rock; press play and watch oceans form, **real continents drift**
(Pangaea gathers and breaks apart), life spark at hydrothermal vents, oxygen fill the sky,
and creatures morph from single cells → trilobites → fish → dinosaurs → us. Giant impacts,
super-volcanoes, snowball freezes and mass extinctions fire as you reach them. Set your own
speed — from a gentle drift to a billion years a minute — and travel through deep time.

**Live:** https://42-apps.github.io/evolution/ · part of the [42-apps](https://42-apps.github.io/) family.

## What you're looking at

- **The globe is real geography.** Coastlines at every age are reconstructed from a published
  plate-tectonic model (Merdith et al. 2021) via the GPlates Web Service — so continental drift,
  supercontinents and ocean opening are as accurate as the science allows (back to ~1 Ga; before
  that the land is shown as stylised, indicative shields).
- **Life appears where we find it.** Each creature lights up at its true age and at the
  **palaeo-position** of its key fossil site (present-day coordinates reconstructed to that age),
  then fades as time moves on. Tap one to meet it.
- **The spotlight** shows the era's headline life-form as a silhouette that morphs through time,
  plus live gauges for the eon/era/period, atmospheric oxygen and climate.
- **Cataclysms** — impacts, flood-basalt volcanism, snowball glaciations and the Big Five mass
  extinctions — animate on the globe and flash a banner as you cross them.
- A **guided tour**, **search**, chapter chips, a colour-keyed tree of life, and shareable
  deep-links (`?ma=…`).

## Run locally

Static site, no build step:

```
python3 -m http.server 8779   # then open http://localhost:8779
```

(Or use the `evolution` config in `.claude/launch.json`.)

## Files

| File | What |
|------|------|
| `index.html` | Shell / DOM |
| `app.js` | Engine — deep-time warp, globe layers, playback, cataclysms, UI |
| `data.js` | Hand-authored framework — time warp, atmosphere/temperature curves, life-form silhouettes, chapters, tour, stylised deep-time cratons |
| `dataset.js` | Compiled dataset — ICS 2023 geologic time scale + 156 events, 203 life forms, 26 extinctions (each date-checked), with palaeo-reconstructed coordinates |
| `data/paleocoast.json` | 29 reconstructed coastline slices, 0–1000 Ma (Merdith 2021, downsampled) |
| `lib/globe.gl.min.js` | Globe renderer |

## Sources & caveats

Continental reconstructions: **GPlates** Web Service (Merdith et al. 2021). Time scale: **ICS 2023**.
Life and events compiled from the palaeontological / geological literature and cross-checked for
dates. Everything is an **approximation** of a fast-moving science; the deeper the past, the
fuzzier. Silhouettes are schematic; oxygen/CO₂/temperature curves are simplified sketches.

Made with much curiosity — and fun.
