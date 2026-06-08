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
        `<div class="ttr-rate"><b style="color:${COLORS[rg]}">${reg.rate === 0 ? '~0%' : '~' + reg.rate + '%'}</b> ` +
        `effective · ${reg.years ? reg.years + ' yrs' : 'ongoing'}</div>` +
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
      `<div class="dr-meta"><span class="dr-rate" style="color:${COLORS[rg]}">${reg.rate === 0 ? '~0%' : '~' + reg.rate + '%'} effective</span>` +
      ` · ${reg.years ? reg.years + ' years' : 'ongoing'}</div>` +
      `<div class="dr-who">${reg.who}</div>` +
      `<div class="dr-note">${reg.note}</div>`;
  } else {
    regEl.classList.add('hidden');
    regEl.innerHTML = '';
  }
  detailCard.classList.remove('hidden');
}
document.getElementById('detailClose').addEventListener('click', () => {
  detailCard.classList.add('hidden');
  state.selected = null;
  refreshGlobe();
});

/* ============================ UI wiring ============================ */
function buildCurrencyOptions() {
  const sel = document.getElementById('currency');
  sel.innerHTML = window.CURRENCIES.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  sel.value = state.currency;
  sel.addEventListener('change', () => { state.currency = sel.value; updateIncomeDisplay(); });
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
    const feat = countries.find(f => isoOf(f.properties) === iso);
    if (feat) { onClick(feat); input.blur(); }
    else if (window.MARKERS[iso]) { selectJurisdiction(iso, window.MARKERS[iso][0], window.MARKERS[iso][1], markerName(iso)); input.blur(); }
  };
  input.addEventListener('change', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

function updateReadout() {
  const rt = document.getElementById('readoutType'), rs = document.getElementById('readoutSub');
  if (state.regimeMode) {
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
  // dim income controls when not income-based (income is the 2nd .ctrl — after search)
  document.querySelectorAll('.panel .ctrl')[1].style.opacity = t.incomeBased ? '1' : '0.45';

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
  detailCard.classList.add('hidden');
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
});

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

  fetch('data/countries.geojson')
    .then(r => r.json())
    .then(geo => { initGlobe(geo); })
    .catch(err => {
      console.error('Failed to load countries geojson', err);
      elViz.innerHTML = '<div style="color:#93a0c5;text-align:center;padding-top:40vh">Could not load map data.</div>';
    });
}
document.addEventListener('DOMContentLoaded', boot);
