/* ============================================================================
   Longevity Map — interactive 3D globe of world life expectancy & the Blue Zones.

   The world's countries are painted by life expectancy at birth (green = longest,
   red = shortest) and optionally extruded into a "longevity relief". The All /
   Women / Men switch and a 1960→2022 time slider re-colour the whole globe live.
   Blue Zones glow blue; clicking a country reveals its rank, 60-year history and
   (where available) which of its regions live longest and shortest. A second
   ranking lists the world's longest-lived cities. Engine: globe.gl.
   Country data: World Bank Open Data API. See About for sourcing & caveats.
   ========================================================================== */
'use strict';

/* ----------------------------- data handles ------------------------------ */
const YEARS = window.LE_YEARS;            // [1960 … 2022]
const Y0 = YEARS[0], Y1 = YEARS[YEARS.length - 1];
const LON = window.LONGEVITY || [];       // countries
const BZ  = window.BLUEZONES || [];
const POWER9 = window.POWER9 || [];
const REGIONS = window.REGIONS || {};
const CITIES = window.CITIES || [];
const yIdx = y => Math.max(0, Math.min(YEARS.length - 1, Math.round(y) - Y0));

/* ----------------------------- helpers ----------------------------------- */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt1 = v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1);
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

/* ----------------------------- colour scale ------------------------------ */
const SCALE = [[50,[138,26,18]],[58,[192,57,43]],[66,[230,126,34]],[72,[241,196,15]],[77,[163,201,58]],[82,[55,196,106]],[86,[26,152,80]]];
const NODATA = [51,65,79];
function leRGB(v) {
  if (v == null || isNaN(v)) return NODATA;
  if (v <= SCALE[0][0]) return SCALE[0][1];
  if (v >= SCALE[SCALE.length - 1][0]) return SCALE[SCALE.length - 1][1];
  for (let i = 0; i < SCALE.length - 1; i++) {
    const [a, ca] = SCALE[i], [b, cb] = SCALE[i + 1];
    if (v >= a && v <= b) { const t = (v - a) / (b - a); return [0,1,2].map(k => Math.round(lerp(ca[k], cb[k], t))); }
  }
  return NODATA;
}
const leColor = (v, alpha) => { const [r,g,b] = leRGB(v); return alpha == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`; };

const BZ_COL = { classic:'#4fd0ff', engineered:'#2ee6c6', emerging:'#7fb3ff', legend:'#9aa9bd' };
const BZ_KIND = { classic:'Validated', engineered:'Engineered', emerging:'Emerging', legend:'Legend' };
const MED_COL = '#ffb05a';

/* ----------------------------- indexes ----------------------------------- */
LON.forEach(c => { c.bz = BZ.filter(z => z.iso === c.iso); });
const byIso = {}; LON.forEach(c => { byIso[c.iso] = c; });
const ALIAS = { KOS:'XKX', PSX:'PSE', SDS:'SSD', CNM:'CYP', SAH:'MAR', KAS:'IND', SOL:'SOM' };
const ISO2_FALLBACK = { XKX:'XK', PSE:'PS', HKG:'HK', MAC:'MO', TWN:'TW', SGP:'SG', GIB:'GI', AND:'AD', MCO:'MC', SMR:'SM', LIE:'LI', PYF:'PF', NOR:'NO', FRA:'FR', CYP:'CY', SSD:'SS', COD:'CD', COG:'CG', VAT:'VA' };
let ISO2 = {}; // built from geojson at load
function flag(iso3) {
  const i2 = ISO2[iso3] || ISO2_FALLBACK[iso3];
  if (!i2 || i2.length !== 2 || i2 === '-9') return '🏳️';
  return String.fromCodePoint(...[...i2.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}

/* value of a country for the current sex, at a given year (carry to nearest valid) */
function arrFor(c, sex) { return sex === 'm' ? c.ma : sex === 'f' ? c.fa : c.t; }
function valAt(c, sex, year) {
  if (!c) return null;
  const a = arrFor(c, sex); if (!a) return null;
  const i = yIdx(year);
  if (a[i] != null) return a[i];
  for (let d = 1; d < a.length; d++) { if (i - d >= 0 && a[i - d] != null) return a[i - d]; if (i + d < a.length && a[i + d] != null) return a[i + d]; }
  return null;
}
const SEX_LABEL = { t:'All', f:'Women', m:'Men' };

/* tiers */
function tierOf(v) {
  if (v == null) return { label:'No data', color:'#7a8a9b' };
  if (v >= 82) return { label:'Exceptional', color:leColor(84) };
  if (v >= 78) return { label:'High', color:leColor(80) };
  if (v >= 74) return { label:'Above average', color:leColor(75.5) };
  if (v >= 70) return { label:'Around average', color:leColor(71.5) };
  if (v >= 64) return { label:'Below average', color:leColor(66) };
  return { label:'Low', color:leColor(57) };
}

/* ----------------------------- state ------------------------------------- */
const state = { sex:'t', year:Y1, sel:null, selType:null, hoverIso:null, hoverBz:null,
  tab:'countries', filter:'all', mode:'globe', med:false, relief:true, bzOn:true };
let globe, spinOn = true, panelOn = true, GEO = null, LAND = [];
const elViz = document.getElementById('globeViz');
const elFlat = document.getElementById('flatViz');
const tooltip = document.getElementById('tooltip');

/* ----------------------------- ranking model ----------------------------- */
const REGION_CHIPS = [
  ['all','🌍 All'],['Europe & Central Asia','Europe'],['East Asia & Pacific','Asia–Pacific'],
  ['North America','N. America'],['Latin America & Caribbean','Latin America'],
  ['Middle East & North Africa','MENA'],['South Asia','S. Asia'],['Sub-Saharan Africa','Africa'],
];
function countryList() {
  let list = LON.filter(c => state.filter === 'all' || c.region === state.filter);
  list = list.map(c => ({ c, v: valAt(c, state.sex, state.year) })).filter(x => x.v != null);
  list.sort((a, b) => b.v - a.v);
  return list;
}
let rankMap = {}; // iso -> rank within current sex/year (all regions)
function rebuildRankMap() {
  const all = LON.map(c => ({ c, v: valAt(c, state.sex, state.year) })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
  rankMap = {}; all.forEach((x, i) => rankMap[x.c.iso] = i + 1);
  rankMap.__n = all.length;
}

/* ============================== Globe ==================================== */
function bzPoints() { return state.bzOn ? BZ.map(z => ({ t:'bz', z, lat:z.lat, lng:z.lon })) : []; }
function regionPoints() {
  if (state.selType !== 'country' || !state.sel) return [];
  const R = REGIONS[state.sel]; if (!R) return [];
  const vals = R.r.map(r => r[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return R.r.map(r => ({ t:'reg', name:r[0], le:r[1], lat:r[2], lng:r[3], hi: r[1] === hi, lo: r[1] === lo }));
}
const allPoints = () => [...regionPoints(), ...bzPoints()];

function medPaths() {
  if (!state.med) return [];
  const ring = lat => { const pts = []; for (let lng = -180; lng <= 180; lng += 2) pts.push([lat, lng]); return pts; };
  return [45, 30, -30, -45].map(lat => ({ coords: ring(lat), key:lat }));
}
function selRings() {
  if (state.selType === 'bz' && state.sel) { const z = BZ.find(x => x.id === state.sel); if (z) return [{ lat:z.lat, lng:z.lon, c:BZ_COL[z.kind] || '#4fd0ff' }]; }
  return [];
}

function polyIso(f) {
  const p = f.properties;
  let iso = p.ADM0_A3;
  if (byIso[iso]) return iso;
  iso = ALIAS[p.ADM0_A3] || p.ISO_A3_EH || p.ISO_A3;
  if (byIso[iso]) return iso;
  return p.ADM0_A3;
}
const polyVal = f => valAt(byIso[polyIso(f)], state.sex, state.year);

function capColor(f) {
  const iso = polyIso(f), v = polyVal(f);
  if (state.hoverIso === iso) return leColor(v, 1);
  if (state.selType === 'country' && state.sel === iso) return leColor(v, 1);
  return leColor(v, v == null ? 0.55 : 0.92);
}
function polyAlt(f) {
  const iso = polyIso(f), v = polyVal(f);
  const base = (state.relief && v != null) ? 0.01 + clamp((v - 50) / 36, 0, 1) * 0.13 : 0.012;
  if (state.selType === 'country' && state.sel === iso) return base + 0.04;
  if (state.hoverIso === iso) return base + 0.02;
  return base;
}

function initGlobe() {
  LAND = GEO.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#3fa7d6').atmosphereAltitude(0.16)
    .polygonsData(LAND)
    .polygonCapColor(capColor)
    .polygonSideColor(f => { const v = polyVal(f); return v == null ? 'rgba(30,42,54,0.5)' : hexA('#04121e', 0.6); })
    .polygonStrokeColor(() => 'rgba(180,210,230,0.18)')
    .polygonAltitude(polyAlt).polygonsTransitionDuration(0)
    .polygonLabel(() => '')
    .onPolygonHover(onPolyHover).onPolygonClick(f => selectCountry(polyIso(f), true))
    .pointsData(allPoints())
    .pointLat(d => d.lat).pointLng(d => d.lng)
    .pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius)
    .pointResolution(14).pointsMerge(false).pointsTransitionDuration(0)
    .pointLabel(() => '').onPointHover(onPointHover).onPointClick(onPointClick)
    .pathsData(medPaths())
    .pathPoints(d => d.coords).pathPointLat(p => p[0]).pathPointLng(p => p[1])
    .pathColor(() => [hexA(MED_COL, 0.0), hexA(MED_COL, 0.65)])
    .pathStroke(1.2).pathDashLength(0.04).pathDashGap(0.02).pathDashAnimateTime(0)
    .pathPointAlt(0.012).pathTransitionDuration(0)
    .ringsData(selRings())
    .ringColor(d => (t => hexA(d.c, Math.sqrt(1 - t)))).ringMaxRadius(3.2).ringPropagationSpeed(1.6).ringRepeatPeriod(900);
  try { const m = globe.globeMaterial(); m.color.set('#0a1b2b'); m.emissive.set('#04101c'); m.emissiveIntensity = 0.92; m.shininess = 3; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.32; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 101; ctr.maxDistance = 600;
  const setZoom = () => { ctr.zoomSpeed = 2.2; }; setZoom(); setTimeout(setZoom, 300); ctr.addEventListener('change', setZoom);
  globe.pointOfView({ lat: 28, lng: 12, altitude: 2.5 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe(); requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 103)); }

function pointColor(d) {
  if (d.t === 'bz') { const sel = state.selType === 'bz' && state.sel === d.z.id; return hexA(BZ_COL[d.z.kind] || '#4fd0ff', sel ? 1 : 0.95); }
  return d.hi ? leColor(d.le, 1) : d.lo ? leColor(d.le, 1) : 'rgba(255,255,255,0.85)';
}
function pointAlt(d) {
  if (d.t === 'bz') return (state.selType === 'bz' && state.sel === d.z.id) ? 0.14 : (state.hoverBz === d.z.id ? 0.09 : 0.05);
  return 0.02;
}
function pointRadius(d) {
  if (d.t === 'bz') { const base = d.z.kind === 'classic' ? 0.5 : d.z.kind === 'legend' ? 0.32 : 0.42; return (state.hoverBz === d.z.id || (state.selType === 'bz' && state.sel === d.z.id)) ? base + 0.2 : base; }
  return d.hi || d.lo ? 0.34 : 0.24;
}
function refreshGlobe() {
  if (!globe || state.mode !== 'globe') return;
  globe.polygonCapColor(capColor).polygonAltitude(polyAlt)
    .pointsData(allPoints()).pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius)
    .pathsData(medPaths()).ringsData(selRings());
}

/* ----------------------------- hover / tooltip --------------------------- */
function showTip(html, x, y) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (x != null) { tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; } }
const hideTip = () => tooltip.classList.add('hidden');
let lastMouse = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('mousemove', e => { lastMouse = { x: e.clientX, y: e.clientY }; if (!tooltip.classList.contains('hidden')) { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; } });

function countryTipHTML(c) {
  const v = valAt(c, state.sex, state.year), rk = rankMap[c.iso];
  const bz = c.bz && c.bz.length;
  return `<div class="tt-name"><span class="tt-flag">${flag(c.iso)}</span>${esc(c.name)}</div>` +
    (bz ? `<div class="tt-bz">🔵 ${c.bz.length === 1 ? 'Blue Zone: ' + esc(c.bz[0].name) : c.bz.length + ' Blue Zones'}</div>` : '') +
    `<div class="tt-le"><b style="color:${leColor(v)}">${fmt1(v)}</b><span class="u">yrs · ${SEX_LABEL[state.sex]} · ${state.year}</span></div>` +
    `<div class="tt-mf"><span>♀ <b>${fmt1(valAt(c,'f',state.year))}</b></span><span>♂ <b>${fmt1(valAt(c,'m',state.year))}</b></span></div>` +
    (rk ? `<div class="tt-rank">World rank <b>#${rk}</b> of ${rankMap.__n}</div>` : '') +
    `<div class="tt-hint">Click to open ↗</div>`;
}
function bzTipHTML(z) {
  return `<div class="tt-name"><span class="tt-flag">🔵</span>${esc(z.name)}</div>` +
    `<div class="tt-bz">${BZ_KIND[z.kind]} Blue Zone · ${esc(z.country)}</div>` +
    `<div class="tt-le" style="margin-top:5px;font-size:12px">${esc(z.hook)}</div>` +
    `<div class="tt-hint">Click for the full story ↗</div>`;
}
function regTipHTML(d) {
  return `<div class="tt-name">${esc(d.name)}</div>` +
    `<div class="tt-le"><b style="color:${leColor(d.le)}">${fmt1(d.le)}</b><span class="u">yrs ${d.hi ? '· longest in country' : d.lo ? '· shortest in country' : ''}</span></div>`;
}
function onPolyHover(f) {
  state.hoverIso = f ? polyIso(f) : null;
  if (globe) globe.controls().autoRotate = !f && spinOn && !playT && !(state.hoverBz);
  refreshGlobe();
  if (!f) { hideTip(); return; }
  const c = byIso[polyIso(f)];
  if (c) showTip(countryTipHTML(c), lastMouse.x, lastMouse.y);
  else showTip(`<div class="tt-name">${esc(f.properties.ADMIN || f.properties.NAME)}</div><div class="tt-le" style="font-size:12px;color:var(--muted)">No life-expectancy data</div>`, lastMouse.x, lastMouse.y);
}
function onPointHover(d) {
  state.hoverBz = (d && d.t === 'bz') ? d.z.id : null;
  if (globe) globe.controls().autoRotate = !d && spinOn && !playT && !state.hoverIso;
  refreshGlobe();
  if (!d) { hideTip(); return; }
  showTip(d.t === 'bz' ? bzTipHTML(d.z) : regTipHTML(d), lastMouse.x, lastMouse.y);
}
function onPointClick(d) { if (d.t === 'bz') selectBlueZone(d.z.id, true); else flyTo(d.lat, d.lng, 0.9); }

/* ----------------------------- selection / fly --------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe && state.mode === 'globe') { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.6 }, 850); } }
function selectCountry(iso, doFly) {
  const c = byIso[iso]; if (!c) { return; }
  state.sel = iso; state.selType = 'country';
  refreshGlobe(); showCountryDetail(c); markActive();
  if (doFly && c.lat != null) flyTo(c.lat, c.lon, 1.5);
  else if (doFly) flyTo(20, 0, 1.8);
}
function selectBlueZone(id, doFly) {
  const z = BZ.find(x => x.id === id); if (!z) return;
  state.sel = id; state.selType = 'bz';
  refreshGlobe(); showBzDetail(z); markActive();
  if (doFly) flyTo(z.lat, z.lon, 1.1);
}
function selectCity(city, doFly) {
  state.sel = null; state.selType = 'city';
  showCityDetail(city); markActive();
  if (doFly) flyTo(city.lat, city.lon, 1.0);
}
function clearSel() { state.sel = null; state.selType = null; detailCard.classList.add('hidden'); refreshGlobe(); markActive(); }

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
const detailBody = document.getElementById('detailBody');
document.getElementById('detailClose').addEventListener('click', clearSel);

function sparkSVG(c, sex) {
  const a = arrFor(c, sex), W = 332, H = 92, pad = 4;
  const pts = []; for (let i = 0; i < a.length; i++) if (a[i] != null) pts.push([YEARS[i], a[i]]);
  if (pts.length < 2) return '<div class="d-text" style="color:var(--muted)">No historical series available.</div>';
  const vmin = Math.max(0, Math.min(...pts.map(p => p[1])) - 2), vmax = Math.max(...pts.map(p => p[1])) + 1;
  const sx = y => pad + (y - Y0) / (Y1 - Y0) * (W - pad * 2);
  const sy = v => (H - 16) - (v - vmin) / (vmax - vmin) * (H - 22);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' ');
  const area = `M${sx(pts[0][0]).toFixed(1)},${(H-16).toFixed(1)} ` + pts.map(p => 'L' + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' ') + ` L${sx(pts[pts.length-1][0]).toFixed(1)},${(H-16).toFixed(1)}Z`;
  const cy = state.year, cv = valAt(c, sex, cy);
  const dot = cv != null ? `<circle cx="${sx(cy).toFixed(1)}" cy="${sy(cv).toFixed(1)}" r="4" fill="#fff" stroke="${leColor(cv)}" stroke-width="2.5"/><line x1="${sx(cy).toFixed(1)}" y1="6" x2="${sx(cy).toFixed(1)}" y2="${H-16}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 3"/>` : '';
  const col = leColor(valAt(c, sex, Y1));
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<path d="${area}" fill="${col}" fill-opacity="0.14"/>` +
    `<path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>` + dot + `</svg>`;
}

function showCountryDetail(c) {
  const sex = state.sex, v = valAt(c, sex, state.year), t = tierOf(v), rk = rankMap[c.iso];
  const first = (() => { const a = arrFor(c, sex); for (let i = 0; i < a.length; i++) if (a[i] != null) return [YEARS[i], a[i]]; return null; })();
  const gain = (first && v != null) ? (v - first[1]) : null;
  const mfCard = (sk, lab, ic) => { const vv = valAt(c, sk, state.year); return `<div class="d-mfc${sex===sk?' on':''}" data-sex="${sk}"><div class="l">${ic} ${lab}</div><div class="v" style="color:${leColor(vv)}">${fmt1(vv)}</div></div>`; };
  let html =
    `<div class="d-flagrow"><span class="d-flag">${flag(c.iso)}</span><div><div class="d-name">${esc(c.name)}</div><div class="d-sub">${esc(c.region || '')}</div></div></div>`;
  if (c.bz && c.bz.length) html += `<div class="d-bzbadge">🔵 ${c.bz.length === 1 ? 'Home to a Blue Zone' : 'Home to ' + c.bz.length + ' Blue Zones'}</div>`;
  html +=
    `<div class="d-hero"><div><span class="d-bignum" style="color:${leColor(v)}">${fmt1(v)}</span><span class="d-bigu"> yrs</span></div>` +
    `<div class="d-heror"><span class="d-tier" style="background:${hexA('#000',0.001)};color:${t.color};border:1px solid ${t.color}">${t.label}</span>` +
    `<div class="d-rank">${SEX_LABEL[sex]} · ${state.year}${rk ? ` · world rank <b>#${rk}</b>/${rankMap.__n}` : ''}</div></div></div>` +
    `<div class="d-mf">${mfCard('t','All','⚥')}${mfCard('f','Women','♀')}${mfCard('m','Men','♂')}</div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>Life expectancy since ${Y0}</span><b>${SEX_LABEL[sex]}</b></div>${sparkSVG(c, sex)}` +
    `<div class="spark-foot"><span>${Y0}</span><span>${Y1}</span></div>`;
  if (gain != null) html += `<div class="d-gain">${gain >= 0 ? '📈' : '📉'} ${gain >= 0 ? 'Gained' : 'Lost'} <b>${Math.abs(gain).toFixed(1)} years</b> since ${first[0]} (${fmt1(first[1])} → ${fmt1(v)}).</div>`;
  html += `</div>`;
  // regions
  const R = REGIONS[c.iso];
  if (R) {
    const rows = R.r.map(r => ({ n:r[0], le:r[1], lat:r[2], lon:r[3] })).sort((a, b) => b.le - a.le);
    const hi = rows[0].le, lo = rows[rows.length - 1].le;
    const render = arr => arr.map(r => `<div class="reg-row" data-lat="${r.lat}" data-lon="${r.lon}"><span class="reg-rank"></span><span class="reg-n">${esc(r.n)}</span><span class="reg-bar"><i style="width:${clamp((r.le-lo)/(hi-lo||1)*100,6,100)}%;background:${leColor(r.le)}"></i></span><span class="reg-v" style="color:${leColor(r.le)}">${fmt1(r.le)}</span></div>`).join('');
    const top = rows.slice(0, 3), bot = rows.slice(-3);
    html += `<div class="d-sec"><div class="d-sec-h"><span>By ${esc(R.kind.toLowerCase())} — longest &amp; shortest lived</span></div>` +
      render(top) + `<div class="reg-split">· · · ${rows.length} ${esc(R.kind.toLowerCase())} ranked · · ·</div>` + render(bot) +
      `<div class="reg-src">Source: ${esc(R.source)}. Best-available estimates.</div></div>`;
  }
  // blue zones in country
  if (c.bz && c.bz.length) {
    html += `<div class="d-sec"><div class="d-sec-h"><span>Blue Zones here</span></div><div class="d-bzchips">` +
      c.bz.map(z => `<span class="bzchip" data-bz="${z.id}">🔵 ${esc(z.name)}</span>`).join('') + `</div></div>`;
  }
  html += `<div class="d-src">Life expectancy at birth, World Bank (${c.yr || Y1}).${c.note ? ' ' + esc(c.note) + '.' : ''} Drag the time slider to change the year.</div>`;
  detailBody.innerHTML = html;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

function showBzDetail(z) {
  const col = BZ_COL[z.kind] || '#4fd0ff';
  let html =
    `<div class="d-flagrow"><span class="d-flag">🔵</span><div><div class="d-name">${esc(z.name)}</div><div class="d-sub">${esc(z.country)} · ${flag(z.iso)}</div></div></div>` +
    `<div class="d-bzbadge" style="background:${hexA(col,0.14)};color:${col};border-color:${hexA(col,0.4)}">${BZ_KIND[z.kind]} Blue Zone${z.since ? ' · since ' + z.since : ''}</div>` +
    `<div class="d-hero" style="border-color:${hexA(col,0.3)}"><div><span class="d-bignum" style="color:${col};font-size:30px">${esc(z.le)}</span></div>` +
    `<div class="d-heror"><div class="d-text" style="font-size:12.5px"><b style="color:${col}">${esc(z.hook)}</b></div></div></div>` +
    `<div class="d-sec"><div class="d-text">${esc(z.metric)}</div></div>` +
    `<div class="d-sec"><div class="d-sec-h"><span>What seems to drive it</span></div><ul class="d-secrets">` +
    z.secrets.map(s => `<li>${esc(s)}</li>`).join('') + `</ul></div>` +
    (z.power && z.power.length ? `<div class="d-sec"><div class="d-sec-h"><span>Power 9 traits</span></div><div class="d-power">` + z.power.map(p => `<span class="pw">${esc(p)}</span>`).join('') + `</div></div>` : '') +
    `<div class="d-sec"><div class="d-text">${esc(z.desc)}</div></div>`;
  if (byIso[z.iso]) html += `<div class="d-sec"><span class="bzchip" data-country="${z.iso}" style="background:rgba(55,196,106,.1);color:var(--green);border-color:rgba(55,196,106,.3)">${flag(z.iso)} See ${esc(z.country)} on the map →</span></div>`;
  html += `<div class="d-src">${esc(z.source)}. Lifestyle factors are associations, not medical advice.</div>`;
  detailBody.innerHTML = html;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

function showCityDetail(city) {
  const t = tierOf(city.le);
  detailBody.innerHTML =
    `<div class="d-flagrow"><span class="d-flag">${flag(city.iso)}</span><div><div class="d-name">${esc(city.n)}</div><div class="d-sub">${esc(city.c)} · ${city.type === 'state' ? 'City-state / territory' : 'City / metro area'}</div></div></div>` +
    `<div class="d-hero"><div><span class="d-bignum" style="color:${leColor(city.le)}">${fmt1(city.le)}</span><span class="d-bigu"> yrs</span></div>` +
    `<div class="d-heror"><span class="d-tier" style="color:${t.color};border:1px solid ${t.color}">${t.label}</span><div class="d-rank">Estimated life expectancy</div></div></div>` +
    `<div class="d-sec"><div class="d-text">${esc(city.note)}</div></div>` +
    (byIso[city.iso] ? `<div class="d-sec"><span class="bzchip" data-country="${city.iso}" style="background:rgba(55,196,106,.1);color:var(--green);border-color:rgba(55,196,106,.3)">${flag(city.iso)} See ${esc(city.c)} on the map →</span></div>` : '') +
    `<div class="d-src">City-level figures are best-available estimates from mixed national & city sources.</div>`;
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}

detailBody.addEventListener('click', e => {
  const reg = e.target.closest('.reg-row'); if (reg) { flyTo(+reg.dataset.lat, +reg.dataset.lon, 0.85); return; }
  const bz = e.target.closest('[data-bz]'); if (bz) { selectBlueZone(bz.dataset.bz, true); return; }
  const co = e.target.closest('[data-country]'); if (co) { selectCountry(co.dataset.country, true); return; }
  const mf = e.target.closest('.d-mfc'); if (mf) { setSex(mf.dataset.sex); return; }
});

/* ============================== Ranking panel ============================ */
const rankList = document.getElementById('rankList');
const rpStat = document.getElementById('rpStat'), rpSub = document.getElementById('rpSub'), rpFoot = document.getElementById('rpFoot');
function buildFilters() {
  document.getElementById('rpFilters').innerHTML = state.tab === 'cities' ? '' :
    REGION_CHIPS.filter(([k]) => k === 'all' || LON.some(c => c.region === k))
      .map(([k, lab]) => `<button class="fchip${state.filter === k ? ' on' : ''}" data-k="${esc(k)}">${esc(lab)}</button>`).join('');
}
function buildRank() {
  document.getElementById('rpYear') && (document.getElementById('rpYear').textContent = state.year);
  if (state.tab === 'cities') {
    rpSub.innerHTML = `Longest-lived cities &amp; city-states · <b>latest</b>`;
    rpFoot.textContent = 'Tap a city to fly there ↗';
    const list = CITIES.slice().sort((a, b) => b.le - a.le);
    rpStat.innerHTML = `<b>${list.length}</b> cities & territories · mixed sources`;
    rankList.innerHTML = list.map((c, i) => rowHTML({ key:'city-' + i, rank:i + 1, flagIso:c.iso, name:c.n, meta:(c.type === 'state' ? '🏛️ ' : '') + esc(c.c), v:c.le, active:state.selType === 'city' && state.sel === null && rankActiveCity === c })).join('');
    return;
  }
  rpSub.innerHTML = `Ranked by life expectancy · <b>${SEX_LABEL[state.sex]}</b> · <b id="rpYear">${state.year}</b>`;
  rpFoot.textContent = 'Tap a country to fly there ↗';
  const list = countryList();
  rpStat.innerHTML = `<b>${list.length}</b> ${state.filter === 'all' ? 'countries & territories' : 'shown'} · world avg <b>${fmt1(worldAvg())}</b> yrs`;
  rankList.innerHTML = list.map((x, i) => rowHTML({
    key:x.c.iso, rank:i + 1, flagIso:x.c.iso, name:x.c.name,
    meta:(x.c.bz && x.c.bz.length ? '<span class="rk-bz">🔵 Blue Zone</span> · ' : '') + esc(shortRegion(x.c.region)),
    v:x.v, active:state.selType === 'country' && state.sel === x.c.iso, iso:x.c.iso
  })).join('') || `<div class="rp-stat">No data for this view.</div>`;
}
let rankActiveCity = null;
function rowHTML(o) {
  const top = o.rank <= 3 ? ' top' + o.rank : '';
  return `<div class="rk-row${top}${o.active ? ' active' : ''}" data-key="${o.key}" ${o.iso ? `data-iso="${o.iso}"` : ''}>` +
    `<span class="rk-rank">${o.rank}</span><span class="rk-flag">${flag(o.flagIso)}</span>` +
    `<span class="rk-main"><span class="rk-name">${esc(o.name)}</span><span class="rk-meta">${o.meta}</span></span>` +
    `<span class="rk-right"><span class="rk-le" style="color:${leColor(o.v)}">${fmt1(o.v)}</span><span class="rk-bar"><i style="width:${clamp((o.v-50)/36*100,4,100)}%;background:${leColor(o.v)}"></i></span></span></div>`;
}
const shortRegion = r => ((REGION_CHIPS.find(c => c[0] === r) || [, r])[1] || r || '').replace('🌍 ', '');
function worldAvg() { const vs = LON.map(c => valAt(c, state.sex, state.year)).filter(v => v != null); return vs.reduce((s, v) => s + v, 0) / (vs.length || 1); }

rankList.addEventListener('click', e => {
  const r = e.target.closest('.rk-row'); if (!r) return;
  if (state.tab === 'cities') { const idx = +r.dataset.key.split('-')[1]; const list = CITIES.slice().sort((a, b) => b.le - a.le); rankActiveCity = list[idx]; selectCity(list[idx], true); buildRank(); }
  else selectCountry(r.dataset.iso, true);
});
document.getElementById('rpTabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; state.tab = b.dataset.tab;
  document.querySelectorAll('#rpTabs button').forEach(x => x.classList.toggle('on', x === b));
  buildFilters(); buildRank();
});
document.getElementById('rpFilters').addEventListener('click', e => {
  const b = e.target.closest('.fchip'); if (!b) return; state.filter = b.dataset.k; buildFilters(); buildRank();
});
function markActive() {
  rankList.querySelectorAll('.rk-row').forEach(r => {
    const on = state.selType === 'country' && r.dataset.iso === state.sel;
    r.classList.toggle('active', on);
  });
  if (state.selType === 'country') { const el = rankList.querySelector(`.rk-row[data-iso="${state.sel}"]`); if (el) el.scrollIntoView({ block:'nearest' }); }
}

/* panel collapse */
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Sex toggle =============================== */
function setSex(sex) {
  state.sex = sex;
  document.querySelectorAll('#sexToggle .seg-b').forEach(b => b.classList.toggle('on', b.dataset.sex === sex));
  rebuildRankMap(); refreshGlobe(); buildRank();
  if (state.selType === 'country' && state.sel) showCountryDetail(byIso[state.sel]);
  if (state.mode === 'flat') drawFlat();
}
document.getElementById('sexToggle').addEventListener('click', e => { const b = e.target.closest('.seg-b'); if (b) setSex(b.dataset.sex); });

/* ============================== Time slider ============================== */
const tlSlider = document.getElementById('tlSlider'), tlPlay = document.getElementById('tlPlay'), tlReset = document.getElementById('tlReset');
const tlYear = document.getElementById('tlYear'), tlReadout = document.getElementById('tlReadout');
function applyYear(refreshDetail) {
  tlYear.textContent = state.year;
  tlReadout.innerHTML = `world average <b>${fmt1(worldAvg())}</b> yrs`;
  tlReset.classList.toggle('hidden', state.year >= Y1);
  rebuildRankMap(); refreshGlobe(); buildRank();
  if (refreshDetail && state.selType === 'country' && state.sel) showCountryDetail(byIso[state.sel]);
  if (state.mode === 'flat') drawFlat();
}
let playT = null;
function stopPlay() { if (playT) { clearInterval(playT); playT = null; } tlPlay.textContent = '▶'; tlPlay.classList.remove('on'); if (globe && state.mode === 'globe' && !state.hoverIso && !state.hoverBz) globe.controls().autoRotate = spinOn; }
function startPlay() {
  if (playT) { stopPlay(); return; }
  if (state.year >= Y1) { state.year = Y0; tlSlider.value = Y0; }
  tlPlay.textContent = '⏸'; tlPlay.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  playT = setInterval(() => {
    state.year += 1;
    if (state.year >= Y1) { state.year = Y1; tlSlider.value = Y1; applyYear(true); stopPlay(); return; }
    tlSlider.value = state.year; applyYear(state.selType === 'country');
  }, 140);
}
tlPlay.addEventListener('click', startPlay);
tlSlider.addEventListener('input', () => { stopPlay(); state.year = +tlSlider.value; applyYear(true); });
tlReset.addEventListener('click', () => { stopPlay(); state.year = Y1; tlSlider.value = Y1; applyYear(true); });

/* ============================== Toggles ================================== */
const btnMed = document.getElementById('btnMed'), btnBlue = document.getElementById('btnBlue'), btnMap = document.getElementById('btnMap');
function setMed(on) { state.med = on; btnMed.classList.toggle('active', on); syncMenu('miMed', on); refreshGlobe(); if (state.mode === 'flat') drawFlat(); }
function setBlue(on) { state.bzOn = on; btnBlue.classList.toggle('active', on); refreshGlobe(); if (state.mode === 'flat') drawFlat(); }
btnMed.addEventListener('click', () => setMed(!state.med));
btnBlue.addEventListener('click', () => setBlue(!state.bzOn));
btnBlue.classList.add('active');
document.getElementById('miMed').addEventListener('click', () => { setMed(!state.med); menu.classList.add('hidden'); });
document.getElementById('miRelief').addEventListener('click', () => { state.relief = !state.relief; syncMenu('miRelief', state.relief); refreshGlobe(); });
document.getElementById('miBluezones').addEventListener('click', () => { menu.classList.add('hidden'); openBz(); });
btnBlue.addEventListener('dblclick', openBz);

/* ============================== Flat map ================================= */
let fctx, fX = 0, fY = 0, fPW = 0, fPH = 0, flatW = 0, flatH = 0, landCache = null;
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
  // ocean
  const oc = fctx.createLinearGradient(0, fY, 0, fY + fPH); oc.addColorStop(0, '#0a2236'); oc.addColorStop(1, '#061521');
  fctx.fillStyle = oc; fctx.fillRect(fX, fY, fPW, fPH);
  // graticule
  fctx.strokeStyle = 'rgba(150,190,215,.06)'; fctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) { fctx.beginPath(); fctx.moveTo(projX(lon), fY); fctx.lineTo(projX(lon), fY + fPH); fctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { fctx.beginPath(); fctx.moveTo(fX, projY(lat)); fctx.lineTo(fX + fPW, projY(lat)); fctx.stroke(); }
  // countries
  fctx.lineWidth = 0.5; fctx.strokeStyle = 'rgba(180,210,230,.16)';
  for (const f of LAND) {
    const v = valAt(byIso[polyIso(f)], state.sex, state.year);
    const sel = state.selType === 'country' && state.sel === polyIso(f);
    fctx.fillStyle = leColor(v, v == null ? 0.4 : 0.9);
    eachRing(f.geometry, ring => {
      fctx.beginPath(); ring.forEach((c, i) => { const x = projX(c[0]), y = projY(c[1]); i ? fctx.lineTo(x, y) : fctx.moveTo(x, y); }); fctx.closePath(); fctx.fill();
      if (sel) { fctx.save(); fctx.strokeStyle = '#fff'; fctx.lineWidth = 1.4; fctx.stroke(); fctx.restore(); } else fctx.stroke();
    });
  }
  // med belt
  if (state.med) {
    fctx.strokeStyle = hexA(MED_COL, 0.6); fctx.lineWidth = 1.4; fctx.setLineDash([6, 4]);
    [45, 30, -30, -45].forEach(lat => { fctx.beginPath(); fctx.moveTo(fX, projY(lat)); fctx.lineTo(fX + fPW, projY(lat)); fctx.stroke(); });
    fctx.setLineDash([]);
    fctx.fillStyle = hexA(MED_COL, 0.06); fctx.fillRect(fX, projY(45), fPW, projY(30) - projY(45)); fctx.fillRect(fX, projY(-30), fPW, projY(-45) - projY(-30));
  }
  // region markers
  flatHits = [];
  for (const d of regionPoints()) { const x = projX(d.lng), y = projY(d.lat); fctx.beginPath(); fctx.arc(x, y, d.hi || d.lo ? 4 : 3, 0, 7); fctx.fillStyle = d.hi || d.lo ? leColor(d.le) : '#fff'; fctx.fill(); fctx.strokeStyle = '#04121e'; fctx.lineWidth = 1; fctx.stroke(); flatHits.push({ d, x, y, r:8, kind:'reg' }); }
  // blue zones
  for (const d of bzPoints()) {
    const x = projX(d.lng), y = projY(d.lat), col = BZ_COL[d.z.kind] || '#4fd0ff';
    fctx.beginPath(); fctx.arc(x, y, 7, 0, 7); fctx.fillStyle = hexA(col, 0.25); fctx.fill();
    fctx.beginPath(); fctx.arc(x, y, 3.6, 0, 7); fctx.fillStyle = col; fctx.fill(); fctx.strokeStyle = '#03121c'; fctx.lineWidth = 1; fctx.stroke();
    flatHits.push({ d, x, y, r:9, kind:'bz' });
  }
}
let flatHits = [];
function pointInRing(x, y, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = projX(ring[i][0]), yi = projY(ring[i][1]), xj = projX(ring[j][0]), yj = projY(ring[j][1]); if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside; } return inside; }
function flatCountryAt(x, y) {
  for (const f of LAND) { let hit = false; eachRing(f.geometry, ring => { if (!hit && pointInRing(x, y, ring)) hit = true; }); if (hit) return f; }
  return null;
}
function flatMarkerAt(x, y) { let best = null, bd = 1e9; for (const h of flatHits) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd && d <= h.r * h.r) { bd = d; best = h; } } return best; }
elFlat.addEventListener('mousemove', e => {
  if (state.mode !== 'flat') return;
  const rect = elFlat.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const m = flatMarkerAt(x, y);
  if (m) { elFlat.style.cursor = 'pointer'; showTip(m.kind === 'bz' ? bzTipHTML(m.d.z) : regTipHTML(m.d), e.clientX, e.clientY); return; }
  const f = flatCountryAt(x, y);
  if (f && byIso[polyIso(f)]) { elFlat.style.cursor = 'pointer'; showTip(countryTipHTML(byIso[polyIso(f)]), e.clientX, e.clientY); }
  else { elFlat.style.cursor = 'grab'; hideTip(); }
});
elFlat.addEventListener('mouseleave', hideTip);
elFlat.addEventListener('click', e => {
  const rect = elFlat.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
  const m = flatMarkerAt(x, y); if (m) { if (m.kind === 'bz') selectBlueZone(m.d.z.id, false); return; }
  const f = flatCountryAt(x, y); if (f && byIso[polyIso(f)]) selectCountry(polyIso(f), false);
});
function setMode(m) {
  state.mode = m;
  elViz.classList.toggle('hidden', m !== 'globe');
  elFlat.classList.toggle('hidden', m !== 'flat');
  btnMap.classList.toggle('active', m === 'flat');
  btnMap.querySelector('.mb-tx').textContent = m === 'flat' ? 'Globe' : 'Flat map';
  syncMenu('miMap', m === 'flat');
  if (m === 'flat') { sizeFlat(); drawFlat(); } else { sizeGlobe(); refreshGlobe(); }
}
btnMap.addEventListener('click', () => setMode(state.mode === 'flat' ? 'globe' : 'flat'));
document.getElementById('miMap').addEventListener('click', () => { setMode(state.mode === 'flat' ? 'globe' : 'flat'); menu.classList.add('hidden'); });

/* ============================== Search =================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  const co = LON.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6).map(c => ({ type:'country', c }));
  const bz = BZ.filter(z => z.name.toLowerCase().includes(q) || z.country.toLowerCase().includes(q)).slice(0, 4).map(z => ({ type:'bz', z }));
  const ci = CITIES.filter(c => c.n.toLowerCase().includes(q)).slice(0, 4).map(c => ({ type:'city', c }));
  hits = [...bz, ...co, ...ci].slice(0, 10);
  searchRes.innerHTML = hits.length ? hits.map((h, i) => {
    if (h.type === 'bz') return `<div class="sr-item${i===0?' sel':''}" data-i="${i}"><span class="sr-ic">🔵</span><span class="sr-name">${esc(h.z.name)}</span><span class="sr-sub">Blue Zone</span></div>`;
    if (h.type === 'city') return `<div class="sr-item" data-i="${i}"><span class="sr-ic">🏙️</span><span class="sr-name">${esc(h.c.n)}</span><span class="sr-score" style="color:${leColor(h.c.le)}">${fmt1(h.c.le)}</span></div>`;
    const v = valAt(h.c, state.sex, state.year);
    return `<div class="sr-item" data-i="${i}"><span class="sr-ic">${flag(h.c.iso)}</span><span class="sr-name">${esc(h.c.name)}</span><span class="sr-score" style="color:${leColor(v)}">${fmt1(v)}</span></div>`;
  }).join('') : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) { const h = hits[i] || hits[0]; if (!h) return; searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
  if (h.type === 'bz') selectBlueZone(h.z.id, true); else if (h.type === 'city') selectCity(h.c, true); else selectCountry(h.c.iso, true); }
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend =================================== */
const legend = document.getElementById('legend');
const toggleLegend = () => legend.classList.toggle('collapsed');
document.getElementById('legendToggle').addEventListener('click', toggleLegend);

/* ============================== Blue Zones overlay ======================= */
const bzOverlay = document.getElementById('bzOverlay');
function openBz() {
  const groups = [['classic','The five validated Blue Zones'],['engineered','The engineered sixth'],['emerging','Emerging candidates (nominated by this atlas)'],['legend','Famous legends — debunked']];
  document.getElementById('bzGallery').innerHTML = groups.map(([k, title]) => {
    const items = BZ.filter(z => z.kind === k); if (!items.length) return '';
    return `<div class="bzg-group-h">${esc(title)}</div>` + items.map(z => {
      const col = BZ_COL[z.kind];
      return `<button class="bzg-card ${z.kind}" data-bz="${z.id}"><div class="bzg-name">${esc(z.name)}<span class="bzg-kind" style="background:${hexA(col,0.16)};color:${col}">${BZ_KIND[z.kind]}</span></div><div class="bzg-co">${flag(z.iso)} ${esc(z.country)}</div><div class="bzg-hook">${esc(z.hook)}</div></button>`;
    }).join('');
  }).join('');
  document.getElementById('power9').innerHTML = POWER9.map(p => `<div class="pw9"><span class="pw9-ic">${p.icon}</span><div><div class="pw9-n">${esc(p.name)}</div><div class="pw9-d">${esc(p.desc)}</div></div></div>`).join('');
  bzOverlay.classList.remove('hidden');
}
document.getElementById('bzClose').addEventListener('click', () => bzOverlay.classList.add('hidden'));
bzOverlay.addEventListener('click', e => {
  if (e.target === bzOverlay) return bzOverlay.classList.add('hidden');
  const card = e.target.closest('.bzg-card'); if (card) { bzOverlay.classList.add('hidden'); selectBlueZone(card.dataset.bz, true); }
});

/* ============================== Menu / misc ============================== */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hoverIso && !state.hoverBz && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
function resetView() { clearSel(); stopPlay(); spinOn = true; syncSpin(); state.year = Y1; tlSlider.value = Y1; setSex('t'); state.filter = 'all'; buildFilters(); applyYear(false); if (globe && state.mode === 'globe') { globe.controls().autoRotate = true; globe.pointOfView({ lat: 28, lng: 12, altitude: 2.5 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });

/* about / welcome */
const aboutOverlay = document.getElementById('aboutOverlay'), welcome = document.getElementById('welcomeOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'longevitymap_seen_v1';
document.getElementById('welCount') && (document.getElementById('welCount').textContent = LON.length + '');
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });

/* ============================== Guided tour ============================== */
const TOUR = [
  ['c','MCO','Monaco tops the world — a wealthy Mediterranean city-state where people live to about 86.'],
  ['bz','okinawa','Okinawa, Japan: islands of record-breaking grandmothers and the original "ikigai".'],
  ['bz','sardinia','Sardinia, Italy: the first Blue Zone ever mapped — and the world capital of male centenarians.'],
  ['bz','ikaria','Ikaria, Greece — "the island where people forget to die." Naps, wild greens, and no clocks.'],
  ['bz','nicoya','Nicoya, Costa Rica: a long life on a "plan de vida", beans and mineral-rich water.'],
  ['bz','loma-linda','Loma Linda, California: Adventists who outlive other Americans by a decade — a Blue Zone you can practise.'],
  ['bz','singapore','Singapore: the world\'s first "engineered" Blue Zone — long life built by policy and design.'],
  ['c','HKG','Hong Kong — the longest-living city on Earth, despite the crowds and the stress.'],
  ['c','IND','India shows the power of place: in Kerala people live a decade longer than in Chhattisgarh. Click any country for its own breakdown.'],
  ['c','NGA','At the other end: much of Sub-Saharan Africa still lives 25–30 years less, though all are rising fast.'],
  ['c','JPN','Press ▶ on the timeline to watch the whole world grow older since 1960 — Japan\'s rise is extraordinary.'],
];
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
const tourCap = document.getElementById('tourCaption');
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; tourCap.classList.add('hidden'); syncMenu('miTour', false); if (globe && state.mode === 'globe') globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const [kind, id, cap] = TOUR[tourIdx];
  if (kind === 'bz') selectBlueZone(id, true); else selectCountry(id, true);
  tourCap.innerHTML = `<span class="tc-yr">Stop ${tourIdx + 1} / ${TOUR.length}</span><span class="tc-tx">${esc(cap)}</span><span class="tc-skip" title="End tour">✕</span>`;
  tourCap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 8500);
}
function startTour() { if (tourActive()) { stopTour(); return; } menu.classList.add('hidden'); stopPlay(); syncMenu('miTour', true); tourIdx = 0; tourStep(); }
document.getElementById('miTour').addEventListener('click', startTour);
tourCap.addEventListener('click', e => { if (e.target.classList.contains('tc-skip')) return stopTour(); if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); } });

/* keyboard */
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (!bzOverlay.classList.contains('hidden')) return bzOverlay.classList.add('hidden'); if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); if (!detailCard.classList.contains('hidden')) clearSel(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); spinOn = !spinOn; if (globe && !state.hoverIso && !state.hoverBz && state.mode === 'globe') globe.controls().autoRotate = spinOn; syncSpin(); }
  else if (e.key === 'ArrowRight') { stopPlay(); state.year = Math.min(Y1, state.year + 1); tlSlider.value = state.year; applyYear(true); }
  else if (e.key === 'ArrowLeft') { stopPlay(); state.year = Math.max(Y0, state.year - 1); tlSlider.value = state.year; applyYear(true); }
});

/* ============================== Boot ===================================== */
window.addEventListener('resize', () => { if (state.mode === 'globe') sizeGlobe(); else { sizeFlat(); drawFlat(); } });
buildFilters(); rebuildRankMap(); buildRank(); applyYear(false);
fetch('data/countries.geojson').then(r => r.json()).then(geo => {
  GEO = geo;
  GEO.features.forEach(f => { const p = f.properties; const i2 = (p.ISO_A2_EH && p.ISO_A2_EH !== '-99') ? p.ISO_A2_EH : (p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null); if (i2) ISO2[p.ADM0_A3] = i2; });
  initGlobe();
  try { const c = new URLSearchParams(location.search).get('c'); if (c && byIso[c]) { selectCountry(c, true); hideWelcome(); } const z = new URLSearchParams(location.search).get('bz'); if (z) { selectBlueZone(z, true); hideWelcome(); } } catch (e) {}
}).catch(err => { console.error('Failed to load map data', err); elViz.innerHTML = '<div style="color:var(--muted);text-align:center;padding-top:34vh">Could not load map data.</div>'; });
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }
