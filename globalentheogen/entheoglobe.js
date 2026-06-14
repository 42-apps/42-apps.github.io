/* ============================================================================
   GlobalEntheogen — interactive 3D globe of psychedelic / entheogen LAW
   ----------------------------------------------------------------------------
   Pick a substance; every country is painted by its legal status on a 6-level
   scale (legal → medical → decriminalized → tolerated → illegal → severe).
   A Medical-access lens highlights where the substance is legally obtainable
   for patients & researchers. Not legal advice — see data/law-data.js.
   ========================================================================== */
'use strict';

/* ----------------------------- State ----------------------------- */
const state = {
  substance: 'overview',   // current substance key (or 'overview' aggregate)
  hovered: null,           // ISO of hovered country
  selected: null,          // ISO of clicked country
  medMode: false,          // Medical-access lens
  orgsMode: false,         // research-organization pins
};

const S = window.STATUSES;
const NODATA_COLOR = '#39425f';
const ACCENT = '#a78bfa';

/* Substance keys excluding the aggregate "overview". */
const SUB_KEYS = Object.keys(window.SUBSTANCES).filter(k => !window.SUBSTANCES[k].aggregate);

/* --------------------------- Status helpers --------------------------- */
// Resolve a geojson feature to an ISO_A2 key we can look up in LAW_DATA.
function isoOf(props) {
  let a2 = props.ISO_A2;
  if (a2 && a2 !== '-99') return a2;
  const name = props.ADMIN || props.NAME;
  return window.NAME_TO_ISO[name] || null;
}

// Average openness score (0–5) across all real substances. null if no data.
function overviewScore(rec) {
  let sum = 0, n = 0;
  for (const k of SUB_KEYS) {
    const st = rawStatus(rec, k);
    if (st && S[st]) { sum += S[st].score; n++; }
  }
  return n ? sum / n : null;
}
function overviewStatus(rec) {
  const avg = overviewScore(rec);
  if (avg == null) return null;
  for (const [thr, st] of window.OVERVIEW_GRADE) { if (avg >= thr) return st; }
  return 'cap';
}
// Per-substance status, ignoring the aggregate logic.
function rawStatus(rec, subKey) {
  if (!rec) return null;
  return (rec.st && rec.st[subKey]) || rec.def || null;
}
// The status key to display for a country under the current (or given) substance.
function statusFor(rec, subKey = state.substance) {
  if (!rec) return null;
  if (subKey === 'overview') return overviewStatus(rec);
  return rawStatus(rec, subKey);
}
// Note text for a substance (falls back to the general country note).
function noteFor(rec, subKey = state.substance) {
  if (!rec || !rec.nt) return null;
  if (subKey === 'overview') return rec.nt._ || null;
  return rec.nt[subKey] || null;
}
// Is the substance legally obtainable for medical / clinical use here?
const isMedAccess = st => st === 'legal' || st === 'med';
const colorOf = st => (st && S[st]) ? S[st].color : NODATA_COLOR;

/* ============================ Globe ============================ */
let globe, countries = [], markerData = [];
const elViz = document.getElementById('globeViz');

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function capColor(feat) {
  const iso = isoOf(feat.properties);
  const rec = iso && window.LAW_DATA[iso];
  const sel = state.selected && iso === state.selected;
  const hov = state.hovered && iso === state.hovered;
  const st = statusFor(rec);

  // Medical-access lens: spotlight countries with legal medical access, dim the rest.
  if (state.medMode) {
    if (isMedAccess(st)) return hexA(colorOf(st), sel ? 0.98 : hov ? 0.95 : 0.9);
    return hexA(NODATA_COLOR, sel || hov ? 0.4 : 0.12);
  }

  if (!st) return hexA(NODATA_COLOR, sel || hov ? 0.4 : 0.32);
  // 'cap' (near-black) gets high opacity so the dark danger-zones still read.
  const base = st === 'cap' ? 0.96 : 0.74;
  return hexA(colorOf(st), sel ? 0.99 : hov ? 0.93 : base);
}
function strokeColor(feat) {
  const iso = isoOf(feat.properties);
  const st = statusFor(iso && window.LAW_DATA[iso]);
  // Outline death-penalty / severe regimes in red so the black landmass is legible & ominous.
  if (!state.medMode && st === 'cap') return 'rgba(239, 77, 82, 0.85)';
  return 'rgba(8, 14, 28, 0.85)';
}
function altOf(feat) {
  const iso = isoOf(feat.properties);
  if (state.selected && iso === state.selected) return 0.07;
  if (state.hovered && iso === state.hovered) return 0.045;
  const st = statusFor(iso && window.LAW_DATA[iso]);
  if (state.medMode && isMedAccess(st)) return 0.03;
  if (!state.medMode && st === 'cap') return 0.022;   // raise danger zones a touch
  return 0.012;
}

function initGlobe(geo) {
  countries = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor(ACCENT)
    .atmosphereAltitude(0.17)
    .showGraticules(true)
    .polygonsData(countries)
    .polygonCapColor(capColor)
    .polygonSideColor(() => 'rgba(28, 20, 54, 0.6)')
    .polygonStrokeColor(strokeColor)
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(240)
    .onPolygonHover(onHover)
    .onPolygonClick(onClick)
    // pulsing rings marking medical-access countries (Medical lens only)
    .ringColor(() => (t => `rgba(167, 139, 250, ${Math.sqrt(1 - t)})`))
    .ringMaxRadius(3.4)
    .ringPropagationSpeed(1.5)
    .ringRepeatPeriod(1100);

  // Research-organization pins (shown via the Research-orgs toggle) — warm gold spikes.
  globe.pointsData([])
    .pointLat(d => d.lat).pointLng(d => d.lng)
    .pointColor(() => '#ffd36e')
    .pointAltitude(0.07).pointRadius(0.32).pointResolution(6).pointsMerge(false)
    .onPointHover(onOrgHover).onPointClick(onOrgClick);

  // Dark ocean globe + soft violet atmosphere (no remote textures — MV3 CSP safe).
  const mat = globe.globeMaterial();
  mat.color.set('#0a1130');
  mat.emissive.set('#0a0820');
  mat.emissiveIntensity = 0.92;
  mat.shininess = 6;

  const ctr = globe.controls();
  ctr.autoRotate = true;
  ctr.autoRotateSpeed = 0.45;
  ctr.enableDamping = true;
  ctr.dampingFactor = 0.12;
  ctr.minDistance = 108;     // globe radius ≈ 100 → lets you zoom right down to the surface
  ctr.maxDistance = 600;
  ctr.zoomSpeed = 2.0;       // snappier wheel / trackpad zoom (default 1.0 felt sluggish)
  ctr.zoomToCursor = true;   // zoom toward the pointer, not just the centre

  // Marker territories (too small for 1:110m polygons) → labelled dots.
  markerData = Object.entries(window.MARKERS).map(([iso, c]) => ({ iso, lat: c[0], lng: c[1], name: nameOf(iso) }));
  globe.labelsData(markerData)
    .labelLat(d => d.lat).labelLng(d => d.lng)
    .labelText(d => d.name)
    .labelSize(0.5).labelDotRadius(0.36)
    .labelColor(markerColor)
    .labelResolution(1).labelAltitude(0.014)
    .onLabelHover(onLabelHover)
    .onLabelClick(onLabelClick);

  globe.pointOfView({ lat: 25, lng: 10, altitude: 2.3 }, 0);
  window.globe = globe; // expose for debugging
  sizeGlobe();
  requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}

function sizeGlobe() {
  if (!globe) return;
  globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 64));
}

function refreshGlobe() {
  if (!globe) return;
  globe.polygonCapColor(capColor).polygonStrokeColor(strokeColor).polygonAltitude(altOf).labelColor(markerColor);
}
function refreshActive() {
  if (state.hovered) hoverEnter(state.hovered, nameOf(state.hovered), true);
  if (state.selected && !detailCard.classList.contains('hidden')) showDetailFor(state.selected);
}
// Ring points for medical-access countries (recomputed per substance).
function accessiblePoints() {
  if (!state.medMode) return [];
  const pts = [];
  for (const f of countries) {
    const iso = isoOf(f.properties);
    if (iso && isMedAccess(statusFor(window.LAW_DATA[iso]))) {
      const [lng, lat] = polyCentroid(f); pts.push({ lat, lng, iso });
    }
  }
  for (const [iso, c] of Object.entries(window.MARKERS)) {
    if (isMedAccess(statusFor(window.LAW_DATA[iso]))) pts.push({ lat: c[0], lng: c[1], iso });
  }
  return pts;
}
function updateRings() { if (globe) globe.ringsData(accessiblePoints()); }

function markerColor(d) {
  const st = statusFor(window.LAW_DATA[d.iso]);
  if (state.medMode && !isMedAccess(st)) return hexA(NODATA_COLOR, 0.5);
  return colorOf(st);
}

/* --------------------------- Research-org pins --------------------------- */
function updateOrgs() { if (globe) globe.pointsData(state.orgsMode ? window.ORGS : []); }
function onOrgHover(d) {
  if (globe) globe.controls().autoRotate = (!d && spinOn && !state.hovered);
  if (!d) { tooltip.classList.add('hidden'); return; }
  tooltip.innerHTML =
    `<div class="tt-head"><span class="tt-flag">🔬</span><span class="tt-name">${d.name}</span></div>` +
    `<div class="tt-org-meta">📍 ${d.city} · <b>${d.type}</b></div>` +
    `<div class="tt-note">${d.focus}</div>`;
  tooltip.classList.remove('hidden');
}
function onOrgClick(d) { if (d && globe) globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 900); }

/* --------------------------- Interaction --------------------------- */
const tooltip = document.getElementById('tooltip');
function nameOf(iso) { return (window.LAW_DATA[iso] && window.LAW_DATA[iso].n) || iso; }

function onHover(feat) {
  const iso = feat ? isoOf(feat.properties) : null;
  const name = feat ? ((window.LAW_DATA[iso] && window.LAW_DATA[iso].n) || feat.properties.ADMIN || feat.properties.NAME) : null;
  hoverEnter(iso, name, !!feat);
}
function onLabelHover(d) { hoverEnter(d ? d.iso : null, d ? nameOf(d.iso) : null, !!d); }

function hoverEnter(iso, name, present) {
  state.hovered = iso;
  refreshGlobe();
  if (globe) globe.controls().autoRotate = !present && spinOn;
  if (!present) { tooltip.classList.add('hidden'); return; }

  const rec = iso && window.LAW_DATA[iso];
  const flag = flagEmoji(iso);
  const sub = window.SUBSTANCES[state.substance];
  const head = `<div class="tt-head"><span class="tt-flag">${flag}</span><span class="tt-name">${name}</span></div>`;

  if (!rec) {
    tooltip.innerHTML = head + `<div class="tt-nodata">No law data on file yet</div>`;
    tooltip.classList.remove('hidden');
    return;
  }

  const st = statusFor(rec);
  const c = colorOf(st);
  const label = st && S[st] ? S[st].label : 'No data';
  const note = noteFor(rec);

  // All-substance snapshot grid (mirrors the substance selector); active one highlighted.
  const cells = SUB_KEYS.map(k => {
    const s2 = statusFor(rec, k);
    return `<div class="tt-cell${k === state.substance ? ' cur' : ''}">` +
      `<span class="tt-dot" style="background:${colorOf(s2)}${s2 === 'cap' ? ';box-shadow:0 0 0 1px #d9486b' : ''}"></span>` +
      `<span class="tt-cl">${window.SUBSTANCES[k].emoji} ${window.SUBSTANCES[k].name}</span>` +
      `<span class="tt-cv">${s2 && S[s2] ? S[s2].short : '—'}</span></div>`;
  }).join('');

  const ov = state.substance === 'overview' ? `<div class="tt-ctx">Openness ${fmtScore(overviewScore(rec))} / 5 across ${SUB_KEYS.length} substances</div>` : '';
  const medFoot = isMedAccess(st)
    ? `<div class="tt-med">⚕ Legal medical / clinical access</div>` : '';

  tooltip.innerHTML = head +
    `<div class="tt-main"><span class="tt-emoji">${sub.emoji}</span>` +
      `<span class="tt-meta"><span class="tt-type">${sub.name}</span>` +
      `<span class="tt-grade" style="color:${st === 'cap' ? '#d9486b' : c}">${label}</span></span></div>` +
    ov +
    (note ? `<div class="tt-note">${note}</div>` : '') +
    medFoot +
    `<div class="tt-grid">${cells}</div>`;
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
  const name = (window.LAW_DATA[iso] && window.LAW_DATA[iso].n) || feat.properties.ADMIN || feat.properties.NAME;
  const [lng, lat] = polyCentroid(feat);
  selectCountry(iso, lat, lng, name);
}
function onLabelClick(d) { if (d) selectCountry(d.iso, d.lat, d.lng, nameOf(d.iso)); }

function selectCountry(iso, lat, lng, name) {
  state.selected = iso;
  refreshGlobe();
  showDetailFor(iso, name);
  globe.controls().autoRotate = false;
  document.getElementById('spinBtn').classList.remove('on');
  spinOn = false;
  globe.pointOfView({ lat, lng, altitude: 1.7 }, 900);
}

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
const fmtScore = v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1);

function showDetailFor(iso, name) {
  const rec = iso && window.LAW_DATA[iso];
  name = name || (rec ? rec.n : iso);
  document.getElementById('detailFlag').textContent = flagEmoji(iso);
  document.getElementById('detailName').textContent = name;

  const gradeEl = document.getElementById('detailGrade');
  const rows = document.getElementById('detailRows');
  const noteEl = document.getElementById('detailNote');
  const subEl = document.getElementById('detailSub');

  if (window.SUBNATIONAL[iso]) { subEl.classList.remove('hidden'); subEl.innerHTML = `↕ ${window.SUBNATIONAL[iso]}`; }
  else { subEl.classList.add('hidden'); subEl.innerHTML = ''; }

  if (!rec) {
    gradeEl.style.cssText = `background:${hexA(NODATA_COLOR, 0.2)};color:${NODATA_COLOR}`;
    gradeEl.textContent = 'No data';
    rows.innerHTML = `<p class="nodata-msg">No law data on file for this territory yet.</p>`;
    noteEl.classList.add('hidden'); noteEl.innerHTML = '';
    document.getElementById('detailConf').innerHTML = '';
    document.getElementById('detailSources').classList.add('hidden');
    detailCard.classList.remove('hidden');
    return;
  }

  const sub = window.SUBSTANCES[state.substance];
  const st = statusFor(rec);
  const c = colorOf(st);
  gradeEl.style.cssText = `background:${hexA(c, 0.18)};color:${st === 'cap' ? '#d9486b' : c}`;
  gradeEl.textContent = `${sub.emoji} ${sub.name} · ${st && S[st] ? S[st].label : 'No data'}`;

  const note = noteFor(rec);
  if (note) { noteEl.classList.remove('hidden'); noteEl.innerHTML = note; }
  else { noteEl.classList.add('hidden'); noteEl.innerHTML = ''; }

  // Every substance, with status dot + label.
  rows.innerHTML = SUB_KEYS.map(k => {
    const s2 = statusFor(rec, k);
    const cc = colorOf(s2);
    const sel = k === state.substance ? ' sel' : '';
    return `<div class="drow${sel}">` +
      `<span class="ddot" style="background:${cc}${s2 === 'cap' ? ';box-shadow:0 0 0 1.5px #d9486b' : ''}"></span>` +
      `<span class="dlabel">${window.SUBSTANCES[k].emoji} ${window.SUBSTANCES[k].name}</span>` +
      `<span class="dval" style="color:${s2 === 'cap' ? '#d9486b' : cc}">${s2 && S[s2] ? S[s2].short : '—'}</span></div>`;
  }).join('');

  // Web-research confidence + sources (if this country was verified in the research pass).
  const conf = window.LAW_CONFIDENCE && window.LAW_CONFIDENCE[iso];
  const confEl = document.getElementById('detailConf');
  if (conf) {
    const cc = { high: '#2fd07a', medium: '#f4c145', low: '#ef8b3c' }[conf] || NODATA_COLOR;
    confEl.innerHTML = `<span class="conf-dot" style="background:${cc}"></span>Data confidence: <b style="color:${cc}">${conf}</b>`;
  } else confEl.innerHTML = '';
  const srcs = window.LAW_SOURCES && window.LAW_SOURCES[iso];
  const srcEl = document.getElementById('detailSources');
  if (srcs && srcs.length) {
    srcEl.innerHTML = '<div class="src-head">Sources</div>' + srcs.map(s => {
      const m = String(s).match(/https?:\/\/[^\s)]+/);
      if (m) {
        const url = m[0];
        let label = String(s).replace(url, '').replace(/[\s(){}\[\]—·:-]+$/, '').trim();
        if (!label) label = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
      }
      return `<span>${s}</span>`;
    }).join('');
    srcEl.classList.remove('hidden');
  } else { srcEl.classList.add('hidden'); srcEl.innerHTML = ''; }

  detailCard.classList.remove('hidden');
}
document.getElementById('detailClose').addEventListener('click', () => {
  detailCard.classList.add('hidden');
  state.selected = null;
  refreshGlobe();
});

/* ============================ UI wiring ============================ */
function buildSubstanceButtons() {
  const grid = document.getElementById('subGrid');
  grid.innerHTML = Object.entries(window.SUBSTANCES)
    .map(([key, s]) => `<button data-key="${key}" class="${key === state.substance ? 'active' : ''}${s.aggregate ? ' agg' : ''}">` +
      `<span class="sb-emoji">${s.emoji}</span><span class="sb-name">${s.name}</span></button>`)
    .join('');
  grid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.substance = btn.dataset.key;
      grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      updateSubstanceUI();
      updateRings();
      refreshGlobe();
      refreshActive();
    });
  });
}

function buildLegend() {
  document.getElementById('legend').innerHTML = Object.entries(S).map(([k, v]) =>
    `<div class="legend-row"><span class="sw" style="background:${v.color}${k === 'cap' ? ';box-shadow:0 0 0 1.5px #d9486b' : ''}"></span>` +
    `<span class="legend-txt">${v.label}</span></div>`).join('') +
    `<div class="legend-row"><span class="sw" style="background:${NODATA_COLOR}"></span><span class="legend-txt">No data</span></div>`;
}

function buildSearchList() {
  document.getElementById('countryList').innerHTML =
    Object.values(window.LAW_DATA).map(r => `<option value="${r.n}"></option>`).join('');
}
function wireSearch() {
  const input = document.getElementById('countrySearch');
  const nameToIso = {};
  for (const [iso, r] of Object.entries(window.LAW_DATA)) nameToIso[r.n.toLowerCase()] = iso;
  const go = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    let iso = nameToIso[q];
    if (!iso) { const hit = Object.entries(window.LAW_DATA).find(([, r]) => r.n.toLowerCase().includes(q)); if (hit) iso = hit[0]; }
    if (!iso) return;
    const feat = countries.find(f => isoOf(f.properties) === iso);
    if (feat) { onClick(feat); input.blur(); }
    else if (window.MARKERS[iso]) { selectCountry(iso, window.MARKERS[iso][0], window.MARKERS[iso][1], nameOf(iso)); input.blur(); }
  };
  input.addEventListener('change', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

function updateReadout() {
  const sub = window.SUBSTANCES[state.substance];
  document.getElementById('readoutType').textContent = `${sub.emoji} ${sub.name}`;
  document.getElementById('readoutSub').textContent = state.medMode
    ? '⚕ Medical-access lens · where can patients legally get it?'
    : (state.substance === 'overview' ? 'Combined openness · hover a country' : 'Legal status · hover a country');
}

function updateSubstanceUI() {
  const sub = window.SUBSTANCES[state.substance];
  updateReadout();
  document.getElementById('subDesc').textContent = sub.desc;
  document.getElementById('subClinical').innerHTML = `<span class="ex-title">⚕ Medical / research</span><br>${sub.clinical}`;
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
try {
  if (!localStorage.getItem('ge_disclaimer_seen')) { openAbout(); localStorage.setItem('ge_disclaimer_seen', '1'); }
} catch (e) { /* localStorage unavailable — ignore */ }

/* medical-access lens toggle */
document.getElementById('medToggle').addEventListener('change', e => {
  state.medMode = e.target.checked;
  document.body.classList.toggle('med-on', state.medMode);
  updateRings();
  refreshGlobe();
  updateReadout();
  refreshActive();
});

/* research-organization pins toggle */
document.getElementById('orgToggle').addEventListener('change', e => {
  state.orgsMode = e.target.checked;
  updateOrgs();
});

/* molecule & brain explorer */
document.getElementById('molBtn').addEventListener('click', () => {
  if (window.GEM_openMolecule) window.GEM_openMolecule(state.substance);
});

window.addEventListener('resize', sizeGlobe);

/* ============================ Boot ============================ */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtRev = ym => { const [y, m] = (ym || '').split('-'); return MONTHS[(+m || 1) - 1] + ' ' + y; };
function buildAbout() {
  const ver = document.getElementById('aboutVer');
  if (ver && window.DATA_REVISION) ver.textContent = `Data reviewed ${fmtRev(window.DATA_REVISION)} · ${ver.textContent}`;
  const src = document.getElementById('aboutSources');
  if (src && Array.isArray(window.SOURCES)) src.innerHTML = window.SOURCES.map(s => `<li>${s}</li>`).join('');
  const el = document.getElementById('aboutChanges');
  if (el && Array.isArray(window.CHANGES)) {
    el.innerHTML = window.CHANGES.map(c =>
      `<div class="chg"><span class="chg-when">${fmtRev(c.date)}</span>` +
      `<span class="chg-body"><b>${c.c}</b> — ${c.ch}<span class="chg-src">${c.src}</span></span></div>`
    ).join('');
  }
}

function boot() {
  buildSubstanceButtons();
  buildLegend();
  buildSearchList();
  wireSearch();
  updateSubstanceUI();
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
