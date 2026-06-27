# 🎵 Music Explorer

An interactive 3D globe of **the greatest and most popular music of all time**, placed on the
world by the country of each song's artist or composer — across every era, language and genre.

Part of [42-apps](https://42-apps.github.io). Live at **https://42-apps.github.io/music-explorer/**

## What it does

Three lenses on the same dataset (~380 songs, 90+ artists, 100 countries):

- **🌍 Atlas** — flags mark every musical homeland. Tap a country to see its signature songs
  (Brazil → *The Girl from Ipanema*, Sweden → ABBA, Jamaica → Bob Marley, Nigeria → Afrobeats…).
  Filter by genre (Pop, Rock, Soul, Latin, Reggae, Classical, Jazz, K-pop, World…) and era.
- **🏆 Charts** — leaderboards: Most Popular, Best-Selling singles, Most Streamed, Most Awarded
  songs; and for artists: Most #1 Hits, Most Charted, Most Grammys, Most Awards, Best-Selling,
  Biggest Today (monthly listeners).
- **⏳ Time Machine** — re-ranks best-selling singles by their **share of everyone alive at
  release**, projected onto any year's population. White Christmas sold 50M to a world of 2.3B in
  1942 — that's a ~176M reach against today's 8.3B. Slide through history to compare eras fairly.

Hit **▶** on any song to open it on YouTube.

## Tech

Vanilla, no build step. [globe.gl](https://github.com/vasturiano/globe.gl) (bundled locally) for the
3D earth + choropleth; a self-managed HTML overlay (`#markerLayer`) projects the flag markers each
frame (globe.gl's CSS2D layer proved unreliable when the viewport reports 0 dimensions).

```
index.html      markup + overlays
app.css         styles (music palette over the 42-apps frosted-glass dark globe)
app.js          globe, three views, markers, search, time machine
data/
  music.js          dataset (generated — do not hand-edit)
  music.seed.js     curated seed (hand-authored; build input)
  countries.js      name → [iso2, iso3, lat, lng] + flag helper
  countries.geojson Natural Earth boundaries (choropleth)
lib/globe.gl.min.js
tools/
  build-data.js       merge seed + research → data/music.js
  deploy-42apps.sh    publish to 42-apps.github.io/music-explorer
```

## Data

The dataset is a curated **seed** (hand-checked landmarks) merged with an exhaustive, adversarially
**verified research sweep** (37 agents across best-sellers, streams, Grammys, hit-makers, by-country
signatures, the classical canon, K-pop/Latin/Afrobeats waves and critics' lists). The build
normalizes country names, reclassifies mislabeled figures (no single ever sold >~50M — anything
larger is a stream/view count), applies fact-check corrections and de-duplicates.

To rebuild after editing the seed or refreshing research:

```bash
node tools/build-data.js   # reads data/music.seed.js + /tmp/research.json → data/music.js
```

Figures are best-documented public estimates (Wikipedia best-seller lists, the Recording Academy,
Billboard, IFPI, Guinness). Cultural significance is a judgment call — this is a celebration, not a
court ruling.

## Run locally

```bash
python3 -m http.server 8775 --directory music-explorer
# → http://localhost:8775
```
