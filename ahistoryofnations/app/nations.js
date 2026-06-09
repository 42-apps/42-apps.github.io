/* ============================================================================
   A History of Nations — interactive globe + timeline.
   • TODAY: present-day sovereign states & territories (Natural Earth 1:50m).
   • HISTORY: time-enabled polity polygons from Cliopatria/Seshat (CC-BY,
     3400 BCE → 2024) — the set alive in the chosen year.
   Scrub the timeline; the borders + the count/list change with the year.
   Engine reused from World Languages Explorer (globe.gl).
   ========================================================================== */
'use strict';

const TODAY = 2026;
// Stepped timeline — coarse in antiquity, finer toward the present; last stop = Today (NE).
const STOPS = [-3000,-2500,-2000,-1500,-1200,-1000,-800,-600,-500,-400,-300,-200,-100,1,100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1750,1800,1850,1900,1914,1939,1960,1980,2000,2024,TODAY];
let yearIdx = STOPS.length - 1;                 // open on Today
const curYear = () => STOPS[yearIdx];
const isToday = () => curYear() >= 2025;
const fmtYr = y => y >= TODAY ? 'Today' : y < 0 ? (-y) + ' BC' : y + (y <= 1500 ? ' CE' : '');
// a recognizable historical-era name for the current year (conventional boundaries)
function eraName(y) {
  if (y >= TODAY)  return 'The world today';
  if (y >= 1991)   return 'Contemporary era';
  if (y >= 1914)   return 'The World Wars & after';
  if (y >= 1789)   return 'Empires & revolutions';
  if (y >= 1500)   return 'Early modern era';
  if (y >= 476)    return 'The Middle Ages';
  if (y >= -550)   return 'Classical antiquity';
  if (y >= -1200)  return 'The Iron Age';
  if (y >= -3300)  return 'The Bronze Age';
  return 'Prehistory';
}

const A3_TO_A2 = { FRA: 'FR', NOR: 'NO', CYN: 'CY', SOL: 'SO' };
const isoOf = p => { const a = p.ISO_A2; if (a && a !== '-99') return a; return A3_TO_A2[p.ADM0_A3] || p.ADM0_A3 || null; };

const PALETTE = ['#d98c5f','#5fae9b','#c97b86','#7d9cc7','#c2a25e','#9b8bbd','#84b06a','#cf9b6e','#6fa0b0','#c08aa6','#8fae7d','#b08f6f','#7fa6a0'];
function hashColor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
function colorForNE(f) { const mc = f.properties.MAPCOLOR13; return (mc && mc > 0) ? PALETTE[(mc - 1) % PALETTE.length] : hashColor(f.properties.ADMIN || f.properties.NAME || ''); }

// ---- generic accessors: work for both NE "today" features and Cliopatria "history" features ----
const isHist = f => f.properties.FromYear !== undefined;
// Cliopatria wraps some names in parentheses (loose/aggregate polities); strip for a clean display.
const stripParen = s => { s = (s || '').trim(); return (s.startsWith('(') && s.endsWith(')')) ? s.slice(1, -1).trim() : s; };
const featName = f => isHist(f) ? stripParen(f.properties.Name) : (f.properties.ADMIN || f.properties.NAME || f.properties.SOVEREIGNT || '—');
const featKey  = f => isHist(f) ? 'h:' + f.properties.Name + ':' + f.properties.FromYear : isoOf(f.properties);
const featColor = f => isHist(f) ? hashColor(f.properties.Name || '') : colorForNE(f);

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n>>16)&255}, ${(n>>8)&255}, ${n&255}, ${a})`; }
function flagEmoji(iso) { if (!iso || iso.length !== 2) return '🏳️'; return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
const fmtPop = n => !n || n < 0 ? '—' : n >= 1e9 ? (n/1e9).toFixed(2)+' bn' : n >= 1e6 ? (n/1e6).toFixed(1)+' M' : n >= 1e3 ? (n/1e3).toFixed(0)+' k' : ''+n;

const state = { hovered: null, selected: null };
let globe, neCountries = [], histAll = null, spinOn = true;
let ghostFeatures = [], ghostToday = true;    // faint "today's borders" reference layer (history mode only) — on by default
const elViz = document.getElementById('globeViz');
const tooltip = document.getElementById('tooltip');

/* ---- "My nations" (today only) — persisted Been / Want-to-go ---- */
const MINE_KEY = 'hon_mine_v1';
const MINE_COLOR = { been: '#2ecc71', want: '#ff4f9a' };
const mine = { been: new Set(), want: new Set() };
let tagMode = null;
function loadMine() { try { const o = JSON.parse(localStorage.getItem(MINE_KEY) || '{}'); (o.been||[]).forEach(x => mine.been.add(x)); (o.want||[]).forEach(x => mine.want.add(x)); } catch (e) {} }
function saveMine() { try { localStorage.setItem(MINE_KEY, JSON.stringify({ been: [...mine.been], want: [...mine.want] })); } catch (e) {} }

/* ---- Drop-a-pin: time-travel a place (persisted) ---- */
const PINS_KEY = 'hon_pins_v1';
const pins = [];
function loadPins() { try { const a = JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); if (Array.isArray(a)) a.forEach(p => { if (p && typeof p.lat === 'number' && typeof p.lng === 'number') pins.push({ name: String(p.name || 'Pin'), lat: p.lat, lng: p.lng }); }); } catch (e) {} }
function savePins() { try { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch (e) {} }
// ray-casting point-in-polygon → "which polity ruled this exact spot in this year?"
function pointInRing(x, y, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function pointInFeature(lng, lat, f) { const g = f.geometry; if (!g) return false; const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []; for (const poly of polys) { if (!poly.length || !pointInRing(lng, lat, poly[0])) continue; let inHole = false; for (let h = 1; h < poly.length; h++) if (pointInRing(lng, lat, poly[h])) { inHole = true; break; } if (!inHole) return true; } return false; }
function polityAt(lng, lat) { const fs = activeFeatures(); for (const f of fs) if (pointInFeature(lng, lat, f)) return f; return null; }
function refreshPins() { if (globe) globe.pointsData(pins.slice()); }
// bounding box per feature (cached) — to pre-filter the full-history point test
function featBB(f) { if (f.__bb) return f.__bb; let x0=181,y0=91,x1=-181,y1=-91; const walk = c => { if (typeof c[0] === 'number') { if(c[0]<x0)x0=c[0]; if(c[0]>x1)x1=c[0]; if(c[1]<y0)y0=c[1]; if(c[1]>y1)y1=c[1]; } else for (let i=0;i<c.length;i++) walk(c[i]); }; const g = f.geometry; if (g && g.coordinates) walk(g.coordinates); return f.__bb = [x0,y0,x1,y1]; }
// every polity that ever contained this point, merged into chronological ranges
function pinHistory(lng, lat) {
  if (!histAll) return [];
  const hits = [];
  for (const f of histAll.features) { const p = f.properties; if (p.Type === 'RELATION') continue; const b = featBB(f); if (lng<b[0]||lng>b[2]||lat<b[1]||lat>b[3]) continue; if (pointInFeature(lng, lat, f)) hits.push({ name: featName(f), from: p.FromYear, to: p.ToYear }); }
  const byName = {}; hits.forEach(h => { (byName[h.name] = byName[h.name] || []).push(h); });
  const merged = [];
  Object.keys(byName).forEach(name => { const arr = byName[name].sort((a,b)=>a.from-b.from); let cur = { name, from: arr[0].from, to: arr[0].to }; for (let i=1;i<arr.length;i++){ const h=arr[i]; if (h.from <= cur.to + 5) cur.to = Math.max(cur.to, h.to); else { merged.push(cur); cur = { name, from: h.from, to: h.to }; } } merged.push(cur); });
  merged.sort((a,b)=> a.from-b.from || a.to-b.to);
  return merged;
}

/* ----------------------------- the active set ----------------------------- */
function activeFeatures() {
  if (isToday()) return neCountries;
  if (!histAll) return [];
  const y = curYear();
  // RELATION features are diplomatic ties (alliances, vassalages, personal unions) — not nations; exclude.
  return histAll.features.filter(f => f.properties.Type !== 'RELATION' && f.properties.FromYear <= y && y <= f.properties.ToYear);
}

function capColor(f) {
  if (f.__ghost) return 'rgba(0,0,0,0)';      // transparent underlay — only its faint outline shows
  const key = featKey(f);
  const sel = state.selected && key === state.selected, hov = state.hovered && key === state.hovered;
  if (isToday()) {
    if (mine.been.has(key)) return hexA(MINE_COLOR.been, sel ? 1 : hov ? 0.96 : 0.86);
    if (mine.want.has(key)) return hexA(MINE_COLOR.want, sel ? 1 : hov ? 0.96 : 0.86);
    const dim = tagMode ? 0.5 : 1;
    return hexA(featColor(f), (sel ? 0.99 : hov ? 0.95 : 0.8) * dim);
  }
  // history: when the today-overlay is on, make polities a touch more translucent so modern borders read through
  return hexA(featColor(f), (sel ? 0.99 : hov ? 0.95 : 0.82) * (ghostToday ? 0.72 : 1));
}
const altOf = f => { if (f.__ghost) return 0; const key = featKey(f); return state.selected === key ? 0.06 : state.hovered === key ? 0.04 : 0.01; };

function initGlobe(geo) {
  neCountries = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  // stable, reusable "today" reference features (same object refs → globe.gl won't re-extrude them each scrub)
  ghostFeatures = neCountries.map(f => ({ type: 'Feature', properties: f.properties, geometry: f.geometry, __ghost: true }));
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#8fb7ff').atmosphereAltitude(0.16)
    .polygonsData(activeFeatures())
    .polygonCapColor(capColor)
    .polygonSideColor(f => f.__ghost ? 'rgba(0,0,0,0)' : 'rgba(10,16,30,0.5)')
    .polygonStrokeColor(f => f.__ghost ? 'rgba(208,223,247,0.42)' : 'rgba(8,12,24,0.65)')
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(0)
    .onPolygonHover(onHover)
    .onPolygonClick(onClick)
    .pointsData(pins.slice())
    .pointLat(d => d.lat).pointLng(d => d.lng)
    .pointColor(() => '#ffd24a')
    .pointAltitude(0.1).pointRadius(0.06).pointResolution(12)
    .pointsMerge(false)
    .pointLabel(d => '📍 ' + d.name)
    .onPointClick(p => { flyToPin(p); showPinHistory(p); })
    .pathsData([])
    .pathPoints(d => d.coords).pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathPointAlt(() => 0.013)
    .pathColor(() => 'rgba(96,172,236,0.8)')
    .pathStroke(0.7)
    .pathLabel(d => '🌊 ' + d.name)
    .pathTransitionDuration(0)
    .labelsData([])
    .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.text)
    .labelColor(() => 'rgba(150,205,245,0.92)')
    .labelSize(0.5).labelDotRadius(0.12).labelResolution(2).labelAltitude(0.014);
  const c = globe.controls(); c.autoRotate = true; c.autoRotateSpeed = 0.35; c.enableDamping = true;
  globe.pointOfView({ lat: 20, lng: 10, altitude: 2.3 });
  sizeGlobe();
  render();
}
function refreshGlobe() { if (globe) globe.polygonCapColor(capColor).polygonAltitude(altOf); }
function sizeGlobe() { if (!globe) return; globe.width(elViz.clientWidth).height(elViz.clientHeight); }
window.addEventListener('resize', sizeGlobe);

/* ------------------------------- render a year ------------------------------- */
function render() {
  document.getElementById('eraLabel').textContent = fmtYr(curYear());
  document.getElementById('eraName').textContent = eraName(curYear());
  document.getElementById('timeSlider').value = yearIdx;
  markEraJump();
  if (!isToday() && tagMode) exitTagMode();                // tagging is a "today" feature — leave it on, stay in the year
  if (state.selected) closeDetail();                       // selection may not exist in the new year
  const active = activeFeatures();
  // overlay today's borders faintly underneath, in history mode only (ghosts first = drawn beneath)
  const polys = (!isToday() && ghostToday) ? ghostFeatures.concat(active) : active;
  if (globe) globe.polygonsData(polys);
  refreshGlobe();
  // panel count + sub-label
  document.getElementById('pnCount').textContent = active.length;
  const sub = document.querySelector('#panel .pn-sub'), split = document.getElementById('pnSplit');
  document.getElementById('pnYear').textContent = fmtYr(curYear());
  if (isToday()) {
    sub.textContent = 'nations & territories';
    const sov = active.filter(f => ['Sovereign country', 'Country'].includes(f.properties.TYPE)).length;
    split.innerHTML = `<b>${sov}</b> sovereign states · <b>${active.length - sov}</b> territories`;
  } else {
    sub.textContent = 'polities & empires';
    split.innerHTML = `mapped in <b>${fmtYr(curYear())}</b> &middot; <span style="color:var(--muted)">borders are estimated, esp. deep past</span>`;
  }
  buildList(active);
  updateMineUI();
  updatePinCard();
}

/* ----------------------------- hover / detail ----------------------------- */
function onHover(f) {
  if (f && f.__ghost) f = null;                // the faint today-overlay is non-interactive
  state.hovered = f ? featKey(f) : null;
  refreshGlobe();
  if (globe) globe.controls().autoRotate = !f && spinOn && !playing;
  if (!f) { tooltip.classList.add('hidden'); return; }
  const p = f.properties;
  const sub = isHist(f) ? (p.Type ? p.Type[0] + p.Type.slice(1).toLowerCase() : 'Polity') + ' · ' + fmtYr(p.FromYear) + '–' + fmtYr(p.ToYear === TODAY ? 2024 : p.ToYear)
                        : (p.TYPE || 'Territory') + ' · ' + (p.SUBREGION || p.CONTINENT || '');
  tooltip.innerHTML = `<div class="tt-name">${isHist(f) ? '' : flagEmoji(isoOf(p)) + ' '}${featName(f)}</div><div class="tt-sub">${sub}</div>`;
  tooltip.classList.remove('hidden');
}
elViz.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('hidden')) return;
  const r = elViz.getBoundingClientRect(); tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px';
});
const detailCard = document.getElementById('detailCard');
function showDetail(f) {
  const p = f.properties, key = featKey(f);
  state.selected = key; refreshGlobe();
  document.getElementById('detailFlag').textContent = isHist(f) ? '🏛' : flagEmoji(isoOf(p));
  document.getElementById('detailName').textContent = featName(f);
  let rows;
  if (isHist(f)) {
    document.getElementById('detailType').textContent = (p.Type ? p.Type[0] + p.Type.slice(1).toLowerCase() : 'Polity');
    const wd = p.Wikidata ? `<a href="https://www.wikidata.org/wiki/${p.Wikidata}" target="_blank" rel="noopener">${p.Wikidata} ↗</a>` : '—';
    rows = [['Existed', fmtYr(p.FromYear) + ' – ' + fmtYr(p.ToYear === TODAY ? 2024 : p.ToYear)], ['Wikidata', wd]];
  } else {
    document.getElementById('detailType').textContent = (p.TYPE || 'Territory') + (p.SOVEREIGNT && p.SOVEREIGNT !== featName(f) ? ' · ' + p.SOVEREIGNT : '');
    rows = [
      ['Formal name', p.FORMAL_EN && p.FORMAL_EN !== '-99' ? p.FORMAL_EN : featName(f)],
      ['Region', [p.SUBREGION, p.CONTINENT].filter(Boolean).join(' · ')],
      ['Population', fmtPop(p.POP_EST) + (p.POP_YEAR ? ' (' + p.POP_YEAR + ')' : '')],
      ['ISO code', [p.ISO_A2, p.ISO_A3].filter(c => c && c !== '-99').join(' / ') || '—'],
    ];
  }
  document.getElementById('detailBody').innerHTML = rows.map(([k, v]) => `<div class="db-row"><span>${k}</span><b>${v || '—'}</b></div>`).join('');
  loadDescription(f, key);
  detailCard.classList.remove('hidden');
  detailCard.scrollTop = 0;
  markListActive(key);
}

/* historical detail: a short Wikipedia summary, fetched on demand via the bundled Wikidata id */
const descCache = new Map();
const escHtml = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
async function loadDescription(f, key) {
  const box = document.getElementById('detailDesc');
  if (!isHist(f)) { box.classList.add('hidden'); box.innerHTML = ''; return; }   // pre-modern places only
  box.classList.remove('hidden');
  const qid = (f.properties.Wikidata || '').trim(), name = featName(f);
  const cacheKey = qid || name;
  if (descCache.has(cacheKey)) return renderDesc(descCache.get(cacheKey), key);
  box.innerHTML = '<div class="dd-load">Loading summary…</div>';
  try {
    let title = name;
    if (/^Q\d+$/.test(qid)) {
      const wd = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`).then(r => r.json());
      const sl = wd.entities && wd.entities[qid] && wd.entities[qid].sitelinks && wd.entities[qid].sitelinks.enwiki;
      title = (sl && sl.title) || name;
    }
    const ex = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`).then(r => r.json());
    const page = Object.values(ex.query.pages)[0];
    const data = (page && page.extract && page.extract.trim())
      ? { extract: page.extract, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')) } : null;
    descCache.set(cacheKey, data);
    renderDesc(data, key);
  } catch (e) { renderDesc(undefined, key); }   // network error — not cached, so we can retry
}
function renderDesc(data, key) {
  if (state.selected !== key) return;            // user clicked elsewhere mid-fetch — don't clobber
  const box = document.getElementById('detailDesc');
  if (data === undefined) { box.innerHTML = '<div class="dd-none">Couldn’t load a summary — check your connection.</div>'; return; }
  if (!data) { box.innerHTML = '<div class="dd-none">No Wikipedia summary available for this polity.</div>'; return; }
  const paras = data.extract.split('\n').map(s => s.trim()).filter(Boolean);
  let text = paras.slice(0, 2).join('\n\n');
  if (text.length > 700) text = text.slice(0, 700).replace(/\s+\S*$/, '') + '…';
  box.innerHTML = text.split('\n\n').map(p => `<p>${escHtml(p)}</p>`).join('')
    + `<a class="dd-more" href="${data.url}" target="_blank" rel="noopener">Read more on Wikipedia →</a>`
    + `<div class="dd-attr">Summary from Wikipedia · CC BY-SA</div>`;
}
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; refreshGlobe(); markListActive(null); }
document.getElementById('detailClose').addEventListener('click', closeDetail);

// pin history: who ruled this exact spot, through time (full Cliopatria sweep + today)
function showPinHistory(p) {
  const hist = p.__hist || (p.__hist = pinHistory(p.lng, p.lat));
  document.getElementById('detailFlag').textContent = '📍';
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailType').textContent = 'Pin · ' + p.lat.toFixed(3) + '°, ' + p.lng.toFixed(3) + '°';
  const modern = neCountries.find(f => pointInFeature(p.lng, p.lat, f));
  let rows = hist.map(h => `<div class="ph-row" data-from="${h.from}" data-to="${h.to}"><span class="ph-nm">${escHtml(h.name)}</span><span class="ph-yr">${fmtYr(h.from)} – ${fmtYr(h.to === TODAY ? 2024 : h.to)}</span></div>`).join('');
  if (modern) rows += `<div class="ph-row" data-from="${TODAY}" data-to="${TODAY}"><span class="ph-nm">${escHtml(featName(modern))}</span><span class="ph-yr">today</span></div>`;
  document.getElementById('detailBody').innerHTML = '<div class="ph-intro">Who ruled this spot, through time</div>' + (rows || '<div class="dd-none">Not inside any mapped state in our data.</div>');
  document.getElementById('detailDesc').classList.add('hidden');
  state.selected = null; refreshGlobe(); markListActive(null);
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function jumpToEra(from, to) {
  const mid = (from + to) / 2; const inR = [];
  for (let i = 0; i < STOPS.length; i++) if (STOPS[i] >= from && STOPS[i] <= to) inR.push(i);
  let idx;
  if (inR.length) idx = inR.reduce((b, i) => Math.abs(STOPS[i] - mid) < Math.abs(STOPS[b] - mid) ? i : b, inR[0]);
  else { idx = 0; let bd = Infinity; for (let i = 0; i < STOPS.length; i++) { const d = Math.abs(STOPS[i] - mid); if (d < bd) { bd = d; idx = i; } } }
  yearIdx = idx; stopPlay(); render();
}
detailCard.addEventListener('click', e => { const r = e.target.closest('.ph-row'); if (r) jumpToEra(+r.dataset.from, +r.dataset.to); });
function onClick(f) {
  if (!f || f.__ghost) return;
  if (isToday() && tagMode) { toggleMine(featKey(f)); return; }
  showDetail(f);
  const b = f.bbox || bboxOf(f);
  const lng = (b[0] + b[2]) / 2, lat = (b[1] + b[3]) / 2;
  spinOn = false; syncSpin();
  if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: 1.7 }, 800); }
}
function bboxOf(f) { let x0=180,y0=90,x1=-180,y1=-90; const walk=c=>{ if(typeof c[0]==='number'){x0=Math.min(x0,c[0]);x1=Math.max(x1,c[0]);y0=Math.min(y0,c[1]);y1=Math.max(y1,c[1]);} else c.forEach(walk); }; walk(f.geometry.coordinates); return [x0,y0,x1,y1]; }

/* ----------------------------- list ----------------------------- */
function buildList(active) {
  const sorted = [...active].sort((a, b) => featName(a).localeCompare(featName(b)));
  document.getElementById('pnList').innerHTML = sorted.map(f =>
    `<div class="pn-row" data-key="${featKey(f)}"><span class="pn-sw" style="background:${featColor(f)}"></span><span class="pn-l">${featName(f)}</span><span class="pn-mine"></span></div>`).join('');
}
function markListActive(key) {
  document.querySelectorAll('#pnList .pn-row').forEach(r => r.classList.toggle('active', r.dataset.key === key));
  const a = key && document.querySelector(`#pnList .pn-row[data-key="${CSS.escape(key)}"]`); if (a) a.scrollIntoView({ block: 'nearest' });
}
function findActive(key) { return activeFeatures().find(f => featKey(f) === key); }
document.getElementById('pnList').addEventListener('click', e => {
  const row = e.target.closest('.pn-row'); if (!row) return;
  const f = findActive(row.dataset.key); if (f) onClick(f);
});

/* ------------------------------- search ------------------------------- */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = activeFeatures().map(f => ({ f, n: featName(f) })).filter(o => o.n.toLowerCase().includes(q))
    .sort((a, b) => a.n.toLowerCase().indexOf(q) - b.n.toLowerCase().indexOf(q) || a.n.localeCompare(b.n)).slice(0, 8);
  searchRes.innerHTML = hits.length ? hits.map((o, i) =>
    `<div class="sr-item${i===0?' sel':''}" data-key="${featKey(o.f)}"><span class="sr-flag">${isHist(o.f) ? '🏛' : flagEmoji(isoOf(o.f.properties))}</span>${o.n}</div>`).join('') : '<div class="sr-none">No match this year</div>';
  searchRes.classList.remove('hidden');
}
function pick(key) {
  if (!key && hits.length) key = featKey(hits[0].f);
  const f = key && findActive(key); if (!f) return;
  onClick(f); searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
}
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pick(); } else if (e.key === 'Escape') { searchEl.value=''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pick(it.dataset.key); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ------------------------------- timeline ------------------------------- */
const slider = document.getElementById('timeSlider');
slider.min = 0; slider.max = STOPS.length - 1; slider.value = yearIdx;
slider.addEventListener('input', () => { yearIdx = +slider.value; stopPlay(); render(); });
document.getElementById('prevEra').addEventListener('click', () => { yearIdx = Math.max(0, yearIdx - 1); stopPlay(); render(); });
document.getElementById('nextEra').addEventListener('click', () => { yearIdx = Math.min(STOPS.length - 1, yearIdx + 1); stopPlay(); render(); });
document.getElementById('nowBtn').addEventListener('click', () => { yearIdx = STOPS.length - 1; stopPlay(); render(); document.getElementById('miReset').click(); });
/* notable-era quick-jumps — leap the timeline to a famous moment */
const ERA_JUMPS = [
  { y: -2000, label: 'Bronze Age' },
  { y: -500,  label: 'Classical'  },
  { y: 100,   label: 'Roman peak' },
  { y: 1000,  label: 'Medieval'   },
  { y: 1500,  label: 'Discovery'  },
  { y: 1900,  label: 'Empires'    },
  { y: 1939,  label: 'World Wars' },
  { y: TODAY, label: 'Today'      },
];
const eraJumpsEl = document.getElementById('eraJumps');
eraJumpsEl.innerHTML = ERA_JUMPS.map(e => { const i = STOPS.indexOf(e.y);
  return `<button class="era-chip" data-idx="${i}" title="Jump to ${fmtYr(e.y)}">${e.label}</button>`; }).join('');
eraJumpsEl.addEventListener('click', e => { const c = e.target.closest('.era-chip'); if (!c) return; yearIdx = +c.dataset.idx; stopPlay(); render(); });
function markEraJump() { document.querySelectorAll('#eraJumps .era-chip').forEach(c => c.classList.toggle('on', +c.dataset.idx === yearIdx)); }

let playing = false, playTimer = null, playDir = 1;
const playFwd = document.getElementById('playFwd'), playBack = document.getElementById('playBack');
function syncPlayBtns() {
  playFwd.textContent = (playing && playDir > 0) ? '⏸' : '▶';
  playBack.textContent = (playing && playDir < 0) ? '⏸' : '◀';
  playFwd.classList.toggle('on', playing && playDir > 0);
  playBack.classList.toggle('on', playing && playDir < 0);
}
function stopPlay() { playing = false; if (playTimer) { clearInterval(playTimer); playTimer = null; } syncPlayBtns(); if (globe && !tagMode) globe.controls().autoRotate = spinOn; }
function startPlay(dir) {
  if (playing && playDir === dir) { stopPlay(); return; }     // same button again = pause
  playDir = dir; playing = true;
  if (dir > 0 && yearIdx >= STOPS.length - 1) yearIdx = 0;     // wrap to start when playing forward from the end
  if (dir < 0 && yearIdx <= 0) yearIdx = STOPS.length - 1;     // wrap to end when playing backward from the start
  syncPlayBtns();
  if (globe) globe.controls().autoRotate = false;
  if (playTimer) clearInterval(playTimer);
  playTimer = setInterval(() => {
    const next = yearIdx + playDir;
    if (next < 0 || next > STOPS.length - 1) { stopPlay(); return; }
    yearIdx = next; render();
  }, 1100);
}
playFwd.addEventListener('click', () => startPlay(1));
playBack.addEventListener('click', () => startPlay(-1));

/* ------------------------------- menu ------------------------------- */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
const miSpin = document.getElementById('miSpin');
function syncSpin() { const s = miSpin.querySelector('.mi-state'); if (s) s.textContent = spinOn ? 'On' : 'Off'; miSpin.classList.toggle('on', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !playing) globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
document.getElementById('miReset').addEventListener('click', () => { closeDetail(); if (globe) globe.pointOfView({ lat: 20, lng: 10, altitude: 2.3 }, 700); menu.classList.add('hidden'); });
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
const miGhost = document.getElementById('miGhost');
function syncGhost() { const s = miGhost.querySelector('.mi-state'); if (s) s.textContent = ghostToday ? 'On' : 'Off'; miGhost.classList.toggle('on', ghostToday); }
miGhost.addEventListener('click', () => { ghostToday = !ghostToday; syncGhost(); render(); });
syncGhost();

/* ---- Rivers layer (lazy-loaded; present-day courses, ~constant over history) ---- */
let riversOn = false, riverPaths = null, riverLabels = null, riversLoading = false;
const miRivers = document.getElementById('miRivers');
function syncRivers() { const s = miRivers.querySelector('.mi-state'); if (s) s.textContent = riversLoading ? '…' : (riversOn ? 'On' : 'Off'); miRivers.classList.toggle('on', riversOn); }
async function ensureRivers() {
  if (riverPaths) return riverPaths;
  if (riversLoading) return null;
  riversLoading = true; syncRivers();
  try {
    const j = await fetch('data/rivers.geojson?v=1').then(r => r.json());
    const paths = [];
    for (const f of j.features) {
      const nm = f.properties.name || '', sr = f.properties.sr, g = f.geometry; if (!g) continue;
      const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      for (const line of lines) if (line.length > 1) paths.push({ name: nm, sr, coords: line });
    }
    riverPaths = paths;
    // labels for the biggest rivers only (dedupe by name → midpoint of its longest segment)
    const best = {};
    for (const p of paths) { if (p.sr > 1 || !p.name) continue; if (!best[p.name] || p.coords.length > best[p.name].len) { const m = p.coords[Math.floor(p.coords.length / 2)]; best[p.name] = { len: p.coords.length, lat: m[1], lng: m[0], text: p.name }; } }
    riverLabels = Object.values(best).map(b => ({ lat: b.lat, lng: b.lng, text: b.text }));
  } catch (e) { riverPaths = []; riverLabels = []; }
  riversLoading = false; syncRivers();
  return riverPaths;
}
async function setRivers(on) {
  riversOn = on; syncRivers();
  if (on) { await ensureRivers(); if (globe && riversOn) { globe.pathsData(riverPaths); globe.labelsData(riverLabels || []); } }
  else if (globe) { globe.pathsData([]); globe.labelsData([]); }
  syncRivers();
}
miRivers.addEventListener('click', () => setRivers(!riversOn));
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });

/* ---- Welcome (first run + "How it works") ---- */
const SEEN_KEY = 'hon_seen_v1';
const welcomeOverlay = document.getElementById('welcomeOverlay');
const showWelcome = () => welcomeOverlay.classList.remove('hidden');
function hideWelcome() { welcomeOverlay.classList.add('hidden'); try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcomeOverlay.addEventListener('click', e => { if (e.target === welcomeOverlay) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); showWelcome(); });
try { if (!localStorage.getItem(SEEN_KEY)) showWelcome(); } catch (e) { showWelcome(); }

/* ------------------------------- My nations ------------------------------- */
function toggleMine(key) {
  if (!key || !tagMode || !isToday()) return;
  const set = mine[tagMode], other = mine[tagMode === 'been' ? 'want' : 'been'];
  if (set.has(key)) set.delete(key); else { set.add(key); other.delete(key); }
  saveMine(); refreshGlobe(); updateMineUI();
}
const mineBanner = document.getElementById('mineBanner');
function renderBanner() {
  if (!tagMode) return;
  const verb = tagMode === 'been' ? 'been to' : 'want to visit';
  mineBanner.className = tagMode;
  mineBanner.innerHTML = `Tap the countries you've <b>${verb}</b> &nbsp;·&nbsp; ✅ <b>${mine.been.size}</b> &nbsp; 🎯 <b>${mine.want.size}</b><span class="mb-x">done ✕</span>`;
}
function setTagMode(m) {
  if (!isToday()) { yearIdx = STOPS.length - 1; render(); }   // tagging only makes sense today
  tagMode = (tagMode === m) ? null : m;
  document.getElementById('miBeen').classList.toggle('on', tagMode === 'been');
  document.getElementById('miWant').classList.toggle('on', tagMode === 'want');
  if (tagMode) { mineBanner.classList.remove('hidden'); renderBanner(); spinOn = false; syncSpin(); if (globe) globe.controls().autoRotate = false; }
  else mineBanner.classList.add('hidden');
  refreshGlobe();
}
// turn tagging off without changing the year (used when scrubbing into history)
function exitTagMode() { tagMode = null; document.getElementById('miBeen').classList.remove('on'); document.getElementById('miWant').classList.remove('on'); mineBanner.classList.add('hidden'); }
function updateMineUI() {
  document.getElementById('cntBeen').textContent = mine.been.size;
  document.getElementById('cntWant').textContent = mine.want.size;
  renderBanner();
  document.querySelectorAll('#pnList .pn-row').forEach(r => { const m = r.querySelector('.pn-mine'); if (m) m.textContent = isToday() ? (mine.been.has(r.dataset.key) ? '✅' : mine.want.has(r.dataset.key) ? '🎯' : '') : ''; });
  const stat = document.getElementById('mineStat'), n = mine.been.size + mine.want.size;
  if (isToday() && n) {
    stat.classList.remove('hidden');
    const pct = Math.round(mine.been.size / (neCountries.length || 1) * 100);
    stat.innerHTML = `<span><span class="ms-b">✅ ${mine.been.size}</span> been <span style="color:var(--muted)">· ${pct}% of the world</span></span><span><span class="ms-w">🎯 ${mine.want.size}</span> to go</span>`;
  } else stat.classList.add('hidden');
}
mineBanner.addEventListener('click', e => { if (e.target.classList.contains('mb-x')) setTagMode(tagMode); });
document.getElementById('miBeen').addEventListener('click', () => { setTagMode('been'); menu.classList.add('hidden'); });
document.getElementById('miWant').addEventListener('click', () => { setTagMode('want'); menu.classList.add('hidden'); });
document.getElementById('miClearMine').addEventListener('click', () => {
  menu.classList.add('hidden');
  if (!mine.been.size && !mine.want.size) return;
  if (!confirm('Clear all your “been” and “want to go” nations?')) return;
  mine.been.clear(); mine.want.clear(); saveMine(); refreshGlobe(); updateMineUI();
});

/* ------------------------------- Drop a pin ------------------------------- */
const pinCard = document.getElementById('pinCard'), pinModal = document.getElementById('pinModal');
const pinSearch = document.getElementById('pinSearch'), pinResults = document.getElementById('pinResults');
let pinResData = [], pinTimer = null;
function updatePinCard() {
  if (!pins.length) { pinCard.classList.add('hidden'); return; }
  pinCard.classList.remove('hidden');
  document.getElementById('pinYear').textContent = fmtYr(curYear());
  document.getElementById('pinList').innerHTML = pins.map((p, i) => {
    const pol = polityAt(p.lng, p.lat);
    const polHtml = pol ? escHtml(featName(pol)) : '<span class="pin-none">no mapped state</span>';
    return `<div class="pin-row" data-i="${i}"><span class="pin-nm" title="${escHtml(p.name)}">${escHtml(p.name)}</span><span class="pin-pol">${polHtml}</span><span class="pin-x" data-x="${i}" title="Remove">×</span></div>`;
  }).join('');
}
function flyToPin(p) { spinOn = false; syncSpin(); stopPlay(); if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.4 }, 900); } }
function addPin(p) {
  if (!pins.some(q => Math.abs(q.lat - p.lat) < 1e-6 && Math.abs(q.lng - p.lng) < 1e-6)) pins.push(p);
  savePins(); refreshPins(); updatePinCard(); flyToPin(p); showPinHistory(p);
}
function openPinModal() { pinModal.classList.remove('hidden'); pinSearch.value = ''; pinResults.innerHTML = ''; pinResData = []; setTimeout(() => pinSearch.focus(), 40); }
function closePinModal() { pinModal.classList.add('hidden'); }
async function runPinSearch() {
  const q = pinSearch.value.trim();
  if (q.length < 2) { pinResults.innerHTML = ''; return; }
  pinResults.innerHTML = '<div class="pin-load">Searching…</div>';
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=' + encodeURIComponent(q), { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    pinResData = Array.isArray(r) ? r : [];
    if (!pinResData.length) { pinResults.innerHTML = '<div class="pin-none-r">No place found — try adding the country.</div>'; return; }
    pinResults.innerHTML = pinResData.map((x, i) => {
      const nm = x.name || (x.display_name || '').split(',')[0];
      const rest = (x.display_name || '').split(',').slice(1).join(',').trim();
      return `<div class="pin-res" data-i="${i}"><div class="pr-nm">${escHtml(nm)}<span class="pr-ty">${escHtml(x.type || x.addresstype || '')}</span></div><div class="pr-dn">${escHtml(rest)}</div></div>`;
    }).join('');
  } catch (e) { pinResults.innerHTML = '<div class="pin-none-r">Search failed — check your connection.</div>'; }
}
pinSearch.addEventListener('input', () => { clearTimeout(pinTimer); pinTimer = setTimeout(runPinSearch, 650); });
pinSearch.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(pinTimer); runPinSearch(); } });
pinResults.addEventListener('click', e => {
  const el = e.target.closest('.pin-res'); if (!el) return;
  const x = pinResData[+el.dataset.i]; if (!x) return;
  addPin({ name: x.name || (x.display_name || '').split(',')[0], lat: +x.lat, lng: +x.lon });
  closePinModal();
});
document.getElementById('pinList').addEventListener('click', e => {
  const x = e.target.closest('.pin-x');
  if (x) { pins.splice(+x.dataset.x, 1); savePins(); refreshPins(); updatePinCard(); return; }
  const row = e.target.closest('.pin-row'); if (row && pins[+row.dataset.i]) { const p = pins[+row.dataset.i]; flyToPin(p); showPinHistory(p); }
});
document.getElementById('pinClear').addEventListener('click', () => { if (pins.length) { pins.length = 0; savePins(); refreshPins(); updatePinCard(); } });
document.getElementById('miPin').addEventListener('click', () => { menu.classList.add('hidden'); openPinModal(); });
document.getElementById('miClearPins').addEventListener('click', () => { menu.classList.add('hidden'); if (pins.length && confirm('Remove all pins?')) { pins.length = 0; savePins(); refreshPins(); updatePinCard(); } });
document.getElementById('pinModalClose').addEventListener('click', closePinModal);
pinModal.addEventListener('click', e => { if (e.target === pinModal) closePinModal(); });

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden');
    if (!welcomeOverlay.classList.contains('hidden')) { hideWelcome(); return; }
    if (!pinModal.classList.contains('hidden')) { closePinModal(); return; }
    aboutOverlay.classList.add('hidden'); if (tagMode) setTagMode(tagMode); else if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === 'ArrowLeft') { yearIdx = Math.max(0, yearIdx - 1); stopPlay(); render(); }
  else if (e.key === 'ArrowRight') { yearIdx = Math.min(STOPS.length - 1, yearIdx + 1); stopPlay(); render(); }
});

/* --------------------------------- boot --------------------------------- */
loadMine();
loadPins();
Promise.all([
  fetch('data/countries.geojson?v=2').then(r => r.json()),
  fetch('data/cliopatria.topojson?v=1').then(r => r.json()),
]).then(([geo, topo]) => {
  try { histAll = topojson.feature(topo, topo.objects.cliopatria_polities_only); } catch (e) { console.error('topojson convert failed', e); histAll = { features: [] }; }
  initGlobe(geo);
}).catch(err => {
  console.error('data load failed', err);
  elViz.innerHTML = '<div style="color:#93a0c5;text-align:center;padding-top:40vh">Could not load map data.</div>';
});
