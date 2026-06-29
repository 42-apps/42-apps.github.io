/* ============================================================================
   Organic Food Map — a 3D globe + flat map coloured by each country's organic
   farming. Greener = more organic, near-black = little/none, slate = no data.
   Data: FiBL/IFOAM 2025 (year 2023) + FAOSTAT 2004–2023. Engine: globe.gl.
   ========================================================================== */
'use strict';

const DATA = window.ORGANIC_DATA || {};
const META = window.ORGANIC_META || {};
const WORLD_TS = window.ORGANIC_WORLD_TS || { area: {}, share: {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ----------------------------- formatting ----------------------------- */
const fmtHa = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M ha'
                  : v >= 1e3 ? Math.round(v / 1e3) + 'k ha' : Math.round(v) + ' ha';
const fmtInt = v => Math.round(v).toLocaleString('en-US');
const fmtShare = v => (v < 1 ? v.toFixed(2) : v.toFixed(1)) + '%';
const fmtM2 = v => Math.round(v).toLocaleString('en-US') + ' m²';
const fmtPct = v => (v >= 0 ? '+' : '') + Math.round(v) + '%';
const fmtEurM = v => v >= 1000 ? '€' + (v / 1000).toFixed(1) + 'B' : '€' + Math.round(v) + 'M';
const fmtEur = v => '€' + Math.round(v);

/* ----------------------------- metrics ----------------------------- */
// get(d) returns the raw value (or null). scale picks the colour transform.
const METRICS = {
  share:     { short: 'Organic %',    icon: '🌱', label: 'Organic share of farmland', unit: '% of agricultural land · 2023',
               scale: 'gamma', gamma: 0.5, get: d => d.share, fmt: fmtShare },
  area:      { short: 'Total land',   icon: '🗺️', label: 'Total organic farmland', unit: 'hectares · 2023',
               scale: 'log', get: d => d.area, fmt: fmtHa },
  producers: { short: '# Farms',      icon: '🚜', label: 'Number of organic farms', unit: 'producers · 2023',
               scale: 'log', get: d => d.producers, fmt: fmtInt },
  areaPc:    { short: 'Per person',   icon: '👤', label: 'Organic land per person', unit: 'm² per inhabitant · 2023',
               scale: 'log', get: d => (d.area && d.pop) ? d.area * 1e4 / d.pop : null, fmt: fmtM2 },
  g10:       { short: '10-yr growth', icon: '📈', label: '10-year growth of organic land', unit: '% change 2013 → 2023 (base ≥ 5,000 ha)',
               scale: 'signed', get: d => growth10(d), fmt: fmtPct },
  retail:    { short: 'Market €',     icon: '🛒', label: 'Organic retail market', unit: 'annual sales · 2023',
               scale: 'log', get: d => d.retail, fmt: fmtEurM },
  retailPc:  { short: 'Spend/person', icon: '💶', label: 'Organic spending per person', unit: '€ per inhabitant · 2023',
               scale: 'log', get: d => (d.retail && d.pop) ? d.retail * 1e6 / d.pop : null, fmt: fmtEur },
};
const METRIC_ORDER = ['share', 'area', 'producers', 'areaPc', 'g10', 'retail', 'retailPc'];

const GROWTH_MIN_BASE = 5000;          // ha of organic land in 2013 to qualify (kills tiny-base noise)
function growth10(d) {
  if (d.g10 == null || d.area == null) return null;
  const base = d.area - d.g10;
  if (base < GROWTH_MIN_BASE) return null;   // grew from ~nothing — % would be a meaningless 40,000%
  return d.g10 / base * 100;
}

const state = { metric: 'share', history: false, year: 2023, flat: false,
                hovered: null, selected: null, playing: false };
let tsAreaMax = 1;

/* compute colour-scale domains from the data once */
function buildScales() {
  for (const k of METRIC_ORDER) {
    const m = METRICS[k];
    const vals = Object.values(DATA).map(m.get).filter(v => v != null);
    m._max = Math.max(...vals);
    if (m.scale === 'signed') {                 // cap growth scale at 95th pct of positive values
      const pos = vals.filter(v => v > 0).sort((a, b) => a - b);
      m._cap = pos.length ? pos[Math.floor(pos.length * 0.95)] : 100;
    }
  }
  for (const d of Object.values(DATA)) if (d.ts && d.ts.area)
    for (const y in d.ts.area) tsAreaMax = Math.max(tsAreaMax, d.ts.area[y]);
}

/* ----------------------------- colour ----------------------------- */
const RAMP = [[20,40,27],[18,62,33],[20,92,46],[33,138,64],[70,210,104],[156,255,112]];
function rampColor(t) {
  t = clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.floor(t), f = t - i, a = RAMP[i], b = RAMP[Math.min(i + 1, RAMP.length - 1)];
  return [Math.round(a[0] + (b[0]-a[0]) * f), Math.round(a[1] + (b[1]-a[1]) * f), Math.round(a[2] + (b[2]-a[2]) * f)];
}
const logT = (v, max) => v <= 0 ? 0 : clamp(Math.log10(v + 1) / Math.log10(max + 1), 0, 1);
function colorT(v) {
  if (v == null) return null;
  if (state.history) return logT(v, tsAreaMax);
  const m = METRICS[state.metric];
  if (m.scale === 'gamma') return Math.pow(clamp(v / m._max, 0, 1), m.gamma);
  if (m.scale === 'signed') return v <= 0 ? 0.015 : logT(v, m._cap);
  return logT(v, m._max);
}
const ndColor = a => `rgba(64,74,90,${a})`;

// value for the active metric (or the FAOSTAT area in history mode)
function curVal(d) {
  if (!d) return null;
  if (state.history) return (d.ts && d.ts.area && d.ts.area[state.year] != null) ? d.ts.area[state.year] : null;
  return METRICS[state.metric].get(d);
}

/* ----------------------------- globe ----------------------------- */
let globe, countries = [];
const elViz = document.getElementById('globeViz');

function capColor(feat) {
  const iso = feat.properties.OISO, d = iso && DATA[iso];
  const v = curVal(d);
  const sel = state.selected === iso, hov = state.hovered === iso;
  if (v == null) return ndColor(sel ? 0.55 : hov ? 0.5 : 0.9);
  const [r, g, b] = rampColor(colorT(v));
  return `rgba(${r},${g},${b},${sel ? 1 : hov ? 0.97 : 0.9})`;
}
function altOf(feat) {
  const iso = feat.properties.OISO, d = iso && DATA[iso], v = curVal(d);
  let a = 0.008 + (v != null ? colorT(v) * 0.06 : 0);
  if (state.selected === iso) a += 0.04;
  else if (state.hovered === iso) a += 0.02;
  return a;
}
function refreshGlobe() { if (globe) globe.polygonCapColor(capColor).polygonAltitude(altOf); }

function initGlobe(geo) {
  countries = geo.features;
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#6fe9c8').atmosphereAltitude(0.16)
    .polygonsData(countries)
    .polygonCapColor(capColor)
    .polygonSideColor(() => 'rgba(8,26,40,0.8)')
    .polygonStrokeColor(() => 'rgba(3,12,20,0.85)')
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(280)
    .onPolygonHover(onHover)
    .onPolygonClick(f => f && selectCountry(f.properties.OISO, true));
  const mat = globe.globeMaterial();
  mat.color.set('#0a2336'); mat.emissive.set('#071a2a'); mat.emissiveIntensity = 0.85; mat.shininess = 6;
  const c = globe.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.45; c.enableDamping = true; c.dampingFactor = 0.12;
  c.minDistance = 110; c.maxDistance = 600;
  globe.pointOfView({ lat: 34, lng: 14, altitude: 2.2 }, 0);
  window.__globe = globe;
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || innerWidth).height(elViz.clientHeight || innerHeight); }
let spinOn = true;

/* ----------------------------- hover / tooltip ----------------------------- */
const tooltip = document.getElementById('tooltip');
function flagEmoji(iso) {
  if (!iso || iso.length !== 2 || /[^A-Z]/.test(iso)) return '🏳️';
  return String.fromCodePoint(...[...iso].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
const nameOf = (iso, feat) => (DATA[iso] && DATA[iso].n) || (feat && feat.properties.NAME) || iso;

function rankOf(iso) {
  const m = state.history ? { get: d => curVal(d) } : METRICS[state.metric];
  const arr = Object.keys(DATA).map(k => [k, m.get(DATA[k])]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
  const i = arr.findIndex(x => x[0] === iso);
  return i < 0 ? null : { rank: i + 1, total: arr.length };
}

function tooltipHTML(iso, feat) {
  const d = DATA[iso], v = curVal(d);
  const head = `<div class="tt-head"><span class="tt-flag">${flagEmoji(iso)}</span>${nameOf(iso, feat)}</div>`;
  if (v == null) return head + `<div class="tt-nd">Not surveyed for this metric</div>`;
  const m = state.history ? { fmt: fmtHa, label: 'Organic farmland', unit: state.year } : METRICS[state.metric];
  const rk = rankOf(iso);
  return head + `<div class="tt-big">${m.fmt(v)}</div><div class="tt-sub">${state.history ? 'organic farmland · ' + state.year : m.label}</div>`
    + (rk ? `<div class="tt-rank">rank #${rk.rank} of ${rk.total}</div>` : '');
}
function onHover(feat) {
  const iso = feat ? feat.properties.OISO : null;
  if (iso === state.hovered) return;
  state.hovered = iso; refreshGlobe();
  if (globe) globe.controls().autoRotate = !feat && spinOn && !state.playing;
  if (!feat || !iso) { tooltip.classList.add('hidden'); return; }
  tooltip.innerHTML = tooltipHTML(iso, feat);
  tooltip.classList.remove('hidden');
}
elViz.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('hidden')) return;
  const r = elViz.getBoundingClientRect();
  tooltip.style.left = (e.clientX - r.left) + 'px';
  tooltip.style.top = (e.clientY - r.top) + 'px';
});

/* ----------------------------- geometry helpers ----------------------------- */
const geomOf = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
function featBBox(feat) {
  let a = 180, b = 90, c = -180, e = -90;
  const walk = co => { if (typeof co[0] === 'number') { a = Math.min(a, co[0]); c = Math.max(c, co[0]); b = Math.min(b, co[1]); e = Math.max(e, co[1]); } else co.forEach(walk); };
  walk(feat.geometry.coordinates); return [a, b, c, e];
}
// Antimeridian-aware centre longitude (Russia, Fiji, NZ, Kiribati span ±180 → naive midpoint lands at ~0).
function featCenterLng(feat) {
  let mn = 180, mx = -180; const lngs = [];
  (function walk(co) { if (typeof co[0] === 'number') { lngs.push(co[0]); if (co[0] < mn) mn = co[0]; if (co[0] > mx) mx = co[0]; } else co.forEach(walk); })(feat.geometry.coordinates);
  if (mx - mn <= 180) return (mn + mx) / 2;
  let lo = 360, hi = -360;
  for (let L of lngs) { if (L < 0) L += 360; if (L < lo) lo = L; if (L > hi) hi = L; }
  const c = (lo + hi) / 2; return c > 180 ? c - 360 : c;
}

/* ----------------------------- flat map ----------------------------- */
const FW = 2000, FH = 1000;
const fpx = lng => (lng + 180) / 360 * FW, fpy = lat => (90 - lat) / 180 * FH;
let flatBuilt = false;
const flatMeta = {};
function flatPathD(f) {
  let d = '';
  for (const poly of geomOf(f)) for (const ring of poly) d += 'M' + ring.map(p => fpx(p[0]).toFixed(1) + ',' + fpy(p[1]).toFixed(1)).join('L') + 'Z';
  return d;
}
function buildFlatMap() {
  if (flatBuilt) return;
  const svg = document.getElementById('flatViz');
  svg.setAttribute('viewBox', '0 0 ' + FW + ' ' + FH);
  let paths = '<rect class="flat-ocean" width="' + FW + '" height="' + FH + '"/>';
  for (const f of countries) {
    const iso = f.properties.OISO;
    paths += `<path class="flat-hit" data-iso="${iso || ''}" d="${flatPathD(f)}"/>`;
    if (iso) flatMeta[iso] = featBBox(f);
  }
  svg.innerHTML = paths;
  svg.querySelectorAll('.flat-hit').forEach(el => {
    const iso = el.dataset.iso;
    el.addEventListener('mousemove', e => flatHover(iso, el, e));
    el.addEventListener('mouseleave', () => { state.hovered = null; tooltip.classList.add('hidden'); });
    el.addEventListener('click', () => { if (!flatPanned && iso) selectCountry(iso, false); });
  });
  initFlatInteract();
  flatBuilt = true;
}
function paintFlat() {
  if (!flatBuilt) return;
  document.querySelectorAll('#flatViz .flat-hit').forEach(el => {
    const iso = el.dataset.iso, d = iso && DATA[iso], v = curVal(d);
    if (v == null) { el.style.fill = iso ? ndColor(0.92) : 'transparent'; }
    else { const [r, g, b] = rampColor(colorT(v)); el.style.fill = `rgb(${r},${g},${b})`; }
    el.classList.toggle('sel', iso === state.selected);
  });
}
function flatHover(iso, el, e) {
  if (flatDragging) return;
  state.hovered = iso;  // flat-map fill is hover-independent (no repaint needed); CSS handles the hover stroke
  const feat = countries.find(c => c.properties.OISO === iso);
  tooltip.innerHTML = tooltipHTML(iso, feat);
  tooltip.classList.remove('hidden');
  tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px';
}
/* flat pan + zoom (viewBox) */
const flatView = { x: 0, y: 0, w: FW, h: FH };
let flatDragging = false, flatPanned = false;
function applyFlatView() { const s = document.getElementById('flatViz'); if (s) s.setAttribute('viewBox', `${flatView.x.toFixed(1)} ${flatView.y.toFixed(1)} ${flatView.w.toFixed(1)} ${flatView.h.toFixed(1)}`); }
function clampFlatView() {
  flatView.w = clamp(flatView.w, FW / 18, FW); flatView.h = flatView.w * (FH / FW);
  flatView.x = clamp(flatView.x, 0, FW - flatView.w); flatView.y = clamp(flatView.y, 0, FH - flatView.h);
}
function resetFlatView() { flatView.x = 0; flatView.y = 0; flatView.w = FW; flatView.h = FH; applyFlatView(); }
function flatClientToSvg(cx, cy) {
  const svg = document.getElementById('flatViz'), r = svg.getBoundingClientRect();
  const sc = Math.min(r.width / flatView.w, r.height / flatView.h);
  return { x: flatView.x + (cx - r.left - (r.width - flatView.w * sc) / 2) / sc, y: flatView.y + (cy - r.top - (r.height - flatView.h * sc) / 2) / sc };
}
let flatBound = false;
function initFlatInteract() {
  if (flatBound) return;
  const svg = document.getElementById('flatViz');
  svg.addEventListener('wheel', e => {
    e.preventDefault(); const p = flatClientToSvg(e.clientX, e.clientY);
    const nw = clamp(flatView.w * (e.deltaY < 0 ? 0.84 : 1 / 0.84), FW / 18, FW), k = nw / flatView.w;
    flatView.x = p.x - (p.x - flatView.x) * k; flatView.y = p.y - (p.y - flatView.y) * k; flatView.w = nw;
    clampFlatView(); applyFlatView();
  }, { passive: false });
  svg.addEventListener('mousedown', e => {
    flatDragging = true; flatPanned = false; svg.style.cursor = 'grabbing'; tooltip.classList.add('hidden');
    const r = svg.getBoundingClientRect(), sc = Math.min(r.width / flatView.w, r.height / flatView.h);
    const sx = e.clientX, sy = e.clientY, ox = flatView.x, oy = flatView.y;
    const mv = ev => { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) flatPanned = true; flatView.x = ox - (ev.clientX - sx) / sc; flatView.y = oy - (ev.clientY - sy) / sc; clampFlatView(); applyFlatView(); };
    const up = () => { flatDragging = false; svg.style.cursor = ''; removeEventListener('mousemove', mv); removeEventListener('mouseup', up); setTimeout(() => flatPanned = false, 30); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  flatBound = true;
}

/* ----------------------------- legend + ranking ----------------------------- */
function updateLegend() {
  const m = state.history
    ? { label: 'Organic farmland — ' + state.year, unit: 'hectares · FAOSTAT series', fmt: fmtHa, get: d => curVal(d), _max: tsAreaMax, scale: 'log' }
    : METRICS[state.metric];
  document.getElementById('lgTitle').textContent = m.label;
  // ramp ticks
  document.getElementById('lgMin').textContent = m.scale === 'signed' ? '≤0' : '0';
  let topVal = m.scale === 'signed' ? m._cap : m._max;
  document.getElementById('lgMax').textContent = m.fmt(topVal);
  // ranking — every country with a value for this metric (scrollable full list)
  const arr = Object.keys(DATA).map(k => ({ iso: k, v: m.get(DATA[k]) })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
  document.getElementById('lgUnit').textContent = m.unit + ' · ' + arr.length + ' countries';
  document.getElementById('lgRank').innerHTML = arr.map((x, i) => {
    const [r, g, b] = rampColor(colorT(x.v));
    return `<li data-iso="${x.iso}"><span class="rk">${i + 1}</span><span class="sw" style="background:rgb(${r},${g},${b})"></span>`
      + `<span class="nm">${nameOf(x.iso)}</span><span class="vl">${m.fmt(x.v)}</span></li>`;
  }).join('');
}
document.getElementById('lgRank').addEventListener('click', e => {
  const li = e.target.closest('li'); if (li) selectCountry(li.dataset.iso, true);
});
document.getElementById('lgToggle').addEventListener('click', () => {
  document.getElementById('lgRank').classList.toggle('hidden');
});

/* ----------------------------- metric bar ----------------------------- */
function buildMetricBar() {
  const bar = document.getElementById('metricBar');
  bar.innerHTML = METRIC_ORDER.map(k =>
    `<button class="pill${k === state.metric ? ' on' : ''}" data-k="${k}"><span class="pi">${METRICS[k].icon}</span>${METRICS[k].short}</button>`).join('');
  bar.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => setMetric(p.dataset.k)));
}
function setMetric(k) {
  if (state.history) toggleHistory(false);
  state.metric = k;
  document.querySelectorAll('#metricBar .pill').forEach(p => p.classList.toggle('on', p.dataset.k === k));
  applyAll();
  if (state.selected) showDetail(state.selected);
}

/* ----------------------------- apply / refresh ----------------------------- */
function applyAll() { refreshGlobe(); paintFlat(); updateLegend(); }

/* ----------------------------- selection + detail ----------------------------- */
function selectCountry(iso, fly) {
  if (!iso) return;
  state.selected = iso; applyAll();
  showDetail(iso);
  const feat = countries.find(c => c.properties.OISO === iso);
  if (state.flat) {
    const bb = feat && featBBox(feat);
    if (bb) { const cx = fpx(featCenterLng(feat)), cy = (fpy(bb[3]) + fpy(bb[1])) / 2;
      const spanLng = (bb[2] - bb[0] > 180) ? 60 : (bb[2] - bb[0]);   // antimeridian spanners: don't zoom to whole world
      flatView.w = clamp(spanLng / 360 * FW * 3 + 60, FW / 16, FW); flatView.h = flatView.w * (FH / FW);
      flatView.x = cx - flatView.w / 2; flatView.y = cy - flatView.h / 2; clampFlatView(); applyFlatView(); }
  } else if (fly && globe && feat) {
    const bb = featBBox(feat); globe.controls().autoRotate = false; spinOn = false; syncSpin();
    globe.pointOfView({ lat: (bb[1] + bb[3]) / 2, lng: featCenterLng(feat), altitude: 1.6 }, 800);
  }
}
const detailCard = document.getElementById('detailCard');
function trendSVG(ts) {
  const ys = Object.keys(ts.area || {}).map(Number).sort((a, b) => a - b);
  if (ys.length < 2) return '';
  const W = 280, H = 74, pad = 8;
  const y0 = ys[0], yN = ys[ys.length - 1], span = (yN - y0) || 1;   // x by calendar year so gaps don't distort
  const vmax = Math.max(...ys.map(y => ts.area[y])) || 1;
  const xAt = y => pad + (y - y0) / span * (W - 2 * pad);
  const yAt = v => H - pad - (v / vmax) * (H - 2 * pad);
  const pts = ys.map(y => `${xAt(y).toFixed(1)},${yAt(ts.area[y]).toFixed(1)}`);
  const area = `M${xAt(y0)},${H - pad} L` + pts.join(' L') + ` L${xAt(yN)},${H - pad} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`
    + `<path d="${area}" fill="rgba(54,208,106,.16)"/>`
    + `<polyline points="${pts.join(' ')}" fill="none" stroke="#36d058" stroke-width="2"/>`
    + `<text x="${pad}" y="${H - 1}" font-size="8" fill="#6f9580">${y0}</text>`
    + `<text x="${W - pad}" y="${H - 1}" font-size="8" fill="#6f9580" text-anchor="end">${yN}</text></svg>`;
}
function showDetail(iso) {
  const d = DATA[iso]; if (!d) return;
  document.getElementById('dFlag').textContent = flagEmoji(iso);
  document.getElementById('dName').textContent = d.n;
  // hero = active metric
  const m = state.history ? { label: 'Organic farmland · ' + state.year, fmt: fmtHa, get: x => curVal(x) } : METRICS[state.metric];
  const hv = m.get(d), rk = rankOf(iso);
  document.getElementById('dHero').innerHTML =
    `<div class="h-v">${hv == null ? '—' : m.fmt(hv)}</div><div class="h-l">${m.label}</div>`
    + (rk ? `<div class="h-rk">#${rk.rank} of ${rk.total} countries</div>` : '');
  // grid of all snapshot metrics
  const cells = [
    ['share', 'Organic share'], ['area', 'Organic land'], ['producers', 'Organic farms'],
    ['areaPc', 'Land/person'], ['g10', '10-yr growth'], ['retail', 'Retail market'],
  ];
  document.getElementById('dGrid').innerHTML = cells.map(([k, lbl]) => {
    const v = METRICS[k].get(d);
    return `<div class="d-cell"><div class="c-v">${v == null ? '—' : METRICS[k].fmt(v)}</div><div class="c-l">${lbl}</div></div>`;
  }).join('');
  const tw = document.querySelector('.d-trendwrap'), tr = document.getElementById('dTrend');
  const svg = d.ts ? trendSVG(d.ts) : '';
  tr.innerHTML = svg; tw.style.display = svg ? '' : 'none';
  const note = document.getElementById('dNote');
  note.textContent = (d.retail && d.pop) ? `Organic spending ≈ ${fmtEur(d.retail * 1e6 / d.pop)} per person per year.` : '';
  detailCard.classList.remove('hidden');
}
document.getElementById('detailClose').addEventListener('click', () => {
  detailCard.classList.add('hidden'); state.selected = null; applyAll();
});

/* ----------------------------- history mode + time ----------------------------- */
const timeBar = document.getElementById('timeBar'), slider = document.getElementById('timeSlider'),
      yearLabel = document.getElementById('yearLabel'), playBtn = document.getElementById('playBtn');
let playTimer = null;
function toggleHistory(on) {
  state.history = on;
  document.getElementById('miHistory').classList.toggle('on', on);
  document.querySelector('#miHistory .mi-state').textContent = on ? 'On' : 'Off';
  timeBar.classList.toggle('hidden', !on);
  document.getElementById('metricBar').classList.toggle('hidden', on);
  document.querySelectorAll('#worldChip .wc-row').forEach(el => el.classList.toggle('hidden', on)); // static 2023 totals are wrong for a past year
  if (!on) stopPlay();
  applyAll();
  if (state.selected) showDetail(state.selected);
}
function setYear(y) { state.year = y; slider.value = y; yearLabel.textContent = y; applyAll(); if (state.selected) showDetail(state.selected); }
slider.addEventListener('input', () => { stopPlay(); setYear(+slider.value); });
function stopPlay() { state.playing = false; if (playTimer) { clearInterval(playTimer); playTimer = null; } playBtn.textContent = '▶'; playBtn.classList.remove('on'); if (globe) globe.controls().autoRotate = spinOn; }
function startPlay() {
  state.playing = true; playBtn.textContent = '⏸'; playBtn.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  if (state.year >= 2023) setYear(2004);
  playTimer = setInterval(() => { if (state.year >= 2023) { stopPlay(); return; } setYear(state.year + 1); }, 650);
}
playBtn.addEventListener('click', () => state.playing ? stopPlay() : startPlay());
document.getElementById('miHistory').addEventListener('click', () => { toggleHistory(!state.history); closeMenu(); });

/* ----------------------------- view toggle + menu ----------------------------- */
function setFlat(flat) {
  state.flat = flat;
  document.getElementById('flatViz').classList.toggle('hidden', !flat);
  elViz.classList.toggle('hidden', flat);
  const mv = document.getElementById('miView');
  mv.querySelector('.mi-ic').textContent = flat ? '🌐' : '🗺';
  mv.querySelector('.mi-tx').textContent = flat ? 'Globe view' : 'Flat map';
  document.querySelectorAll('.mi-globe').forEach(el => el.classList.toggle('hidden', flat));
  if (flat) { buildFlatMap(); paintFlat(); } else { refreshGlobe(); }
}
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
const closeMenu = () => menu.classList.add('hidden');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) closeMenu(); });
document.getElementById('miView').addEventListener('click', () => { setFlat(!state.flat); closeMenu(); });
const miSpin = document.getElementById('miSpin');
function syncSpin() { miSpin.querySelector('.mi-state').textContent = spinOn ? 'On' : 'Off'; miSpin.classList.toggle('on', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.playing) globe.controls().autoRotate = spinOn; syncSpin(); });
document.getElementById('miReset').addEventListener('click', () => {
  closeMenu(); state.selected = null; detailCard.classList.add('hidden'); applyAll();
  if (state.flat) resetFlatView(); else if (globe) { globe.pointOfView({ lat: 24, lng: 12, altitude: 2.3 }, 700); }
});
document.getElementById('miFull').addEventListener('click', () => { closeMenu(); if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); });
document.getElementById('miHelp').addEventListener('click', () => { closeMenu(); document.getElementById('tutorial').classList.remove('hidden'); });

/* ----------------------------- about / world trend ----------------------------- */
const aboutOv = document.getElementById('aboutOverlay');
document.getElementById('aboutSrc').textContent = META.src || '';
document.getElementById('miAbout').addEventListener('click', () => { closeMenu(); aboutOv.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOv.classList.add('hidden'));
aboutOv.addEventListener('click', e => { if (e.target === aboutOv) aboutOv.classList.add('hidden'); });

function worldTrendSVG() {
  const ys = Object.keys(WORLD_TS.area).map(Number).sort((a, b) => a - b);
  const W = 520, H = 230, pl = 44, pb = 26, pt = 12;
  const y0 = ys[0], yN = ys[ys.length - 1], span = (yN - y0) || 1;
  const vmax = Math.max(...ys.map(y => WORLD_TS.area[y]));
  const xAt = y => pl + (y - y0) / span * (W - pl - 10);
  const yAt = v => H - pb - (v / vmax) * (H - pb - pt);
  const pts = ys.map(y => `${xAt(y).toFixed(1)},${yAt(WORLD_TS.area[y]).toFixed(1)}`);
  let grid = '';
  for (let g = 0; g <= 4; g++) { const v = vmax * g / 4, y = yAt(v);
    grid += `<line x1="${pl}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="rgba(255,255,255,.07)"/>`
      + `<text x="${pl - 6}" y="${y + 3}" font-size="9" fill="#6f9580" text-anchor="end">${(v / 1e6).toFixed(0)}M</text>`; }
  let xl = '';
  for (const y of [2004, 2009, 2014, 2019, 2023]) { if (y < y0 || y > yN) continue;
    xl += `<text x="${xAt(y)}" y="${H - 8}" font-size="9" fill="#6f9580" text-anchor="middle">${y}</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}">${grid}<path d="M${xAt(y0)},${H - pb} L${pts.join(' L')} L${xAt(yN)},${H - pb} Z" fill="rgba(54,208,106,.16)"/>`
    + `<polyline points="${pts.join(' ')}" fill="none" stroke="#36d058" stroke-width="2.5"/>${xl}</svg>`;
}
const worldTrend = document.getElementById('worldTrend');
function showWorldTrend() { document.getElementById('wtChart').innerHTML = worldTrendSVG(); worldTrend.classList.remove('hidden'); }
document.getElementById('wcTrend').addEventListener('click', showWorldTrend);
const miTrendEl = document.getElementById('miTrend');   // menu entry → reachable on mobile (worldChip is hidden there)
if (miTrendEl) miTrendEl.addEventListener('click', () => { closeMenu(); showWorldTrend(); });
document.getElementById('wtClose').addEventListener('click', () => worldTrend.classList.add('hidden'));
worldTrend.addEventListener('click', e => { if (e.target === worldTrend) worldTrend.classList.add('hidden'); });

/* ----------------------------- search ----------------------------- */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [], selIdx = 0;
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = Object.keys(DATA).map(iso => ({ iso, n: DATA[iso].n })).filter(c => c.n.toLowerCase().includes(q))
    .sort((a, b) => a.n.toLowerCase().indexOf(q) - b.n.toLowerCase().indexOf(q) || a.n.localeCompare(b.n)).slice(0, 8);
  selIdx = 0;
  searchRes.innerHTML = hits.length ? hits.map((c, i) => `<div class="sr-item${i === selIdx ? ' sel' : ''}" data-iso="${c.iso}"><span class="sr-flag">${flagEmoji(c.iso)}</span>${c.n}</div>`).join('')
    : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function highlightSel() {
  [...searchRes.children].forEach((el, i) => el.classList && el.classList.toggle('sel', i === selIdx));
  const cur = searchRes.children[selIdx]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}
function pick(iso) { if (!iso && hits.length) iso = (hits[selIdx] || hits[0]).iso; if (!iso) return; selectCountry(iso, true); searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur(); }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); pick(hits[selIdx] && hits[selIdx].iso); }
  else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); }
  else if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); selIdx = Math.min(hits.length - 1, selIdx + 1); highlightSel(); }
  else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); selIdx = Math.max(0, selIdx - 1); highlightSel(); }
});
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pick(it.dataset.iso); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ----------------------------- share ----------------------------- */
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 1900); }
document.getElementById('miShare').addEventListener('click', () => {
  closeMenu();
  const seg = [state.history ? 'h' + state.year : state.metric]; if (state.selected) seg.push(state.selected); if (state.flat) seg.push('flat');
  const url = location.origin + location.pathname + '#' + seg.join(',');
  const done = () => showToast('🔗 Link copied');
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done); else done();
});

/* ----------------------------- keyboard ----------------------------- */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { closeMenu(); [aboutOv, worldTrend, document.getElementById('tutorial')].forEach(o => o.classList.add('hidden')); if (!detailCard.classList.contains('hidden')) { detailCard.classList.add('hidden'); state.selected = null; applyAll(); } }
  else if (state.history && e.key === 'ArrowRight') { stopPlay(); setYear(Math.min(2023, state.year + 1)); }
  else if (state.history && e.key === 'ArrowLeft') { stopPlay(); setYear(Math.max(2004, state.year - 1)); }
});
addEventListener('resize', sizeGlobe);

/* ----------------------------- tutorial ----------------------------- */
document.getElementById('tutStart').addEventListener('click', () => { document.getElementById('tutorial').classList.add('hidden'); try { localStorage.setItem('ofm_seen', '1'); } catch (e) {} });
document.getElementById('tutorial').addEventListener('click', e => { if (e.target.id === 'tutorial') document.getElementById('tutorial').classList.add('hidden'); });

/* ----------------------------- boot ----------------------------- */
function boot() {
  buildScales(); buildMetricBar(); syncSpin();
  // legend ramp gradient is generated from RAMP so the key always matches the painted colours
  const lgr = document.getElementById('lgRamp');
  if (lgr) lgr.style.background = 'linear-gradient(90deg,' + RAMP.map(c => `rgb(${c[0]},${c[1]},${c[2]})`).join(',') + ')';
  // world chip
  document.getElementById('wcA').textContent = (META.world.area / 1e6).toFixed(1) + 'M ha';
  document.getElementById('wcB').textContent = META.world.share + '%';
  document.getElementById('wcC').textContent = (META.world.producers / 1e6).toFixed(1) + 'M';
  updateLegend();
  // deep link: #metric[,ISO][,flat]  or #h2010,...
  const parts = decodeURIComponent((location.hash || '').slice(1)).split(',').map(s => s.trim()).filter(Boolean);
  let pendingIso = null;
  for (const p of parts) {
    if (p === 'flat') { /* set after geojson */ }
    else if (/^h\d{4}$/.test(p)) { state.year = clamp(+p.slice(1), 2004, 2023); }
    else if (METRICS[p]) state.metric = p;
    else if (DATA[p]) pendingIso = p;
  }
  fetch('data/countries.geojson').then(r => r.json()).then(geo => {
    initGlobe(geo);
    document.getElementById('loading').classList.add('hidden');
    if (parts.includes('flat')) setFlat(true);
    if (parts.some(p => /^h\d{4}$/.test(p))) { toggleHistory(true); setYear(state.year); }   // history works regardless of segment order
    else { document.querySelectorAll('#metricBar .pill').forEach(pl => pl.classList.toggle('on', pl.dataset.k === state.metric)); applyAll(); }
    if (pendingIso) selectCountry(pendingIso, true);
    try { if (!localStorage.getItem('ofm_seen')) document.getElementById('tutorial').classList.remove('hidden'); } catch (e) {}
  }).catch(err => { console.error(err); document.getElementById('loading').textContent = 'Could not load map data.'; });
}
document.addEventListener('DOMContentLoaded', boot);
