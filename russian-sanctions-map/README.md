# Russian Sanctions Map 🌍

**A century of the world — for & against Moscow.**

An interactive 3D globe and timeline of how every country has aligned toward
Russia, from the **Russian Empire** and the **USSR** to the largest sanctions
programme in history. Each country is painted **green** where relations are open
and friendly, **yellow** where it is neutral or partial, and **red** where it
sanctions or isolates Russia — with **Russia itself** (and, before 1991, the
other Soviet republics) in violet. Part of the
[42-apps](https://42-apps.github.io/) collection, built with
[globe.gl](https://globe.gl).

🔗 **Live:** https://42-apps.github.io/russian-sanctions-map/

## What it does

- **Choropleth globe & flat map** — 218 countries/territories coloured (and
  extruded into a 3D relief) by their stance *toward Moscow* in the selected year.
- **A century-long time slider (1900 → 2026)** — drag, or press ▶, to watch the
  world re-colour through nine eras: the WWII Grand Alliance, the Iron Curtain
  falling across Europe, the 1990s thaw when almost everyone turned green, and
  the 2014 → 2022 re-freeze into today's record sanctions. A live tally
  (🔴 sanctioning · 🟡 neutral · 🟢 open) updates as you scrub.
- **48 milestones** — every turning point from the 1911 trade-treaty abrogation
  to the EU's 21st sanctions package (June 2026) is a clickable tick on the
  timeline and an entry in the **Milestones** tab, each with the date, the actors
  and why it mattered.
- **Country drill-down** — click any country for its **relationship arc** with
  Russia across the whole century, broken into phases, plus its current status.
- **Era quick-jump** — pills to leap to the Empire, the Cold War, the partnership
  era, Crimea, today…
- **Global impact dashboard** — 14 headline stats (frozen reserves, the shadow
  fleet, the energy decoupling, Russia's GDP and defence burden, the corporate
  exodus…) and six thematic notes on what the sanctions have actually done.
- Search, a guided tour, auto-rotate, fullscreen, deep-linking (`?c=DEU`,
  `?y=1985`) and a responsive mobile layout.

## How a country is coloured

Each country carries a **status timeline** toward Moscow:

| Code | Meaning |
|------|---------|
| 🟢 green | Open / friendly — no sanctions |
| 🟡 yellow | Neutral or partial — balancing, or staying out |
| 🔴 red | Sanctioning or isolating Russia |
| 🟣 violet | Russia itself (and the USSR's republics before 1991) |

The colour is an **editorial reading of the relationship**, not only formal legal
measures. For the modern era (2014, 2022, today) it reflects the actual
sanctioning coalition; for older eras it reflects bloc alignment — NATO and its
allies vs. the Warsaw Pact, the Soviet republics, and the Non-Aligned Movement.
The great powers (Russia, the US, UK, France, Germany, Italy, Japan, China,
Finland, Poland, Iran) carry hand-authored arcs so the Empire, the World Wars and
the Sino-Soviet split are right; the rest are generated from a compact Cold-War
cohort + modern-stance spec.

## Data & sourcing

- **Milestones, current stances, Cold-War blocs and impact stats** were compiled
  (June 2026 snapshot) from OFAC and the EU Council sanctions timeline, the UK &
  G7, **Castellum.AI**, the **UN General Assembly ES-11 votes**, **SIPRI**,
  **Bruegel**, **CEPR**, **BOFIT** and the **Yale CELI** corporate-exit list.
- Country positions are baked into `data/sanctions.js` by `build_sanctions.mjs`,
  which expands a compact per-country spec into the full status timeline. Country
  names, regions and coordinates come from the World Bank country list
  (`data/_country_base.json`); boundaries are Natural Earth.
- The **hard cases** — India, Turkey, Serbia, the Gulf states, Central Asia,
  Armenia, Georgia, Israel — are flagged in their detail cards. Current stances
  involve judgement calls and reflect a moment in a fast-moving story.

## Run it

It's a static site — no build step for the app itself.

```bash
python3 -m http.server 8770 --directory russian-sanctions-map
# open http://localhost:8770

# regenerate the data file after editing build_sanctions.mjs:
node build_sanctions.mjs
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup & overlays |
| `app.css` | Styling (geopolitical slate / sanction-red / Russia-violet theme) |
| `app.js` | Globe, choropleth, timeline, milestones, drill-down, dashboard |
| `data/sanctions.js` | 218 countries · 48 milestones · 9 eras · impact stats (generated) |
| `data/countries.geojson` | Natural Earth country boundaries |
| `data/_country_base.json` | Country names / regions / coordinates (build input) |
| `build_sanctions.mjs` | Regenerates `sanctions.js` from the country spec |
| `lib/globe.gl.min.js` | 3D globe engine |

Not affiliated with any government; built for education and journalism.
Figures are best-available estimates — corrections are warmly welcome.
