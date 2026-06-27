# Book Explorer

An interactive 3D-globe atlas of the world's greatest and most popular books — for grown-ups
and children alike — placed on the planet by the country of their author, across every era,
language and genre (including comics & manga).

Part of **42-apps**. Sibling of [Music Explorer](../music-explorer/). Vanilla JS, no build step.

## Three lenses
- **🌍 Atlas** — spin the globe; tap any country to read its signature books. Flags mark every
  literary homeland (Don Quixote → Spain, Tintin → Belgium, One Piece → Japan). Filter by genre,
  era, or adult vs children's.
- **🏆 Charts** — best-selling, most-translated and most-awarded books; plus the most prolific,
  best-selling and most-decorated authors.
- **⏳ Time Machine** — re-rank best-sellers by their share of everyone alive at publication,
  projected to any chosen year's population (Don Quixote sold to a world of 0.6B ≈ 7.5B reach today).

## Files
- `index.html`, `app.css`, `app.js` — the app (globe engine shared with Music Explorer)
- `data/books.js` — the dataset (`songs` = books, `artists` = authors; generic keys shared with the engine)
- `data/countries.js` — name → flag / ISO / lat-lng lookup
- `data/countries.geojson` — Natural Earth country polygons (choropleth)
- `lib/globe.gl.min.js` — bundled globe.gl + three.js

## Run locally
```
python3 -m http.server 8776 --directory book-explorer
# → http://localhost:8776
```

## Deploy
`tools/deploy-42apps.sh "message"` publishes to https://42-apps.github.io/book-explorer/
(pushed as the 42-apps account via the keychain PAT).

## Data
Figures are best-documented public estimates (Wikipedia best-seller & most-translated lists; the
Nobel, Booker, Pulitzer and Hugo records). A multi-agent research sweep can later expand the
hand-curated seed to the same scale as Music Explorer.
