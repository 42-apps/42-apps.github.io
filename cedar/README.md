# 🌳 CEDAR Explorer

**An interactive 3D globe of the world's intentional communities & ecovillages.**
By **CEDAR** — the Centre for Ecovillage Development and Research.

🔗 **Live:** https://42-apps.github.io/cedar/

From **Auroville** to **Findhorn**, **Tamera** to the **kibbutzim**, CEDAR Explorer maps 100+ real intentional communities and ecovillages onto a living globe — and ranks them by what makes a community thrive.

![CEDAR Explorer](https://42-apps.github.io/cedar/)

## What it does

- **A point for every community** on a spinnable 3D globe, coloured by type (ecovillage, kibbutz, commune, spiritual, cohousing, intentional, research) and sized by its success score.
- **A world ranking** in the side panel that re-sorts by any single measure — size, longevity, global reach or recognition — so you can jump straight to any community.
- **A detail card** for each: when it was founded, how many people live there, how international it is, its land area, founders, awards & recognitions, highlights, and a link to explore it directly.
- **A guided tour** through eight landmark communities, search, deep links (`?c=auroville`) and a fully responsive layout.

## The success score

Each community gets a transparent **0–100 score** combining four ingredients of success:

| Ingredient | Measure |
|---|---|
| **Size** | current residents (log-scaled) |
| **Longevity** | years the community has been going |
| **Global reach** | documented number of nationalities living there |
| **Recognition** | UN, UNESCO, Right Livelihood, World Habitat, GEN & other honours (weighted by prestige) |

The flagship — and the clear #1 — is **Auroville** (Tamil Nadu, India): the world's largest and most international intentional community, home to ~3,300 people from 60+ countries since 1968, and repeatedly endorsed by UNESCO.

## Data

Figures are best-available estimates gathered from Wikipedia, official community websites, the [Global Ecovillage Network](https://ecovillage.org) and the Foundation for Intentional Community. Some movement-level entries (Hutterites, Bruderhof, EcoYoff) count the whole network rather than a single site — noted in each description. Corrections are warmly welcome.

All data lives in [`data/communities.js`](data/communities.js); the score is computed live in [`app.js`](app.js) (`scoreOf()`), so the formula is fully transparent and tweakable.

## Run locally

No build step — it's a static site.

```bash
python3 -m http.server 8767
# open http://localhost:8767
```

## Built with

[globe.gl](https://github.com/vasturiano/globe.gl) (Three.js) · part of the [42-apps](https://42-apps.github.io/) collection · engine lineage from *A History of Us* and *GlobalTax*.
