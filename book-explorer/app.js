/* ============================================================
   Music Explorer — app.js
   3D globe of the world's greatest music. Three lenses:
   Atlas (by country) · Charts (leaderboards) · Time Machine (population-adjusted).
   ============================================================ */
(function () {
"use strict";

/* ---------- short helpers ---------- */
const $ = s => document.querySelector(s);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const esc = s => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const COUNTRIES = window.COUNTRIES, flagFor = window.flagFor, M = window.BOOKS;

/* Find-the-book: open a Google Books search (first result is virtually always the book). */
function ytUrl(title, artist) { return "https://www.google.com/search?tbm=bks&q=" + encodeURIComponent((artist ? artist + " " : "") + title); }
function ytLink(title, artist, cls) { return `<a class="ytlink${cls ? " " + cls : ""}" href="${ytUrl(title, artist)}" target="_blank" rel="noopener" title="Find this book" aria-label="Find this book">📖</a>`; }

function humanize(n) {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return Math.round(n / 1e6) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
}
function popAt(year) {
  const P = M.population;
  if (year <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) {
    if (year <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * (year - a[0]) / (b[0] - a[0]); }
  }
  return P[P.length - 1][1];
}
function era(y) { if (!y) return "Unknown"; if (y < 1950) return "Pre-1950"; if (y < 1980) return "1950s–70s"; if (y < 2000) return "1980s–90s"; return "2000s+"; }
function genreColor(g) {
  g = (g || "").toLowerCase();
  if (/comic|manga|graphic/.test(g)) return "#ff9f43";
  if (/child|picture book|fairy|fable/.test(g)) return "#5be0a0";
  if (/fantasy/.test(g)) return "#a98bff";
  if (/sci|science fiction/.test(g)) return "#6ad2ff";
  if (/myster|crime|thriller|detective/.test(g)) return "#ff6b5b";
  if (/horror|gothic/.test(g)) return "#c77bff";
  if (/romance/.test(g)) return "#ff5db1";
  if (/poetry|epic|myth/.test(g)) return "#e0b15b";
  if (/religio|scriptur|sacred|philosoph|political/.test(g)) return "#ffd24a";
  if (/memoir|self-help|non-?fiction|biograph/.test(g)) return "#5bd6ff";
  if (/drama|play|satire/.test(g)) return "#ff7bd5";
  if (/literary|classic|historical|fiction|magical|folklore/.test(g)) return "#ffcf6b";
  return "#b6abce";
}
const GENRE_LEGEND = [
  ["Literary / Classic", "#ffcf6b"], ["Fantasy", "#a98bff"], ["Sci-Fi", "#6ad2ff"], ["Mystery", "#ff6b5b"],
  ["Horror", "#c77bff"], ["Romance", "#ff5db1"], ["Children's", "#5be0a0"], ["Comic / Manga", "#ff9f43"],
  ["Poetry / Epic", "#e0b15b"], ["Religious", "#ffd24a"], ["Non-fiction", "#5bd6ff"], ["Drama", "#ff7bd5"]
];

/* ---------- enrich songs ---------- */
const SONGS = M.songs.map((s, i) => {
  const c = COUNTRIES[s.country];
  return Object.assign({}, s, {
    _i: i,
    id: s.id || ("b" + i),     // book records are hand-authored without ids; generate stable ones
    iso2: c ? c[0] : null, iso3: c ? c[1] : null,
    lat: c ? c[2] : null, lng: c ? c[3] : null,
    flag: flagFor(s.country, c ? c[0] : null),
    color: genreColor(s.genre), era: era(s.year)
  });
});
const SONG_BY_ID = {}; SONGS.forEach(s => SONG_BY_ID[s.id] = s);

/* aggregate by country (atlas) */
const COUNTRY_AGG = {};
SONGS.forEach(s => {
  if (!s.lat) return;
  const k = s.country;
  if (!COUNTRY_AGG[k]) {
    const c = COUNTRIES[s.country];
    COUNTRY_AGG[k] = { name: k, iso2: c[0], iso3: c[1], lat: c[2], lng: c[3], flag: s.flag, songs: [], weight: 0 };
  }
  COUNTRY_AGG[k].songs.push(s);
  COUNTRY_AGG[k].weight += (s.pop || 50);
});
Object.values(COUNTRY_AGG).forEach(c => c.songs.sort((a, b) => (b.pop || 0) - (a.pop || 0)));
/* iso3 -> has songs + dominant color (for choropleth) */
const ISO3_INFO = {};
Object.values(COUNTRY_AGG).forEach(c => {
  const e = ISO3_INFO[c.iso3] || (ISO3_INFO[c.iso3] = { weight: 0, color: c.songs[0].color, top: c.songs[0] });
  e.weight += c.weight;
  if ((c.songs[0].pop || 0) > (e.top.pop || 0)) { e.top = c.songs[0]; e.color = c.songs[0].color; }
});

/* ---------- state ---------- */
const state = {
  view: "atlas",
  chart: "popular",
  genre: "all",
  eraF: "all",
  audience: "all",
  refYear: 2026,
  sel: null,        // {type:'song'|'country'|'artist', key}
  spin: true,
  hover: null
};
const lastMouse = { x: 0, y: 0 };

/* ---------- globe ---------- */
let globe, GEO = null, LAND = [];
const elViz = $("#globeViz");

function polyIso(f) {
  const p = f.properties;
  if (p.ISO_A3 && p.ISO_A3 !== "-99") return p.ISO_A3;
  if (p.ISO_A3_EH && p.ISO_A3_EH !== "-99") return p.ISO_A3_EH;
  return p.ADM0_A3;
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

function capColor(f) {
  const iso = polyIso(f);
  const info = ISO3_INFO[iso];
  const selIso = state.sel && state.sel.type === "country" ? COUNTRY_AGG[state.sel.key].iso3 : null;
  const hot = (selIso && selIso === iso) || state.hover === iso;
  if (state.view === "atlas" && info) {
    // colour countries that have music; brighter when active
    return hexA(info.color, hot ? 0.92 : 0.5);
  }
  if (info) return hexA(info.color, hot ? 0.7 : 0.16);
  return hexA("#2a2440", hot ? 0.5 : 0.28);
}
function polyAlt(f) {
  const iso = polyIso(f);
  const info = ISO3_INFO[iso];
  const selIso = state.sel && state.sel.type === "country" ? COUNTRY_AGG[state.sel.key].iso3 : null;
  let base = info ? (state.view === "atlas" ? 0.012 + Math.min(0.05, info.weight / 4000) : 0.01) : 0.008;
  if (selIso && selIso === iso) return base + 0.06;
  if (state.hover === iso) return base + 0.03;
  return base;
}

function initGlobe() {
  LAND = GEO.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== "Antarctica");
  globe = Globe()(elViz)
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true).atmosphereColor("#46c2a6").atmosphereAltitude(0.18)
    .polygonsData(LAND)
    .polygonCapColor(capColor)
    .polygonSideColor(() => "rgba(10,8,18,0.5)")
    .polygonStrokeColor(() => "rgba(190,170,235,0.14)")
    .polygonAltitude(polyAlt)
    .polygonsTransitionDuration(160)
    .onPolygonHover(onPolyHover)
    .onPolygonClick(onPolyClick)
    .onGlobeClick(() => { clearSel(); });

  try {
    const m = globe.globeMaterial();
    m.color.set("#0f211e"); m.emissive.set("#08140f"); m.emissiveIntensity = 0.9; m.shininess = 5;
  } catch (e) {}

  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.32;
  ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 130; ctr.maxDistance = 600;
  const setZoom = () => { ctr.zoomSpeed = 2.0; };
  setZoom(); ctr.addEventListener("change", setZoom);
  globe.pointOfView({ lat: 22, lng: 8, altitude: 2.5 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}

  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);

  // self-managed marker overlay (globe.gl's CSS2D layer proved flaky); project each frame
  markerLayer = $("#markerLayer");
  requestAnimationFrame(tick);
}
function tick() { updatePositions(); requestAnimationFrame(tick); }
function sizeGlobe() {
  if (!globe) return;
  const w = elViz.clientWidth || window.innerWidth || document.documentElement.clientWidth || 1280;
  const h = elViz.clientHeight || window.innerHeight || document.documentElement.clientHeight || 800;
  globe.width(w).height(h);
}

/* ---------- markers ---------- */
function buildMarker(d) {
  const wrap = el("div", "gmark");          // globe.gl controls wrap's transform
  if (d._dim) wrap.classList.add("dimmed");
  const inner = el("div", "gm-inner");
  inner.style.setProperty("--fs", (d._size || 22) + "px");
  const f = el("span", "gm-flag"); f.textContent = d.flag; inner.appendChild(f);
  if (d._rank != null && d._rank <= 12) { const r = el("span", "gm-rank"); r.textContent = d._rank; inner.appendChild(r); }
  else if (d._badge != null) { const b = el("span", "gm-badge"); b.textContent = d._badge; inner.appendChild(b); }
  wrap.appendChild(inner);
  wrap.addEventListener("mouseenter", () => showMarkerTip(d));
  wrap.addEventListener("mouseleave", hideTip);
  wrap.addEventListener("mousemove", e => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; positionTip(); });
  wrap.addEventListener("click", ev => { ev.stopPropagation(); d._onClick && d._onClick(); });
  return wrap;
}
function showMarkerTip(d) {
  let html = "";
  if (d._tip) html = d._tip;
  $("#tooltip").innerHTML = html;
  $("#tooltip").classList.remove("hidden");
  positionTip();
}
function positionTip() {
  const t = $("#tooltip"); if (t.classList.contains("hidden")) return;
  let x = lastMouse.x, y = lastMouse.y;
  const w = t.offsetWidth, h = t.offsetHeight;
  if (x + w + 26 > window.innerWidth) x = x - w - 18;
  if (y + h + 26 > window.innerHeight) y = y - h - 18;
  t.style.left = x + "px"; t.style.top = y + "px"; t.style.transform = "translate(12px,12px)";
}
function hideTip() { $("#tooltip").classList.add("hidden"); }

let markerLayer = null, MARK = [];
function setMarkers(arr) {
  MARK = arr || [];
  if (!markerLayer) return;
  markerLayer.textContent = "";
  const frag = document.createDocumentFragment();
  MARK.forEach(d => { const node = buildMarker(d); d._el = node; frag.appendChild(node); });
  markerLayer.appendChild(frag);
  updatePositions();
}
function updatePositions() {
  if (!globe || !MARK.length || !markerLayer) return;
  const cam = globe.camera().position;
  const camLen = Math.hypot(cam.x, cam.y, cam.z) || 1;
  const R = globe.getGlobeRadius ? globe.getGlobeRadius() : 100;
  const horizon = R / camLen; // cos(horizon angle): surface points with higher dot are visible
  for (const m of MARK) {
    const elm = m._el; if (!elm) continue;
    const p = globe.getCoords(m.lat, m.lng, 0.01);
    const pLen = Math.hypot(p.x, p.y, p.z) || 1;
    const dot = (p.x * cam.x + p.y * cam.y + p.z * cam.z) / (pLen * camLen);
    if (dot < horizon * 0.985) { if (elm.style.display !== "none") elm.style.display = "none"; continue; }
    const sc = globe.getScreenCoords(m.lat, m.lng, 0.01);
    if (sc.x == null) { elm.style.display = "none"; continue; }
    elm.style.display = "block";
    elm.style.transform = `translate(-50%,-50%) translate(${sc.x}px,${sc.y}px)`;
  }
}

/* ---------- polygon interaction ---------- */
function onPolyHover(f) {
  state.hover = f ? polyIso(f) : null;
  if (globe) globe.controls().autoRotate = !f && state.spin;
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);
  if (!f) { if (!state.hover) hideTip(); return; }
  const iso = polyIso(f);
  const info = ISO3_INFO[iso];
  const name = f.properties.ADMIN || f.properties.NAME;
  const flag = info ? info.top.flag : flagFor(name, (f.properties.ISO_A2 || "").toUpperCase());
  let html = `<div class="tt-title"><span class="tt-flag">${flag}</span>${esc(name)}</div>`;
  if (info) html += `<div class="tt-sub">${info.top.flag ? "" : ""}${esc(info.top.title)} — ${esc(info.top.artist)}</div><div class="tt-hint">Click for this country's music ↗</div>`;
  else html += `<div class="tt-blurb" style="color:var(--dim)">No songs yet on the map.</div>`;
  $("#tooltip").innerHTML = html; $("#tooltip").classList.remove("hidden"); positionTip();
}
function onPolyClick(f) {
  const iso = polyIso(f);
  // find a country in our agg with this iso3
  const hit = Object.values(COUNTRY_AGG).find(c => c.iso3 === iso);
  if (hit) selectCountry(hit.name, true);
}

/* ---------- camera ---------- */
function flyTo(lat, lng, alt) {
  if (!globe) return;
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat, lng, altitude: alt || 1.7 }, 850);
}

/* ============================================================
   VIEW RENDERING
   ============================================================ */
function render() {
  renderViewbar();
  if (state.view === "atlas") renderAtlas();
  else if (state.view === "charts") renderCharts();
  else renderTimeMachine();
  $("#timebar").classList.toggle("hidden", state.view !== "timemachine");
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === state.view));
  const rl = $("#rankList"); if (rl) rl.scrollTop = 0; // fresh list starts at the top (slider bypasses render())
}

/* ----- viewbar (context chips) ----- */
function renderViewbar() {
  const vb = $("#viewbar"); vb.innerHTML = "";
  if (state.view === "atlas") {
    vb.appendChild(chipLabel("For"));
    [["all", "Everyone"], ["adult", "📖 Adult"], ["children", "🧒 Children's"]].forEach(([k, lab]) =>
      vb.appendChild(chip(lab, state.audience === k, () => { state.audience = k; render(); })));
    vb.appendChild(sep());
    vb.appendChild(chipLabel("Genre"));
    const genres = ["all", "Literary", "Fantasy", "Sci-Fi", "Mystery", "Horror", "Romance", "Children's", "Comic", "Poetry", "Religious"];
    genres.forEach(g => vb.appendChild(chip(g === "all" ? "All" : g, state.genre === g, () => { state.genre = g; render(); })));
    vb.appendChild(sep());
    vb.appendChild(chipLabel("Era"));
    ["all", "Pre-1950", "1950s–70s", "1980s–90s", "2000s+"].forEach(e =>
      vb.appendChild(chip(e === "all" ? "All" : e, state.eraF === e, () => { state.eraF = e; render(); })));
  } else if (state.view === "charts") {
    vb.appendChild(chipLabel("Books"));
    [["popular", "🔥 Most Popular"], ["sales", "💰 Best-Selling"], ["translated", "🌍 Most Translated"], ["awarded", "🏆 Most Awarded"]]
      .forEach(([k, lab]) => vb.appendChild(chip(lab, state.chart === k, () => { state.chart = k; clearSel(); render(); })));
    vb.appendChild(sep());
    vb.appendChild(chipLabel("Authors"));
    [["sold", "✍️ Best-Selling"], ["prolific", "📚 Most Prolific"], ["transauth", "🌐 Most Translated"], ["awards", "🏅 Most Awarded"]]
      .forEach(([k, lab]) => vb.appendChild(chip(lab, state.chart === k, () => { state.chart = k; clearSel(); render(); })));
  } else {
    vb.appendChild(chipLabel("Re-rank best-sellers by their share of everyone alive at publication, projected to a chosen year."));
  }
  // let the side panels sit just below the (possibly wrapped) chip bar
  requestAnimationFrame(() => document.documentElement.style.setProperty("--vbh", (vb.offsetHeight + 8) + "px"));
}
function chip(label, on, fn) { const c = el("button", "chip" + (on ? " on" : "")); c.innerHTML = label; c.onclick = fn; return c; }
function chipLabel(t) { const s = el("span", "chip-label"); s.textContent = t; return s; }
function sep() { return el("span", "chip-sep"); }

/* genre family match for filter */
function inGenre(s, fam) {
  if (fam === "all") return true;
  const g = (s.genre || "").toLowerCase();
  const map = {
    "Literary": /literary|classic|historical|fiction|magical|folklore/, "Fantasy": /fantasy/,
    "Sci-Fi": /sci|science fiction/, "Mystery": /myster|crime|thriller|detective/,
    "Horror": /horror|gothic/, "Romance": /romance/, "Children's": /child|picture book|fairy|fable/,
    "Comic": /comic|manga|graphic/, "Poetry": /poetry|epic|myth/, "Religious": /religio|scriptur|sacred|philosoph|political/
  };
  return map[fam] ? map[fam].test(g) : true;
}
/* audience filter: 'all' shows everything; 'all'-tagged books always show */
function inAud(s) {
  if (state.audience === "all") return true;
  const a = s.audience || "adult";
  return a === state.audience || a === "all";
}

/* ----- ATLAS ----- */
function renderAtlas() {
  $("#rkTitle").textContent = "Atlas of Books";
  $("#rkSub").textContent = "Tap a country to read its signature books";
  $("#legend").classList.remove("hidden");
  $("#legend").innerHTML = GENRE_LEGEND.map(([l, c]) => `<span class="lg-item"><span class="lg-dot" style="background:${c}"></span>${l}</span>`).join("");

  // filtered countries
  const countries = Object.values(COUNTRY_AGG).map(c => {
    const songs = c.songs.filter(s => inGenre(s, state.genre) && inAud(s) && (state.eraF === "all" || s.era === state.eraF));
    return Object.assign({}, c, { fsongs: songs });
  }).filter(c => c.fsongs.length).sort((a, b) => b.weight - a.weight);

  $("#rkCount").textContent = countries.length + " countries";
  // list
  const list = $("#rankList"); list.innerHTML = "";
  countries.forEach((c, i) => {
    const r = el("div", "rk-row" + (state.sel && state.sel.type === "country" && state.sel.key === c.name ? " active" : ""));
    r.innerHTML =
      `<span class="rk-rank">${i + 1}</span>` +
      `<span class="rk-flag">${c.flag}</span>` +
      `<span class="rk-body"><span class="rk-name">${esc(c.name)}</span>` +
      `<span class="rk-meta">${esc(c.fsongs[0].title)} · ${c.fsongs.length} book${c.fsongs.length > 1 ? "s" : ""}</span></span>` +
      `<span class="genre-dot" style="background:${c.fsongs[0].color}"></span>`;
    r.dataset.selkey = "country:" + c.name;
    r.onclick = () => selectCountry(c.name, true);
    list.appendChild(r);
  });
  $("#rkFoot").textContent = countries.reduce((n, c) => n + c.fsongs.length, 0) + " books across the world";

  // markers
  const maxW = Math.max(...countries.map(c => c.weight), 1);
  const markers = countries.map(c => ({
    lat: c.lat, lng: c.lng, flag: c.flag,
    _size: 17 + Math.round(16 * Math.sqrt(c.weight / maxW)),
    _badge: c.fsongs.length > 1 ? c.fsongs.length : null,
    _tip: `<div class="tt-title"><span class="tt-flag">${c.flag}</span>${esc(c.name)}</div><div class="tt-sub">${esc(c.fsongs[0].title)} — ${esc(c.fsongs[0].artist)}</div><div class="tt-hint">${c.fsongs.length} song${c.fsongs.length > 1 ? "s" : ""} · click to explore ↗</div>`,
    _onClick: () => selectCountry(c.name, true)
  }));
  setMarkers(markers);
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);
}

/* ----- CHARTS ----- */
function artistChart(metric, title, sub, unit) {
  const list = M.artists.filter(a => a.metric === metric).sort((a, b) => b.value - a.value);
  const max = list.length ? list[0].value : 1;
  const big = metric === "books_sold" || metric === "translations";
  return { kind: "artist", title, sub, list, stat: a => ({ big: big && metric !== "translations" ? humanize(a.value) : a.value, unit, bar: a.value / max }) };
}
function audFiltered() { return SONGS.filter(inAud); }
function chartConfig() {
  switch (state.chart) {
    case "popular": return { kind: "song", title: "Most Popular of All Time", sub: "Composite fame across sales, translations, awards & cultural weight", list: audFiltered().sort((a, b) => (b.pop || 0) - (a.pop || 0)), stat: s => ({ big: (s.pop || 0), unit: "fame", bar: (s.pop || 0) / 100 }) };
    case "sales": return { kind: "song", title: "Best-Selling Books", sub: "Estimated copies sold worldwide", list: audFiltered().filter(s => s.sales).sort((a, b) => b.sales - a.sales), stat: s => ({ big: humanize(s.sales), unit: "copies", bar: s.sales / 500000000 }) };
    case "translated": return { kind: "song", title: "Most Translated", sub: "Number of languages translated into", list: audFiltered().filter(s => s.translations).sort((a, b) => b.translations - a.translations), stat: s => ({ big: s.translations, unit: "languages", bar: s.translations / 300 }) };
    case "awarded": return { kind: "song", title: "Most Awarded Books", sub: "Nobel, Booker, Pulitzer, Hugo & more", list: audFiltered().filter(s => s.awardCount).sort((a, b) => b.awardCount - a.awardCount || (b.pop || 0) - (a.pop || 0)), stat: s => ({ big: s.awardCount, unit: "awards", bar: s.awardCount / 3 }) };
    case "sold": return artistChart("books_sold", "Best-Selling Authors", "Estimated copies sold across a career", "copies");
    case "prolific": return artistChart("num_books", "Most Prolific Authors", "Number of books written", "books");
    case "transauth": return artistChart("translations", "Most Translated Authors", "Number of languages translated into", "languages");
    case "awards": return artistChart("awards", "Most Awarded Authors", "Major literary awards won", "awards");
  }
}
function renderCharts() {
  $("#legend").classList.add("hidden");
  const cfg = chartConfig();
  $("#rkTitle").textContent = cfg.title;
  $("#rkSub").textContent = cfg.sub;
  $("#rkCount").textContent = cfg.list.length + (cfg.kind === "song" ? " books" : " authors");

  const list = $("#rankList"); list.innerHTML = "";
  cfg.list.forEach((d, i) => {
    const st = cfg.stat(d);
    const country = cfg.kind === "song" ? d.country : d.country;
    const c = COUNTRIES[country];
    const flag = cfg.kind === "song" ? d.flag : flagFor(country, c ? c[0] : null);
    const isSel = state.sel && ((cfg.kind === "song" && state.sel.type === "song" && state.sel.key === d.id) || (cfg.kind === "artist" && state.sel.type === "artist" && state.sel.key === artistKey(d)));
    const r = el("div", "rk-row" + (isSel ? " active" : ""));
    r.innerHTML =
      `<span class="rk-rank">${i + 1}</span>` +
      `<span class="rk-flag">${flag}</span>` +
      `<span class="rk-body"><span class="rk-name">${esc(cfg.kind === "song" ? d.title : d.name)}</span>` +
      `<span class="rk-meta">${esc(cfg.kind === "song" ? d.artist + " · " + d.country : d.country + (d.era ? " · " + d.era : ""))}</span>` +
      `<span class="rk-bar" style="width:${Math.max(6, Math.min(100, st.bar * 100))}%"></span></span>` +
      `<span class="rk-stat"><span class="rk-big">${st.big}</span><span class="rk-unit">${st.unit}</span></span>`;
    r.dataset.selkey = cfg.kind === "song" ? "song:" + d.id : "artist:" + artistKey(d);
    r.onclick = () => { cfg.kind === "song" ? selectSong(d.id, true) : selectArtist(d, true); };
    list.appendChild(r);
  });
  $("#rkFoot").textContent = "Click any row to fly there";

  // markers (cap the globe to the top of the leaderboard; the list shows all)
  let markers;
  if (cfg.kind === "song") {
    markers = cfg.list.filter(s => s.lat).slice(0, 40).map((s, i) => ({
      lat: s.lat, lng: s.lng, flag: s.flag, _size: i < 3 ? 30 : i < 10 ? 24 : 19, _rank: i + 1,
      _tip: `<div class="tt-title"><span class="tt-flag">${s.flag}</span>${esc(s.title)}</div><div class="tt-sub">#${i + 1} · ${esc(s.artist)}</div>`,
      _onClick: () => selectSong(s.id, true)
    }));
  } else {
    markers = cfg.list.filter(a => COUNTRIES[a.country]).slice(0, 40).map((a, i) => {
      const c = COUNTRIES[a.country];
      return { lat: c[2], lng: c[3], flag: flagFor(a.country, c[0]), _size: i < 3 ? 30 : i < 10 ? 24 : 19, _rank: i + 1,
        _tip: `<div class="tt-title"><span class="tt-flag">${flagFor(a.country, c[0])}</span>${esc(a.name)}</div><div class="tt-sub">#${i + 1} · ${esc(a.country)}</div>`,
        _onClick: () => selectArtist(a, true) };
    });
  }
  setMarkers(markers);
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);
}
function artistKey(a) { return a.name + "|" + a.metric; }

/* ----- TIME MACHINE ----- */
function tmList() {
  const ref = state.refYear, refPop = popAt(ref) * 1e9;
  return SONGS.filter(s => s.sales && s.year && s.year >= 1600).map(s => {
    const worldThen = popAt(s.year) * 1e9;
    const share = s.sales / worldThen;
    const projected = share * refPop;
    return Object.assign({}, s, { _share: share, _projected: projected, _worldThen: worldThen });
  }).sort((a, b) => b._projected - a._projected);
}
function renderTimeMachine() {
  $("#legend").classList.add("hidden");
  $("#rkTitle").textContent = "Time Machine";
  $("#rkSub").textContent = `Best-sellers ranked by reach if released to the world of ${state.refYear}`;
  const list = tmList();
  $("#rkCount").textContent = list.length + " books";

  const elList = $("#rankList"); elList.innerHTML = "";
  const maxP = Math.max(...list.map(s => s._projected), 1);
  list.forEach((s, i) => {
    const isSel = state.sel && state.sel.type === "song" && state.sel.key === s.id;
    const r = el("div", "rk-row" + (isSel ? " active" : ""));
    r.innerHTML =
      `<span class="rk-rank">${i + 1}</span>` +
      `<span class="rk-flag">${s.flag}</span>` +
      `<span class="rk-body"><span class="rk-name">${esc(s.title)}</span>` +
      `<span class="rk-meta">${esc(s.artist)} · ${s.year} · sold ${humanize(s.sales)}</span>` +
      `<span class="rk-bar" style="width:${Math.max(6, (s._projected / maxP) * 100)}%"></span></span>` +
      `<span class="rk-stat"><span class="rk-big">${humanize(s._projected)}</span><span class="rk-unit">reach</span></span>`;
    r.dataset.selkey = "song:" + s.id;
    r.onclick = () => selectSong(s.id, true);
    elList.appendChild(r);
  });
  $("#rkFoot").textContent = "“Reach” = share of the world that read it, applied to " + state.refYear + "'s population";

  const markers = list.filter(s => s.lat).slice(0, 40).map((s, i) => ({
    lat: s.lat, lng: s.lng, flag: s.flag, _size: i < 3 ? 30 : i < 10 ? 24 : 19, _rank: i + 1,
    _tip: `<div class="tt-title"><span class="tt-flag">${s.flag}</span>${esc(s.title)}</div><div class="tt-sub">#${i + 1} · reach ${humanize(s._projected)}</div>`,
    _onClick: () => selectSong(s.id, true)
  }));
  setMarkers(markers);
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);

  // slider readout
  $("#tmYear").textContent = state.refYear;
  $("#tmPop").textContent = "🌍 " + popAt(state.refYear).toFixed(2) + "B people";
  $("#tmSlider").value = state.refYear;
  $("#tmSlider").style.setProperty("--fill", ((state.refYear - 1900) / (2026 - 1900) * 100) + "%");
  const top = list[0];
  if (top) $("#tmExplain").innerHTML = `e.g. <b>${esc(top.title)}</b> sold ${humanize(top.sales)} to a world of ${(top._worldThen / 1e9).toFixed(1)}B — that's a <b>${humanize(top._projected)}</b> reach today.`;
}

/* ============================================================
   SELECTION / DETAIL CARD
   ============================================================ */
function clearSel() { state.sel = null; $("#detailCard").classList.add("hidden"); document.querySelectorAll(".rk-row.active").forEach(r => r.classList.remove("active")); if (globe) globe.polygonCapColor(capColor).polygonAltitude(polyAlt); }

function selectSong(id, fly) {
  const s = SONG_BY_ID[id]; if (!s) return;
  state.sel = { type: "song", key: id };
  showSongDetail(s);
  if (fly && s.lat) flyTo(s.lat, s.lng, 1.7);
  markActiveRows();
}
function selectCountry(name, fly) {
  const c = COUNTRY_AGG[name]; if (!c) return;
  state.sel = { type: "country", key: name };
  showCountryDetail(c);
  if (fly) flyTo(c.lat, c.lng, 1.7);
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt);
  markActiveRows();
}
function selectArtist(a, fly) {
  state.sel = { type: "artist", key: artistKey(a) };
  showArtistDetail(a);
  const c = COUNTRIES[a.country];
  if (fly && c) flyTo(c[2], c[3], 1.8);
  markActiveRows();
}
function markActiveRows() {
  const want = state.sel ? state.sel.type + ":" + state.sel.key : null;
  let active = null;
  document.querySelectorAll(".rk-row").forEach(r => { const on = r.dataset.selkey === want; r.classList.toggle("active", on); if (on) active = r; });
  if (active) active.scrollIntoView({ block: "nearest" });
}

function statBox(num, lab, ctx, cls) {
  return `<div class="dc-stat ${cls || ""}"><div class="dc-snum">${num}</div><div class="dc-slab">${lab}</div>${ctx ? `<div class="dc-sctx">${ctx}</div>` : ""}</div>`;
}
function showSongDetail(s) {
  const dc = $("#detailCard"), b = $("#detailBody");
  const tags = [];
  tags.push(`<span class="dc-tag" style="border-color:${s.color}66;color:${s.color}">${esc(s.genre)}</span>`);
  tags.push(`<span class="dc-tag">${esc(s.country)}</span>`);
  if (s.year) tags.push(`<span class="dc-tag">${s.year < 0 ? Math.abs(s.year) + " BCE" : s.year}</span>`);
  if (s.language) tags.push(`<span class="dc-tag">${esc(s.language)}</span>`);
  const audLab = { children: "🧒 Children's", adult: "📖 Adult", all: "👪 All ages" }[s.audience || "adult"];
  if (audLab) tags.push(`<span class="dc-tag">${audLab}</span>`);
  if (s.awards) tags.push(`<span class="dc-tag hi">🏆 ${esc(s.awards)}</span>`);

  let stats = "";
  if (s.sales) stats += statBox(humanize(s.sales), "Copies sold", "worldwide", "gold");
  if (s.translations) stats += statBox(s.translations, "Languages", "translated into", "cyan");
  if (s.pop) stats += statBox(s.pop, "Fame score", "0–100 composite");
  if (s.sales && s.year && s.year >= 1600) {
    const reach = (s.sales / (popAt(s.year) * 1e9)) * popAt(2026) * 1e9;
    stats += statBox(humanize(reach), "Today-equivalent", "population-adjusted");
  }

  b.innerHTML =
    `<div class="dc-hero"><div class="dc-flag">${s.flag}</div>` +
    `<div class="dc-title">${esc(s.title)} ${ytLink(s.title, s.artist, "dc-find")}</div>` +
    `<div class="dc-artist">${esc(s.artist)}</div>` +
    `<div class="dc-tags">${tags.join("")}</div></div>` +
    `<div class="dc-body"><p class="dc-blurb">${esc(s.blurb)}</p>` +
    (stats ? `<div class="dc-stats">${stats}</div>` : "") +
    moreFromCountry(s) + "</div>";
  dc.classList.remove("hidden"); dc.scrollTop = 0;
}
function moreFromCountry(s) {
  const c = COUNTRY_AGG[s.country]; if (!c || c.songs.length < 2) return "";
  const others = c.songs.filter(x => x.id !== s.id).slice(0, 6);
  if (!others.length) return "";
  return `<div class="dc-section-h">More from ${esc(s.country)} ${s.flag}</div>` +
    others.map(o => `<div class="dc-songrow" data-song="${o.id}"><span class="genre-dot" style="background:${o.color}"></span><span><span class="n">${esc(o.title)}</span><br><span class="m">${esc(o.artist)}</span></span><span class="y">${o.year || ""}</span></div>`).join("");
}
function showCountryDetail(c) {
  const dc = $("#detailCard"), b = $("#detailBody");
  const genres = Array.from(new Set(c.songs.map(s => s.genre))).slice(0, 4).join(" · ");
  b.innerHTML =
    `<div class="dc-hero"><div class="dc-flag">${c.flag}</div>` +
    `<div class="dc-title">${esc(c.name)}</div>` +
    `<div class="dc-artist">${c.songs.length} book${c.songs.length > 1 ? "s" : ""} on the map</div>` +
    `<div class="dc-tags"><span class="dc-tag">${esc(genres)}</span></div></div>` +
    `<div class="dc-body"><div class="dc-section-h">Signature books</div>` +
    c.songs.map((o, i) => `<div class="dc-songrow" data-song="${o.id}"><span class="rk-rank" style="width:18px">${i + 1}</span><span class="genre-dot" style="background:${o.color}"></span><span><span class="n">${esc(o.title)}</span><br><span class="m">${esc(o.artist)} · ${esc(o.genre)}</span></span><span class="y">${o.year || ""}</span></div>`).join("") +
    `</div>`;
  dc.classList.remove("hidden"); dc.scrollTop = 0;
}
function showArtistDetail(a) {
  const dc = $("#detailCard"), b = $("#detailBody");
  const c = COUNTRIES[a.country];
  const flag = flagFor(a.country, c ? c[0] : null);
  const metricLab = { books_sold: "copies sold", num_books: "books written", translations: "languages translated", awards: "major literary awards" }[a.metric] || a.metric;
  // their songs in dataset
  const theirs = SONGS.filter(s => (s.artist || "").toLowerCase().includes(a.name.toLowerCase()) || (a.name.toLowerCase().includes("beatles") && /beatles/i.test(s.artist))).slice(0, 6);
  b.innerHTML =
    `<div class="dc-hero"><div class="dc-flag">${flag}</div>` +
    `<div class="dc-title">${esc(a.name)}</div>` +
    `<div class="dc-artist">${esc(a.country)}${a.era ? " · " + esc(a.era) : ""}${a.genre ? " · " + esc(a.genre) : ""}</div></div>` +
    `<div class="dc-body">` +
    `<div class="dc-stats">${statBox(humanize(a.value), metricLab, "", "gold")}</div>` +
    `<p class="dc-blurb">${esc(a.blurb || "")}</p>` +
    (theirs.length ? `<div class="dc-section-h">On the map</div>` + theirs.map(o => `<div class="dc-songrow" data-song="${o.id}"><span class="genre-dot" style="background:${o.color}"></span><span><span class="n">${esc(o.title)}</span><br><span class="m">${esc(o.genre)}</span></span><span class="y">${o.year || ""}</span></div>`).join("") : "") +
    `</div>`;
  dc.classList.remove("hidden"); dc.scrollTop = 0;
}
// delegate clicks on song rows inside detail card
$("#detailBody").addEventListener("click", e => {
  const row = e.target.closest("[data-song]"); if (row) selectSong(row.dataset.song, true);
});

/* ============================================================
   SEARCH
   ============================================================ */
function buildSearchIndex() {
  const idx = [];
  SONGS.forEach(s => idx.push({ kind: "Book", label: s.title, meta: s.artist + " · " + s.country, flag: s.flag, go: () => selectSong(s.id, true) }));
  Object.values(COUNTRY_AGG).forEach(c => idx.push({ kind: "Country", label: c.name, meta: c.songs.length + " books", flag: c.flag, go: () => selectCountry(c.name, true) }));
  const seenA = new Set();
  const metricChart = { books_sold: "sold", num_books: "prolific", translations: "transauth", awards: "awards" };
  M.artists.forEach(a => { if (seenA.has(a.name)) return; seenA.add(a.name); const c = COUNTRIES[a.country]; idx.push({ kind: "Author", label: a.name, meta: a.country, flag: flagFor(a.country, c ? c[0] : null), go: () => { state.view = "charts"; state.chart = metricChart[a.metric] || "sold"; render(); selectArtist(a, true); } }); });
  return idx;
}
let SEARCH_IDX = [];
function runSearch(q) {
  const box = $("#searchResults");
  q = q.trim().toLowerCase();
  if (!q) { box.classList.add("hidden"); return; }
  const hits = SEARCH_IDX.filter(x => x.label.toLowerCase().includes(q) || x.meta.toLowerCase().includes(q)).slice(0, 12);
  if (!hits.length) { box.innerHTML = `<div class="sr-row" style="cursor:default;color:var(--dim)">No matches</div>`; box.classList.remove("hidden"); return; }
  box.innerHTML = hits.map((h, i) => `<div class="sr-row" data-i="${i}"><span class="sr-flag">${h.flag}</span><span><span class="sr-name">${esc(h.label)}</span><br><span class="sr-meta">${esc(h.meta)}</span></span><span class="sr-kind">${h.kind}</span></div>`).join("");
  box.classList.remove("hidden");
  box.querySelectorAll(".sr-row[data-i]").forEach(r => r.onclick = () => { hits[+r.dataset.i].go(); $("#search").value = ""; box.classList.add("hidden"); });
}

/* ============================================================
   CONTROLS / WIRING
   ============================================================ */
function resetHome() {
  clearSel();
  state.view = "atlas"; state.genre = "all"; state.eraF = "all"; state.audience = "all"; state.chart = "popular"; state.refYear = 2026;
  state.spin = true; syncSpin();
  render();
  flyTo(22, 8, 2.5);
  setTimeout(() => { if (globe) globe.controls().autoRotate = state.spin; }, 900);
}
function syncSpin() { $("#spinToggle").classList.toggle("off", !state.spin); if (globe) globe.controls().autoRotate = state.spin; }

function wire() {
  $("#brandHome").onclick = resetHome;
  document.querySelectorAll(".tab[data-view]").forEach(t => t.onclick = () => { state.view = t.dataset.view; clearSel(); render(); });
  $("#aboutBtn").onclick = () => $("#aboutOverlay").classList.remove("hidden");
  $("#aboutClose").onclick = () => $("#aboutOverlay").classList.add("hidden");
  $("#aboutOverlay").onclick = e => { if (e.target.id === "aboutOverlay") $("#aboutOverlay").classList.add("hidden"); };
  $("#dcClose").onclick = clearSel;
  $("#spinToggle").onclick = () => { state.spin = !state.spin; syncSpin(); };
  $("#search").addEventListener("input", e => runSearch(e.target.value));
  $("#search").addEventListener("focus", e => { if (e.target.value) runSearch(e.target.value); });
  document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) $("#searchResults").classList.add("hidden"); });
  $("#tmSlider").addEventListener("input", e => { state.refYear = +e.target.value; renderTimeMachine(); });
  window.addEventListener("mousemove", e => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; });
  window.addEventListener("keydown", e => { if (e.key === "Escape") { clearSel(); $("#aboutOverlay").classList.add("hidden"); } });
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  wire();
  SEARCH_IDX = buildSearchIndex();
  try {
    const res = await fetch("data/countries.geojson");
    GEO = await res.json();
  } catch (e) { console.error("geojson load failed", e); }
  initGlobe();
  render();
}
boot();
})();
