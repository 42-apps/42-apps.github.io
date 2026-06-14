/* ============================================================================
   CEDAR Explorer — interactive 3D globe of the world's intentional communities.
   Centre for Ecovillage Development and Research.

   Each community in data/communities.js becomes a glowing point on the globe
   (or a 2D flat map). A live "success score" (0–100) is computed from four
   ingredients — size, longevity, international reach and recognition (scoreOf).
   The left panel ranks every community and re-sorts by any single measure.
   A timeline scrubber reveals communities by founding year; lineage arcs show
   who seeded whom; a stats overlay sums up the movement. Engine: globe.gl.
   ========================================================================== */
'use strict';

const NOW = 2026;
const MIN_YEAR = 1850;
const C = window.COMMUNITIES || [];

/* ----------------------------- community types --------------------------- */
const TYPES = {
  ecovillage:  { label:'Ecovillage',            c:'#5fd08a' },
  intentional: { label:'Intentional community', c:'#e7b24a' },
  kibbutz:     { label:'Kibbutz / moshav',      c:'#4aa6e0' },
  commune:     { label:'Commune',               c:'#ef6b6b' },
  spiritual:   { label:'Spiritual community',   c:'#b98cf0' },
  cohousing:   { label:'Cohousing',             c:'#34d0c0' },
  research:    { label:'Research community',     c:'#f2a13a' },
};
const typeColor = t => (TYPES[t] || {}).c || '#9fb0a5';
const typeLabel = t => (TYPES[t] || {}).label || t;
const typeShort = t => typeLabel(t).replace(' community', '').replace(' / moshav', '');

/* ----------------------------- helpers ----------------------------------- */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
const fmtNum = n => n == null ? '—' : n.toLocaleString('en-US');

/* ----------------------------- success score ----------------------------- */
function awardPoints(awards) {
  if (!awards || !awards.length) return 0;
  let pts = 0;
  for (const a of awards) {
    const s = a.toLowerCase();
    let w = 0.7;
    if (s.includes('unesco')) w = Math.max(w, 2.2);
    else if (s.includes('world habitat') || s.includes('un-habitat') || s.includes('habitat best')) w = Math.max(w, 1.8);
    else if (s.includes('right livelihood')) w = Math.max(w, 1.8);
    else if (s.includes('unep') || s.includes('champions of the earth')) w = Math.max(w, 1.5);
    else if (s.includes('magsaysay') || s.includes('gandhi') || s.includes('niwano') || s.includes('peace prize') || s.includes('peace messenger')) w = Math.max(w, 1.3);
    else if (s.includes('ecosoc') || s.includes('unwto') || s.includes('un tourism') || s.includes(' un ') || s.includes('global forum') || s.includes('national historic landmark')) w = Math.max(w, 1.2);
    else if (s.includes('gen ') || s.includes('global ecovillage') || s.includes('ecovillage excellence')) w = Math.max(w, 0.95);
    pts += w;
  }
  return pts;
}
function scoreOf(c) {
  const yrs = NOW - c.founded;
  const sAge   = clamp(yrs / 80, 0, 1);
  const sPop   = clamp((Math.log10(Math.max(c.pop || 1, 1)) - 1) / (Math.log10(10000) - 1), 0, 1);
  const sReach = c.nat != null ? clamp(c.nat / 60, 0, 1) : 0.12;
  const sAward = clamp(awardPoints(c.awards) / 5, 0, 1);
  const composite = 0.24 * sAge + 0.24 * sPop + 0.28 * sReach + 0.24 * sAward;
  return { total: Math.round(composite * 100), yrs,
    parts: { size: Math.round(sPop * 100), age: Math.round(sAge * 100), reach: Math.round(sReach * 100), honours: Math.round(sAward * 100) } };
}
C.forEach(c => { c.id = slug(c.name); const s = scoreOf(c); c.score = s.total; c.yrs = s.yrs; c.parts = s.parts; c.flagship = c.id === 'auroville'; });
C.sort((a, b) => b.score - a.score);
const byId = id => C.find(c => c.id === id);
const FLAGSHIP = byId('auroville');

/* ----------------------------- lineage arcs ------------------------------ */
// Documented "who seeded whom" links between two mapped communities.
const LINEAGE = [
  ['degania-alef', 'nahalal', "Nahalal's founders came from Degania"],
  ['degania-alef', 'kibbutz-lotan', 'Part of the kibbutz movement Degania began'],
  ['degania-alef', 'kibbutz-ketura', 'Part of the kibbutz movement Degania began'],
  ['degania-alef', 'kibbutz-hatzerim', 'Part of the kibbutz movement Degania began'],
  ['zegg', 'tamera', 'Same founders — Dieter Duhm & Sabine Lichtenfels'],
  ['twin-oaks', 'acorn-community', 'Founded by former Twin Oaks members'],
  ['twin-oaks', 'east-wind', 'Federation of Egalitarian Communities'],
  ['twin-oaks', 'sandhill-farm', 'Federation of Egalitarian Communities'],
  ['sandhill-farm', 'dancing-rabbit-ecovillage', 'Sandhill seeded the NE-Missouri cluster'],
  ['findhorn-ecovillage', 'sirius-community', 'Founded by former Findhorn members'],
  ['auroville', 'sadhana-forest', "Grew at Auroville's edge"],
];
const ARCS = LINEAGE.map(([p, k, note]) => {
  const P = byId(p), K = byId(k); if (!P || !K) return null;
  return { sLat: P.lat, sLng: P.lon, eLat: K.lat, eLng: K.lon, py: P.founded, cy: K.founded, label: `<b>${esc(P.name)} → ${esc(K.name)}</b><br>${esc(note)}` };
}).filter(Boolean);

/* ----------------------------- state ------------------------------------- */
const state = { hovered: null, selected: null, sort: 'score', filter: 'all', year: NOW, mode: 'globe', arcs: false };
let globe, spinOn = true, panelOn = true;
const elViz = document.getElementById('globeViz');
const elFlat = document.getElementById('flatViz');
const tooltip = document.getElementById('tooltip');

const visible = () => C.filter(c => (state.filter === 'all' || c.type === state.filter) && c.founded <= state.year);
function sortVal(c) { return state.sort === 'pop' ? (c.pop || 0) : state.sort === 'age' ? c.yrs : state.sort === 'nat' ? (c.nat || 0) : c.score; }
const sorted = () => visible().slice().sort((a, b) => sortVal(b) - sortVal(a) || b.score - a.score);
function activeArcs() { if (!state.arcs || state.filter !== 'all') return []; return ARCS.filter(a => a.py <= state.year && a.cy <= state.year); }

/* ============================== Globe ==================================== */
function initGlobe(geo) {
  const land = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#6fd58a').atmosphereAltitude(0.17)
    .polygonsData(land)
    .polygonCapColor(() => 'rgba(86,150,104,0.20)').polygonSideColor(() => 'rgba(20,48,32,0.55)')
    .polygonStrokeColor(() => 'rgba(140,206,160,0.22)').polygonAltitude(0.006).polygonsTransitionDuration(0)
    .pointsData(visible())
    .pointLat(d => d.lat).pointLng(d => d.lon)
    .pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius)
    .pointResolution(14).pointsMerge(false).pointsTransitionDuration(0)
    .onPointHover(onPointHover).onPointClick(c => selectCommunity(c, true))
    .arcsData(activeArcs())
    .arcStartLat(d => d.sLat).arcStartLng(d => d.sLng).arcEndLat(d => d.eLat).arcEndLng(d => d.eLng)
    .arcColor(() => ['rgba(231,178,74,0.12)', 'rgba(231,178,74,0.92)'])
    .arcStroke(0.55).arcDashLength(0.4).arcDashGap(0.18).arcDashInitialGap(() => 0).arcDashAnimateTime(2400)
    .arcAltitudeAutoScale(0.45).arcsTransitionDuration(0).arcLabel(d => d.label)
    .ringColor(() => (t => `rgba(231,178,74,${Math.sqrt(1 - t)})`))
    .ringMaxRadius(2.6).ringPropagationSpeed(1.4).ringRepeatPeriod(1300)
    .ringsData(FLAGSHIP ? [{ lat: FLAGSHIP.lat, lng: FLAGSHIP.lon }] : []);
  try { const m = globe.globeMaterial(); m.color.set('#0c2417'); m.emissive.set('#06140d'); m.emissiveIntensity = 0.94; m.shininess = 2; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.34; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 165; ctr.maxDistance = 540; ctr.zoomSpeed = 1.4;
  globe.pointOfView({ lat: 22, lng: 40, altitude: 2.4 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 56)); }
function pointColor(d) { const sel = state.selected === d.id, hov = state.hovered === d.id; return hexA(typeColor(d.type), sel ? 1 : hov ? 0.95 : 0.82); }
function pointAlt(d) { return state.selected === d.id ? 0.16 : state.hovered === d.id ? 0.08 : 0.01; }
function pointRadius(d) { const base = 0.2 + (d.score / 100) * 0.55; return state.selected === d.id ? base + 0.28 : state.hovered === d.id ? base + 0.12 : base; }
function refreshPoints() { if (globe) globe.pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius); }

/* ============================== Flat map ================================= */
let fctx, landCanvas, fX = 0, fY = 0, fPW = 0, fPH = 0, flatW = 0, flatH = 0, flatPts = [];
const projX = lon => fX + (lon + 180) / 360 * fPW;
const projY = lat => fY + (90 - lat) / 180 * fPH;
function eachRing(geom, cb) { if (!geom) return; if (geom.type === 'Polygon') geom.coordinates.forEach(cb); else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(cb)); }
let LAND = [];
function sizeFlat() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  flatW = elFlat.clientWidth; flatH = elFlat.clientHeight;
  elFlat.width = flatW * dpr; elFlat.height = flatH * dpr;
  fctx = elFlat.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fPW = Math.min(flatW * 0.98, flatH * 2 * 0.98); fPH = fPW / 2; fX = (flatW - fPW) / 2; fY = (flatH - fPH) / 2;
  buildLand(dpr);
}
function buildLand(dpr) {
  landCanvas = document.createElement('canvas'); landCanvas.width = flatW * dpr; landCanvas.height = flatH * dpr;
  const g = landCanvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const oc = g.createLinearGradient(0, fY, 0, fY + fPH); oc.addColorStop(0, '#0a2034'); oc.addColorStop(1, '#06141f');
  g.fillStyle = oc; g.fillRect(fX, fY, fPW, fPH);
  g.strokeStyle = 'rgba(140,206,160,0.07)'; g.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) { g.beginPath(); g.moveTo(projX(lon), fY); g.lineTo(projX(lon), fY + fPH); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { g.beginPath(); g.moveTo(fX, projY(lat)); g.lineTo(fX + fPW, projY(lat)); g.stroke(); }
  g.fillStyle = 'rgba(86,150,104,0.34)'; g.strokeStyle = 'rgba(140,206,160,0.20)'; g.lineWidth = 0.5;
  for (const f of LAND) eachRing(f.geometry, ring => {
    g.beginPath(); ring.forEach((c, i) => { const x = projX(c[0]), y = projY(c[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath(); g.fill(); g.stroke();
  });
}
function drawFlat() {
  if (!fctx) return;
  fctx.clearRect(0, 0, flatW, flatH);
  if (landCanvas) fctx.drawImage(landCanvas, 0, 0, flatW, flatH);
  for (const a of activeArcs()) {
    const x1 = projX(a.sLng), y1 = projY(a.sLat), x2 = projX(a.eLng), y2 = projY(a.eLat);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.2;
    const gr = fctx.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, 'rgba(231,178,74,0.12)'); gr.addColorStop(1, 'rgba(231,178,74,0.9)');
    fctx.strokeStyle = gr; fctx.lineWidth = 1.4; fctx.beginPath(); fctx.moveTo(x1, y1); fctx.quadraticCurveTo(mx, my, x2, y2); fctx.stroke();
  }
  flatPts = [];
  for (const c of visible()) {
    const x = projX(c.lon), y = projY(c.lat), sel = c.id === state.selected, r = 2.6 + (c.score / 100) * 5;
    if (c.flagship) { fctx.beginPath(); fctx.arc(x, y, r + 4, 0, 7); fctx.strokeStyle = 'rgba(231,178,74,0.85)'; fctx.lineWidth = 1.6; fctx.stroke(); }
    fctx.beginPath(); fctx.arc(x, y, sel ? r + 2.5 : r, 0, 7); fctx.fillStyle = hexA(typeColor(c.type), sel ? 1 : 0.85); fctx.fill();
    if (sel) { fctx.strokeStyle = '#fff'; fctx.lineWidth = 2; fctx.stroke(); }
    flatPts.push({ c, x, y, r: Math.max(r, 8) });
  }
}
function flatHit(e) { const rect = elFlat.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top; let best = null, bd = 1e9; for (const p of flatPts) { const d = (p.x - mx) ** 2 + (p.y - my) ** 2; if (d < bd) { bd = d; best = p; } } return best && bd <= best.r * best.r ? best.c : null; }
elFlat.addEventListener('mousemove', e => { if (state.mode !== 'flat') return; const c = flatHit(e); if (c) { state.hovered = c.id; showTip(tipHTML(c), e); elFlat.style.cursor = 'pointer'; } else { state.hovered = null; tooltip.classList.add('hidden'); elFlat.style.cursor = 'grab'; } });
elFlat.addEventListener('click', e => { const c = flatHit(e); if (c) selectCommunity(c, false); });
elFlat.addEventListener('mouseleave', () => { state.hovered = null; tooltip.classList.add('hidden'); });

/* ============================== shared tooltip =========================== */
function tipHTML(d) {
  return `<div class="tt-head"><span class="tt-flag">${d.flag}</span><span><div class="tt-name">${esc(d.name)}</div>` +
    `<div class="tt-sub" style="color:${typeColor(d.type)}">${esc(typeLabel(d.type))} · ${esc(d.country)}</div></span></div>` +
    `<div class="tt-row"><span>📅 <b>${d.founded}</b></span><span>👥 <b>${fmtNum(d.pop)}</b></span>` +
    (d.nat ? `<span>🌍 <b>${d.nat}</b> nat.</span>` : '') + `</div>` +
    `<div class="tt-score">success score <b>${d.score}</b>/100</div>`;
}
function showTip(html, e) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (e) moveTip(e); }
function moveTip(e) { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; }
document.addEventListener('mousemove', e => { if (!tooltip.classList.contains('hidden')) moveTip(e); });
function onPointHover(d) {
  state.hovered = d ? d.id : null; refreshPoints();
  if (globe) globe.controls().autoRotate = !d && spinOn && !playT;
  if (!d) { tooltip.classList.add('hidden'); return; }
  showTip(tipHTML(d));
}

/* ============================== scene paint ============================== */
function paintScene() {
  if (state.mode === 'globe') { if (globe) { globe.pointsData(visible()).arcsData(activeArcs()); refreshPoints(); } }
  else drawFlat();
}
function afterDataChange(skipRank) { paintScene(); if (!skipRank) buildRank(); updateTimeReadout(); }

/* ----------------------------- selection / fly --------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.5 }, 850); } }
function selectCommunity(c, doFly) {
  if (!c) return;
  // make sure it isn't hidden by an active type or time filter
  if (state.filter !== 'all' && c.type !== state.filter) { state.filter = 'all'; buildFilters(); }
  if (c.founded > state.year) { stopPlay(); state.year = NOW; tlSlider.value = NOW; }
  state.selected = c.id;
  paintScene(); buildRank(); updateTimeReadout();
  if (state.mode === 'globe' && doFly) flyTo(c.lat, c.lon, 1.45);
  showDetail(c); markActive(c.id);
}

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
const row = (label, val) => (val == null || val === '') ? '' : `<div class="db-row"><span>${label}</span><b>${val}</b></div>`;
const bar = (label, v) => `<div class="ds-bar"><span>${label}</span><div class="ds-track"><i style="width:${v}%"></i></div></div>`;
function showDetail(c) {
  document.getElementById('detailFlag').textContent = c.flag;
  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailType').innerHTML = `<span class="type-dot" style="background:${typeColor(c.type)}"></span>${esc(typeLabel(c.type))}`;
  const badge = document.getElementById('detailBadge');
  if (c.badge) { badge.textContent = c.badge; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
  const p = c.parts;
  document.getElementById('detailScore').innerHTML =
    `<div><div class="ds-num">${c.score}<span class="ds-of"> /100</span></div></div>` +
    `<div class="ds-bars"><div class="ds-label">Success score</div>` + bar('Size', p.size) + bar('Age', p.age) + bar('Reach', p.reach) + bar('Honours', p.honours) + `</div>`;
  document.getElementById('detailRows').innerHTML =
    row('Founded', `${c.founded} <span style="color:var(--muted);font-weight:500">· ${c.yrs} yrs</span>`) +
    row('Population', fmtNum(c.pop) + (c.pop ? ' residents' : '')) +
    row('Nationalities', c.nat ? c.nat + ' countries' : '<span style="color:var(--muted);font-weight:500">not documented</span>') +
    row('Land area', c.area ? c.area.toLocaleString('en-US') + ' ha' : '') +
    row('Location', esc(c.city)) + row('Founded by', esc(c.founder));
  const aw = document.getElementById('detailAwards');
  if (c.awards && c.awards.length) { aw.innerHTML = `<div class="detail-sec-h">Awards &amp; recognition</div>` + c.awards.map(a => `<div class="aw-chip">${esc(a)}</div>`).join(''); aw.classList.remove('hidden'); } else aw.classList.add('hidden');
  const hi = document.getElementById('detailHi');
  if (c.highlights && c.highlights.length) { hi.innerHTML = `<div class="detail-sec-h">Highlights</div><ul>` + c.highlights.map(h => `<li>${esc(h)}</li>`).join('') + `</ul>`; hi.classList.remove('hidden'); } else hi.classList.add('hidden');
  const dd = document.getElementById('detailDesc');
  if (c.desc) { dd.textContent = c.desc; dd.classList.remove('hidden'); } else dd.classList.add('hidden');
  const tg = document.getElementById('detailTags');
  if (c.tags && c.tags.length) { tg.innerHTML = c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(''); tg.classList.remove('hidden'); } else tg.classList.add('hidden');
  const link = document.getElementById('detailLink');
  if (c.url) { link.href = c.url; link.classList.remove('hidden'); } else link.classList.add('hidden');
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; paintScene(); markActive(null); }
document.getElementById('detailClose').addEventListener('click', closeDetail);

/* ============================== Ranking panel ============================ */
const rankList = document.getElementById('rankList');
function buildFilters() {
  const present = Object.keys(TYPES).filter(t => C.some(c => c.type === t));
  const chips = [{ k: 'all', label: 'All' }].concat(present.map(t => ({ k: t, label: typeShort(t) })));
  document.getElementById('rpFilters').innerHTML = chips.map(ch => {
    const on = state.filter === ch.k, col = ch.k === 'all' ? 'var(--accent)' : typeColor(ch.k);
    return `<button class="fchip${on ? ' on' : ''}" data-k="${ch.k}" ${on ? `style="background:${col};border-color:${col}"` : ''}>${esc(ch.label)}</button>`;
  }).join('');
}
function buildRank() {
  const list = sorted();
  const metricWord = { score: 'score', pop: 'residents', age: 'years', nat: 'nationalities' }[state.sort];
  document.getElementById('rpStat').innerHTML = `<b>${list.length}</b> shown · ${C.length} surveyed worldwide`;
  rankList.innerHTML = list.map((c, i) => {
    const rank = i + 1, topCls = rank <= 3 ? ' top' + rank : '';
    const mv = state.sort === 'pop' ? fmtNum(c.pop) : state.sort === 'age' ? c.yrs + ' yr' : state.sort === 'nat' ? (c.nat || '—') : c.score;
    const sub = state.sort === 'score'
      ? `<div class="rk-bar"><i style="width:${c.score}%;background:${typeColor(c.type)}"></i></div>`
      : `<div class="rk-mini">${esc(metricWord === 'years' ? 'since ' + c.founded : metricWord)}</div>`;
    return `<div class="rk-row${topCls}${c.flagship ? ' flagship' : ''}${state.selected === c.id ? ' active' : ''}" data-id="${c.id}">` +
      `<span class="rk-rank">${rank}</span><span class="rk-flag">${c.flag}</span>` +
      `<span class="rk-main"><span class="rk-name">${c.flagship ? '<span class="rk-star">★</span>' : ''}${esc(c.name)}</span>` +
      `<span class="rk-meta"><span class="rk-type-dot" style="background:${typeColor(c.type)}"></span>${esc(typeShort(c.type))}<span class="dot">·</span>${esc(c.country)}</span></span>` +
      `<span class="rk-right"><span class="rk-score">${mv}</span>${sub}</span></div>`;
  }).join('') || `<div class="pn-empty" style="color:var(--muted);font-size:12px;padding:10px">No communities founded by ${state.year} in this filter.</div>`;
}
function markActive(id) {
  rankList.querySelectorAll('.rk-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
  if (id) { const el = rankList.querySelector(`.rk-row[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); }
}
rankList.addEventListener('click', e => { const r = e.target.closest('.rk-row'); if (r) selectCommunity(byId(r.dataset.id), true); });
document.getElementById('rpSort').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; state.sort = b.dataset.sort;
  document.querySelectorAll('#rpSort button').forEach(x => x.classList.toggle('on', x === b)); buildRank();
});
document.getElementById('rpFilters').addEventListener('click', e => {
  const b = e.target.closest('.fchip'); if (!b) return; state.filter = b.dataset.k; buildFilters(); afterDataChange();
});

/* panel collapse */
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Search =================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = C.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q)).slice(0, 9);
  searchRes.innerHTML = hits.length
    ? hits.map((c, i) => `<div class="sr-item${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="sr-ic">${c.flag}</span>${esc(c.name)}<span class="sr-sub">${esc(c.country)}</span></div>`).join('')
    : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) { const c = hits[i] || hits[0]; if (!c) return; searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur(); selectCommunity(c, true); }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend =================================== */
document.getElementById('legendStrip').innerHTML = Object.values(TYPES).map(t => `<span style="background:${t.c}"></span>`).join('');
document.getElementById('legendBody').innerHTML =
  Object.entries(TYPES).map(([k, t]) => C.some(c => c.type === k) ? `<div class="lg-row"><span class="lg-dot" style="background:${t.c}"></span>${esc(t.label)}</div>` : '').join('') +
  `<div class="lg-note">Point size grows with the success score. ★ rings mark the flagship, Auroville.</div>`;
const legend = document.getElementById('legend');
const toggleLegend = () => legend.classList.toggle('collapsed');
document.getElementById('legendToggle').addEventListener('click', toggleLegend);
document.getElementById('legendStrip').addEventListener('click', toggleLegend);
legend.classList.add('collapsed');

/* ============================== Timeline scrubber ======================== */
const tlSlider = document.getElementById('tlSlider'), tlPlay = document.getElementById('tlPlay'), tlReset = document.getElementById('tlReset');
const tlYear = document.getElementById('tlYear'), tlCount = document.getElementById('tlCount'), tlHist = document.getElementById('tlHist');
const DECADES = []; for (let d = MIN_YEAR; d < NOW; d += 10) DECADES.push(d);
const decCount = d => C.filter(c => c.founded >= d && c.founded < d + 10).length;
tlSlider.min = MIN_YEAR; tlSlider.max = NOW; tlSlider.step = 1; tlSlider.value = NOW;
(function buildHist() { const mx = Math.max(...DECADES.map(decCount), 1); tlHist.innerHTML = DECADES.map(d => `<div class="hb" title="${decCount(d)} founded in the ${d}s" style="height:${Math.round(decCount(d) / mx * 100)}%"></div>`).join(''); })();
function updateTimeReadout() {
  const y = state.year, today = y >= NOW;
  tlYear.textContent = today ? 'Today · 2026' : y;
  const n = C.filter(c => c.founded <= y).length;
  tlCount.innerHTML = today ? `all <b>${C.length}</b> communities` : `<b>${n}</b> founded by ${y}`;
  tlReset.classList.toggle('hidden', today);
  [...tlHist.children].forEach((b, i) => b.classList.toggle('on', !today && y >= DECADES[i] && y < DECADES[i] + 10));
}
let playT = null;
function stopPlay() { if (playT) { clearInterval(playT); playT = null; } tlPlay.textContent = '▶'; tlPlay.classList.remove('on'); if (globe && state.mode === 'globe' && !state.hovered) globe.controls().autoRotate = spinOn; }
function startPlay() {
  if (playT) { stopPlay(); return; }
  if (state.year >= NOW) state.year = MIN_YEAR;
  tlPlay.textContent = '⏸'; tlPlay.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  playT = setInterval(() => {
    state.year += 3;
    if (state.year >= NOW) { state.year = NOW; tlSlider.value = NOW; afterDataChange(); stopPlay(); return; }
    tlSlider.value = state.year; afterDataChange(true);
  }, 150);
}
tlPlay.addEventListener('click', startPlay);
tlSlider.addEventListener('input', () => { stopPlay(); state.year = +tlSlider.value; afterDataChange(); });
tlReset.addEventListener('click', () => { stopPlay(); state.year = NOW; tlSlider.value = NOW; afterDataChange(); });

/* ============================== Stats overlay ============================ */
const statsOverlay = document.getElementById('statsOverlay');
function buildStats() {
  const people = C.reduce((s, c) => s + (c.pop || 0), 0);
  const countries = new Set(C.map(c => c.country)).size;
  const oldest = C.slice().sort((a, b) => a.founded - b.founded)[0];
  const largest = C.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0))[0];
  const intl = C.filter(c => c.nat != null).sort((a, b) => b.nat - a.nat)[0];
  const card = (n, l) => `<div class="st-card"><div class="st-num">${n}</div><div class="st-lab">${l}</div></div>`;
  const types = Object.keys(TYPES).map(t => ({ t, n: C.filter(c => c.type === t).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const tmax = Math.max(...types.map(x => x.n));
  const typeBars = types.map(x => `<div class="st-bar"><span class="nm"><i style="background:${typeColor(x.t)}"></i>${esc(typeShort(x.t))}</span><div class="tk"><i style="width:${x.n / tmax * 100}%;background:${typeColor(x.t)}"></i></div><span class="ct">${x.n}</span></div>`).join('');
  const wmax = Math.max(...DECADES.map(decCount), 1);
  const wave = DECADES.filter(d => d >= 1900).map(d => { const n = decCount(d); return `<div class="wb" title="${n} founded in the ${d}s"><b>${n || ''}</b><i style="height:${n / wmax * 64}px"></i><span>${String(d).slice(2)}s</span></div>`; }).join('');
  const pick = (k, c) => `<div class="p" data-id="${c.id}"><div class="k">${k}</div><div class="v">${c.flag} ${esc(c.name)} <small>${k === 'Oldest' ? c.founded : k === 'Largest' ? fmtNum(c.pop) : c.nat + ' nat.'}</small></div></div>`;
  document.getElementById('statsBody').innerHTML =
    `<div class="st-grid">${card(C.length, 'communities mapped')}${card('≈ ' + (people >= 1000 ? Math.round(people / 1000) + 'k' : people), 'people living in community')}${card(countries, 'countries represented')}</div>` +
    `<div class="st-h">By type</div><div class="st-bars">${typeBars}</div>` +
    `<div class="st-h">Founding waves (per decade)</div><div class="st-wave">${wave}</div>` +
    `<div class="st-h">Standouts — tap to explore</div><div class="st-pick">${pick('Oldest', oldest)}${pick('Largest', largest)}${pick('Most international', intl)}</div>`;
  document.getElementById('statsN').textContent = C.length;
}
document.getElementById('statsBody') && statsOverlay.addEventListener('click', e => {
  if (e.target === statsOverlay) return statsOverlay.classList.add('hidden');
  const p = e.target.closest('.st-pick .p'); if (p) { statsOverlay.classList.add('hidden'); selectCommunity(byId(p.dataset.id), true); }
});
document.getElementById('statsClose').addEventListener('click', () => statsOverlay.classList.add('hidden'));

/* ============================== Mode + menu ============================== */
function setMode(m) {
  state.mode = m;
  elViz.classList.toggle('hidden', m !== 'globe');
  elFlat.classList.toggle('hidden', m !== 'flat');
  syncMenu('miMap', m === 'flat');
  if (m === 'flat') { sizeFlat(); drawFlat(); } else { sizeGlobe(); paintScene(); }
}
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hovered && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
function resetView() { closeDetail(); spinOn = true; syncSpin(); stopPlay(); state.year = NOW; tlSlider.value = NOW; afterDataChange(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = true; globe.pointOfView({ lat: 22, lng: 40, altitude: 2.4 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miFlagship').addEventListener('click', () => { menu.classList.add('hidden'); if (FLAGSHIP) selectCommunity(FLAGSHIP, true); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });
document.getElementById('miMap').addEventListener('click', () => { setMode(state.mode === 'flat' ? 'globe' : 'flat'); menu.classList.add('hidden'); });
document.getElementById('miArcs').addEventListener('click', () => { state.arcs = !state.arcs; syncMenu('miArcs', state.arcs); paintScene(); });
document.getElementById('miStats').addEventListener('click', () => { menu.classList.add('hidden'); buildStats(); statsOverlay.classList.remove('hidden'); });

/* ============================== Guided tour ============================== */
const TOUR = [
  ['auroville', 'We begin at the flagship: Auroville, the largest and most international community on Earth — 3,300 people from 60+ countries, since 1968.'],
  ['findhorn-ecovillage', 'North to Scotland and Findhorn — birthplace of the Global Ecovillage Network and a UN-Habitat best-practice model.'],
  ['tamera', 'To southern Portugal: Tamera, a peace-research community that re-greened arid land with its famous Water Retention Landscape.'],
  ['federation-of-damanhur', 'In the Italian Alps, Damanhur carved vast underground Temples of Humankind — and runs its own constitution and currency.'],
  ['degania-alef', "The Sea of Galilee: Degania, founded 1910 — the world's first kibbutz, mother of a movement of 270+."],
  ['sekem', 'On reclaimed Egyptian desert, SEKEM brought biodynamic farming to the Nile — a Right Livelihood laureate.'],
  ['crystal-waters', "To Queensland: Crystal Waters, the world's first permaculture village and a UN World Habitat Award winner."],
  ['freetown-christiania', "And Copenhagen's Freetown Christiania — 900 people self-governing a former barracks since 1971. Explore the other 100+ yourself."],
];
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
const tourCap = document.getElementById('tourCaption');
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; tourCap.classList.add('hidden'); syncMenu('miTour', false); if (globe && state.mode === 'globe') globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const [id, cap] = TOUR[tourIdx], c = byId(id); if (c) selectCommunity(c, true);
  tourCap.innerHTML = `<span class="tc-yr">Stop ${tourIdx + 1} / ${TOUR.length}</span><span class="tc-tx">${esc(cap)}</span><span class="tc-skip" title="End tour">✕</span>`;
  tourCap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 8000);
}
function startTour() { if (tourActive()) { stopTour(); return; } menu.classList.add('hidden'); stopPlay(); if (state.year < NOW) { state.year = NOW; tlSlider.value = NOW; afterDataChange(); } syncMenu('miTour', true); tourIdx = 0; tourStep(); }
document.getElementById('miTour').addEventListener('click', startTour);
tourCap.addEventListener('click', e => { if (e.target.classList.contains('tc-skip')) return stopTour(); if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); } });

/* ============================== Share / deep link ======================== */
let toastTimer = null;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }
document.getElementById('miShare').addEventListener('click', async () => {
  menu.classList.add('hidden');
  const u = location.origin + location.pathname + (state.selected ? '?c=' + state.selected : '');
  try { await navigator.clipboard.writeText(u); toast(state.selected ? '🔗 Link copied — opens at ' + byId(state.selected).name : '🔗 Link copied'); }
  catch (e) { toast('Copy this link: ' + u); }
});
function applyDeepLink() { try { const c = new URLSearchParams(location.search).get('c'); if (c && byId(c)) { selectCommunity(byId(c), true); hideWelcome(); } } catch (e) {} }

/* ============================== About / welcome ========================== */
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'cedar_seen_v1';
const welcome = document.getElementById('welcomeOverlay');
const elWelCount = document.getElementById('welCount'); if (elWelCount) elWelCount.textContent = C.length;
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (!statsOverlay.classList.contains('hidden')) return statsOverlay.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden'); if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); spinOn = !spinOn; if (globe && !state.hovered && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); }
});

/* ============================== Boot ===================================== */
window.addEventListener('resize', () => { if (state.mode === 'globe') sizeGlobe(); else { sizeFlat(); drawFlat(); } });
buildFilters(); buildRank(); updateTimeReadout();
fetch('data/countries.geojson')
  .then(r => r.json())
  .then(geo => { LAND = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica'); initGlobe(geo); applyDeepLink(); })
  .catch(err => { console.error('Failed to load map data', err); elViz.innerHTML = '<div style="color:var(--muted);text-align:center;padding-top:38vh">Could not load map data.</div>'; });
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }
