/* ============================================================================
   Russian Sanctions Map — an interactive 3D globe + timeline of how the world
   has aligned for or against Moscow, from the Russian Empire to June 2026.

   Each country carries a STATUS TIMELINE toward Russia: green (open/friendly),
   yellow (neutral/partial), red (sanctioning), or "self" (Russia / the USSR's
   republics before 1991). Drag the time slider — or press ▶ — to watch the
   world re-colour through every era: the Iron Curtain falling across Europe,
   the 1990s thaw, and the 2014→2022 re-freeze. Click a country for its arc, or
   a milestone for the story. Engine: globe.gl. Data: see About for sourcing.
   ========================================================================== */
'use strict';

/* ----------------------------- data handles ------------------------------ */
const D = window.RSM || {};
const START = D.start || 1900, END = D.end || 2026;
const C = D.countries || [], EV = (D.events || []).slice().sort((a, b) => a.y - b.y);
const ERAS = D.eras || [], STATS = D.stats || [], NOTES = D.notes || [];
const byIso = {}; C.forEach(c => { byIso[c.iso] = c; });

/* ----------------------------- helpers ----------------------------------- */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

/* ----------------------------- colour system ----------------------------- */
const COL = { g:'#37c46a', y:'#f1c40f', r:'#e2483d', self:'#8b7cff', nd:'#3a4456' };
const SLABEL = { g:'Open / friendly', y:'Neutral / partial', r:'Sanctioning', self:'Russia', nd:'No data' };
const SLONG = {
  g:'Friendly, open relations with Russia — no sanctions.',
  y:'Neutral or partial — no full sanctions; balancing or staying out.',
  r:'Sanctioning or isolating Russia.',
  self:'Russia itself — the subject of the map (the USSR before 1991).',
  nd:'No data / did not yet feature.',
};
const colorFor = (code, a) => { const h = COL[code] || COL.nd; return a == null ? h : hexA(h, a); };

/* event category palette (red = anti-Moscow pressure, green = rapprochement) */
const CAT = { restriction:'#e2483d', escalation:'#ff7a3d', conflict:'#c0392b', diplomatic:'#56a8ff', alliance:'#37c46a', easing:'#2ee6c6' };
const CAT_LABEL = { restriction:'Sanction', escalation:'Escalation', conflict:'Conflict', diplomatic:'Diplomacy', alliance:'Alliance', easing:'Thaw' };

/* ----------------------------- model ------------------------------------- */
function statusAt(c, year) {
  if (!c || !c.seg) return null;
  let code = null;
  for (let i = 0; i < c.seg.length; i++) { if (c.seg[i][0] <= year) code = c.seg[i][1]; else break; }
  return code;
}
function eraAt(year) { let e = ERAS[0]; for (const x of ERAS) { if (year >= x.from) e = x; } return e; }
function eventsInYear(year) { return EV.filter(e => e.y === year); }
function latestEventBy(year) { let r = null; for (const e of EV) { if (e.y <= year) r = e; else break; } return r; }
/* phases of a country's arc: [{from,to,code}] */
function phasesOf(c) {
  const s = c.seg, out = [];
  for (let i = 0; i < s.length; i++) out.push({ from: s[i][0], to: i + 1 < s.length ? s[i + 1][0] : END, code: s[i][1] });
  return out;
}
function tallyAt(year) {
  const t = { r:0, y:0, g:0, self:0, nd:0 };
  for (const c of C) { if (c.terr) continue; const s = statusAt(c, year); t[s == null ? 'nd' : s]++; }
  return t;
}

/* ----------------------------- ISO ↔ geojson ----------------------------- */
const ALIAS = { KOS:'XKX', PSX:'PSE', SDS:'SSD', CNM:'CYP', SAH:'MAR', KAS:'IND', SOL:'SOM' };
const ISO2_FALLBACK = { XKX:'XK', PSE:'PS', HKG:'HK', MAC:'MO', TWN:'TW', SGP:'SG', GIB:'GI', AND:'AD', MCO:'MC', SMR:'SM', LIE:'LI', PYF:'PF', NOR:'NO', FRA:'FR', CYP:'CY', SSD:'SS', COD:'CD', COG:'CG', RUS:'RU' };
let ISO2 = {};
function flag(iso3) {
  const i2 = ISO2[iso3] || ISO2_FALLBACK[iso3];
  if (!i2 || i2.length !== 2 || i2 === '-9') return '🏳️';
  return String.fromCodePoint(...[...i2.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}

/* ----------------------------- state ------------------------------------- */
const state = { year: END, sel:null, selType:null, hoverIso:null, hoverEv:null,
  tab:'countries', region:'all', stance:'all', mode:'globe', relief:true };
let globe, spinOn = true, panelOn = true, GEO = null, LAND = [];
const elViz = document.getElementById('globeViz');
const elFlat = document.getElementById('flatViz');
const tooltip = document.getElementById('tooltip');

/* ============================== Globe ==================================== */
function polyIso(f) {
  const p = f.properties;
  let iso = p.ADM0_A3;
  if (byIso[iso]) return iso;
  iso = ALIAS[p.ADM0_A3] || p.ISO_A3_EH || p.ISO_A3;
  if (byIso[iso]) return iso;
  return p.ADM0_A3;
}
const polyStatus = f => statusAt(byIso[polyIso(f)], state.year);

function capColor(f) {
  const iso = polyIso(f), s = polyStatus(f);
  const selOn = state.selType === 'country' && state.sel === iso;
  if (s == null) return colorFor('nd', selOn || state.hoverIso === iso ? 0.7 : 0.4);
  if (state.hoverIso === iso || selOn) return colorFor(s, 1);
  return colorFor(s, 0.9);
}
const ALT = { self:0.16, r:0.07, g:0.05, y:0.022, nd:0.008 };
function polyAlt(f) {
  const iso = polyIso(f), s = polyStatus(f);
  let base = state.relief ? (ALT[s] != null ? ALT[s] : 0.012) : 0.012;
  if (s === 'self') base = state.relief ? 0.16 : 0.05;
  if (state.selType === 'country' && state.sel === iso) return base + 0.05;
  if (state.hoverIso === iso) return base + 0.025;
  return base;
}
function russiaRing() {
  const r = byIso.RUS; if (!r) return [];
  const rings = [{ lat:r.lat, lng:r.lon, c:COL.self }];
  if (state.selType === 'country' && state.sel && state.sel !== 'RUS') {
    const c = byIso[state.sel]; if (c && c.lat != null) rings.push({ lat:c.lat, lng:c.lon, c: colorFor(statusAt(c, state.year) || 'nd') });
  }
  return rings;
}

function initGlobe() {
  LAND = GEO.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#b34a4a').atmosphereAltitude(0.17)
    .polygonsData(LAND)
    .polygonCapColor(capColor)
    .polygonSideColor(f => { const s = polyStatus(f); return s == null ? 'rgba(28,34,48,0.5)' : hexA('#0a0d16', 0.62); })
    .polygonStrokeColor(() => 'rgba(190,200,225,0.16)')
    .polygonAltitude(polyAlt).polygonsTransitionDuration(140)
    .polygonLabel(() => '')
    .onPolygonHover(onPolyHover).onPolygonClick(f => selectCountry(polyIso(f), true))
    .ringsData(russiaRing())
    .ringColor(d => (t => hexA(d.c, Math.sqrt(1 - t) * 0.8))).ringMaxRadius(d => d.c === COL.self ? 4.2 : 3)
    .ringPropagationSpeed(1.7).ringRepeatPeriod(d => d.c === COL.self ? 1100 : 800);
  try { const m = globe.globeMaterial(); m.color.set('#11141f'); m.emissive.set('#0a0810'); m.emissiveIntensity = 0.9; m.shininess = 4; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.3; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 101; ctr.maxDistance = 600;
  const setZoom = () => { ctr.zoomSpeed = 2.2; }; setZoom(); setTimeout(setZoom, 300); ctr.addEventListener('change', setZoom);
  globe.pointOfView({ lat: 50, lng: 50, altitude: 2.4 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 150)); }
function refreshGlobe() {
  if (!globe || state.mode !== 'globe') return;
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt).polygonSideColor(f => { const s = polyStatus(f); return s == null ? 'rgba(28,34,48,0.5)' : hexA('#0a0d16', 0.62); }).ringsData(russiaRing());
}

/* ----------------------------- hover / tooltip --------------------------- */
function showTip(html, x, y) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (x != null) { tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; } }
const hideTip = () => tooltip.classList.add('hidden');
let lastMouse = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('mousemove', e => { lastMouse = { x: e.clientX, y: e.clientY }; if (!tooltip.classList.contains('hidden')) { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; } });

function countryTipHTML(c) {
  const s = statusAt(c, state.year);
  const ev = latestEventBy(state.year);
  return `<div class="tt-name"><span class="tt-flag">${flag(c.iso)}</span>${esc(c.name)}</div>` +
    `<div class="tt-stat"><span class="tt-dot" style="background:${colorFor(s || 'nd')}"></span><b>${SLABEL[s || 'nd']}</b><span class="u">· ${state.year}</span></div>` +
    `<div class="tt-blurb">${esc(c.iso === 'RUS' ? c.blurb : (SLONG[s || 'nd']))}</div>` +
    `<div class="tt-hint">Click for its history with Russia ↗</div>`;
}
function onPolyHover(f) {
  state.hoverIso = f ? polyIso(f) : null;
  if (globe) globe.controls().autoRotate = !f && spinOn && !playT;
  refreshGlobe();
  if (!f) { hideTip(); return; }
  const c = byIso[polyIso(f)];
  if (c) showTip(countryTipHTML(c), lastMouse.x, lastMouse.y);
  else showTip(`<div class="tt-name">${esc(f.properties.ADMIN || f.properties.NAME)}</div><div class="tt-blurb">No data</div>`, lastMouse.x, lastMouse.y);
}

/* ----------------------------- selection / fly --------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.6 }, 850); } }
function selectCountry(iso, doFly) {
  const c = byIso[iso]; if (!c) return;
  state.sel = iso; state.selType = 'country';
  refreshGlobe(); showCountryDetail(c); markActive();
  if (doFly && c.lat != null) flyTo(c.lat, c.lon, c.iso === 'RUS' ? 2.2 : 1.6);
}
function selectEvent(idx, doFly) {
  const e = EV[idx]; if (!e) return;
  state.sel = idx; state.selType = 'event';
  if (doFly !== false) { stopPlay(); state.year = e.y; syncSlider(); applyYear(false); }
  showEventDetail(e, idx); markActive();
}
function clearSel() { state.sel = null; state.selType = null; detailCard.classList.add('hidden'); refreshGlobe(); markActive(); }

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
const detailBody = document.getElementById('detailBody');
document.getElementById('detailClose').addEventListener('click', clearSel);

/* horizontal arc strip 1900→END coloured by the country's phases */
function arcSVG(c) {
  const W = 336, H = 30, span = END - START;
  const x = y => (y - START) / span * W;
  let rects = '';
  for (const p of phasesOf(c)) {
    const x0 = x(p.from), x1 = x(p.to);
    rects += `<rect x="${x0.toFixed(1)}" y="0" width="${(x1 - x0).toFixed(1)}" height="${H}" fill="${colorFor(p.code)}" />`;
  }
  const mx = x(state.year);
  const marker = `<line x1="${mx.toFixed(1)}" y1="-2" x2="${mx.toFixed(1)}" y2="${H + 2}" stroke="#fff" stroke-width="2"/><circle cx="${mx.toFixed(1)}" cy="${H + 4}" r="3" fill="#fff"/>`;
  return `<svg class="arc" viewBox="-1 -6 ${W + 2} ${H + 14}" preserveAspectRatio="none">${rects}${marker}</svg>`;
}

function showCountryDetail(c) {
  if (c.iso === 'RUS') return showRussiaDetail(c);
  const s = statusAt(c, state.year);
  const phases = phasesOf(c);
  let html =
    `<div class="d-flagrow"><span class="d-flag">${flag(c.iso)}</span><div><div class="d-name">${esc(c.name)}</div><div class="d-sub">${esc(c.region || '')}</div></div></div>` +
    `<div class="d-hero" style="border-color:${hexA(colorFor(s || 'nd'), 0.4)}"><span class="d-bigdot" style="background:${colorFor(s || 'nd')}"></span>` +
    `<div class="d-heror"><div class="d-status" style="color:${colorFor(s || 'nd')}">${SLABEL[s || 'nd']}</div>` +
    `<div class="d-statsub">toward Russia · <b>${state.year}</b></div></div></div>` +
    `<div class="d-text" style="margin-top:11px">${esc(c.blurb)}</div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>Relationship over time</span><b>${START}–${END}</b></div>${arcSVG(c)}` +
    `<div class="arc-foot"><span>${START}</span><span>${END}</span></div>`;
  // phase list (most recent first)
  html += `<div class="d-phases">` + phases.slice().reverse().map(p => {
    const yr = p.to >= END ? `${p.from}–now` : `${p.from}–${p.to}`;
    return `<div class="ph-row"><span class="ph-dot" style="background:${colorFor(p.code)}"></span><span class="ph-yr">${yr}</span><span class="ph-lab">${SLABEL[p.code]}</span></div>`;
  }).join('') + `</div></div>`;
  detailBody.innerHTML = html;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

function showRussiaDetail(c) {
  const t = tallyAt(state.year);
  detailBody.innerHTML =
    `<div class="d-flagrow"><span class="d-flag">${flag('RUS')}</span><div><div class="d-name">Russia</div><div class="d-sub">The subject of the map</div></div></div>` +
    `<div class="d-text" style="margin-top:12px">${esc(c.blurb)}</div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>The world toward Russia · ${state.year}</span></div>` +
    `<div class="d-counts">` +
    `<div class="cnt r"><b>${t.r}</b><span>Sanctioning</span></div>` +
    `<div class="cnt y"><b>${t.y}</b><span>Neutral</span></div>` +
    `<div class="cnt g"><b>${t.g}</b><span>Open</span></div></div>` +
    `<div class="d-text" style="font-size:12px;color:var(--muted);margin-top:9px">Drag the timeline to see how this balance has shifted across a century.</div></div>` +
    `<div class="d-sec"><button class="d-impact-btn" id="dImpact">📊 Open the global impact dashboard</button></div>`;
  document.getElementById('dImpact').addEventListener('click', openImpact);
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

function showEventDetail(e, idx) {
  const cat = CAT[e.cat] || '#888';
  detailBody.innerHTML =
    `<div class="d-evhead" style="border-color:${hexA(cat, 0.5)}">` +
    `<div class="d-evcat" style="background:${hexA(cat, 0.16)};color:${cat};border-color:${hexA(cat, 0.45)}">${CAT_LABEL[e.cat] || e.cat}</div>` +
    `<div class="d-evdate">${esc(e.d || e.y)}</div></div>` +
    `<div class="d-name" style="margin-top:9px">${esc(e.t)}</div>` +
    `<div class="d-evactors">${esc(e.who)}</div>` +
    `<div class="d-sevdots">${[1,2,3,4,5].map(n => `<span class="sv${n <= e.sev ? ' on' : ''}" style="${n <= e.sev ? 'background:' + cat : ''}"></span>`).join('')}<span class="sv-lab">turning-point weight</span></div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>What happened</span></div><div class="d-text">${esc(e.what)}</div></div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>Why it mattered</span></div><div class="d-text">${esc(e.imp)}</div></div>` +
    `<div class="d-evnav">` +
    (idx > 0 ? `<button class="evnav" data-i="${idx - 1}">‹ ${esc(EV[idx - 1].t.slice(0, 26))}…</button>` : '<span></span>') +
    (idx < EV.length - 1 ? `<button class="evnav r" data-i="${idx + 1}">${esc(EV[idx + 1].t.slice(0, 26))}… ›</button>` : '<span></span>') +
    `</div>`;
  detailBody.querySelectorAll('.evnav').forEach(b => b.addEventListener('click', () => selectEvent(+b.dataset.i, true)));
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

/* ============================== Left panel =============================== */
const rankList = document.getElementById('rankList');
const rpSub = document.getElementById('rpSub'), rpFoot = document.getElementById('rpFoot'), rpStat = document.getElementById('rpStat');
const REGION_CHIPS = [
  ['all','🌍 All'], ['Europe & Central Asia','Europe & C. Asia'], ['East Asia & Pacific','Asia–Pacific'],
  ['North America','N. America'], ['Latin America & Caribbean','Latin America'],
  ['Middle East, North Africa, Afghanistan & Pakistan','MENA'], ['South Asia','S. Asia'], ['Sub-Saharan Africa','Africa'],
];
const STANCE_CHIPS = [['all','All'], ['r','🔴 Sanctioning'], ['y','🟡 Neutral'], ['g','🟢 Open']];
const shortRegion = r => ((REGION_CHIPS.find(x => x[0] === r) || [, r])[1] || r || '').replace('🌍 ', '');

function buildFilters() {
  if (state.tab === 'milestones') { document.getElementById('rpFilters').innerHTML = ''; return; }
  document.getElementById('rpFilters').innerHTML =
    STANCE_CHIPS.map(([k, lab]) => `<button class="fchip st${state.stance === k ? ' on' : ''}" data-st="${k}">${lab}</button>`).join('') +
    `<span class="fchip-sep"></span>` +
    REGION_CHIPS.map(([k, lab]) => `<button class="fchip${state.region === k ? ' on' : ''}" data-rg="${esc(k)}">${esc(lab)}</button>`).join('');
}
const STANCE_ORDER = { r:0, y:1, g:2, self:3, nd:4 };
function buildList() {
  if (state.tab === 'milestones') return buildMilestones();
  document.getElementById('rpYear') && (document.getElementById('rpYear').textContent = state.year);
  rpSub.innerHTML = `Stance toward Russia · <b id="rpYear">${state.year}</b>`;
  rpFoot.textContent = 'Tap a country to fly there ↗';
  let list = C.filter(c => !c.terr && c.iso !== 'RUS')
    .map(c => ({ c, s: statusAt(c, state.year) }))
    .filter(x => x.s != null)
    .filter(x => state.region === 'all' || x.c.region === state.region)
    .filter(x => state.stance === 'all' || x.s === state.stance);
  list.sort((a, b) => (STANCE_ORDER[a.s] - STANCE_ORDER[b.s]) || a.c.name.localeCompare(b.c.name));
  const t = tallyAt(state.year);
  rpStat.innerHTML = `<span class="ts r">${t.r} sanctioning</span><span class="ts y">${t.y} neutral</span><span class="ts g">${t.g} open</span>`;
  rankList.innerHTML = list.map(x =>
    `<div class="rk-row" data-iso="${x.c.iso}"><span class="rk-dot" style="background:${colorFor(x.s)}"></span>` +
    `<span class="rk-flag">${flag(x.c.iso)}</span><span class="rk-main"><span class="rk-name">${esc(x.c.name)}</span>` +
    `<span class="rk-meta">${esc(shortRegion(x.c.region))}</span></span>` +
    `<span class="rk-stat" style="color:${colorFor(x.s)}">${SLABEL[x.s]}</span></div>`
  ).join('') || `<div class="rp-empty">No countries in this view for ${state.year}.</div>`;
  markActive();
}
function buildMilestones() {
  rpSub.innerHTML = `Milestones & turning points · <b>${EV.length}</b>`;
  rpFoot.textContent = 'Tap a milestone to jump there ↗';
  rpStat.innerHTML = '';
  rankList.innerHTML = EV.map((e, i) => {
    const cat = CAT[e.cat] || '#888';
    const active = e.y <= state.year && (i === EV.length - 1 || EV[i + 1].y > state.year);
    return `<div class="ev-row${active ? ' now' : ''}" data-ev="${i}"><span class="ev-tick" style="background:${cat}"></span>` +
      `<span class="ev-yr">${e.y}</span><span class="ev-main"><span class="ev-t">${esc(e.t)}</span>` +
      `<span class="ev-cat" style="color:${cat}">${CAT_LABEL[e.cat] || e.cat}</span></span></div>`;
  }).join('');
  markActive();
  const nowEl = rankList.querySelector('.ev-row.now'); if (nowEl) nowEl.scrollIntoView({ block:'nearest' });
}
rankList.addEventListener('click', e => {
  const ev = e.target.closest('.ev-row'); if (ev) { selectEvent(+ev.dataset.ev, true); return; }
  const r = e.target.closest('.rk-row'); if (r) selectCountry(r.dataset.iso, true);
});
document.getElementById('rpTabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; state.tab = b.dataset.tab;
  document.querySelectorAll('#rpTabs button').forEach(x => x.classList.toggle('on', x === b));
  buildFilters(); buildList();
});
document.getElementById('rpFilters').addEventListener('click', e => {
  const b = e.target.closest('.fchip'); if (!b) return;
  if (b.dataset.st != null) state.stance = b.dataset.st; else if (b.dataset.rg != null) state.region = b.dataset.rg;
  buildFilters(); buildList();
});
function markActive() {
  rankList.querySelectorAll('.rk-row').forEach(r => r.classList.toggle('active', state.selType === 'country' && r.dataset.iso === state.sel));
  rankList.querySelectorAll('.ev-row').forEach(r => r.classList.toggle('active', state.selType === 'event' && +r.dataset.ev === state.sel));
  if (state.selType === 'country') { const el = rankList.querySelector(`.rk-row[data-iso="${state.sel}"]`); if (el) el.scrollIntoView({ block:'nearest' }); }
}

/* panel collapse */
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Timeline ================================= */
const tlSlider = document.getElementById('tlSlider'), tlPlay = document.getElementById('tlPlay'), tlReset = document.getElementById('tlReset');
const tlYear = document.getElementById('tlYear'), tlEra = document.getElementById('tlEra'), tlReadout = document.getElementById('tlReadout');
const tlEraBands = document.getElementById('tlEraBands'), tlMarks = document.getElementById('tlMarks');
const span = END - START;
const pct = y => ((y - START) / span * 100);

function buildTrack() {
  tlEraBands.innerHTML = ERAS.map((e, i) =>
    `<div class="era-band e${i % 3}" style="left:${pct(e.from)}%;width:${pct(e.to) - pct(e.from)}%" title="${esc(e.name)}"></div>`).join('');
  tlMarks.innerHTML = EV.map((e, i) => {
    const cat = CAT[e.cat] || '#888';
    return `<button class="tmark s${e.sev}" data-ev="${i}" style="left:${pct(e.y)}%;background:${cat}" title="${esc(e.y + ' · ' + e.t)}"></button>`;
  }).join('');
}
tlMarks.addEventListener('click', e => { const m = e.target.closest('.tmark'); if (m) selectEvent(+m.dataset.ev, true); });
tlMarks.addEventListener('mouseover', e => { const m = e.target.closest('.tmark'); if (m) { const ev = EV[+m.dataset.ev]; showTip(`<div class="tt-name" style="font-size:12.5px">${esc(ev.t)}</div><div class="tt-stat"><span class="tt-dot" style="background:${CAT[ev.cat]}"></span>${esc(ev.d || ev.y)} · ${CAT_LABEL[ev.cat]}</div>`, e.clientX, e.clientY); } });
tlMarks.addEventListener('mouseout', e => { if (e.target.closest('.tmark')) hideTip(); });

function applyYear(refreshDetail) {
  const era = eraAt(state.year), t = tallyAt(state.year);
  tlYear.textContent = state.year;
  tlEra.textContent = era.name;
  tlReadout.innerHTML = `<span class="ro r">🔴 ${t.r}</span><span class="ro y">🟡 ${t.y}</span><span class="ro g">🟢 ${t.g}</span>`;
  tlReset.classList.toggle('hidden', state.year >= END);
  tlSlider.style.setProperty('--fill', pct(state.year) + '%');
  refreshGlobe();
  if (state.mode === 'flat') drawFlat();
  if (state.tab === 'milestones') buildMilestones(); else buildList();
  if (refreshDetail && state.selType === 'country' && state.sel) showCountryDetail(byIso[state.sel]);
}
function syncSlider() { tlSlider.value = state.year; }
let playT = null;
function stopPlay() { if (playT) { clearInterval(playT); playT = null; } tlPlay.textContent = '▶'; tlPlay.classList.remove('on'); if (globe && state.mode === 'globe' && !state.hoverIso) globe.controls().autoRotate = spinOn; }
function startPlay() {
  if (playT) { stopPlay(); return; }
  if (state.year >= END) { state.year = START; syncSlider(); }
  tlPlay.textContent = '⏸'; tlPlay.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  let hold = 0;
  playT = setInterval(() => {
    if (hold > 0) { hold--; return; }
    state.year += 1;
    if (state.year >= END) { state.year = END; syncSlider(); applyYear(true); stopPlay(); return; }
    syncSlider(); applyYear(state.selType === 'country');
    const evs = eventsInYear(state.year);
    if (evs.length) { flashCaption(evs[0]); hold = 5; } // linger on milestone years
  }, 95);
}
const tourCap = document.getElementById('tourCaption');
let capTimer = null;
function flashCaption(e) {
  const cat = CAT[e.cat] || '#888';
  tourCap.innerHTML = `<span class="tc-yr" style="color:${cat}">${esc(e.d || e.y)} · ${CAT_LABEL[e.cat]}</span><span class="tc-tx">${esc(e.t)}</span>`;
  tourCap.classList.remove('hidden');
  if (capTimer) clearTimeout(capTimer);
  capTimer = setTimeout(() => { if (!tourActive()) tourCap.classList.add('hidden'); }, 2600);
}
tlPlay.addEventListener('click', startPlay);
tlSlider.addEventListener('input', () => { stopPlay(); state.year = +tlSlider.value; applyYear(true); });
tlReset.addEventListener('click', () => { stopPlay(); state.year = END; syncSlider(); applyYear(true); });

/* ============================== Era quick-jump ========================== */
const eraBar = document.getElementById('eraBar');
function buildEraBar() {
  eraBar.innerHTML = ERAS.map((e, i) => `<button class="era-pill" data-era="${i}">${esc(e.name)}</button>`).join('');
}
eraBar.addEventListener('click', e => {
  const b = e.target.closest('.era-pill'); if (!b) return;
  const era = ERAS[+b.dataset.era]; stopPlay();
  state.year = era.to >= END ? END : Math.round((era.from + era.to) / 2);
  if (+b.dataset.era === 0) state.year = era.from;
  syncSlider(); applyYear(true); flashCaption({ d: `${era.from}–${era.to >= END ? 'now' : era.to}`, y: era.from, t: era.blurb, cat:'diplomatic' });
});

/* ============================== Flat map ================================= */
let fctx, fX = 0, fY = 0, fPW = 0, fPH = 0, flatW = 0, flatH = 0;
const projX = lon => fX + (lon + 180) / 360 * fPW;
const projY = lat => fY + (90 - lat) / 180 * fPH;
function eachRing(geom, cb) { if (!geom) return; if (geom.type === 'Polygon') geom.coordinates.forEach(cb); else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => p.forEach(cb)); }
function sizeFlat() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  flatW = elFlat.clientWidth; flatH = elFlat.clientHeight;
  elFlat.width = flatW * dpr; elFlat.height = flatH * dpr;
  fctx = elFlat.getContext('2d'); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fPW = Math.min(flatW * 0.98, flatH * 2 * 0.98); fPH = fPW / 2; fX = (flatW - fPW) / 2; fY = (flatH - fPH) / 2;
}
function drawFlat() {
  if (!fctx || !GEO) return;
  fctx.clearRect(0, 0, flatW, flatH);
  const oc = fctx.createLinearGradient(0, fY, 0, fY + fPH); oc.addColorStop(0, '#0c1320'); oc.addColorStop(1, '#070b14');
  fctx.fillStyle = oc; fctx.fillRect(fX, fY, fPW, fPH);
  fctx.strokeStyle = 'rgba(150,170,210,.06)'; fctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) { fctx.beginPath(); fctx.moveTo(projX(lon), fY); fctx.lineTo(projX(lon), fY + fPH); fctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { fctx.beginPath(); fctx.moveTo(fX, projY(lat)); fctx.lineTo(fX + fPW, projY(lat)); fctx.stroke(); }
  fctx.lineWidth = 0.5; fctx.strokeStyle = 'rgba(190,200,225,.16)';
  for (const f of LAND) {
    const s = polyStatus(f);
    const sel = state.selType === 'country' && state.sel === polyIso(f);
    fctx.fillStyle = colorFor(s || 'nd', s == null ? 0.35 : 0.92);
    eachRing(f.geometry, ring => {
      fctx.beginPath(); ring.forEach((c, i) => { const x = projX(c[0]), y = projY(c[1]); i ? fctx.lineTo(x, y) : fctx.moveTo(x, y); }); fctx.closePath(); fctx.fill();
      if (sel) { fctx.save(); fctx.strokeStyle = '#fff'; fctx.lineWidth = 1.5; fctx.stroke(); fctx.restore(); } else fctx.stroke();
    });
  }
}
function pointInRing(x, y, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = projX(ring[i][0]), yi = projY(ring[i][1]), xj = projX(ring[j][0]), yj = projY(ring[j][1]); if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function flatCountryAt(x, y) { for (const f of LAND) { let hit = false; eachRing(f.geometry, ring => { if (!hit && pointInRing(x, y, ring)) hit = true; }); if (hit) return f; } return null; }
elFlat.addEventListener('mousemove', e => {
  if (state.mode !== 'flat') return;
  const rect = elFlat.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const f = flatCountryAt(x, y);
  if (f && byIso[polyIso(f)]) { elFlat.style.cursor = 'pointer'; showTip(countryTipHTML(byIso[polyIso(f)]), e.clientX, e.clientY); }
  else { elFlat.style.cursor = 'grab'; hideTip(); }
});
elFlat.addEventListener('mouseleave', hideTip);
elFlat.addEventListener('click', e => { const rect = elFlat.getBoundingClientRect(); const f = flatCountryAt(e.clientX - rect.left, e.clientY - rect.top); if (f && byIso[polyIso(f)]) selectCountry(polyIso(f), false); });
function setMode(m) {
  state.mode = m;
  elViz.classList.toggle('hidden', m !== 'globe');
  elFlat.classList.toggle('hidden', m !== 'flat');
  btnMap.classList.toggle('active', m === 'flat');
  btnMap.querySelector('.mb-tx').textContent = m === 'flat' ? 'Globe' : 'Flat map';
  syncMenu('miMap', m === 'flat');
  if (m === 'flat') { sizeFlat(); drawFlat(); } else { sizeGlobe(); refreshGlobe(); }
}
const btnMap = document.getElementById('btnMap');
btnMap.addEventListener('click', () => setMode(state.mode === 'flat' ? 'globe' : 'flat'));
document.getElementById('miMap').addEventListener('click', () => { setMode(state.mode === 'flat' ? 'globe' : 'flat'); menu.classList.add('hidden'); });

/* ============================== Search =================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  const co = C.filter(c => !c.terr && c.name.toLowerCase().includes(q)).slice(0, 6).map(c => ({ type:'country', c }));
  const ev = EV.map((e, i) => ({ e, i })).filter(({ e }) => e.t.toLowerCase().includes(q) || ('' + e.y).includes(q)).slice(0, 5).map(({ e, i }) => ({ type:'event', e, i }));
  hits = [...co, ...ev].slice(0, 10);
  searchRes.innerHTML = hits.length ? hits.map((h, i) => {
    if (h.type === 'event') return `<div class="sr-item" data-i="${i}"><span class="sr-ic" style="color:${CAT[h.e.cat]}">◆</span><span class="sr-name">${esc(h.e.t)}</span><span class="sr-sub">${h.e.y}</span></div>`;
    const s = statusAt(h.c, state.year);
    return `<div class="sr-item" data-i="${i}"><span class="sr-ic">${flag(h.c.iso)}</span><span class="sr-name">${esc(h.c.name)}</span><span class="sr-dot" style="background:${colorFor(s || 'nd')}"></span></div>`;
  }).join('') : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) { const h = hits[i] || hits[0]; if (!h) return; searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
  if (h.type === 'event') selectEvent(h.i, true); else selectCountry(h.c.iso, true); }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend =================================== */
document.getElementById('legendToggle').addEventListener('click', () => document.getElementById('legend').classList.toggle('collapsed'));

/* ============================== Impact overlay ========================== */
const impactOverlay = document.getElementById('impactOverlay');
function openImpact() {
  document.getElementById('impactStats').innerHTML = STATS.map(s =>
    `<div class="stat-card"><div class="stat-big">${esc(s.big)}</div><div class="stat-lab">${esc(s.label)}</div><div class="stat-ctx">${esc(s.ctx)}</div></div>`).join('');
  document.getElementById('impactNotes').innerHTML = NOTES.map(n =>
    `<div class="note"><div class="note-h">${esc(n.title)}</div><div class="note-b">${esc(n.body)}</div></div>`).join('');
  document.getElementById('impactSop').textContent = D.sop || '';
  menu.classList.add('hidden'); impactOverlay.classList.remove('hidden');
}
document.getElementById('impactClose').addEventListener('click', () => impactOverlay.classList.add('hidden'));
impactOverlay.addEventListener('click', e => { if (e.target === impactOverlay) impactOverlay.classList.add('hidden'); });
document.getElementById('btnImpact').addEventListener('click', openImpact);
document.getElementById('miImpact').addEventListener('click', openImpact);

/* ============================== Menu / misc ============================== */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hoverIso && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
function resetView() { clearSel(); stopPlay(); spinOn = true; syncSpin(); state.year = END; syncSlider(); state.region = 'all'; state.stance = 'all'; buildFilters(); applyYear(false); if (globe && state.mode === 'globe') { globe.controls().autoRotate = true; globe.pointOfView({ lat: 50, lng: 50, altitude: 2.4 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });
document.getElementById('miRelief').addEventListener('click', () => { state.relief = !state.relief; syncMenu('miRelief', state.relief); refreshGlobe(); });

/* about / welcome */
const aboutOverlay = document.getElementById('aboutOverlay'), welcome = document.getElementById('welcomeOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'rsm_seen_v1';
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });

/* ============================== Guided tour ============================== */
const TOUR = [
  ['y', 1905, 'Welcome. We begin in the age of empires — the Tsar allied with France and Britain, at odds with Germany and Japan.'],
  ['y', 1945, 'In World War II the USSR is an Allied power. Lend-Lease makes Moscow a partner of the West — the high-water mark of cooperation.'],
  ['y', 1965, 'Then the Iron Curtain. NATO turns red against Moscow; the Warsaw Pact glows green around it. Watch Europe split in two.'],
  ['y', 1980, 'Cold-War pressure peaks: the CoCom tech embargo, the grain embargo and the Olympic boycott after the invasion of Afghanistan.'],
  ['y', 1995, 'The thaw. The USSR is gone, Russia joins the G8, and almost the whole world turns green — the most open the planet has been to Moscow.'],
  ['ev', null, 'CRIMEA'],
  ['y', 2018, 'The first modern sanctions spread across the West as Crimea, MH17 and the Skripal poisoning pile up.'],
  ['ev', null, 'INVASION'],
  ['c', 'CHN', 'As the West turns red, Russia pivots east — China becomes its economic lifeline, buying oil and trading in yuan.'],
  ['c', 'IND', 'India and much of the Global South stay neutral-yellow: condemning the war at the UN, but buying Russian oil and refusing to sanction.'],
  ['c', 'RUS', 'Today Russia is the most-sanctioned country on Earth. Open the impact dashboard to see what that has done — and drag the timeline to relive it all.'],
];
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; tourCap.classList.add('hidden'); syncMenu('miTour', false); if (globe && state.mode === 'globe') globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const [kind, val, cap] = TOUR[tourIdx];
  let text = cap;
  if (kind === 'y') { stopPlay(); state.year = val; syncSlider(); applyYear(false); }
  else if (kind === 'c') { selectCountry(val, true); }
  else if (kind === 'ev') {
    const idx = cap === 'CRIMEA' ? EV.findIndex(e => e.y === 2014) : EV.findIndex(e => e.y === 2022 && /invasion/i.test(e.t));
    if (idx >= 0) { selectEvent(idx, true); text = EV[idx].y + ' — ' + EV[idx].t + '. ' + EV[idx].imp; }
  }
  tourCap.innerHTML = `<span class="tc-yr">Stop ${tourIdx + 1} / ${TOUR.length}</span><span class="tc-tx">${esc(text)}</span><span class="tc-skip" title="End tour">✕</span>`;
  tourCap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 7800);
}
function startTour() { if (tourActive()) { stopTour(); return; } menu.classList.add('hidden'); stopPlay(); hideWelcome(); syncMenu('miTour', true); tourIdx = 0; tourStep(); }
document.getElementById('miTour').addEventListener('click', startTour);
document.getElementById('welTour') && document.getElementById('welTour').addEventListener('click', () => { hideWelcome(); startTour(); });
tourCap.addEventListener('click', e => { if (e.target.classList.contains('tc-skip')) return stopTour(); if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); } });

/* keyboard */
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (!impactOverlay.classList.contains('hidden')) return impactOverlay.classList.add('hidden'); if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); if (!detailCard.classList.contains('hidden')) clearSel(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); startPlay(); }
  else if (e.key === 'ArrowRight') { stopPlay(); state.year = Math.min(END, state.year + 1); syncSlider(); applyYear(true); }
  else if (e.key === 'ArrowLeft') { stopPlay(); state.year = Math.max(START, state.year - 1); syncSlider(); applyYear(true); }
});

/* ============================== Boot ===================================== */
window.addEventListener('resize', () => { if (state.mode === 'globe') sizeGlobe(); else { sizeFlat(); drawFlat(); } });
tlSlider.min = START; tlSlider.max = END; tlSlider.value = END;
buildEraBar(); buildTrack(); buildFilters(); buildList(); applyYear(false);
fetch('data/countries.geojson').then(r => r.json()).then(geo => {
  GEO = geo;
  GEO.features.forEach(f => { const p = f.properties; const i2 = (p.ISO_A2_EH && p.ISO_A2_EH !== '-99') ? p.ISO_A2_EH : (p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null); if (i2) ISO2[p.ADM0_A3] = i2; });
  initGlobe();
  try { const c = new URLSearchParams(location.search).get('c'); if (c && byIso[c]) { selectCountry(c, true); hideWelcome(); } const y = +new URLSearchParams(location.search).get('y'); if (y >= START && y <= END) { state.year = y; syncSlider(); applyYear(true); } } catch (e) {}
}).catch(err => { console.error('Failed to load map data', err); elViz.innerHTML = '<div style="color:var(--muted);text-align:center;padding-top:34vh">Could not load map data.</div>'; });
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }
