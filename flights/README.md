# Direct Flights

An interactive 3D globe of the world's airports and their **non-stop** flights.

- **Click an airport** — every direct route it flies fans out as a glowing arc.
- **Click a route** — see the great-circle distance, an estimated flight time, and **every airline** that flies that city-pair non-stop.
- **Longest flights** — a curated 2026 ranking of the world's longest non-stop passenger routes, traced on the globe.

Only non-stop service is shown — no connections.

## Data
- Airport & route backbone: [OpenFlights](https://openflights.org/data) (ODbL) — a community snapshot of scheduled non-stop service. Broad but not perfectly current.
- Longest-flights table: curated 2026 ranking (Wikipedia "Longest flights" + airline timetables).

Built with [globe.gl](https://github.com/vasturiano/globe.gl) / three.js. No build step — static HTML/CSS/JS. Not affiliated with any airline or airport.
