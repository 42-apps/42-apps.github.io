# 🌕 Living on the Moon

An interactive 3D Moon you can explore, build on, and fly to.

**Live:** https://42-apps.github.io/moon/

Three modes in one little world, built with [Three.js](https://threejs.org) — no build step, just static ES modules.

- **🔭 Explore** — a high-resolution 3D Moon (8K NASA / LRO-derived imagery) you can
  spin and zoom right down to the surface, with the maria, the great craters, every
  crewed & robotic landing site, and the spots humanity is eyeing for its first bases.
- **🏗️ Build** — drop dome cities, hotels, solar farms, ice mines and launch pads onto
  the surface and watch a colony come to life. The poles are prime real estate.
- **🚀 Launch** — fly a SpaceX **Starship** from a hi-res Earth to the Moon with a
  realistic timeline: liftoff, booster separation, trans-lunar injection, a three-day
  coast you can fast-forward, lunar-orbit insertion, and a powered landing.

## Run locally

It's all static files. Serve the folder with any web server:

```bash
python -m http.server 8799
# then open http://localhost:8799
```

## Layout

- `index.html` · `styles.css` — shell & UI
- `src/` — `main.js` (scene, explore, loop), `data.js` (landmarks, buildings, mission),
  `colony.js` (build mode), `launch.js` (Starship sim), `util.js` (helpers)
- `lib/three/` — vendored Three.js r184 (build + addons)
- `assets/tex/` — equirectangular imagery (see Credits)

## Credits

Lunar and Earth imagery © [Solar System Scope](https://www.solarsystemscope.com/textures/)
(NASA-derived), licensed **CC BY 4.0**. Three.js is MIT-licensed. The Starship is modelled
procedurally. Distances in Launch mode are compressed for visibility; the times are realistic.
