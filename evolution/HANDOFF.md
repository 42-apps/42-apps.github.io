# HANDOFF — A short history of evolution on earth

Deep-time 3D-globe app (globe.gl, no build). Sibling of `ahistoryofus`. Local folder
`~/Desktop/claude code/evolution`; live at `42-apps.github.io/evolution/`. Dev port 8779.

## Architecture

Continuous time `ma` (millions of years ago; 0 = today, 4600 = Earth's birth). A **non-linear
warp** (`WARP` in data.js, `posToMa`/`maToPos`) maps a 0–1 slider position to `ma` so the whole
Precambrian (88% of time) gets the left half of the bar and the Phanerozoic the right, recent
stretched most. Playback (`frame()` via requestAnimationFrame) advances the slider position at a
rate scaled by a speed multiplier; a live "Myr/s" readout shows the local rate.

**Globe layers (globe.gl), rebuilt on time change:**
- `polygonsData` — land. ≤1000 Ma: nearest reconstructed coastline slice from `paleocoast.json`
  (rebuilt only when the slice index changes). >1000 Ma: stylised growing `CRATONS`. >4000 Ma: none
  (magma world). Cap colour greens after land plants; whitens during snowballs.
- `htmlElementsData` — **emoji markers** for life + located events, at palaeo-coords. A persistent
  registry (`markerReg`) keeps stable element identity so markers fade/scale live during playback
  instead of flickering. Co-located fossils are spread into a constellation; labels de-cluttered.
- `ringsData` — expanding shockwave rings for impacts / flood-basalt volcanism.
- Globe material + atmosphere tint by era (magma-red → methane-orange → ocean-blue → snowball-white);
  a camera-following "headlight" keeps the visible face lit.

**Marker visibility** = a proportional time-window: an item is visible when `|ma − age|` is within
`windowTol(age) = clamp(0.09·age, 0.02, 320)` Ma — wide in the sparse deep past, tight in the crowded
recent past (so 12-ka agriculture never bleeds into 300 ka). Alpha fades toward the window edge.

**Cataclysms:** `checkTriggers(prevMa, curMa)` fires a screen flash + banner when playback crosses a
major impact/volcanism (`importance≥5`) or a mass extinction.

## Data

- `dataset.js` (generated) — `GEOSCALE` (ICS 2023), `EVENTS`, `LIFE`, `EXTINCTIONS`. Compiled by the
  `evolution-timeline-research` workflow: 14 era-agents → adversarial date-check → merge. Palaeo
  coordinates added by reconstructing each fossil site to its age via the GPlates Web Service
  (`gws.gplates.org/reconstruct/reconstruct_points`, MERDITH2021). Regeneration scripts live in the
  session scratchpad (`gen_dataset.py`, `fetch_paleo.py`).
- `data.js` (hand-authored) — warp, curves (`O2`/`CO2`/`TEMP`), `SNOWBALLS`, `CLADE_COLORS`, `CRATONS`,
  `STAGES`+`SIL` (morphing silhouettes), `CHAPTERS`, `TOUR`.

## Known limitations / next steps

- ~43 fossil sites returned no plate at their age (GPlates 999.99) and fall back to modern coords, so
  they don't sit perfectly on the palaeo-coastline. Could re-try with a nearer age or a different model.
- Playback smoothness depends on `requestAnimationFrame`; untestable in the headless preview (page is
  "hidden" → rAF paused), verified via manual frame-stepping. Works in a real browser.
- Land is snapped to the nearest of 29 coastline slices (no morph between them) — continents "step"
  every ~30–40 Myr during fast play. A vertex-morph crossfade would smooth it.
- A few emoji/name quibbles in the compiled data (e.g. Dimetrodon shown with 🦖). Low priority.

## Deploy

Publish AS `42-apps` (anonymity rule) via the keychain PAT — see `42-apps-deploy-mechanism` memory.
Fresh-clone `42-apps/42-apps.github.io`, copy this folder to `/evolution/`, commit + push as 42-apps.
