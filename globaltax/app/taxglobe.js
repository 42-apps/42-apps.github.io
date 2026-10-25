/* ============================================================================
   TaxGlobe — interactive 3D globe of world tax rates
   ========================================================================== */
'use strict';

/* ----------------------------- State ----------------------------- */
const state = {
  incomeUSD: 75000,      // canonical income, always stored in USD
  currency: 'USD',
  taxType: 'pit_marginal',
  hovered: null,         // ISO of hovered country
  selected: null,        // ISO of clicked country
  regimeMode: false,     // highlight new-resident / relocation tax regimes
  view: 'globe',         // 'globe' | 'table'
};

const MIN_USD = 1000;       // slider floor (above $0)
const MAX_USD = 5000000;    // top of the income slider
const COLORS = {
  green: '#2fd07a', yellow: '#f4c145', red: '#ef4d52', grey: '#39425f',
};

/* --------------------------- Helpers --------------------------- */
const cur = code => window.CURRENCIES.find(c => c.code === code) || window.CURRENCIES[0];

// Map slider 0..100 to a USD income on a LOG scale (so everyday salaries sit mid-slider).
function sliderToUSD(v) {
  if (v <= 0) return 0;
  let usd = MIN_USD * Math.pow(MAX_USD / MIN_USD, v / 100);
  if (usd < 100000) usd = Math.round(usd / 1000) * 1000;
  else if (usd < 1000000) usd = Math.round(usd / 5000) * 5000;
  else usd = Math.round(usd / 25000) * 25000;
  return usd;
}
function usdToSlider(usd) {
  if (usd <= MIN_USD) return usd <= 0 ? 0 : 1;
  return Math.round(100 * Math.log(usd / MIN_USD) / Math.log(MAX_USD / MIN_USD));
}
function fmtMoney(amount, code) {
  const c = cur(code);
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount));
  return c.sym + n;
}

// Resolve a geojson feature to an ISO_A2 key we can look up in TAX_DATA.
function isoOf(props) {
  let a2 = props.ISO_A2;
  if (a2 && a2 !== '-99') return a2;
  const name = props.ADMIN || props.NAME;
  return window.NAME_TO_ISO[name] || null;
}

// Build synthetic progressive brackets when a country has no explicit pitb.
function bracketsFor(rec) {
  if (rec.pitb) return rec.pitb;
  const top = rec.pit || 0;
  if (top <= 0) return [[0, 0]];
  const r = p => Math.round(top * p * 10) / 10;
  return [[0, 0], [12000, r(0.35)], [45000, r(0.6)], [120000, r(0.82)], [300000, top]];
}

// Marginal personal rate at a given USD income.
function marginalRate(rec, usd) {
  const b = bracketsFor(rec);
  let rate = b[0][1];
  for (const [thr, rt] of b) { if (usd >= thr) rate = rt; else break; }
  return rate;
}

// Effective (average) personal rate across the whole income.
function effectiveRate(rec, usd) {
  if (usd <= 0) return 0;
  const b = bracketsFor(rec);
  let tax = 0;
  for (let i = 0; i < b.length; i++) {
    const lo = b[i][0];
    const rt = b[i][1];
    const hi = i + 1 < b.length ? b[i + 1][0] : Infinity;
    if (usd > lo) tax += (Math.min(usd, hi) - lo) * rt / 100;
    else break;
  }
  return Math.round((tax / usd) * 1000) / 10;
}

// The displayed rate (%) for a country under a given tax type & income. null = no data.
function rateFor(rec, typeKey = state.taxType) {
  if (!rec) return null;
  const t = window.TAX_TYPES[typeKey];
  if (t.incomeBased) {
    return t.mode === 'effective' ? effectiveRate(rec, state.incomeUSD) : marginalRate(rec, state.incomeUSD);
  }
  const v = rec[t.field];
  return typeof v === 'number' ? v : null;
}

// Grade a rate to green / yellow / red / grey using a tax type's thresholds.
function gradeOf(rate, typeKey = state.taxType) {
  if (rate == null) return 'grey';
  const [g, y] = window.TAX_TYPES[typeKey].grade;
  if (rate <= g) return 'green';
  if (rate <= y) return 'yellow';
  return 'red';
}
// Grade a new-resident regime's effective rate (lower = more attractive).
function regimeGrade(rate) {
  if (rate == null) return 'grey';
  const [g, y] = window.REGIME_GRADE;
  if (rate <= g) return 'green';
  if (rate <= y) return 'yellow';
  return 'red';
}
const GRADE_LABEL = { green: 'Low / no tax', yellow: 'Moderate', red: 'High', grey: 'No data' };
const GRADE_BURDEN = { green: 'Low burden', yellow: 'Moderate burden', red: 'High burden', grey: 'No data' };
const KIND_LABEL = { mover: 'New-resident regime', territorial: 'Territorial — foreign income exempt', notax: 'No personal income tax', low: 'Structurally low tax' };
const KIND_FOOT = { mover: 'New-resident tax break', territorial: 'Foreign income exempt (territorial)', notax: 'No personal income tax', low: 'Structurally low tax' };
const SCOPE_SHORT = { foreign: 'on foreign income', earned: 'on local pay', all: 'effective', pension: 'on foreign pensions' };
// A regime's headline rate, saying which income it covers (+ any flat option on local pay), as HTML.
function regimeRateHTML(reg, color) {
  const main = reg.scope === 'lumpsum'
    ? `<b style="color:${color}">Lump-sum / capped</b>`
    : `<b style="color:${color}">${reg.rate === 0 ? '~0%' : '~' + reg.rate + '%'}</b> ${SCOPE_SHORT[reg.scope] || 'effective'}`;
  return main + (typeof reg.earned === 'number' ? ` · ${reg.earned}% flat option on local pay` : '');
}

/* ============================ Globe ============================ */
let globe, countries = [], regimePoints = [], markerData = [];
const elViz = document.getElementById('globeViz');

function capColor(feat) {
  const iso = isoOf(feat.properties);
  const sel = state.selected && iso === state.selected;
  const hov = state.hovered && iso === state.hovered;

  if (state.regimeMode) {
    const reg = iso && window.REGIMES[iso];
    if (!reg) return hexA(COLORS.grey, sel || hov ? 0.45 : 0.16); // dim non-regime countries
    const g = regimeGrade(reg.rate);
    return hexA(COLORS[g], sel ? 0.97 : hov ? 0.92 : 0.85);
  }

  const rec = iso && window.TAX_DATA[iso];
  const g = gradeOf(rateFor(rec));
  const a = sel ? 0.95 : hov ? 0.9 : (g === 'grey' ? 0.35 : 0.72);
  return hexA(COLORS[g], a);
}
function altOf(feat) {
  const iso = isoOf(feat.properties);
  if (state.selected && iso === state.selected) return 0.07;
  if (state.hovered && iso === state.hovered) return 0.045;
  if (state.regimeMode && iso && window.REGIMES[iso]) return 0.03;
  return 0.012;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function initGlobe(geo) {
  countries = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#5ad1c5')
    .atmosphereAltitude(0.16)
    .showGraticules(true)
    .polygonsData(countries)
    .polygonCapColor(capColor)
    .polygonSideColor(() => 'rgba(20, 34, 64, 0.6)')
    .polygonStrokeColor(() => 'rgba(8, 14, 28, 0.85)')
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(220)
    .onPolygonHover(onHover)
    .onPolygonClick(onClick)
    // pulsing rings marking new-resident regimes (shown only in regime mode)
    .ringColor(() => (t => `rgba(90, 209, 197, ${Math.sqrt(1 - t)})`))
    .ringMaxRadius(3.5)
    .ringPropagationSpeed(1.6)
    .ringRepeatPeriod(1100);

  // Dark ocean globe + soft atmosphere (no remote textures — MV3 CSP safe).
  const mat = globe.globeMaterial();
  mat.color.set('#0a1a33');
  mat.emissive.set('#071328');
  mat.emissiveIntensity = 0.9;
  mat.shininess = 6;

  const ctr = globe.controls();
  ctr.autoRotate = true;
  ctr.autoRotateSpeed = 0.45;
  ctr.enableDamping = true;
  ctr.dampingFactor = 0.12;
  ctr.minDistance = 175;
  ctr.maxDistance = 520;

  // Marker territories (too small for 1:110m polygons) → labelled dots, hover/click like polygons.
  markerData = Object.entries(window.MARKERS).map(([iso, c]) => ({ iso, lat: c[0], lng: c[1], name: markerName(iso) }));
  globe.labelsData(markerData)
    .labelLat(d => d.lat).labelLng(d => d.lng)
    .labelText(d => d.name)
    .labelSize(0.5).labelDotRadius(0.34)
    .labelColor(markerColor)
    .labelResolution(1).labelAltitude(0.013)
    .onLabelHover(onLabelHover)
    .onLabelClick(onLabelClick);

  // Pre-compute ring positions for every regime — polygon centroids + marker coords.
  regimePoints = Object.keys(window.REGIMES).map(iso => {
    const f = countries.find(c => isoOf(c.properties) === iso);
    if (f) { const [lng, lat] = polyCentroid(f); return { lat, lng, iso }; }
    if (window.MARKERS[iso]) return { lat: window.MARKERS[iso][0], lng: window.MARKERS[iso][1], iso };
    return null;
  }).filter(Boolean);

  globe.pointOfView({ lat: 25, lng: 10, altitude: 2.3 }, 0);
  window.globe = globe; // expose for debugging
  sizeGlobe();
  // Container may not have its final size on the first frame — keep it in sync.
  requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
  if (state.view === 'table') globe.pauseAnimation();   // opened straight into the table
}

function sizeGlobe() {
  if (!globe) return;
  const w = elViz.clientWidth || window.innerWidth;
  const h = elViz.clientHeight || (window.innerHeight - 64);
  globe.width(w).height(h);
}

// Re-evaluate polygon + label colors/altitudes after state changes.
function refreshGlobe() {
  if (!globe) return;
  globe.polygonCapColor(capColor).polygonAltitude(altOf).labelColor(markerColor);
}
// Re-render the active hover tooltip and open detail card (works for polygons & markers).
function refreshActive() {
  if (state.hovered) hoverEnter(state.hovered, markerName(state.hovered), true);
  if (state.selected && !detailCard.classList.contains('hidden')) showDetailFor(state.selected);
}
// Show/hide the pulsing regime rings.
function updateRings() {
  if (!globe) return;
  globe.ringsData(state.regimeMode ? regimePoints : []);
}
// Colour for a marker label dot — same grading as the polygons.
function markerColor(d) {
  if (state.regimeMode) {
    const reg = window.REGIMES[d.iso];
    return reg ? COLORS[regimeGrade(reg.rate)] : COLORS.grey;
  }
  return COLORS[gradeOf(rateFor(window.TAX_DATA[d.iso]))];
}

/* --------------------------- Interaction --------------------------- */
const tooltip = document.getElementById('tooltip');

function markerName(iso) { return (window.TAX_DATA[iso] && window.TAX_DATA[iso].n) || iso; }

function onHover(feat) {
  const iso = feat ? isoOf(feat.properties) : null;
  const name = feat ? ((window.TAX_DATA[iso] && window.TAX_DATA[iso].n) || feat.properties.ADMIN || feat.properties.NAME) : null;
  hoverEnter(iso, name, !!feat);
}
function onLabelHover(d) { hoverEnter(d ? d.iso : null, d ? markerName(d.iso) : null, !!d); }

function hoverEnter(iso, name, present) {
  state.hovered = iso;
  refreshGlobe();
  if (globe) globe.controls().autoRotate = !present && spinOn;
  if (!present) { tooltip.classList.add('hidden'); return; }
  const rec = iso && window.TAX_DATA[iso];
  const flag = flagEmoji(iso);

  if (!rec) {
    tooltip.innerHTML =
      `<div class="tt-head"><span class="tt-flag">${flag}</span><span class="tt-name">${name}</span></div>` +
      `<div class="tt-nodata">No tax data on file yet</div>`;
    tooltip.classList.remove('hidden');
    return;
  }

  const head = `<div class="tt-head"><span class="tt-flag">${flag}</span>` +
    `<span class="tt-name">${name}</span><span class="tt-cur">${rec.cur}</span></div>`;
  const reg = iso && window.REGIMES[iso];

  // ----- New-resident mode: lead with the relocation regime -----
  if (state.regimeMode) {
    let body;
    if (reg) {
      const rg = regimeGrade(reg.rate);
      body = `<div class="tt-regime">` +
        `<div class="ttr-title">✦ ${reg.name}</div>` +
        `<div class="ttr-rate">${regimeRateHTML(reg, COLORS[rg])} · ${reg.years ? reg.years + ' yrs' : 'ongoing'}</div>` +
        `<div class="ttr-who">${reg.who}</div><div class="ttr-note">${reg.note}</div></div>`;
    } else {
      body = `<div class="tt-nodata">No special new-resident regime</div>`;
    }
    tooltip.innerHTML = head + body;
    tooltip.classList.remove('hidden');
    return;
  }

  // ----- Standard mode -----
  const t = window.TAX_TYPES[state.taxType];
  const rate = rateFor(rec);
  const g = gradeOf(rate);

  const ctx = t.incomeBased
    ? `${t.mode === 'effective' ? 'effective' : 'marginal'} rate at ${fmtMoney(state.incomeUSD * cur(state.currency).fx, state.currency)}`
    : 'standard headline rate';

  // Full snapshot of every tax type (mirrors the left-hand Tax Type box), each dotted by its grade.
  const cells = Object.entries(window.TAX_TYPES).map(([k, t2]) => {
    const r = rateFor(rec, k);
    const cg = gradeOf(r, k);
    return `<div class="tt-cell${k === state.taxType ? ' cur' : ''}">` +
      `<span class="tt-dot" style="background:${COLORS[cg]}"></span>` +
      `<span class="tt-cl">${t2.short}</span>` +
      `<span class="tt-cv">${r == null ? '—' : Math.round(r) + '%'}</span></div>`;
  }).join('');

  const regFoot = reg ? `<div class="tt-regime-foot">✦ ${KIND_FOOT[reg.kind] || 'Relocation perk'}</div>` : '';
  const subNote = window.SUBNATIONAL[iso] ? `<div class="tt-sub">↕ ${window.SUBNATIONAL[iso]}</div>` : '';

  tooltip.innerHTML = head +
    `<div class="tt-main"><span class="tt-big" style="color:${COLORS[g]}">${rate == null ? '—' : rate + '%'}</span>` +
      `<span class="tt-meta"><span class="tt-type">${t.short}</span>` +
      `<span class="tt-grade" style="color:${COLORS[g]}">${GRADE_BURDEN[g]}</span></span></div>` +
    `<div class="tt-ctx">${ctx}</div>` +
    `<div class="tt-grid">${cells}</div>` + subNote + regFoot;
  tooltip.classList.remove('hidden');
}

elViz.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('hidden')) return;
  const r = elViz.getBoundingClientRect();
  tooltip.style.left = (e.clientX - r.left) + 'px';
  tooltip.style.top = (e.clientY - r.top) + 'px';
});

function onClick(feat) {
  if (!feat) return;
  const iso = isoOf(feat.properties);
  const name = (window.TAX_DATA[iso] && window.TAX_DATA[iso].n) || feat.properties.ADMIN || feat.properties.NAME;
  const [lng, lat] = polyCentroid(feat);
  selectJurisdiction(iso, lat, lng, name);
}
function onLabelClick(d) { if (d) selectJurisdiction(d.iso, d.lat, d.lng, markerName(d.iso)); }

function selectJurisdiction(iso, lat, lng, name) {
  state.selected = iso;
  refreshGlobe();
  showDetailFor(iso, name);
  globe.controls().autoRotate = false;
  document.getElementById('spinBtn').classList.remove('on');
  spinOn = false;
  globe.pointOfView({ lat, lng, altitude: 1.7 }, 900);
}

// Rough centroid from the feature bounding box.
function polyCentroid(feat) {
  const bb = feat.bbox;
  if (bb) return [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
  let mnx = 180, mny = 90, mxx = -180, mxy = -90;
  const walk = c => {
    if (typeof c[0] === 'number') { mnx = Math.min(mnx, c[0]); mxx = Math.max(mxx, c[0]); mny = Math.min(mny, c[1]); mxy = Math.max(mxy, c[1]); }
    else c.forEach(walk);
  };
  walk(feat.geometry.coordinates);
  return [(mnx + mxx) / 2, (mny + mxy) / 2];
}

/* --------------------------- Detail card --------------------------- */
const detailCard = document.getElementById('detailCard');
function flagEmoji(iso) {
  if (!iso || iso.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
function showDetailFor(iso, name) {
  const rec = iso && window.TAX_DATA[iso];
  name = name || (rec ? rec.n : iso);
  document.getElementById('detailFlag').textContent = flagEmoji(iso);
  document.getElementById('detailName').textContent = name;

  const gradeEl = document.getElementById('detailGrade');
  const rows = document.getElementById('detailRows');
  const regEl = document.getElementById('detailRegime');
  const subEl = document.getElementById('detailSub');
  // "varies by region" note
  if (window.SUBNATIONAL[iso]) { subEl.classList.remove('hidden'); subEl.innerHTML = `↕ ${window.SUBNATIONAL[iso]}`; }
  else { subEl.classList.add('hidden'); subEl.innerHTML = ''; }
  if (!rec) {
    gradeEl.className = 'detail-grade grey';
    gradeEl.textContent = 'No data';
    rows.innerHTML = `<p style="color:var(--muted);font-size:11.5px;line-height:1.5">No tax data on file for this territory yet.</p>`;
    regEl.classList.add('hidden');
    detailCard.classList.remove('hidden');
    document.body.classList.add('card-open');
    return;
  }
  const mainRate = rateFor(rec);
  const mg = gradeOf(mainRate);
  gradeEl.className = 'detail-grade ' + mg;
  gradeEl.textContent = GRADE_LABEL[mg] + ' · ' + (mainRate == null ? '—' : mainRate + '%');

  rows.innerHTML = Object.entries(window.TAX_TYPES).map(([key, t]) => {
    const rate = rateFor(rec, key);
    const g = gradeOf(rate, key);
    const sel = key === state.taxType ? ' sel' : '';
    return `<div class="drow${sel}">` +
      `<span class="ddot" style="background:${COLORS[g]}"></span>` +
      `<span class="dlabel">${t.short}</span>` +
      `<span class="dval">${rate == null ? '—' : rate + '%'}</span></div>`;
  }).join('');

  // New-resident / relocation regime section (shown whenever the country has one).
  const reg = window.REGIMES[iso];
  if (reg) {
    const rg = regimeGrade(reg.rate);
    regEl.classList.remove('hidden');
    regEl.innerHTML =
      `<div class="dr-head">✦ ${KIND_LABEL[reg.kind] || 'Relocation perk'}</div>` +
      `<div class="dr-name">${reg.name}</div>` +
      `<div class="dr-meta"><span class="dr-rate">${regimeRateHTML(reg, COLORS[rg])}</span>` +
      ` · ${reg.years ? reg.years + ' years' : 'ongoing'}</div>` +
      `<div class="dr-who">${reg.who}</div>` +
      `<div class="dr-note">${reg.note}</div>`;
  } else {
    regEl.classList.add('hidden');
    regEl.innerHTML = '';
  }
  detailCard.classList.remove('hidden');
  document.body.classList.add('card-open');
}
document.getElementById('detailClose').addEventListener('click', () => {
  const prev = state.selected;
  const hadFocus = detailCard.contains(document.activeElement);
  hideDetail();
  state.selected = null;
  refreshGlobe();
  markSelectedRow();
  // Keyboard users go back to the row they opened the card from.
  const tr = state.view === 'table' && hadFocus && prev && rowCache.get(prev);
  if (tr && tr.isConnected) tr.focus({ preventScroll: true });
});
function hideDetail() {
  detailCard.classList.add('hidden');
  document.body.classList.remove('card-open');
}
// "Show on globe" (table view only) — switch views and fly to the country.
document.getElementById('detailLocate').addEventListener('click', () => {
  const iso = state.selected;
  if (!iso) return;
  setView('globe');
  locateOnGlobe(iso);
  document.getElementById('detailClose').focus();   // this button is hidden on the globe — keep focus in the card
});

/* ============================ Ranking table ============================ */
// The All-in rate is a weighted average of these seven headline rates. Income tax uses
// your EFFECTIVE rate at the slider income, so the ranking re-orders as income changes.
const SCORE_KEYS = ['pit_effective', 'ss', 'vat', 'cit', 'cgt', 'est', 'gift'];
const PROFILES = {
  balanced: { label: 'Balanced',          w: { pit_effective: 40, ss: 15, vat: 20, cit: 7,  cgt: 10, est: 5,  gift: 3 } },
  employee: { label: 'Salaried employee', w: { pit_effective: 50, ss: 25, vat: 20, cit: 0,  cgt: 5,  est: 0,  gift: 0 } },
  business: { label: 'Business owner',    w: { pit_effective: 25, ss: 10, vat: 10, cit: 40, cgt: 10, est: 5,  gift: 0 } },
  investor: { label: 'Investor',          w: { pit_effective: 15, ss: 5,  vat: 15, cit: 15, cgt: 40, est: 7,  gift: 3 } },
  legacy:   { label: 'Retiree & legacy',  w: { pit_effective: 25, ss: 0,  vat: 20, cit: 0,  cgt: 20, est: 25, gift: 10 } },
  equal:    { label: 'Equal weights',     w: { pit_effective: 1,  ss: 1,  vat: 1,  cit: 1,  cgt: 1,  est: 1,  gift: 1 } },
};
const OVERALL_GRADE = [10, 20];   // All-in rate: ≤10% low, ≤20% moderate, above that high
const TV_COLS = [
  { key: 'rank',          label: '#',          title: 'Overall rank — lowest All-in rate first. Ties share a rank.' },
  { key: 'name',          label: 'Country' },
  { key: 'overall',       label: 'All-in',     sub: 'blended rate', title: 'Weighted average of all seven taxes (weights: ⚖ Weights). Lower is better. Green ≤10% · yellow ≤20% · red above.' },
  { key: 'bill',          label: 'Income tax', sub: 'per year',     title: 'Income tax on your income at the effective rate (shown in your currency)' },
  { key: 'pit_effective', label: 'Income',     sub: 'effective' },
  { key: 'pit_marginal',  label: 'Income',     sub: 'marginal',     title: 'Shown for reference — not part of the All-in rate' },
  { key: 'ss',            label: 'Social sec.' },
  { key: 'vat',           label: 'VAT / GST' },
  { key: 'cit',           label: 'Corporate' },
  { key: 'cgt',           label: 'Cap. gains' },
  { key: 'est',           label: 'Estate' },
  { key: 'gift',          label: 'Gift' },
];
const REGION_OF = {};
for (const [region, isos] of Object.entries(window.REGIONS || {})) isos.forEach(iso => { REGION_OF[iso] = region; });
// What a regime's rate covers (REGIMES[iso].scope) and which income source it helps in the table.
const SCOPE_LABEL = {
  foreign: 'foreign-source income', earned: 'local employment income',
  all: 'all income', lumpsum: 'a lump-sum / capped charge — not modelled in the table',
  pension: 'foreign pensions only — not applied to investment income in the table',
};
const SOURCE_SCOPE = { foreign: 'foreign', local: 'earned' };   // income source → regime scope it can use
const SOURCE_LABEL = { foreign: 'foreign investment & pension income', local: 'a local job / salary' };

const tv = {
  sort: { key: 'overall', dir: 1 },   // dir 1 = ascending (best first)
  region: '',
  query: '',
  profile: 'balanced',
  weights: { ...PROFILES.balanced.w },
  source: 'foreign',                   // new-resident mode: what kind of income the mover has
  rows: [],                            // last computed (filtered + sorted) rows, for CSV
  total: 0,
};
try {
  const p = localStorage.getItem('gt_tv_profile');
  const w = JSON.parse(localStorage.getItem('gt_tv_weights') || 'null');
  const valid = w && SCORE_KEYS.every(k => Number.isFinite(w[k]) && w[k] >= 0 && w[k] <= 50);
  if (p === 'custom' && valid) { tv.profile = 'custom'; tv.weights = Object.fromEntries(SCORE_KEYS.map(k => [k, w[k]])); }
  else if (PROFILES[p]) { tv.profile = p; tv.weights = { ...PROFILES[p].w }; }
} catch (e) { /* localStorage unavailable — use defaults */ }
function saveWeights() {
  try {
    localStorage.setItem('gt_tv_profile', tv.profile);
    localStorage.setItem('gt_tv_weights', JSON.stringify(tv.weights));
  } catch (e) { /* ignore */ }
}

const tableView = document.getElementById('tableView');
const tvBody = document.getElementById('tvBody');
const tvScroll = document.getElementById('tvScroll');
const rowCache = new Map();   // iso → <tr>, reused so rows can glide to their new rank
const fmtPct = v => (v == null ? '—' : (Math.round(v * 10) / 10) + '%');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const weightSum = () => SCORE_KEYS.reduce((s, k) => s + (tv.weights[k] || 0), 0);
const profileLabel = () => (PROFILES[tv.profile] ? PROFILES[tv.profile].label : 'Custom weights');
// The column to tint — the one the table is sorted by (rank sorts by the All-in rate).
const sortedCol = () => (tv.sort.key === 'rank' ? 'overall' : tv.sort.key);
function gradeOverall(v) {
  if (v == null) return 'grey';
  return v <= OVERALL_GRADE[0] ? 'green' : v <= OVERALL_GRADE[1] ? 'yellow' : 'red';
}

// Every country's rates at the current income, its All-in rate and overall rank (unfiltered).
function computeRows() {
  const wsum = weightSum();
  const rows = Object.entries(window.TAX_DATA).map(([iso, rec]) => {
    const r = { iso, rec, name: rec.n, region: REGION_OF[iso] || '' };
    for (const k of Object.keys(window.TAX_TYPES)) r[k] = rateFor(rec, k);
    r.pitNormal = r.pit_effective;
    // New-resident mode: a mover can use a relocation regime where it beats the normal rules —
    // but only if the regime covers the kind of income they have (most exempt foreign income only).
    const reg = window.REGIMES[iso];
    // A foreign-income regime may also offer a flat rate on local pay (reg.earned, e.g. Korea's 19% option).
    const regRate = !reg ? null
      : reg.scope === 'all' || reg.scope === SOURCE_SCOPE[tv.source] ? reg.rate
      : tv.source === 'local' && typeof reg.earned === 'number' ? reg.earned : null;
    r.regimeUsed = !!(state.regimeMode && regRate != null && r.pit_effective != null && regRate < r.pit_effective);
    if (r.regimeUsed) r.pit_effective = regRate;
    r.bill = r.pit_effective == null ? null : state.incomeUSD * r.pit_effective / 100;
    if (wsum > 0) {
      let s = 0, used = 0;
      for (const k of SCORE_KEYS) {
        const w = tv.weights[k] || 0;
        if (!w || r[k] == null) continue;
        s += w * r[k]; used += w;
      }
      r.overall = used ? Math.round((s / used) * 10) / 10 : null;
    } else r.overall = null;
    return r;
  });
  // Competition ranking (1, 2, 2, 4…) on the displayed (rounded) All-in rate.
  const ranked = rows.filter(r => r.overall != null).sort((a, b) => a.overall - b.overall);
  ranked.forEach((r, i) => { r.rank = i && r.overall === ranked[i - 1].overall ? ranked[i - 1].rank : i + 1; });
  return rows;
}

function sortRows(rows) {
  const { key, dir } = tv.sort;
  const k = key === 'rank' ? 'overall' : key;
  const byOverall = (a, b) => (a.overall ?? Infinity) - (b.overall ?? Infinity) || a.name.localeCompare(b.name);
  return rows.sort((a, b) => {
    if (k === 'name') return dir * a.name.localeCompare(b.name);
    const av = a[k], bv = b[k];
    if (av == null || bv == null) return (av == null) - (bv == null) || byOverall(a, b);   // no data always last
    return dir * (av - bv) || byOverall(a, b);
  });
}

function rowHTML(r, maxOverall) {
  const hl = k => (k === sortedCol() ? ' hl' : '');
  const cell = k => {
    const v = r[k];
    return `<td class="c-rate${hl(k)}"><span class="tv-dot" style="background:${COLORS[gradeOf(v, k)]}"></span>${fmtPct(v)}</td>`;
  };
  const reg = window.REGIMES[r.iso];
  const sub = window.SUBNATIONAL[r.iso];
  const badges =
    (reg ? `<span class="tv-badge${r.regimeUsed ? ' on' : ''}" title="${escAttr(`✦ ${reg.name} — applies to ${SCOPE_LABEL[reg.scope] || 'qualifying movers'}` +
      (typeof reg.earned === 'number' ? `; ${reg.earned}% flat option on local employment income` : ''))}">✦</span>` : '') +
    (sub ? `<span class="tv-badge sub" title="${escAttr(sub)}">↕</span>` : '');
  const og = gradeOverall(r.overall);
  const bar = r.overall == null || !maxOverall ? 0 : Math.max(2, Math.round(100 * r.overall / maxOverall));
  const local = r.bill == null ? '—' : fmtMoney(r.bill * cur(state.currency).fx, state.currency);
  const effTitle = r.regimeUsed
    ? ` title="${escAttr(`✦ ${reg.name} — ~${r.pit_effective}% on ${SOURCE_LABEL[tv.source]} for a qualifying mover (normal rules: ${fmtPct(r.pitNormal)})`)}"` : '';
  return `<td class="c-rank">${r.rank ?? '—'}</td>` +
    `<td class="c-name"><span class="tv-flag">${flagEmoji(r.iso)}</span><span class="tv-nm">${r.name}</span>${badges}</td>` +
    `<td class="c-overall${hl('overall')}"><div class="tv-ov"><span class="tv-ov-val" style="color:${COLORS[og]}">${fmtPct(r.overall)}</span>` +
      `<span class="tv-ov-bar"><i style="width:${bar}%;background:${COLORS[og]}"></i></span></div></td>` +
    `<td class="c-bill">${local}</td>` +
    `<td class="c-rate${hl('pit_effective')}${r.regimeUsed ? ' regime' : ''}"${effTitle}>` +
      `<span class="tv-dot" style="background:${COLORS[gradeOf(r.pit_effective, 'pit_effective')]}"></span>${r.regimeUsed ? '✦ ' : ''}${fmtPct(r.pit_effective)}</td>` +
    ['pit_marginal', 'ss', 'vat', 'cit', 'cgt', 'est', 'gift'].map(cell).join('');
}

function renderTableHead() {
  const { key, dir } = tv.sort;
  const head = document.getElementById('tvHead');
  const focused = head.contains(document.activeElement) ? document.activeElement.dataset.key : null;
  head.innerHTML = TV_COLS.map(c => {
    const active = c.key === key || (key === 'rank' && c.key === 'overall') || (key === 'overall' && c.key === 'rank');
    const aria = c.key === key ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : '';
    const arrow = active ? (dir > 0 ? '▲' : '▼') : '';
    const hl = c.key === sortedCol() ? ' hl' : '';
    return `<th class="h-${c.key}${hl}${active ? ' sorted' : ''}"${aria}>` +
      `<button data-key="${c.key}"${c.title ? ` title="${escAttr(c.title)}"` : ''}>` +
      `<span class="th-l">${c.label}<span class="th-arrow">${arrow}</span></span>` +
      (c.sub ? `<span class="th-sub">${c.sub}</span>` : '') + `</button></th>`;
  }).join('');
  if (focused) { const b = head.querySelector(`button[data-key="${focused}"]`); if (b) b.focus(); }   // keep keyboard focus
}

function renderTable(animate = true) {
  if (state.view !== 'table') return;
  const all = computeRows();
  const maxOverall = Math.max(0, ...all.map(r => r.overall || 0));
  const q = tv.query.trim().toLowerCase();
  let rows = all.filter(r =>
    (!tv.region || r.region === tv.region) &&
    (!q || r.name.toLowerCase().includes(q) || r.iso.toLowerCase() === q));
  rows = sortRows(rows);
  tv.rows = rows;
  tv.total = all.length;

  renderTableHead();
  // FLIP: remember where each visible row was, rebuild in the new order, then glide rows into place.
  const glide = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const before = new Map();
  if (glide) for (const tr of tvBody.children) before.set(tr.dataset.iso, tr.getBoundingClientRect().top);
  // Roving tabindex: the table is one Tab stop (focused, selected or first row); arrow keys move within it.
  const active = tvBody.contains(document.activeElement) ? document.activeElement.dataset.iso : null;
  const stop = [active, state.selected].find(iso => iso && rows.some(r => r.iso === iso)) || (rows[0] && rows[0].iso);
  const frag = document.createDocumentFragment();
  for (const r of rows) {
    let tr = rowCache.get(r.iso);
    if (!tr) {
      tr = document.createElement('tr');
      tr.dataset.iso = r.iso;
      rowCache.set(r.iso, tr);
    }
    tr.tabIndex = r.iso === stop ? 0 : -1;
    tr.innerHTML = rowHTML(r, maxOverall);
    tr.classList.toggle('sel', r.iso === state.selected);
    frag.appendChild(tr);
  }
  tvBody.replaceChildren(frag);
  if (active && rowCache.get(active).isConnected) rowCache.get(active).focus({ preventScroll: true });
  if (before.size) {
    const moved = [];
    for (const tr of tvBody.children) {
      const top = before.get(tr.dataset.iso);
      if (top == null) continue;
      const dy = top - tr.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      tr.style.transition = 'none';
      tr.style.transform = `translateY(${dy}px)`;
      moved.push(tr);
    }
    if (moved.length) {
      void tvBody.offsetHeight;   // commit the inverted positions before animating
      for (const tr of moved) { tr.style.transition = 'transform .35s cubic-bezier(.2,.7,.2,1)'; tr.style.transform = ''; }
    }
  }
  document.getElementById('tvEmpty').classList.toggle('hidden', rows.length > 0);
  renderTableMeta();
  updateReadout();
}

function renderTableMeta() {
  const income = fmtMoney(state.incomeUSD * cur(state.currency).fx, state.currency);
  const col = TV_COLS.find(c => c.key === tv.sort.key);
  const sortTxt = tv.sort.key === 'overall' || tv.sort.key === 'rank'
    ? (tv.sort.dir > 0 ? 'Ranked best → worst' : 'Ranked worst → best')
    : `Sorted by ${col.label}${col.sub ? ' (' + col.sub + ')' : ''}, ${tv.sort.key === 'name' ? (tv.sort.dir > 0 ? 'A → Z' : 'Z → A') : (tv.sort.dir > 0 ? 'lowest first' : 'highest first')}`;
  const shown = tv.rows.length === tv.total ? `${tv.total} countries & territories` : `${tv.rows.length} of ${tv.total} shown`;
  document.getElementById('tvMeta').innerHTML =
    `<b>${sortTxt}</b> · ${shown} · income <b>${income}</b> · ${profileLabel()}` +
    (state.regimeMode ? ` · <span class="tv-meta-regime">✦ regimes applied to ${SOURCE_LABEL[tv.source]}</span>` : '') +
    (weightSum() > 0 ? '' : ` · <span class="tv-warn">set at least one weight above 0</span>`);
  const wsum = weightSum();
  const mix = wsum > 0
    ? SCORE_KEYS.filter(k => tv.weights[k] > 0).map(k => `${window.TAX_TYPES[k].short} ${Math.round(100 * tv.weights[k] / wsum)}%`).join(' · ')
    : 'no weights set';
  document.getElementById('tvFoot').innerHTML =
    `<b>All-in</b> = weighted average of each country's headline rates — ${mix} — with income tax at your ` +
    `<b>effective</b> rate on ${income}. Lower is better · green ≤${OVERALL_GRADE[0]}% · yellow ≤${OVERALL_GRADE[1]}% · red above. ` +
    (state.regimeMode
      ? `<b>✦</b> New-resident mode: where a relocation regime covers ${SOURCE_LABEL[tv.source]} and beats normal income tax, its rate is used (assumes you qualify); ` +
        `lump-sum / capped regimes (e.g. Swiss forfait) and pension-only reliefs aren't modelled. `
      : '') +
    `Excludes state/local taxes, deductions, social-security ceilings & treaties — <b>not tax advice</b>.`;
}

function markSelectedRow() {
  for (const tr of tvBody.children) tr.classList.toggle('sel', tr.dataset.iso === state.selected);
}

let tvPending = false;
function scheduleTable() {
  if (state.view !== 'table' || tvPending) return;
  tvPending = true;
  const run = () => { if (!tvPending) return; tvPending = false; renderTable(); };
  requestAnimationFrame(run);
  setTimeout(run, 120);   // rAF can stall in occluded / background tabs
}

// Select a country from the table: highlight its row and open the detail card.
function selectRow(iso, scroll) {
  state.selected = iso;
  refreshGlobe();
  showDetailFor(iso);
  let tr = rowCache.get(iso);
  if (scroll && (!tr || !tr.isConnected)) {   // hidden by a filter — clear filters so it shows
    tv.query = ''; tv.region = '';
    document.getElementById('tvSearch').value = '';
    document.getElementById('tvRegion').value = '';
    renderTable(false);
    tr = rowCache.get(iso);
  }
  markSelectedRow();
  if (tr) setTabStop(tr);
  // Scroll only the table (scrollIntoView would also shift the overflow-hidden page containers).
  if (scroll && tr) {
    const delta = tr.getBoundingClientRect().top - tvScroll.getBoundingClientRect().top;
    tvScroll.scrollTo({ top: tvScroll.scrollTop + delta - (tvScroll.clientHeight - tr.offsetHeight) / 2, behavior: 'smooth' });
  }
}
function setTabStop(tr) {
  for (const row of tvBody.children) row.tabIndex = row === tr ? 0 : -1;
}
// Move keyboard focus to another row, scrolling the table just enough to keep it clear of the sticky header.
function focusRow(tr) {
  if (!tr) return;
  setTabStop(tr);
  tr.focus({ preventScroll: true });
  const head = tvScroll.querySelector('thead').offsetHeight;
  const r = tr.getBoundingClientRect(), s = tvScroll.getBoundingClientRect();
  if (r.top < s.top + head) tvScroll.scrollTop -= s.top + head - r.top;
  else if (r.bottom > s.bottom) tvScroll.scrollTop += r.bottom - s.bottom;
}

function buildWeightsPanel() {
  const wsum = weightSum();
  document.getElementById('tvWeights').innerHTML =
    `<div class="tvw-head"><span>How much each tax counts toward <b>All-in</b></span>` +
    `<button class="tv-btn tvw-reset" id="tvwReset">Reset to Balanced</button></div>` +
    SCORE_KEYS.map(k => {
      const share = wsum > 0 ? Math.round(100 * (tv.weights[k] || 0) / wsum) : 0;
      return `<label class="tvw-row"><span class="tvw-l">${window.TAX_TYPES[k].short}</span>` +
        `<input type="range" min="0" max="50" step="1" value="${tv.weights[k] || 0}" data-key="${k}" aria-label="${window.TAX_TYPES[k].short} weight" />` +
        `<span class="tvw-v">${share}%</span></label>`;
    }).join('');
}
function buildProfileOptions() {
  const sel = document.getElementById('tvProfile');
  sel.innerHTML = Object.entries(PROFILES).map(([k, p]) => `<option value="${k}">⚖ ${p.label}</option>`).join('') +
    `<option value="custom">⚖ Custom weights</option>`;
  sel.value = tv.profile;
}

function exportCSV() {
  const c = cur(state.currency);
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Rank', 'Country', 'ISO', 'Region', 'All-in rate %', `Income tax per year (${c.code})`,
    'Income tax effective %', 'Income tax marginal %', 'Social security %', 'VAT/GST %', 'Corporate %',
    'Capital gains %', 'Estate %', 'Gift %', 'New-resident regime applied'];
  const lines = [head.map(esc).join(',')].concat(tv.rows.map(r => [
    r.rank, r.name, r.iso, r.region, r.overall,
    r.bill == null ? '' : Math.round(r.bill * c.fx), r.pit_effective, r.pit_marginal,
    r.ss, r.vat, r.cit, r.cgt, r.est, r.gift, r.regimeUsed ? window.REGIMES[r.iso].name : '',
  ].map(esc).join(',')));
  // Leading BOM so Excel reads the file as UTF-8 (Côte d'Ivoire, €…).
  const blob = new Blob(['﻿' + lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `globaltax-ranking-${Math.round(state.incomeUSD * c.fx)}-${c.code}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function wireTable() {
  const region = document.getElementById('tvRegion');
  region.innerHTML = `<option value="">All regions</option>` +
    Object.keys(window.REGIONS || {}).map(r => `<option value="${r}">${r}</option>`).join('');
  region.addEventListener('change', () => { tv.region = region.value; renderTable(); });

  const search = document.getElementById('tvSearch');
  search.addEventListener('input', () => { tv.query = search.value; renderTable(); });

  buildProfileOptions();
  document.getElementById('tvProfile').addEventListener('change', e => {
    tv.profile = e.target.value;
    if (PROFILES[tv.profile]) tv.weights = { ...PROFILES[tv.profile].w };
    saveWeights();
    buildWeightsPanel();
    renderTable();
  });

  const wBtn = document.getElementById('tvWeightsBtn');
  const wPanel = document.getElementById('tvWeights');
  buildWeightsPanel();
  wBtn.addEventListener('click', () => {
    const open = wPanel.classList.toggle('hidden') === false;
    wBtn.setAttribute('aria-expanded', String(open));
    wBtn.classList.toggle('on', open);
  });
  wPanel.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.key;
    if (!k) return;
    tv.weights[k] = +e.target.value;
    tv.profile = 'custom';
    document.getElementById('tvProfile').value = 'custom';
    saveWeights();
    const wsum = weightSum();   // refresh the share labels without rebuilding the sliders being dragged
    wPanel.querySelectorAll('input[data-key]').forEach(inp => {
      inp.nextElementSibling.textContent = (wsum > 0 ? Math.round(100 * (tv.weights[inp.dataset.key] || 0) / wsum) : 0) + '%';
    });
    scheduleTable();
  });
  wPanel.addEventListener('click', e => {
    if (e.target.id !== 'tvwReset') return;
    tv.profile = 'balanced';
    tv.weights = { ...PROFILES.balanced.w };
    document.getElementById('tvProfile').value = 'balanced';
    saveWeights();
    buildWeightsPanel();
    document.getElementById('tvwReset').focus();   // the panel was rebuilt — keep keyboard focus on Reset
    renderTable();
  });

  const source = document.getElementById('tvSource');
  source.value = tv.source;
  source.addEventListener('change', () => { tv.source = source.value; renderTable(); });

  document.getElementById('tvHead').addEventListener('click', e => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.dataset.key;
    const same = tv.sort.key === key || (['rank', 'overall'].includes(key) && ['rank', 'overall'].includes(tv.sort.key));
    tv.sort = { key, dir: same ? -tv.sort.dir : 1 };
    renderTable();
  });

  tvBody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-iso]');
    if (tr) selectRow(tr.dataset.iso, false);
  });
  tvBody.addEventListener('keydown', e => {
    const tr = e.target.closest('tr[data-iso]');
    if (!tr) return;
    const rows = tvBody.children;
    const next = { ArrowDown: tr.nextElementSibling, ArrowUp: tr.previousElementSibling,
                   Home: rows[0], End: rows[rows.length - 1] }[e.key];
    if (next !== undefined) { e.preventDefault(); focusRow(next); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    selectRow(tr.dataset.iso, false);
  });

  document.getElementById('tvCsvBtn').addEventListener('click', exportCSV);
}

// Switch between the 3D globe and the ranking table.
function setView(view) {
  if (view !== 'table') view = 'globe';
  if (view === state.view) return;
  state.view = view;
  const table = view === 'table';
  document.body.classList.toggle('view-table', table);
  tableView.classList.toggle('hidden', !table);
  for (const [id, on] of [['viewGlobeBtn', !table], ['viewTableBtn', table]]) {
    const b = document.getElementById(id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  state.hovered = null;
  tooltip.classList.add('hidden');
  // On phones the table view lets <main> scroll; start each view at the top so the globe isn't left offset.
  document.querySelector('main').scrollTop = 0;
  if (globe) {
    if (table) globe.pauseAnimation();
    else { globe.resumeAnimation(); sizeGlobe(); refreshGlobe(); }
  }
  if (table) renderTable(false);
  updateTaxTypeUI();
  const url = location.pathname + location.search + (table ? '#table' : '');
  try { history.replaceState(null, '', url); } catch (e) { /* ignore */ }
}

// Fly the globe to a country (polygon or small-territory marker).
function locateOnGlobe(iso) {
  if (!globe) return false;
  const feat = countries.find(f => isoOf(f.properties) === iso);
  if (feat) { onClick(feat); return true; }
  if (window.MARKERS[iso]) { selectJurisdiction(iso, window.MARKERS[iso][0], window.MARKERS[iso][1], markerName(iso)); return true; }
  return false;
}

/* ============================ UI wiring ============================ */
function buildCurrencyOptions() {
  const sel = document.getElementById('currency');
  sel.innerHTML = window.CURRENCIES.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  sel.value = state.currency;
  sel.addEventListener('change', () => { state.currency = sel.value; updateIncomeDisplay(); scheduleTable(); });
}

function buildTaxTypeButtons() {
  const grid = document.getElementById('taxTypeGrid');
  grid.innerHTML = Object.entries(window.TAX_TYPES)
    .map(([key, t]) => `<button data-key="${key}" class="${key === state.taxType ? 'active' : ''}">${t.short}</button>`)
    .join('');
  grid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.taxType = btn.dataset.key;
      grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      updateTaxTypeUI();
      refreshGlobe();
      refreshActive();
      // In the table, picking a tax type sorts by that column (lowest first).
      if (state.view === 'table') { tv.sort = { key: state.taxType, dir: 1 }; renderTable(); }
    });
  });
}

function buildSearchList() {
  document.getElementById('countryList').innerHTML =
    Object.values(window.TAX_DATA).map(r => `<option value="${r.n}"></option>`).join('');
}
function wireSearch() {
  const input = document.getElementById('countrySearch');
  const nameToIso = {};
  for (const [iso, r] of Object.entries(window.TAX_DATA)) nameToIso[r.n.toLowerCase()] = iso;
  const go = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    let iso = nameToIso[q];
    if (!iso) {
      const hit = Object.entries(window.TAX_DATA).find(([, r]) => r.n.toLowerCase().includes(q));
      if (hit) iso = hit[0];
    }
    if (!iso) return;
    if (state.view === 'table') { selectRow(iso, true); input.blur(); return; }
    if (locateOnGlobe(iso)) input.blur();
  };
  input.addEventListener('change', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

function updateReadout() {
  const rt = document.getElementById('readoutType'), rs = document.getElementById('readoutSub');
  if (state.view === 'table') {
    rt.textContent = state.regimeMode ? 'All-tax ranking ✦ movers' : 'All-tax ranking';
    rs.textContent = `${profileLabel()} weights · click a row for details`;
  } else if (state.regimeMode) {
    rt.textContent = 'New-resident regimes';
    rs.textContent = '✦ Relocation tax breaks · hover a country';
  } else {
    const t = window.TAX_TYPES[state.taxType];
    rt.textContent = t.label;
    rs.textContent = t.incomeBased ? 'Driven by your income · hover a country' : 'Flat headline rate · hover a country';
  }
}

function updateTaxTypeUI() {
  const t = window.TAX_TYPES[state.taxType];
  updateReadout();
  document.getElementById('taxTypeDesc').textContent = t.desc;
  // legend ranges
  const [g, y] = t.grade;
  document.getElementById('lgGreen').textContent = `0–${g}%`;
  document.getElementById('lgYellow').textContent = `${g}–${y}%`;
  document.getElementById('lgRed').textContent = `${y}%+`;
  // dim income controls when not income-based (income is the 2nd .ctrl — after search);
  // the table's All-in rate always depends on income, so keep it lit there.
  document.querySelectorAll('.panel .ctrl')[1].style.opacity = t.incomeBased || state.view === 'table' ? '1' : '0.45';

  // plain-language explainer for the income tax types (marginal vs effective)
  const ex = document.getElementById('explainer');
  if (t.incomeBased) {
    ex.classList.remove('hidden');
    ex.innerHTML =
      `<span class="ex-title">💡 Marginal vs effective</span><br>` +
      `Say you earn <b>$50,000</b>. Your last dollar is taxed at <b>30%</b> — that's your ` +
      `<b>marginal</b> rate. But because lower bands are taxed less, your total tax might be ` +
      `<b>$9,000</b> — an <b>effective</b> (average) rate of <b>18%</b>. ` +
      `Marginal = tax on extra income · effective = your real overall rate.`;
  } else {
    ex.classList.add('hidden');
    ex.innerHTML = '';
  }
}

function updateIncomeDisplay() {
  const c = cur(state.currency);
  const localAmt = state.incomeUSD * c.fx;
  document.getElementById('incomeAmount').textContent = fmtMoney(localAmt, state.currency);
  document.getElementById('incomeUsd').textContent =
    state.currency === 'USD' ? '' : '≈ ' + fmtMoney(state.incomeUSD, 'USD') + ' USD';
}

function wireIncomeSlider() {
  const slider = document.getElementById('incomeSlider');
  slider.value = usdToSlider(state.incomeUSD);
  slider.addEventListener('input', () => {
    state.incomeUSD = sliderToUSD(+slider.value);
    updateIncomeDisplay();
    if (window.TAX_TYPES[state.taxType].incomeBased) {
      refreshGlobe();
      refreshActive();
    }
    scheduleTable();
  });
}

/* header buttons */
let spinOn = true;
document.getElementById('spinBtn').classList.add('on');
document.getElementById('spinBtn').addEventListener('click', e => {
  spinOn = !spinOn;
  globe.controls().autoRotate = spinOn;
  e.currentTarget.classList.toggle('on', spinOn);
});
document.getElementById('resetBtn').addEventListener('click', () => {
  state.selected = null;
  hideDetail();
  refreshGlobe();
  globe.pointOfView({ lat: 25, lng: 10, altitude: 2.3 }, 800);
});
document.getElementById('fsBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

/* about / disclaimer modal */
const aboutOverlay = document.getElementById('aboutOverlay');
const openAbout = () => aboutOverlay.classList.remove('hidden');
const closeAbout = () => aboutOverlay.classList.add('hidden');
document.getElementById('aboutBtn').addEventListener('click', openAbout);
document.getElementById('aboutClose').addEventListener('click', closeAbout);
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) closeAbout(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAbout(); });
// Show the disclaimer once on first run.
try {
  if (!localStorage.getItem('gt_disclaimer_seen')) { openAbout(); localStorage.setItem('gt_disclaimer_seen', '1'); }
} catch (e) { /* localStorage unavailable — ignore */ }

/* new-resident / relocation regime toggle */
document.getElementById('regimeToggle').addEventListener('change', e => {
  state.regimeMode = e.target.checked;
  document.body.classList.toggle('regime-on', state.regimeMode);
  updateRings();
  refreshGlobe();
  updateReadout();
  refreshActive();
  scheduleTable();
});

/* globe / table view switch */
document.getElementById('viewGlobeBtn').addEventListener('click', () => setView('globe'));
document.getElementById('viewTableBtn').addEventListener('click', () => setView('table'));
window.addEventListener('hashchange', () => setView(location.hash === '#table' ? 'table' : 'globe'));

window.addEventListener('resize', sizeGlobe);

/* ============================ Boot ============================ */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtRev = ym => { const [y, m] = (ym || '').split('-'); return MONTHS[(+m || 1) - 1] + ' ' + y; };
function buildAbout() {
  const ver = document.getElementById('aboutVer');
  if (ver && window.DATA_REVISION) ver.textContent = `Data reviewed ${fmtRev(window.DATA_REVISION)} · ${ver.textContent}`;
  const el = document.getElementById('aboutChanges');
  if (el && Array.isArray(window.CHANGES)) {
    el.innerHTML = window.CHANGES.map(c =>
      `<div class="chg"><span class="chg-when">${fmtRev(c.date)}</span>` +
      `<span class="chg-body"><b>${c.c}</b> — ${c.ch}<span class="chg-src">${c.src}</span></span></div>`
    ).join('');
  }
}

function boot() {
  buildCurrencyOptions();
  buildTaxTypeButtons();
  buildSearchList();
  wireSearch();
  wireIncomeSlider();
  updateTaxTypeUI();
  updateIncomeDisplay();
  buildAbout();
  wireTable();
  if (location.hash === '#table') setView('table');

  fetch('data/countries.geojson')
    .then(r => r.json())
    .then(geo => { initGlobe(geo); })
    .catch(err => {
      console.error('Failed to load countries geojson', err);
      elViz.innerHTML = '<div style="color:#93a0c5;text-align:center;padding-top:40vh">Could not load map data.</div>';
    });
}
document.addEventListener('DOMContentLoaded', boot);
