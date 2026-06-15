# Longevity Map 🌍

**World life expectancy & the Blue Zones — on a living globe.**

An interactive 3D globe that paints every country and territory by how long its
people live — **green** where life is longest, **yellow** around the world
average, **red** where it is shortest — and marks the world's **Blue Zones** in
blue. Part of the [42-apps](https://42-apps.github.io/) collection, built with
[globe.gl](https://globe.gl).

![Longevity Map](https://42-apps.github.io/) <!-- screenshot to be added -->

## What it does

- **Choropleth globe & flat map** — 218 countries/territories coloured (and
  extruded into a 3D "longevity relief") by life expectancy at birth.
- **All / Women / Men** — switch the whole map between total, female and male
  life expectancy to see the longevity gap between the sexes.
- **Time slider (1960 → 2022)** — drag, or press ▶, to watch six decades of
  dramatic gains (world average 55 → 73 years) — and the rare real collapses
  (Rwanda 1994, Cambodia under the Khmer Rouge).
- **Country drill-down** — click a country for its world rank, 60-year history,
  and — for 16 countries — **which of its regions live longest and shortest**
  (e.g. Kerala 78.3 vs Chhattisgarh 69.5 in India).
- **Two rankings** — the longest-lived **countries** and, separately, the
  longest-lived **cities & city-states** (Monaco, Hong Kong, San Marino…).
- **Blue Zones** — the five demographically validated zones (Okinawa, Sardinia,
  Ikaria, Nicoya, Loma Linda), Buettner's "engineered" sixth (Singapore), a set
  of **emerging candidates** this atlas nominates (Cilento, the Sicani Mountains,
  Rugao, Martinique, Menorca, Hong Kong, Andorra), and two famous-but-debunked
  legends (Hunza, Vilcabamba) — each with a writeup and the **Power 9** lifestyle
  traits.
- **Mediterranean climate belt** — toggle the 30°–45° latitude bands, a nod to
  the old idea that mild, temperate climates are gentler on human life.
- Search, guided tour, auto-rotate, fullscreen, deep-linking (`?c=JPN`,
  `?bz=okinawa`), and a responsive mobile layout.

## Data & sourcing

- **Country life expectancy** is sourced live from the **World Bank Open Data
  API** (`SP.DYN.LE00.IN` / `.MA.IN` / `.FE.IN`, total/male/female, 1960–2022)
  and baked into `data/longevity.js` by `build_longevity.py`. Implausible modern
  artifacts (e.g. an erroneous CAR 2022 value) are filtered; genuine historical
  catastrophes are preserved. Taiwan is supplemented from its own statistics
  agency (not in World Bank data).
- **Subnational figures** (`data/regions.js`) and **city figures**
  (`data/cities.js`) are best-available estimates from national statistics
  offices, with varying methods and base years — compare *within* a country, not
  across.
- **Blue Zones** (`data/bluezones.js`) follow Dan Buettner / National Geographic,
  Pes & Poulain, the Adventist Health Study and the regional studies cited on
  each card. Lifestyle claims are associations, not medical advice.

## Run it

It's a static site — no build step.

```bash
python3 -m http.server 8769 --directory longevity-map
# open http://localhost:8769
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup & overlays |
| `app.css` | Styling (longevity green / Blue-Zone cyan theme) |
| `app.js` | Globe, choropleth, rankings, drill-down, time slider, Blue Zones |
| `data/longevity.js` | 218 countries · total/male/female · 1960–2022 (World Bank) |
| `data/bluezones.js` | Blue Zones, candidates, legends + the Power 9 |
| `data/regions.js` | Subnational life expectancy for 16 countries |
| `data/cities.js` | World's longest-lived cities & city-states |
| `data/countries.geojson` | Natural Earth country boundaries |
| `lib/globe.gl.min.js` | 3D globe engine |
| `build_longevity.py` | Regenerates `longevity.js` from the World Bank API |

Figures are best-available estimates; corrections are warmly welcome.
