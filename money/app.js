/* ============================================================================
   World Money Map — a 3D globe + flat map coloured by each country's money &
   wealth. Gold = more, near-black = less, slate = no data. Plus a World Wealth
   dashboard of where all of Earth's measurable wealth sits. Engine: globe.gl.
   Data: curated 2025–2026 snapshot (IMF, World Bank, UBS, Forbes, WGC, WFE,
   SWFI, Savills, Numbeo). See "About & sources".
   ========================================================================== */
'use strict';

const DATA  = window.MONEY_DATA || {};
const META  = window.MONEY_META || { world: {}, tsStart: 1990, tsEnd: 2025, tsYears: [] };
const WORLD = window.MONEY_WORLD_WEALTH || { year: 2025, total: 0, classes: [] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const GOLD_USD_OZ = META.goldPriceOz || 2900;   // ~2026 spot, single source of truth
const TROY_OZ_T   = 32150.7;                      // troy ounces per tonne
const GOLD_USD_T  = GOLD_USD_OZ * TROY_OZ_T;      // US$ value of one tonne of gold
const ADULT_SHARE = 0.72;                         // fallback adult share of population
const adultsOf = d => d.adults || (d.pop ? d.pop * ADULT_SHARE : null);

/* ----------------------------- formatting ----------------------------- */
function fmtUSD(v) {                               // compact dollars: $25.3T, $980B, $1.2M
  if (v == null) return '—';
  const n = Math.abs(v), s = v < 0 ? '−$' : '$';
  if (n >= 1e12) return s + (n / 1e12).toFixed(n >= 1e13 ? 1 : 2) + 'T';
  if (n >= 1e9)  return s + (n / 1e9).toFixed(n >= 1e11 ? 0 : 1) + 'B';
  if (n >= 1e6)  return s + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'M';
  if (n >= 1e3)  return s + (n / 1e3).toFixed(0) + 'k';
  return s + Math.round(n);
}
function fmtUSD0(v) {                               // plain dollars w/ commas, compact if huge
  if (v == null) return '—';
  return Math.abs(v) < 1e6 ? (v < 0 ? '−$' : '$') + Math.round(Math.abs(v)).toLocaleString('en-US') : fmtUSD(v);
}
function fmtNum(v) {                                // compact counts: 24.5M, 1.2M, 340k
  if (v == null) return '—';
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return Math.round(v).toLocaleString('en-US');
}
const fmtInt    = v => v == null ? '—' : Math.round(v).toLocaleString('en-US');
const fmtPct1   = v => v == null ? '—' : v.toFixed(1) + '%';
const fmtPct2   = v => v == null ? '—' : v.toFixed(2) + '%';
const fmtIndex  = v => v == null ? '—' : Math.round(v) + '';
const fmtTonnes = v => v == null ? '—' : Math.round(v).toLocaleString('en-US') + ' t';
const fmtPerM2  = v => v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US') + '/m²';

/* ----------------------------- metrics ----------------------------- */
// each: { group, short, icon, label, unit, scale, ramp, fmt, get, src, tsKey }
const METRICS = {
  /* A · ECONOMY */
  gdp:       { group: 'econ', short: 'GDP', icon: '📈', label: 'GDP', unit: 'nominal · US$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.gdp, tsKey: 'gdp', src: 'IMF WEO 2025' },
  gdpPc:     { group: 'econ', short: 'GDP / person', icon: '👤', label: 'GDP per capita', unit: 'nominal · US$ · 2025',
               scale: 'log', fmt: fmtUSD0, get: d => (d.gdp && d.pop) ? d.gdp / d.pop : null, src: 'IMF WEO 2025' },
  gdpPpp:    { group: 'econ', short: 'GDP (PPP)', icon: '🪙', label: 'GDP at purchasing-power parity', unit: 'international$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.gdpPpp, src: 'IMF WEO 2025' },
  gdpPppPc:  { group: 'econ', short: 'PPP / person', icon: '🧮', label: 'GDP per capita (PPP)', unit: 'international$ · 2025',
               scale: 'log', fmt: fmtUSD0, get: d => (d.gdpPpp && d.pop) ? d.gdpPpp / d.pop : null, src: 'IMF WEO 2025' },
  priceLevel:{ group: 'econ', short: 'Cost / currency', icon: '💱', label: 'Price level (currency strength)', unit: 'price-level index · US = 100',
               scale: 'lin', fmt: fmtIndex, get: d => d.ppl, src: 'World Bank ICP' },

  /* B · WEALTH */
  wealth:    { group: 'wealth', short: 'Private wealth', icon: '💰', label: 'Total private (household) wealth', unit: 'US$ · 2024',
               scale: 'log', fmt: fmtUSD, get: d => d.wealth, src: 'UBS Global Wealth Report 2025' },
  wAdult:    { group: 'wealth', short: 'Wealth / adult', icon: '🧑‍💼', label: 'Mean wealth per adult', unit: 'US$ · 2024',
               scale: 'log', fmt: fmtUSD0, get: d => d.wAdult, src: 'UBS Global Wealth Report 2025' },
  wMed:      { group: 'wealth', short: 'Median wealth', icon: '⚖️', label: 'Median wealth per adult', unit: 'US$ · 2024',
               scale: 'log', fmt: fmtUSD0, get: d => d.wMed, src: 'UBS Global Wealth Report 2025' },
  mill:      { group: 'wealth', short: '# Millionaires', icon: '🤵', label: 'USD millionaires', unit: 'adults worth > $1M · 2024',
               scale: 'log', fmt: fmtNum, get: d => d.mill, src: 'UBS Global Wealth Report 2025' },
  pctMill:   { group: 'wealth', short: '% Millionaires', icon: '％', label: 'Share of adults who are millionaires', unit: '% of adults · 2024',
               scale: 'gamma', gamma: 0.5, fmt: fmtPct2, get: d => (d.mill && adultsOf(d)) ? d.mill / adultsOf(d) * 100 : null, src: 'UBS / IMF' },
  bill:      { group: 'wealth', short: '# Billionaires', icon: '🧑‍🚀', label: 'USD billionaires', unit: 'resident billionaires · 2025',
               scale: 'log', fmt: fmtInt, get: d => d.bill, src: "Forbes World's Billionaires 2025" },
  salary:    { group: 'wealth', short: 'Avg salary', icon: '💵', label: 'Average annual wage', unit: 'gross · US$ · latest',
               scale: 'log', fmt: fmtUSD0, get: d => d.salary, src: 'OECD / ILO / national' },
  govNW:     { group: 'wealth', short: 'Govt net worth', icon: '🏛️', label: 'Government net worth', unit: 'public assets − liabilities · US$',
               scale: 'signed', ramp: 'div', fmt: fmtUSD, get: d => d.govNW, src: 'IMF public-sector balance sheet' },

  /* C · ASSETS & STORES OF VALUE */
  realEstate:{ group: 'assets', short: 'Real estate', icon: '🏠', label: 'Total residential real-estate value', unit: 'US$ · est. 2024',
               scale: 'log', fmt: fmtUSD, get: d => d.realEstate, src: 'Savills / estimates' },
  priceM2:   { group: 'assets', short: 'Price / m²', icon: '📐', label: 'Average home price per m²', unit: 'US$ per m² · 2025',
               scale: 'log', fmt: fmtPerM2, get: d => d.priceM2, src: 'Numbeo / Global Property Guide' },
  gold:      { group: 'assets', short: 'Gold reserves', icon: '🥇', label: 'Official gold reserves', unit: 'tonnes · 2025',
               scale: 'log', fmt: fmtTonnes, get: d => d.gold, src: 'World Gold Council' },
  mktCap:    { group: 'assets', short: 'Stock market', icon: '🏢', label: 'Stock-market capitalisation', unit: 'listed equities · US$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.mktCap, src: 'WFE / SIFMA / World Bank' },
  bizVal:    { group: 'assets', short: 'Business value', icon: '🏭', label: 'Total business / equity value', unit: 'listed + private · US$ · est.',
               scale: 'log', fmt: fmtUSD, get: d => d.bizVal != null ? d.bizVal : (d.mktCap != null ? d.mktCap * 1.55 : null), src: 'estimate (listed × private uplift)' },
  fxRes:     { group: 'assets', short: 'FX reserves', icon: '🏦', label: 'Foreign-exchange reserves', unit: 'ex-gold · US$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.fxRes, src: 'IMF / central banks' },
  swf:       { group: 'assets', short: 'Sovereign fund', icon: '🏰', label: 'Sovereign wealth fund assets', unit: 'US$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.swf, src: 'SWF Institute / Global SWF' },
  crypto:    { group: 'assets', short: 'Crypto', icon: '🪙', label: 'Crypto held by residents', unit: 'est. US$ value · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.crypto, src: 'estimate (Chainalysis-based)' },
  deposits:  { group: 'assets', short: 'Bank deposits', icon: '🐖', label: 'Bank deposits', unit: 'US$ · latest',
               scale: 'log', fmt: fmtUSD, get: d => d.deposits, src: 'central banks / estimates' },
  m2:        { group: 'assets', short: 'Money (M2)', icon: '💸', label: 'Broad money supply (M2)', unit: 'US$ · 2025',
               scale: 'log', fmt: fmtUSD, get: d => d.m2, src: 'central banks / Trading Economics' },
  totWealth: { group: 'assets', short: 'Total wealth', icon: '🌐', label: 'Total national wealth', unit: 'produced + natural + human + foreign · US$',
               scale: 'log', fmt: fmtUSD, get: d => d.totWealth, src: 'World Bank — Changing Wealth of Nations' },

  /* D · DEBT & NET POSITION */
  govDebt:   { group: 'debt', short: 'Govt debt', icon: '📉', label: 'Government gross debt', unit: 'US$ · 2025',
               scale: 'log', ramp: 'debt', fmt: fmtUSD, get: d => debtUSD(d), src: 'IMF WEO 2025' },
  govDebtPct:{ group: 'debt', short: 'Debt % GDP', icon: '🧾', label: 'Government debt, % of GDP', unit: '% of GDP · 2025',
               scale: 'lin', ramp: 'debt', fmt: fmtPct1, get: d => d.govDebtPct, src: 'IMF WEO 2025' },
  govDebtPc: { group: 'debt', short: 'Debt / person', icon: '🪪', label: 'Government debt per capita', unit: 'US$ · 2025',
               scale: 'log', ramp: 'debt', fmt: fmtUSD0, get: d => (debtUSD(d) && d.pop) ? debtUSD(d) / d.pop : null, src: 'IMF WEO 2025' },
  extDebt:   { group: 'debt', short: 'External debt', icon: '🌍', label: 'Gross external debt', unit: 'US$ · latest',
               scale: 'log', ramp: 'debt', fmt: fmtUSD, get: d => d.extDebt, src: 'World Bank / Joint EDS' },
  niip:      { group: 'debt', short: 'Net foreign assets', icon: '↔️', label: 'Net international investment position', unit: 'net foreign assets · US$',
               scale: 'signed', ramp: 'div', fmt: fmtUSD, get: d => d.niip, src: 'IMF / national accounts' },
};
function debtUSD(d) { return d.govDebt != null ? d.govDebt : (d.govDebtPct != null && d.gdp != null ? d.gdp * d.govDebtPct / 100 : null); }

const CATS = {
  econ:   { name: 'Economy', icon: '📊', metrics: ['gdp', 'gdpPc', 'gdpPpp', 'gdpPppPc', 'priceLevel'] },
  wealth: { name: 'Wealth',  icon: '💎', metrics: ['wealth', 'wAdult', 'wMed', 'mill', 'pctMill', 'bill', 'salary', 'govNW'] },
  assets: { name: 'Assets',  icon: '🏛️', metrics: ['realEstate', 'priceM2', 'gold', 'mktCap', 'bizVal', 'fxRes', 'swf', 'crypto', 'deposits', 'm2', 'totWealth'] },
  debt:   { name: 'Debt',    icon: '⚖️', metrics: ['govDebt', 'govDebtPct', 'govDebtPc', 'extDebt', 'niip'] },
};
const CAT_ORDER = ['econ', 'wealth', 'assets', 'debt'];
const ALL_METRICS = Object.keys(METRICS);
const hasTS = k => !!METRICS[k].tsKey;

const state = { cat: 'econ', metric: 'gdp', history: false, year: 2025, flat: false,
                hovered: null, selected: null, playing: false };
const tsMax = {};   // per tsKey global max across all years

/* compute colour-scale domains once */
function buildScales() {
  for (const k of ALL_METRICS) {
    const m = METRICS[k];
    const vals = Object.values(DATA).map(m.get).filter(v => v != null);
    if (!vals.length) { m._max = 1; m._min = 0; m._cap = 1; continue; }
    m._max = Math.max(...vals);
    m._min = Math.min(...vals);
    if (m.scale === 'signed') {
      const abs = vals.map(Math.abs).sort((a, b) => a - b);
      m._cap = abs[Math.floor(abs.length * 0.92)] || 1;   // cap at 92nd pct so a few giants don't flatten the scale
    }
  }
  for (const d of Object.values(DATA)) if (d.ts)
    for (const key in d.ts) for (const y in d.ts[key]) tsMax[key] = Math.max(tsMax[key] || 1, d.ts[key][y]);
}

/* ----------------------------- colour ----------------------------- */
const RAMP_MONEY = [[18,20,28],[44,38,17],[80,62,16],[140,106,20],[214,168,42],[255,214,82]];
const RAMP_DEBT  = [[18,20,28],[54,28,26],[104,40,32],[166,58,42],[226,92,58],[255,150,92]];
const RAMP_DIV   = [[226,92,58],[150,74,58],[60,62,72],[74,150,104],[74,210,138]];   // neg→neutral→pos
function rampColor(stops, t) {
  t = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.floor(t), f = t - i, a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
  return [Math.round(a[0] + (b[0]-a[0]) * f), Math.round(a[1] + (b[1]-a[1]) * f), Math.round(a[2] + (b[2]-a[2]) * f)];
}
const rampOf = r => r === 'debt' ? RAMP_DEBT : RAMP_MONEY;
const logT = (v, max) => v <= 0 ? 0 : clamp(Math.log10(v + 1) / Math.log10(max + 1), 0, 1);

function normT(v, m) {                              // 0..1 used for altitude / magnitude
  if (v == null) return 0;
  if (state.history) return logT(v, tsMax[m.tsKey] || 1);
  if (m.scale === 'signed') return clamp(Math.abs(v) / (m._cap || 1), 0, 1);
  if (m.scale === 'gamma')  return Math.pow(clamp(v / m._max, 0, 1), m.gamma || 0.5);
  if (m.scale === 'lin')    { const lo = m._min || 0; return clamp((v - lo) / ((m._max - lo) || 1), 0, 1); }
  return logT(v, m._max);
}
function valColor(v, m) {
  if (v == null) return null;
  if (!state.history && m.scale === 'signed') {
    const cap = m._cap || 1;
    return rampColor(RAMP_DIV, clamp(v / (2 * cap) + 0.5, 0, 1));
  }
  return rampColor(state.history ? RAMP_MONEY : rampOf(m.ramp), normT(v, m));
}
const ndColor = a => `rgba(64,74,90,${a})`;

const curMetric = () => METRICS[state.metric];
function curVal(d) {
  if (!d) return null;
  if (state.history) { const m = curMetric(); return (d.ts && d.ts[m.tsKey] && d.ts[m.tsKey][state.year] != null) ? d.ts[m.tsKey][state.year] : null; }
  return curMetric().get(d);
}

/* ----------------------------- globe ----------------------------- */
let globe, countries = [];
const elViz = document.getElementById('globeViz');

function capColor(feat) {
  const iso = feat.properties.OISO, d = iso && DATA[iso];
  const v = curVal(d), m = curMetric();
  const sel = state.selected === iso, hov = state.hovered === iso;
  const rgb = v == null ? null : valColor(v, m);
  if (!rgb) return ndColor(sel ? 0.6 : hov ? 0.5 : 0.9);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${sel ? 1 : hov ? 0.97 : 0.9})`;
}
function altOf(feat) {
  const iso = feat.properties.OISO, d = iso && DATA[iso], v = curVal(d);
  let a = 0.008 + (v != null ? normT(v, curMetric()) * 0.07 : 0);
  if (state.selected === iso) a += 0.04; else if (state.hovered === iso) a += 0.02;
  return a;
}
function refreshGlobe() { if (globe) globe.polygonCapColor(capColor).polygonAltitude(altOf); }

function initGlobe(geo) {
  countries = geo.features;
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#ffd98a').atmosphereAltitude(0.16)
    .polygonsData(countries)
    .polygonCapColor(capColor)
    .polygonSideColor(() => 'rgba(30,22,8,0.8)')
    .polygonStrokeColor(() => 'rgba(8,8,14,0.85)')
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(280)
    .onPolygonHover(onHover)
    .onPolygonClick(f => f && selectCountry(f.properties.OISO, true));
  const mat = globe.globeMaterial();
  mat.color.set('#0c1426'); mat.emissive.set('#0a0f1d'); mat.emissiveIntensity = 0.9; mat.shininess = 7;
  const c = globe.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.45; c.enableDamping = true; c.dampingFactor = 0.12;
  c.minDistance = 110; c.maxDistance = 600;
  globe.pointOfView({ lat: 30, lng: 14, altitude: 2.3 }, 0);
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
  const arr = Object.keys(DATA).map(k => [k, curVal(DATA[k])]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
  const i = arr.findIndex(x => x[0] === iso);
  return i < 0 ? null : { rank: i + 1, total: arr.length };
}
function tooltipHTML(iso, feat) {
  const d = DATA[iso], v = curVal(d), m = curMetric();
  const head = `<div class="tt-head"><span class="tt-flag">${flagEmoji(iso)}</span>${nameOf(iso, feat)}</div>`;
  if (v == null) return head + `<div class="tt-nd">No data for this metric</div>`;
  const rk = rankOf(iso);
  const sub = state.history ? m.label + ' · ' + state.year : m.label;
  return head + `<div class="tt-big">${m.fmt(v)}</div><div class="tt-sub">${sub}</div>`
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
  const m = curMetric();
  document.querySelectorAll('#flatViz .flat-hit').forEach(el => {
    const iso = el.dataset.iso, d = iso && DATA[iso], v = curVal(d), rgb = v == null ? null : valColor(v, m);
    el.style.fill = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : (iso ? ndColor(0.92) : 'transparent');
    el.classList.toggle('sel', iso === state.selected);
  });
}
function flatHover(iso, el, e) {
  if (flatDragging) return;
  state.hovered = iso;
  const feat = countries.find(c => c.properties.OISO === iso);
  tooltip.innerHTML = tooltipHTML(iso, feat);
  tooltip.classList.remove('hidden');
  tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px';
}
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
function rankedList(limit) {
  return Object.keys(DATA).map(k => ({ iso: k, v: curVal(DATA[k]) })).filter(x => x.v != null)
    .sort((a, b) => b.v - a.v).slice(0, limit);
}
function updateLegend() {
  const m = curMetric();
  document.getElementById('lgTitle').textContent = m.label + (state.history ? ' · ' + state.year : '');
  document.getElementById('lgUnit').textContent = m.unit;
  // ramp gradient reflects the active ramp / scale
  const stops = state.history ? RAMP_MONEY : (m.scale === 'signed' ? RAMP_DIV : rampOf(m.ramp));
  document.getElementById('lgRamp').style.background = 'linear-gradient(90deg,' + stops.map(c => `rgb(${c[0]},${c[1]},${c[2]})`).join(',') + ')';
  document.getElementById('lgMin').textContent = m.scale === 'signed' ? '−' + m.fmt(m._cap).replace('−', '') : (m.scale === 'lin' ? m.fmt(m._min) : '0');
  document.getElementById('lgMax').textContent = m.fmt(m.scale === 'signed' ? m._cap : m._max);
  document.getElementById('lgNd').textContent = m.scale === 'signed' ? 'no data (grey = near zero)' : 'no data';
  // ranking
  const arr = rankedList(14);
  document.getElementById('lgRank').innerHTML = arr.map((x, i) => {
    const rgb = valColor(x.v, m) || [80, 80, 80];
    return `<li data-iso="${x.iso}"><span class="rk">${i + 1}</span><span class="sw" style="background:rgb(${rgb[0]},${rgb[1]},${rgb[2]})"></span>`
      + `<span class="nm">${nameOf(x.iso)}</span><span class="vl">${m.fmt(x.v)}</span></li>`;
  }).join('');
}
document.getElementById('lgRank').addEventListener('click', e => {
  const li = e.target.closest('li'); if (li) selectCountry(li.dataset.iso, true);
});
document.getElementById('lgToggle').addEventListener('click', () => document.getElementById('lgRank').classList.toggle('hidden'));

/* ----------------------------- category + metric bars ----------------------------- */
function buildCatBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = CAT_ORDER.map(c =>
    `<button class="cat${c === state.cat ? ' on' : ''}" data-c="${c}"><span class="ci">${CATS[c].icon}</span>${CATS[c].name}</button>`).join('');
  bar.querySelectorAll('.cat').forEach(b => b.addEventListener('click', () => selectCategory(b.dataset.c)));
}
function buildMetricBar() {
  const bar = document.getElementById('metricBar');
  bar.innerHTML = CATS[state.cat].metrics.map(k => {
    const dim = state.history && !hasTS(k);
    return `<button class="pill${k === state.metric ? ' on' : ''}${dim ? ' dim' : ''}" data-k="${k}"><span class="pi">${METRICS[k].icon}</span>${METRICS[k].short}</button>`;
  }).join('');
  bar.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => setMetric(p.dataset.k)));
}
function selectCategory(c) { setMetric(CATS[c].metrics[0]); }
function setMetric(k) {
  if (state.history && !hasTS(k)) setHistory(false);   // a non-time-series metric exits history
  state.metric = k; state.cat = METRICS[k].group;
  buildCatBar(); buildMetricBar();
  applyAll();
  if (state.selected) showDetail(state.selected);
}

/* ----------------------------- apply / refresh ----------------------------- */
function applyAll() { refreshGlobe(); paintFlat(); updateLegend(); }

/* ----------------------------- selection + detail ----------------------------- */
function selectCountry(iso, fly) {
  if (!iso || !DATA[iso]) return;
  state.selected = iso; applyAll(); showDetail(iso);
  const feat = countries.find(c => c.properties.OISO === iso);
  if (state.flat) {
    const bb = feat && featBBox(feat);
    if (bb) { const cx = fpx(featCenterLng(feat)), cy = (fpy(bb[3]) + fpy(bb[1])) / 2;
      const spanLng = (bb[2] - bb[0] > 180) ? 60 : (bb[2] - bb[0]);
      flatView.w = clamp(spanLng / 360 * FW * 3 + 60, FW / 16, FW); flatView.h = flatView.w * (FH / FW);
      flatView.x = cx - flatView.w / 2; flatView.y = cy - flatView.h / 2; clampFlatView(); applyFlatView(); }
  } else if (fly && globe && feat) {
    const bb = featBBox(feat); globe.controls().autoRotate = false; spinOn = false; syncSpin();
    globe.pointOfView({ lat: (bb[1] + bb[3]) / 2, lng: featCenterLng(feat), altitude: 1.6 }, 800);
  }
}
const detailCard = document.getElementById('detailCard');
function trendSVG(series) {
  const ys = Object.keys(series).map(Number).sort((a, b) => a - b);
  if (ys.length < 2) return '';
  const W = 286, H = 74, pad = 8;
  const y0 = ys[0], yN = ys[ys.length - 1], span = (yN - y0) || 1;
  const vmax = Math.max(...ys.map(y => series[y])) || 1;
  const xAt = y => pad + (y - y0) / span * (W - 2 * pad);
  const yAt = v => H - pad - (v / vmax) * (H - 2 * pad);
  const pts = ys.map(y => `${xAt(y).toFixed(1)},${yAt(series[y]).toFixed(1)}`);
  const area = `M${xAt(y0)},${H - pad} L` + pts.join(' L') + ` L${xAt(yN)},${H - pad} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`
    + `<path d="${area}" fill="rgba(214,168,42,.16)"/>`
    + `<polyline points="${pts.join(' ')}" fill="none" stroke="#ffd34d" stroke-width="2"/>`
    + `<text x="${pad}" y="${H - 1}" font-size="8" fill="#8a826c">${y0}</text>`
    + `<text x="${W - pad}" y="${H - 1}" font-size="8" fill="#8a826c" text-anchor="end">${yN}</text></svg>`;
}
function showDetail(iso) {
  const d = DATA[iso]; if (!d) return;
  document.getElementById('dFlag').textContent = flagEmoji(iso);
  document.getElementById('dName').textContent = d.n;
  const m = curMetric(), hv = curVal(d), rk = rankOf(iso);
  document.getElementById('dHero').innerHTML =
    `<div class="h-v">${hv == null ? '—' : m.fmt(hv)}</div><div class="h-l">${m.label}${state.history ? ' · ' + state.year : ''}</div>`
    + (rk ? `<div class="h-rk">#${rk.rank} of ${rk.total} countries</div>` : '');
  // full profile grouped by category
  let body = '';
  for (const c of CAT_ORDER) {
    const cells = CATS[c].metrics.map(k => {
      const v = METRICS[k].get(d);
      if (v == null) return '';
      const neg = (METRICS[k].scale === 'signed' && v < 0) ? ' neg' : '';
      return `<div class="d-cell"><div class="c-v${neg}">${METRICS[k].fmt(v)}</div><div class="c-l">${METRICS[k].short}</div></div>`;
    }).filter(Boolean).join('');
    if (cells) body += `<div class="d-sect-t">${CATS[c].icon} ${CATS[c].name}</div><div class="d-grid">${cells}</div>`;
  }
  document.getElementById('dBody').innerHTML = body;
  // GDP trend
  const tw = document.getElementById('dTrendWrap'), tr = document.getElementById('dTrend');
  const svg = (d.ts && d.ts.gdp) ? trendSVG(d.ts.gdp) : '';
  tr.innerHTML = svg; tw.style.display = svg ? '' : 'none';
  // note: currency + gold value + confidence
  const bits = [];
  if (d.fx && d.ccy && d.ccy !== 'USD') bits.push(`1 USD ≈ ${d.fx >= 100 ? Math.round(d.fx).toLocaleString('en-US') : d.fx} ${d.ccy}.`);
  if (d.gold) bits.push(`Gold reserves ≈ ${fmtUSD(d.gold * GOLD_USD_T)} at today's price.`);
  if (d.tier === 2) bits.push('Several figures for this country are best-effort estimates.');
  document.getElementById('dNote').textContent = bits.join(' ');
  detailCard.classList.remove('hidden');
}
document.getElementById('detailClose').addEventListener('click', () => {
  detailCard.classList.add('hidden'); state.selected = null; applyAll();
});

/* ----------------------------- World Wealth dashboard ----------------------------- */
const WW_COLORS = {                                  // distinct on-theme tile colours
  realestate: '#e8b53a', equities: '#d99a2b', bonds: '#c98a55', money: '#bf9d4e',
  gold: '#ffd34d', crypto: '#a8772e', pensions: '#caa84e', deposits: '#d4af55',
  other: '#9c8a5e', commodities: '#b89043',
};
// area-accurate binary-split treemap → rects in [0..100] coords (matches data order)
function treemap(items, x, y, w, h, out) {
  if (!items.length) return;
  if (items.length === 1) { out.push({ d: items[0].d, x, y, w, h }); return; }
  const total = items.reduce((s, i) => s + i.v, 0);
  let acc = 0, idx = 0;
  for (let i = 0; i < items.length; i++) { acc += items[i].v; if (acc >= total / 2) { idx = i + 1; break; } }
  idx = Math.max(1, Math.min(items.length - 1, idx));
  const a = items.slice(0, idx), b = items.slice(idx);
  const frac = a.reduce((s, i) => s + i.v, 0) / total;
  if (w >= h) { const aw = w * frac; treemap(a, x, y, aw, h, out); treemap(b, x + aw, y, w - aw, h, out); }
  else { const ah = h * frac; treemap(a, x, y, w, ah, out); treemap(b, x, y + ah, w, h - ah, out); }
}
function holdersFor(metricKey, n) {
  const m = METRICS[metricKey]; if (!m) return [];
  return Object.keys(DATA).map(iso => ({ iso, v: m.get(DATA[iso]) })).filter(x => x.v != null)
    .sort((a, b) => b.v - a.v).slice(0, n).map(x => ({ ...x, fmt: m.fmt(x.v) }));
}
const wwOverlay = document.getElementById('worldWealth');
function renderWorldWealth() {
  const classes = (WORLD.classes || []).slice().sort((a, b) => b.value - a.value);
  const total = WORLD.total || classes.reduce((s, c) => s + c.value, 0);
  document.getElementById('wwHead').innerHTML =
    `<div><span class="ww-total">${fmtUSD(total)}</span></div>`
    + `<div class="ww-tl">${WORLD.totalLabel || 'total measurable global wealth'}<br><span class="ww-yr">${WORLD.year || 2025}</span></div>`;
  // treemap
  const items = classes.map(c => ({ d: c, v: c.value }));
  const rects = []; treemap(items, 0, 0, 100, 100, rects);
  document.getElementById('wwTree').innerHTML = rects.map(r => {
    const c = r.d, area = r.w * r.h, sm = area < 7 ? ' sm' : '';
    const col = WW_COLORS[c.key] || '#caa84e';
    return `<div class="ww-tile${sm}" data-metric="${c.metric || ''}" title="${c.label}"
      style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;background:${col}">
      <div class="tl-n">${c.icon || ''} ${c.label}</div>
      <div class="tl-v">${fmtUSD(c.value)}</div>
      <div class="tl-p">${(c.value / total * 100).toFixed(1)}%</div></div>`;
  }).join('');
  // cards: who holds what
  document.getElementById('wwCards').innerHTML = classes.map(c => {
    const holders = c.metric ? holdersFor(c.metric, 5) : [];
    const hh = holders.map(h => `<div class="ww-hold" data-iso="${h.iso}" data-metric="${c.metric}"><span class="h-fl">${flagEmoji(h.iso)}</span><span class="h-n">${nameOf(h.iso)}</span><span class="h-v">${h.fmt}</span></div>`).join('');
    return `<div class="ww-c">
      <div class="ww-c-h"><span class="ww-c-ic">${c.icon || ''}</span><span class="ww-c-n">${c.label}</span></div>
      <div class="ww-c-v">${fmtUSD(c.value)}</div>
      <div class="ww-c-p">${(c.value / total * 100).toFixed(1)}% of world wealth${c.note ? ' · ' + c.note : ''}</div>
      ${hh ? `<div class="ww-c-sub">Largest holders</div>${hh}` : ''}</div>`;
  }).join('');
  document.getElementById('wwNote').textContent = WORLD.src || '';
}
function openWorldWealth() { renderWorldWealth(); wwOverlay.classList.remove('hidden'); }
wwOverlay.addEventListener('click', e => {
  if (e.target === wwOverlay) { wwOverlay.classList.add('hidden'); return; }
  const tile = e.target.closest('.ww-tile'), hold = e.target.closest('.ww-hold');
  if (hold) { wwOverlay.classList.add('hidden'); setMetric(hold.dataset.metric); selectCountry(hold.dataset.iso, true); }
  else if (tile && tile.dataset.metric) { wwOverlay.classList.add('hidden'); setMetric(tile.dataset.metric); }
});
document.getElementById('wwClose').addEventListener('click', () => wwOverlay.classList.add('hidden'));
document.getElementById('wcDash').addEventListener('click', openWorldWealth);
document.getElementById('miDash').addEventListener('click', () => { closeMenu(); openWorldWealth(); });

/* ----------------------------- history mode + time ----------------------------- */
const timeBar = document.getElementById('timeBar'), slider = document.getElementById('timeSlider'),
      yearLabel = document.getElementById('yearLabel'), playBtn = document.getElementById('playBtn');
const TS_YEARS = (META.tsYears && META.tsYears.length) ? META.tsYears.slice() : [1990, 2000, 2010, 2020, 2025];
const TS_START = TS_YEARS[0], TS_END = TS_YEARS[TS_YEARS.length - 1];
let playTimer = null, yIdx = TS_YEARS.length - 1;
slider.min = 0; slider.max = TS_YEARS.length - 1; slider.step = 1; slider.value = yIdx;
const nearestYearIdx = y => { let bi = 0, bd = Infinity; TS_YEARS.forEach((yy, i) => { const dd = Math.abs(yy - y); if (dd < bd) { bd = dd; bi = i; } }); return bi; };
function updateHistoryMenu() {
  const mi = document.getElementById('miHistory');
  mi.classList.toggle('on', state.history);
  mi.querySelector('.mi-state').textContent = state.history ? 'On' : 'Off';
}
function setHistory(on) {
  if (on && !hasTS(state.metric)) { state.metric = 'gdp'; state.cat = 'econ'; }
  state.history = on;
  updateHistoryMenu();
  timeBar.classList.toggle('hidden', !on);
  document.querySelectorAll('#worldChip .wc-row').forEach(el => el.classList.toggle('hidden', on));
  document.getElementById('tSrc').textContent = curMetric().label + ' · World Bank / IMF';
  if (!on) stopPlay();
  buildCatBar(); buildMetricBar();
  applyAll();
  if (state.selected) showDetail(state.selected);
}
function setYearIdx(i) {
  yIdx = clamp(i, 0, TS_YEARS.length - 1); state.year = TS_YEARS[yIdx];
  slider.value = yIdx; yearLabel.textContent = state.year;
  applyAll(); if (state.selected) showDetail(state.selected);
}
slider.addEventListener('input', () => { stopPlay(); setYearIdx(+slider.value); });
function stopPlay() { state.playing = false; if (playTimer) { clearInterval(playTimer); playTimer = null; } playBtn.textContent = '▶'; playBtn.classList.remove('on'); if (globe) globe.controls().autoRotate = spinOn; }
function startPlay() {
  state.playing = true; playBtn.textContent = '⏸'; playBtn.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  if (yIdx >= TS_YEARS.length - 1) setYearIdx(0);
  playTimer = setInterval(() => { if (yIdx >= TS_YEARS.length - 1) { stopPlay(); return; } setYearIdx(yIdx + 1); }, 820);
}
playBtn.addEventListener('click', () => state.playing ? stopPlay() : startPlay());
document.getElementById('miHistory').addEventListener('click', () => { setHistory(!state.history); closeMenu(); });

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
  if (state.flat) resetFlatView(); else if (globe) globe.pointOfView({ lat: 24, lng: 12, altitude: 2.3 }, 700);
});
document.getElementById('miFull').addEventListener('click', () => { closeMenu(); if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); });
document.getElementById('miHelp').addEventListener('click', () => { closeMenu(); document.getElementById('tutorial').classList.remove('hidden'); });

/* ----------------------------- about ----------------------------- */
const aboutOv = document.getElementById('aboutOverlay');
document.getElementById('aboutSrc').textContent = META.src || '';
document.getElementById('miAbout').addEventListener('click', () => { closeMenu(); aboutOv.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOv.classList.add('hidden'));
aboutOv.addEventListener('click', e => { if (e.target === aboutOv) aboutOv.classList.add('hidden'); });

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
  const seg = [state.history ? 'h' + state.year : '', state.metric].filter(Boolean);
  if (state.selected) seg.push(state.selected);
  if (state.flat) seg.push('flat');
  const url = location.origin + location.pathname + '#' + seg.join(',');
  const done = () => showToast('🔗 Link copied');
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done); else done();
});

/* ----------------------------- keyboard ----------------------------- */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { closeMenu(); [aboutOv, wwOverlay, document.getElementById('tutorial')].forEach(o => o.classList.add('hidden')); if (!detailCard.classList.contains('hidden')) { detailCard.classList.add('hidden'); state.selected = null; applyAll(); } }
  else if (state.history && e.key === 'ArrowRight') { stopPlay(); setYearIdx(yIdx + 1); }
  else if (state.history && e.key === 'ArrowLeft') { stopPlay(); setYearIdx(yIdx - 1); }
});
addEventListener('resize', sizeGlobe);

/* ----------------------------- tutorial ----------------------------- */
document.getElementById('tutStart').addEventListener('click', () => { document.getElementById('tutorial').classList.add('hidden'); try { localStorage.setItem('wmm_seen', '1'); } catch (e) {} });
document.getElementById('tutorial').addEventListener('click', e => { if (e.target.id === 'tutorial') document.getElementById('tutorial').classList.add('hidden'); });

/* ----------------------------- boot ----------------------------- */
function boot() {
  buildScales(); buildCatBar(); buildMetricBar(); syncSpin();
  const w = META.world || {};
  document.getElementById('wcA').textContent = w.wealth != null ? fmtUSD(w.wealth) : '$—';
  document.getElementById('wcB').textContent = w.millionaires != null ? fmtNum(w.millionaires) : '—';
  document.getElementById('wcC').textContent = w.billionaires != null ? fmtInt(w.billionaires) : '—';
  document.getElementById('wcCt').textContent = w.countries != null ? w.countries : Object.keys(DATA).length;
  updateLegend();
  // deep link: #[hYYYY,]metric[,ISO][,flat]
  const parts = decodeURIComponent((location.hash || '').slice(1)).split(',').map(s => s.trim()).filter(Boolean);
  let pendingIso = null, wantHist = null;
  for (const p of parts) {
    if (p === 'flat') continue;
    else if (/^h\d{4}$/.test(p)) wantHist = clamp(+p.slice(1), TS_START, TS_END);
    else if (METRICS[p]) { state.metric = p; state.cat = METRICS[p].group; }
    else if (DATA[p]) pendingIso = p;
  }
  buildCatBar(); buildMetricBar();
  fetch('data/countries.geojson').then(r => r.json()).then(geo => {
    initGlobe(geo);
    document.getElementById('loading').classList.add('hidden');
    if (parts.includes('flat')) setFlat(true);
    if (wantHist != null && hasTS(state.metric)) { setHistory(true); setYearIdx(nearestYearIdx(wantHist)); }
    else applyAll();
    if (pendingIso) selectCountry(pendingIso, true);
    try { if (!localStorage.getItem('wmm_seen')) document.getElementById('tutorial').classList.remove('hidden'); } catch (e) {}
  }).catch(err => { console.error(err); document.getElementById('loading').textContent = 'Could not load map data.'; });
  // expose for verification
  window.__money = { state, DATA, META, WORLD, METRICS, CATS, curVal, curMetric, valColor, rankedList, openWorldWealth, setMetric, setHistory };
}
document.addEventListener('DOMContentLoaded', boot);
