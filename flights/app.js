/* ============================================================================
   Direct Flights — a 3D globe of the world's non-stop routes.
   Click an airport -> every direct route fans out. Click a route -> every
   airline flying that city-pair non-stop. Plus the world's longest flights.
   Engine: globe.gl / three.js.  Data: OpenFlights (ODbL) + curated 2026 list.
   ========================================================================== */
'use strict';

const DATA     = window.FLIGHT_DATA || { airports:{}, routes:[], airlines:{}, meta:{} };
const AP       = DATA.airports;          // IATA -> {n,c,co,lat,lng,d}
const ROUTES   = DATA.routes;            // [{s,d,km,op:[],cs:[]}]
const AIRLINES = DATA.airlines;          // token -> {n,co,ia}
const LONGEST  = window.LONGEST_FLIGHTS || [];

/* ----------------------------- indices ----------------------------- */
const IATAS = Object.keys(AP);
let maxDeg = 1;
for (const k of IATAS) maxDeg = Math.max(maxDeg, AP[k].d);

// airport -> list of route indices touching it
const byAirport = {};
ROUTES.forEach((r, i) => {
  (byAirport[r.s] || (byAirport[r.s] = [])).push(i);
  (byAirport[r.d] || (byAirport[r.d] = [])).push(i);
});

// points array for the globe (one per served airport)
const POINTS = IATAS.map(iata => {
  const a = AP[iata];
  return { iata, lat: a.lat, lng: a.lng, deg: a.d, name: a.n, city: a.c, country: a.co };
});

/* ----------------------------- helpers ----------------------------- */
const $ = id => document.getElementById(id);
const fmtInt = n => n == null ? '—' : Math.round(n).toLocaleString('en-US');
const KM2MI = 0.621371;

function airlineName(tok) {
  if (!tok) return tok;
  if (tok[0] === '~') return tok.slice(1);            // only a bare carrier code was known
  return (AIRLINES[tok] && AIRLINES[tok].n) || tok;
}
function airlineCountry(tok) {
  return (AIRLINES[tok] && AIRLINES[tok].co) || null;
}
function estDuration(km) {                            // rough scheduled time from distance
  const h = km / 875 + 0.5;
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm === 60 ? `${hh + 1}h 00m` : `${hh}h ${String(mm).padStart(2, '0')}m`;
}
function midpoint(a, b) {
  // simple interpolation — good enough for camera framing
  let dl = b.lng - a.lng;
  if (dl > 180) dl -= 360; else if (dl < -180) dl += 360;
  return { lat: (a.lat + b.lat) / 2, lng: a.lng + dl / 2 };
}
function lerpColor(c1, c2, t) {
  const a = c1, b = c2;
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
const C_SMALL = [54, 224, 200], C_BIG = [255, 211, 107];   // teal -> gold by hub size
function degColor(deg) { return lerpColor(C_SMALL, C_BIG, Math.sqrt(deg / maxDeg)); }

/* ----------------------------- state ----------------------------- */
const state = { mode: 'browse', airport: null, route: null, hover: null, longestHi: null, spin: true };
let globe, mouse = { x: 0, y: 0 };

/* ============================================================================
   GLOBE
   ========================================================================== */
function initGlobe(geo) {
  const el = $('globeViz');
  globe = Globe()(el)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#5aa9ff').atmosphereAltitude(0.17)
    .polygonsData(geo.features)
    .polygonCapColor(() => 'rgba(28,42,68,0.72)')
    .polygonSideColor(() => 'rgba(10,16,30,0.4)')
    .polygonStrokeColor(() => 'rgba(90,140,200,0.28)')
    .polygonAltitude(0.006)
    // airports
    .pointsData(POINTS)
    .pointLat('lat').pointLng('lng')
    .pointColor(pointColor)
    .pointRadius(pointRadius)
    .pointAltitude(0.002)
    .pointResolution(6)
    .pointLabel(() => '')
    .onPointClick(p => selectAirport(p.iata, true))
    .onPointHover(onPointHover)
    // routes (arc layer, selection-driven)
    .arcsData([])
    .arcStartLat('startLat').arcStartLng('startLng').arcEndLat('endLat').arcEndLng('endLng')
    .arcColor('color').arcStroke('stroke').arcAltitudeAutoScale(d => d.alt)
    .arcDashLength('dl').arcDashGap('dg').arcDashAnimateTime('dt')
    .arcsTransitionDuration(0)
    .arcLabel(() => '')
    .onArcClick(d => { if (d.ref != null) selectRoute(d.ref); })
    // rings = pulse on selected airport(s)
    .ringsData([])
    .ringLat('lat').ringLng('lng')
    .ringColor(() => (t => `rgba(255,211,107,${1 - t})`))
    .ringMaxRadius('maxR').ringPropagationSpeed('speed').ringRepeatPeriod('period');

  const mat = globe.globeMaterial();
  mat.color.set('#070d1a'); mat.emissive.set('#06101f'); mat.emissiveIntensity = 0.85; mat.shininess = 6;

  const c = globe.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.42; c.enableDamping = true; c.dampingFactor = 0.12;
  c.minDistance = 130; c.maxDistance = 520;
  c.addEventListener('start', () => {});  // (keep autorotate unless we stop it)

  globe.pointOfView({ lat: 24, lng: 8, altitude: 2.5 }, 0);
  window.__globe = globe;
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(el);
}
function sizeGlobe() { if (globe) globe.width(innerWidth).height(innerHeight); }

function pointColor(p) {
  if (state.airport) {
    if (p.iata === state.airport) return '#ffffff';
    if (state.destSet && state.destSet.has(p.iata)) return '#ffe7a8';
    return 'rgba(120,150,190,0.28)';
  }
  if (state.mode === 'longest' && state.longestSet) {
    return state.longestSet.has(p.iata) ? '#ff8a63' : 'rgba(120,150,190,0.25)';
  }
  return degColor(p.deg);
}
function pointRadius(p) {
  const base = 0.13 + 0.62 * Math.sqrt(p.deg / maxDeg);
  if (state.airport) {
    if (p.iata === state.airport) return base + 0.5;
    if (state.destSet && state.destSet.has(p.iata)) return Math.max(base, 0.26);
    return base * 0.55;
  }
  if (state.mode === 'longest' && state.longestSet && state.longestSet.has(p.iata)) return base + 0.35;
  return base;
}
function refreshPoints() {
  globe.pointColor(pointColor).pointRadius(pointRadius);
  globe.pointsData(POINTS);   // force re-evaluation of accessors
}
function setSpin(on) {
  state.spin = on;
  if (globe) globe.controls().autoRotate = on;
  const mi = $('miSpin'); if (mi) mi.querySelector('.mi-state').textContent = on ? 'On' : 'Off';
}

/* ============================================================================
   SELECT AIRPORT  -> fan out every non-stop route
   ========================================================================== */
function selectAirport(iata, fly) {
  const a = AP[iata]; if (!a) return;
  closeOverlays();
  state.mode = 'browse'; state.airport = iata; state.route = null; state.longestHi = null;

  const ridx = byAirport[iata] || [];
  const dests = [];
  const destSet = new Set();
  for (const i of ridx) {
    const r = ROUTES[i];
    const other = r.s === iata ? r.d : r.s;
    if (!AP[other] || destSet.has(other)) continue;
    destSet.add(other);
    const nAl = new Set([...(r.op || []), ...(r.cs || [])]).size;
    dests.push({ iata: other, km: r.km, ridx: i, nAl });
  }
  dests.sort((x, y) => y.km - x.km);
  state.destSet = destSet;
  state.dests = dests;

  drawAirportArcs(null);
  globe.ringsData([{ lat: a.lat, lng: a.lng, maxR: 4.5, speed: 2.2, period: 900 }]);
  refreshPoints();
  setSpin(false);
  renderAirportPanel(iata, dests);
  if (fly) globe.pointOfView({ lat: a.lat, lng: a.lng, altitude: 1.75 }, 900);
  $('statChip').classList.add('hidden');
  syncUrl();
}

function drawAirportArcs(hiRidx) {
  const iata = state.airport; if (!iata) return;
  const o = AP[iata];
  const arcs = state.dests.map(d => {
    const t = AP[d.iata];
    const hot = hiRidx != null && d.ridx === hiRidx;
    return {
      startLat: o.lat, startLng: o.lng, endLat: t.lat, endLng: t.lng,
      color: hot ? ['#ffffff', '#ffd36b'] : (hiRidx != null
        ? ['rgba(82,150,210,0.18)', 'rgba(120,150,190,0.18)']
        : ['rgba(82,185,255,0.85)', 'rgba(255,211,107,0.9)']),
      stroke: hot ? 0.85 : (hiRidx != null ? 0.22 : 0.4),
      dl: hot ? 0.4 : 0.55, dg: hot ? 0.12 : 0.18, dt: hot ? 2200 : 0,
      alt: 0.4, ref: d.ridx
    };
  });
  // draw the highlighted arc last so it renders on top
  if (hiRidx != null) arcs.sort((a, b) => (a.ref === hiRidx) - (b.ref === hiRidx));
  globe.arcsData(arcs);
}

/* ============================================================================
   SELECT ROUTE  -> every airline flying it non-stop
   ========================================================================== */
function selectRoute(ridx) {
  const r = ROUTES[ridx]; if (!r) return;
  state.route = ridx;
  // orient: origin = current airport if it is an endpoint, else r.s
  const origin = (state.airport === r.s || state.airport === r.d) ? state.airport : r.s;
  const dest = origin === r.s ? r.d : r.s;
  if (!state.airport || (state.airport !== r.s && state.airport !== r.d)) {
    // route picked without an airport context — adopt origin first
    selectAirport(origin, true);
  }
  drawAirportArcs(ridx);
  renderRoutePanel(r, origin, dest);
  const mid = midpoint(AP[origin], AP[dest]);
  const alt = Math.min(2.6, 1.4 + r.km / 9000);
  globe.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: alt }, 800);
  // mark active dest row
  document.querySelectorAll('.dest-row').forEach(el => el.classList.toggle('on', +el.dataset.ridx === ridx));
  syncUrl();
}

/* ============================================================================
   PANELS
   ========================================================================== */
function showPanel() { $('panel').classList.remove('hidden'); }
function renderAirportPanel(iata, dests) {
  const a = AP[iata];
  $('apView').classList.remove('hidden'); $('rtView').classList.add('hidden');
  $('apIata').textContent = iata;
  $('apName').textContent = a.n;
  $('apLoc').textContent = [a.c, a.co].filter(Boolean).join(', ');
  const countries = new Set(dests.map(d => AP[d.iata].co)).size;
  const longest = dests.length ? dests[0] : null;
  $('apStats').innerHTML =
    `<div class="p-stat"><b>${fmtInt(dests.length)}</b><span>non-stop destinations</span></div>` +
    `<div class="p-stat"><b>${fmtInt(countries)}</b><span>countries reached</span></div>` +
    (longest ? `<div class="p-stat"><b>${fmtInt(longest.km)}</b><span>km · farthest hop</span></div>` : '');
  $('apListLabel').textContent = `Non-stop destinations · ${dests.length}`;
  $('destFilter').value = '';
  renderDestList(dests);
  showPanel();
}
function renderDestList(dests) {
  const ol = $('destList');
  ol.innerHTML = dests.map(d => {
    const t = AP[d.iata];
    return `<li class="dest-row" data-ridx="${d.ridx}" data-iata="${d.iata}">
      <span class="dest-iata">${d.iata}</span>
      <span class="dest-tx"><b>${esc(t.c || t.n)}</b><span>${esc(t.co || '')} · ${d.nAl} airline${d.nAl === 1 ? '' : 's'}</span></span>
      <span class="dest-km">${fmtInt(d.km)} km</span></li>`;
  }).join('') || `<li class="dest-al" style="padding:8px">No non-stop routes in the dataset.</li>`;
  ol.querySelectorAll('.dest-row').forEach(el => {
    el.onclick = () => selectRoute(+el.dataset.ridx);
    el.onmouseenter = () => previewArc(+el.dataset.ridx);
    el.onmouseleave = () => { if (state.route == null) drawAirportArcs(null); };
  });
}
function previewArc(ridx) { if (state.route == null) drawAirportArcs(ridx); }

function renderRoutePanel(r, origin, dest) {
  $('apView').classList.add('hidden'); $('rtView').classList.remove('hidden');
  const o = AP[origin], d = AP[dest];
  $('rtAi').textContent = origin; $('rtAc').textContent = o.c || o.n;
  $('rtBi').textContent = dest; $('rtBc').textContent = d.c || d.n;
  const mi = Math.round(r.km * KM2MI);
  $('rtMetrics').innerHTML =
    `<div class="rt-metric"><b>${fmtInt(r.km)}</b><span>km (${fmtInt(mi)} mi)</span></div>` +
    `<div class="rt-metric"><b>${estDuration(r.km)}</b><span>est. flight time</span></div>`;

  const ops = r.op || [], cs = (r.cs || []).filter(t => !ops.includes(t));
  // de-dup by display name
  const seen = new Set(); const opRows = [];
  for (const tok of ops) { const n = airlineName(tok); if (seen.has(n)) continue; seen.add(n); opRows.push(tok); }
  const csRows = [];
  for (const tok of cs) { const n = airlineName(tok); if (seen.has(n)) continue; seen.add(n); csRows.push(tok); }

  $('rtAlLabel').textContent = opRows.length === 1
    ? 'Operated non-stop by' : `${opRows.length} airlines fly this non-stop`;
  const rowHtml = (tok, isCs) => {
    const co = airlineCountry(tok);
    return `<li class="rt-al${isCs ? ' cs' : ''}"><span class="rt-al-ic">✈</span>
      <span class="rt-al-tx"><b>${esc(airlineName(tok))}</b>${co ? `<span>${esc(co)}</span>` : ''}</span>
      ${isCs ? '<span class="rt-al-tag">codeshare</span>' : ''}</li>`;
  };
  $('rtAirlines').innerHTML =
    opRows.map(t => rowHtml(t, false)).join('') +
    csRows.map(t => rowHtml(t, true)).join('');
  $('rtNote').textContent = csRows.length
    ? 'Dashed = codeshare (sold by the airline but operated by another carrier above).'
    : '';
  $('rtBack').onclick = () => { state.route = null; drawAirportArcs(null);
    renderAirportPanel(state.airport, state.dests);
    document.querySelectorAll('.dest-row').forEach(el => el.classList.remove('on')); syncUrl(); };
  showPanel();
}

function closePanel() {
  $('panel').classList.add('hidden');
  state.airport = null; state.route = null; state.destSet = null; state.dests = null;
  globe.arcsData([]); globe.ringsData([]);
  refreshPoints(); setSpin(true);
  $('statChip').classList.remove('hidden');
  syncUrl();
}

/* ============================================================================
   LONGEST FLIGHTS
   ========================================================================== */
function openLongest() {
  closePanel(); closeMenu();
  state.mode = 'longest';
  const set = new Set();
  LONGEST.forEach(f => { set.add(f.a); set.add(f.b); });
  state.longestSet = set;

  $('lgBody').innerHTML = LONGEST.map(f => {
    const A = AP[f.a], B = AP[f.b];
    return `<tr data-r="${f.r}">
      <td class="lg-rk">${f.r}</td>
      <td class="lg-route"><b>${f.a} ⇄ ${f.b}</b><br><span>${esc(A.c)} – ${esc(B.c)}</span></td>
      <td>${esc(f.al.join(', '))}</td>
      <td class="lg-km">${fmtInt(f.km)}<span> km</span></td>
      <td class="lg-dur">${f.dur}</td>
      <td class="lg-ac">${esc(f.ac)}</td></tr>`;
  }).join('');
  $('lgBody').querySelectorAll('tr').forEach(tr => {
    tr.onclick = () => highlightLongest(+tr.dataset.r);
  });
  drawLongestArcs(null);
  refreshPoints();
  setSpin(false);
  $('statChip').classList.add('hidden');
  $('longest').classList.remove('hidden');
  syncUrl();
}
function drawLongestArcs(hiR) {
  const n = LONGEST.length;
  const arcs = LONGEST.map((f, i) => {
    const A = AP[f.a], B = AP[f.b];
    const t = i / (n - 1);                     // 0 = longest
    const col = lerpColor([255, 90, 70], [255, 211, 107], t);  // hot red -> gold
    const hot = hiR != null && f.r === hiR;
    return {
      startLat: A.lat, startLng: A.lng, endLat: B.lat, endLng: B.lng,
      color: hot ? ['#ffffff', '#ff5d54'] : (hiR != null ? ['rgba(150,120,120,0.2)', 'rgba(150,120,120,0.2)'] : [col, col]),
      stroke: hot ? 1.0 : (hiR != null ? 0.3 : 0.55),
      dl: 0.5, dg: 0.16, dt: hot ? 2200 : 0, alt: 0.5, ref: null, lf: f.r
    };
  });
  globe.arcsData(arcs);
}
function highlightLongest(r) {
  state.longestHi = r;
  const f = LONGEST.find(x => x.r === r); if (!f) return;
  drawLongestArcs(r);
  $('lgBody').querySelectorAll('tr').forEach(tr => tr.classList.toggle('on', +tr.dataset.r === r));
  const mid = midpoint(AP[f.a], AP[f.b]);
  globe.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: 2.4 }, 900);
}
function closeLongest() {
  $('longest').classList.add('hidden');
  state.mode = 'browse'; state.longestSet = null; state.longestHi = null;
  globe.arcsData([]);
  refreshPoints(); setSpin(true);
  $('statChip').classList.remove('hidden');
  syncUrl();
}

/* ============================================================================
   HOVER TOOLTIP
   ========================================================================== */
const tooltip = $('tooltip');
function onPointHover(p) {
  state.hover = p;
  if (!p) { tooltip.classList.add('hidden'); document.body.style.cursor = ''; return; }
  document.body.style.cursor = 'pointer';
  tooltip.innerHTML =
    `<div class="tt-iata">${p.iata}</div>` +
    `<div class="tt-name">${esc(p.name)}</div>` +
    `<div class="tt-loc">${esc([p.city, p.country].filter(Boolean).join(', '))}</div>` +
    `<div class="tt-deg">${fmtInt(p.deg)} non-stop destination${p.deg === 1 ? '' : 's'}</div>`;
  tooltip.classList.remove('hidden');
  placeTooltip();
}
function placeTooltip() {
  if (tooltip.classList.contains('hidden')) return;
  const pad = 14, w = tooltip.offsetWidth, h = tooltip.offsetHeight;
  let x = mouse.x + pad, y = mouse.y + pad;
  if (x + w > innerWidth - 8) x = mouse.x - w - pad;
  if (y + h > innerHeight - 8) y = mouse.y - h - pad;
  tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
}
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; if (state.hover) placeTooltip(); });

/* ============================================================================
   SEARCH
   ========================================================================== */
const searchEl = $('search'), srEl = $('searchResults');
let srSel = -1, srItems = [];
function runSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) { srEl.classList.add('hidden'); return; }
  const out = [];
  for (const iata of IATAS) {
    const a = AP[iata];
    const hay = (iata + ' ' + a.n + ' ' + a.c + ' ' + a.co).toLowerCase();
    if (hay.includes(q)) {
      let score = a.d;
      if (iata.toLowerCase() === q) score += 1e6;
      else if ((a.c || '').toLowerCase().startsWith(q)) score += 5e4;
      out.push({ iata, a, score });
    }
  }
  out.sort((x, y) => y.score - x.score);
  srItems = out.slice(0, 12); srSel = -1;
  srEl.innerHTML = srItems.map((o, i) =>
    `<div class="sr-item" data-i="${i}" data-iata="${o.iata}">
      <span class="sr-iata">${o.iata}</span>
      <span class="sr-tx"><b>${esc(o.a.c || o.a.n)}</b><span>${esc(o.a.co || '')}</span></span>
      <span class="sr-deg">${fmtInt(o.a.d)} routes</span></div>`).join('')
    || `<div class="sr-item" style="cursor:default;color:var(--faint)">No matching airport</div>`;
  srEl.querySelectorAll('.sr-item[data-iata]').forEach(el => el.onclick = () => pickSearch(el.dataset.iata));
  srEl.classList.remove('hidden');
}
function pickSearch(iata) {
  searchEl.value = ''; srEl.classList.add('hidden'); searchEl.blur();
  selectAirport(iata, true);
}
searchEl.addEventListener('input', () => runSearch(searchEl.value));
searchEl.addEventListener('focus', () => { if (searchEl.value) runSearch(searchEl.value); });
searchEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { srEl.classList.add('hidden'); searchEl.blur(); return; }
  if (!srItems.length) return;
  if (e.key === 'ArrowDown') { srSel = Math.min(srItems.length - 1, srSel + 1); markSr(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { srSel = Math.max(0, srSel - 1); markSr(); e.preventDefault(); }
  else if (e.key === 'Enter') { pickSearch(srItems[Math.max(0, srSel)].iata); }
});
function markSr() {
  srEl.querySelectorAll('.sr-item').forEach((el, i) => el.classList.toggle('on', i === srSel));
}
document.addEventListener('click', e => {
  if (!$('searchWrap').contains(e.target)) srEl.classList.add('hidden');
  if (!$('menu').contains(e.target) && e.target !== $('menuBtn')) closeMenu();
});

/* dest filter inside airport panel */
$('destFilter').addEventListener('input', function () {
  const q = this.value.trim().toLowerCase();
  const filtered = !q ? state.dests : state.dests.filter(d => {
    const t = AP[d.iata];
    return (d.iata + ' ' + t.n + ' ' + t.c + ' ' + t.co).toLowerCase().includes(q);
  });
  renderDestList(filtered);
});

/* ============================================================================
   MENU / OVERLAYS / MISC
   ========================================================================== */
function closeMenu() { $('menu').classList.add('hidden'); }
function toggleMenu() { $('menu').classList.toggle('hidden'); }
function closeOverlays() {
  $('longest').classList.add('hidden');
  $('aboutOverlay').classList.add('hidden'); $('helpOverlay').classList.add('hidden');
  if (state.mode === 'longest') { state.mode = 'browse'; state.longestSet = null; }
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); t.style.opacity = '1';
  clearTimeout(t._t); t._t = setTimeout(() => { t.style.opacity = '0';
    setTimeout(() => t.classList.add('hidden'), 320); }, 2200);
}
function resetView() {
  closePanel(); closeLongest(); closeOverlays();
  globe.pointOfView({ lat: 24, lng: 8, altitude: 2.5 }, 900);
}

$('menuBtn').onclick = e => { e.stopPropagation(); toggleMenu(); };
$('longestBtn').onclick = openLongest;
$('miLongest').onclick = () => { closeMenu(); openLongest(); };
$('miReset').onclick = () => { closeMenu(); resetView(); };
$('miSpin').onclick = () => { setSpin(!state.spin); };
$('miFull').onclick = () => { closeMenu();
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };
$('miShare').onclick = () => { closeMenu(); doShare(); };
$('miHelp').onclick = () => { closeMenu(); $('helpOverlay').classList.remove('hidden'); };
$('miAbout').onclick = () => { closeMenu(); $('aboutOverlay').classList.remove('hidden'); };
$('panelClose').onclick = closePanel;
$('lgClose').onclick = closeLongest;
$('aboutClose').onclick = () => $('aboutOverlay').classList.add('hidden');
$('helpClose').onclick = $('helpGo').onclick = () => $('helpOverlay').classList.add('hidden');
$('brandHome').onclick = resetView;
addEventListener('keydown', e => { if (e.key === 'Escape') {
  if (!$('longest').classList.contains('hidden')) closeLongest();
  else if (!$('aboutOverlay').classList.contains('hidden')) $('aboutOverlay').classList.add('hidden');
  else if (!$('helpOverlay').classList.contains('hidden')) $('helpOverlay').classList.add('hidden');
  else if (!$('panel').classList.contains('hidden')) closePanel();
} });
addEventListener('resize', sizeGlobe);

function doShare() {
  const url = location.origin + location.pathname + buildHash();
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(
    () => toast('Link copied to clipboard'), () => toast(url));
  else toast(url);
}
function buildHash() {
  if (state.mode === 'longest') return '#view=longest';
  if (state.airport && state.route != null) {
    const r = ROUTES[state.route]; return `#ap=${state.airport}&to=${r.s === state.airport ? r.d : r.s}`;
  }
  if (state.airport) return `#ap=${state.airport}`;
  return '';
}
function syncUrl() { history.replaceState(null, '', location.pathname + buildHash()); }
function loadFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('view') === 'longest') { openLongest(); return; }
  const ap = h.get('ap');
  if (ap && AP[ap]) {
    selectAirport(ap, true);
    const to = h.get('to');
    if (to && AP[to]) {
      const d = (state.dests || []).find(x => x.iata === to);
      if (d) selectRoute(d.ridx);
    }
  }
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ============================================================================
   BOOT
   ========================================================================== */
function boot(geo) {
  $('scAir').textContent = fmtInt(DATA.meta.nAirports || IATAS.length);
  $('scRoute').textContent = fmtInt(DATA.meta.nRoutes || ROUTES.length);
  $('scAl').textContent = fmtInt(DATA.meta.nAirlines || Object.keys(AIRLINES).length);
  initGlobe(geo);
  setTimeout(() => { $('loading').classList.add('gone'); }, 350);
  loadFromHash();
}
fetch('data/countries.geojson?v=1').then(r => r.json()).then(boot).catch(err => {
  $('loading').textContent = 'Failed to load map data.'; console.error(err);
});
