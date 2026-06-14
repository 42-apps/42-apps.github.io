/* ============================================================================
   A History of Us — interactive globe + deep-time scrubber.
   Watch Homo sapiens spread from one African cradle to the whole Earth:
   regions glow with the GENETIC LINEAGE of whoever lived there, migration
   routes animate as people move, archaeological SITES light up at their date,
   and the Ice-Age world (land bridges, drowning lakes, lost rivers) shifts
   beneath them. Engine forked from "A History of Nations" (globe.gl).
   Data lives in journey.js (STOPS_YA, LINEAGES, REGIONS, MIGRATIONS, SITES …).
   ========================================================================== */
'use strict';

const NOW_CAL = 2026;
let yearIdx = Math.max(0, STOPS_YA.indexOf(200000));   // open in the African cradle
const curYa = () => STOPS_YA[yearIdx];
const prevYa = () => (yearIdx > 0 ? STOPS_YA[yearIdx - 1] : Infinity);   // the older neighbour stop

/* ----------------------------- formatting ------------------------------- */
function fmtYA(ya) {
  if (ya <= 0) return 'Today';
  return ya.toLocaleString('en-US') + (ya === 1 ? ' year ago' : ' years ago');
}
function calOf(ya) {
  if (ya <= 0) return '2026 CE';
  const y = NOW_CAL - ya;
  return y > 0 ? ('≈ ' + y.toLocaleString('en-US') + ' CE') : ('≈ ' + (1 - y).toLocaleString('en-US') + ' BCE');
}
function fmtPop(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace(/\.0$/, '') + ' million';
  if (n >= 1e3) return Math.round(n / 1e3) + ',000';
  return '' + Math.round(n / 100) * 100;
}
// log-interpolated world population (POP is [ya, people], ya descending)
function popAt(ya) {
  if (ya <= 0) return POP[POP.length - 1][1];
  for (let i = 0; i < POP.length - 1; i++) {
    const [y1, p1] = POP[i], [y2, p2] = POP[i + 1];
    if (ya <= y1 && ya >= y2) { const t = (y1 - ya) / (y1 - y2); return Math.exp(Math.log(p1) + t * (Math.log(p2) - Math.log(p1))); }
  }
  return POP[0][1];
}

/* ----------------------------- region time-model ------------------------- */
// peoples sorted OLDEST→NEWEST (from descending); the active people is the most
// recent one whose `from` has already arrived by the chosen year.
function peopleAt(region, ya) { let cur = null; for (const p of region.peoples) { if (p.from >= ya) cur = p; else break; } return cur; }
const regionLit = (region, ya) => region.peoples[0].from >= ya;
const linColor = key => (LINEAGES[key] ? LINEAGES[key].c : '#9aa');

/* ----------------------------- colour helpers ---------------------------- */
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
function ringSignedArea(ring) { let a = 0; for (let i = 0, n = ring.length; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
// this globe fills a Polygon when its outer ring is CLOCKWISE; normalise hand-traced rings.
function fixWinding(geom) {
  if (!geom || geom.type !== 'Polygon') return geom;
  const rings = geom.coordinates.map((ring, i) => { const cw = ringSignedArea(ring) < 0; return ((i === 0) !== cw) ? ring.slice().reverse() : ring; });
  return { type: 'Polygon', coordinates: rings };
}
function centroidOf(ring) { let sx = 0, sy = 0; for (const c of ring) { sx += c[0]; sy += c[1]; } const n = ring.length || 1; return [sx / n, sy / n]; }

/* ----------------------------- site kinds -------------------------------- */
const SITE_KIND = {
  fossil: { c: '#ece6d6', e: '🦴', label: 'Fossil' },
  cradle: { c: '#ecb24a', e: '🌍', label: 'Cradle' },
  art:    { c: '#ef7fae', e: '🎨', label: 'Art & symbol' },
  burial: { c: '#bda3e6', e: '⚱️', label: 'Burial' },
  tech:   { c: '#5fd0e0', e: '🛠️', label: 'Tools & towns' },
  dna:    { c: '#46d6b2', e: '🧬', label: 'Ancient DNA' },
  voyage: { c: '#f2a13a', e: '⛵', label: 'Voyage & frontier' }
};
const ARCH_SHORT = { neander: 'Neanderthals', deniso: 'Denisovans', erectus: 'H. erectus', flores: 'H. floresiensis', luzon: 'H. luzonensis', naledi: 'H. naledi' };

/* ----------------------------- state & globe ----------------------------- */
const state = { hovered: null, selected: null, share: null };
let globe, baseFeatures = [], spinOn = true, playing = false;
let arcsOn = true, sitesOn = true, paleoOn = true, climateOn = true, archaicOn = true;   // story layers — all on by default
let ARCS = [], iceFeatures = [], archaicFeatures = [];
let paleoLand = [], paleoWater = [], paleoRivers = [];  // built after fetch

/* ---- climate helpers ---- */
function interp(curve, ya) {   // curve is [[ya, val], …] ya-descending
  if (ya <= 0) return curve[curve.length - 1][1];
  for (let i = 0; i < curve.length - 1; i++) { const [y1, v1] = curve[i], [y2, v2] = curve[i + 1]; if (ya <= y1 && ya >= y2) { const f = (y1 - ya) / (y1 - y2); return v1 + f * (v2 - v1); } }
  return curve[0][1];
}
const tempAt = ya => interp(TEMP, ya);          // global mean anomaly °C vs today
const seaLevelAt = ya => interp(SEALEVEL, ya);  // global sea level (m) vs today
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function iceAlpha() { return clamp(0.18 + (-tempAt(curYa())) * 0.13, 0.18, 0.86); }   // colder → more opaque
function lerpHex(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t), g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t), bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t); return `rgb(${r}, ${g}, ${bl})`; }
function climateLabel(anom) { if (anom >= 0.4) return { e: '🔥', txt: anom.toFixed(1) + '°C warmer', cls: 'warm' }; if (anom > -0.5) return { e: '🌡️', txt: 'about like today', cls: 'mild' }; return { e: '❄️', txt: (-anom).toFixed(1) + '°C colder', cls: 'cold' }; }
const elViz = document.getElementById('globeViz');
const tooltip = document.getElementById('tooltip');

function buildArcs() {
  ARCS = [];
  for (const route of MIGRATIONS) {
    for (let i = 0; i < route.pts.length - 1; i++) {
      const a = route.pts[i], b = route.pts[i + 1];
      ARCS.push({ route, lin: route.lin, sLat: a[1], sLng: a[0], eLat: b[1], eLng: b[0], ya: (b[2] != null ? b[2] : route.ya) });
    }
  }
}

/* ----------------------------- active sets ------------------------------- */
function litRegions() { const y = curYa(); return REGIONS.filter(r => regionLit(r, y)); }
function activeArcs() { if (!arcsOn) return []; const y = curYa(); return ARCS.filter(a => y <= a.ya); }
function activeSites() { if (!sitesOn) return []; const y = curYa(); return SITES.filter(s => y <= s.ya); }
const inYa = (o, y) => o.ya1 <= y && y <= o.ya0;     // paleo features carry [ya1 younger, ya0 older]
function activePaleoLand()  { if (!paleoOn) return []; const y = curYa(); return paleoLand.filter(f => inYa(f.properties, y)); }
function activePaleoWater() { if (!paleoOn) return []; const y = curYa(); return paleoWater.filter(f => inYa(f.properties, y)); }
function activePaleoRivers(){ if (!paleoOn) return []; const y = curYa(); return paleoRivers.filter(p => inYa(p, y)); }
function activeIce() { if (!climateOn) return []; const y = curYa(); return iceFeatures.filter(f => f.__ice_d.ya1 <= y && y <= f.__ice_d.ya0); }
function activeArchaic() { if (!archaicOn) return []; const y = curYa(); return archaicFeatures.filter(f => f.__arc_d.ya1 <= y && y <= f.__arc_d.ya0); }

/* the single polygon layer = base + other-humans + Ice-Age land/water + lit regions + ice sheets */
function polygonSet() {
  const regions = litRegions().map(r => r.__feat);
  return baseFeatures.concat(activeArchaic(), activePaleoLand(), activePaleoWater(), regions, activeIce());
}

function capColor(f) {
  if (f.__base)  return 'rgba(196,206,220,0.17)';
  if (f.__land)  return 'rgba(202,178,120,0.44)';
  if (f.__water) return 'rgba(86,150,212,0.42)';
  if (f.__ice)   { const sel = state.selected === 'i:' + f.__ice_d.id, hov = state.hovered === 'i:' + f.__ice_d.id; return `rgba(228,240,252,${clamp(iceAlpha() * (sel ? 1.12 : hov ? 1.06 : 1), 0, 0.94)})`; }
  if (f.__archaic) { const s = f.__arc_d, sel = state.selected === 'a:' + s.id, hov = state.hovered === 'a:' + s.id; return hexA(s.c, sel ? 0.55 : hov ? 0.46 : 0.28); }
  // a lit region — coloured by the deep lineage of its current people
  const r = f.__region, p = peopleAt(r, curYa());
  const c = linColor(p ? p.lin : 'african');
  const sel = state.selected === 'r:' + r.id, hov = state.hovered === 'r:' + r.id;
  return hexA(c, sel ? 0.96 : hov ? 0.9 : 0.82);
}
function sideColor(f) { return f.__base ? 'rgba(0,0,0,0)' : f.__land ? 'rgba(150,128,70,0.4)' : f.__water ? 'rgba(60,110,170,0.4)' : f.__ice ? 'rgba(176,202,232,0.45)' : f.__archaic ? 'rgba(30,30,40,0.35)' : 'rgba(10,16,30,0.45)'; }
function strokeColor(f) { return f.__base ? 'rgba(150,165,195,0.16)' : f.__land ? 'rgba(222,198,150,0.55)' : f.__water ? 'rgba(150,200,240,0.5)' : f.__ice ? 'rgba(232,244,255,0.62)' : f.__archaic ? hexA(f.__arc_d.c, 0.85) : 'rgba(255,250,235,0.5)'; }
function altOf(f) {
  if (f.__base) return 0.002;
  if (f.__land || f.__water) return 0.006;
  if (f.__ice) return state.selected === 'i:' + f.__ice_d.id ? 0.05 : state.hovered === 'i:' + f.__ice_d.id ? 0.03 : 0.016;
  if (f.__archaic) return state.selected === 'a:' + f.__arc_d.id ? 0.05 : state.hovered === 'a:' + f.__arc_d.id ? 0.03 : 0.0135;
  const r = f.__region; return state.selected === 'r:' + r.id ? 0.05 : state.hovered === 'r:' + r.id ? 0.03 : 0.012;
}

/* ------------------------------- globe init ------------------------------ */
function initGlobe(land) {
  baseFeatures = land.features.map(f => ({ type: 'Feature', __base: true, properties: {}, geometry: f.geometry }));
  REGIONS.forEach(r => { r.__feat = { type: 'Feature', __region: true, __reg: r, properties: { name: r.name }, geometry: fixWinding({ type: 'Polygon', coordinates: [r.poly] }) }; r.__feat.__region = r; });
  iceFeatures = ICE.map(s => ({ type: 'Feature', __ice: true, __ice_d: s, properties: { name: s.name }, geometry: fixWinding({ type: 'Polygon', coordinates: [s.poly] }), labLat: s.label[1], labLng: s.label[0] }));
  archaicFeatures = ARCHAIC.map(s => ({ type: 'Feature', __archaic: true, __arc_d: s, properties: { name: s.name }, geometry: fixWinding({ type: 'Polygon', coordinates: [s.poly] }), labLat: s.label[1], labLng: s.label[0] }));

  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#cf8d4a').atmosphereAltitude(0.18)
    .polygonsData(polygonSet())
    .polygonCapColor(capColor).polygonSideColor(sideColor).polygonStrokeColor(strokeColor)
    .polygonAltitude(altOf).polygonsTransitionDuration(0)
    .onPolygonHover(onPolyHover).onPolygonClick(onPolyClick)
    // migration arcs — animated, coloured by lineage, brightening toward the destination
    .arcsData(activeArcs())
    .arcStartLat(d => d.sLat).arcStartLng(d => d.sLng).arcEndLat(d => d.eLat).arcEndLng(d => d.eLng)
    .arcColor(arcColor).arcStroke(d => arcRecent(d) ? 1.5 : 0.6)
    .arcDashLength(0.42).arcDashGap(0.16).arcDashInitialGap(() => 0).arcDashAnimateTime(2000)
    .arcAltitudeAutoScale(0.5).arcsTransitionDuration(0)
    .arcLabel(d => `<b>${d.route.name}</b>`)
    .onArcHover(onArcHover).onArcClick(d => showMigrationDetail(d.route))
    // archaeological sites — coloured dots
    .pointsData(activeSites())
    .pointLat(d => d.lat).pointLng(d => d.lng)
    .pointColor(d => (SITE_KIND[d.kind] || SITE_KIND.fossil).c)
    .pointAltitude(0.012).pointRadius(0.26).pointResolution(10).pointsMerge(false)
    .pointLabel(d => `<b>${(SITE_KIND[d.kind] || {}).e || ''} ${d.name}</b><br>${d.find}`)
    .onPointHover(onPointHover).onPointClick(d => { flyTo(d.lat, d.lng, 1.3); showSiteDetail(d); })
    // lost rivers — gently flowing dashed lines
    .pathsData(activePaleoRivers())
    .pathPoints(d => d.coords).pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathPointAlt(() => 0.012)
    .pathColor(() => 'rgba(240,205,120,0.9)').pathStroke(1.1)
    .pathDashLength(0.05).pathDashGap(0.03).pathDashAnimateTime(5000)
    .pathLabel(d => `🏞 ${d.name} — now gone`).pathTransitionDuration(0)
    // text labels (sites + lit region names), decluttered
    .labelsData([]).labelLat(d => d.lat).labelLng(d => d.lng)
    .labelText(d => d.text).labelColor(d => d.color).labelSize(d => d.size || 0.42)
    .labelDotRadius(0).labelAltitude(d => d.alt || 0.014).labelResolution(2)
    .onLabelClick(onLabelClick);

  const c = globe.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.32; c.enableDamping = true; c.dampingFactor = 0.18; c.zoomToCursor = true;
  const setZoom = () => { c.zoomSpeed = 2.4; }; setZoom(); setTimeout(setZoom, 300); c.addEventListener('change', setZoom);
  // give the globe sphere a dusk-blue "Earth" material so unlit land reads against space
  try { const m = globe.globeMaterial(); m.color.set('#16202f'); m.emissive.set('#0a1018'); m.emissiveIntensity = 0.92; m.shininess = 0; } catch (e) {}
  globe.pointOfView({ lat: 2, lng: 20, altitude: 2.3 });   // open looking at the African cradle
  sizeGlobe();
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  render();
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth).height(elViz.clientHeight); }
window.addEventListener('resize', sizeGlobe);

function arcColor(d) { const c = linColor(d.lin), bright = arcRecent(d); return [hexA(c, bright ? 0.22 : 0.1), hexA(c, bright ? 1 : 0.5)]; }
function arcRecent(d) { const y = curYa(); return d.ya >= y && d.ya < prevYa(); }

/* --------------------------------- render -------------------------------- */
function render() {
  const ya = curYa();
  document.getElementById('eraLabel').textContent = fmtYA(ya);
  document.getElementById('eraCal').textContent = (ya > 0 && ya <= 7000) ? calOf(ya) : '';
  const ei = eraInfo(ya);
  document.getElementById('eraName').textContent = ei.era;
  document.getElementById('timeSlider').value = yearIdx;
  if (state.selected) closeDetail();
  markChapter();

  // climate gauge (temperature + sea level) + globe mood-tint
  const anom = tempAt(ya), cl = climateLabel(anom), sl = Math.round(seaLevelAt(ya));
  const badge = document.getElementById('climateBadge');
  if (climateOn) { badge.className = 'climate-badge ' + cl.cls; badge.innerHTML = `${cl.e} <b>${cl.txt}</b>` + (Math.abs(sl) >= 5 ? ` · seas <b>${sl} m</b>` : ''); }
  badge.classList.toggle('hidden', !climateOn);

  if (globe) {
    globe.polygonsData(polygonSet()).polygonCapColor(capColor).polygonAltitude(altOf);
    globe.arcsData(activeArcs());
    globe.pointsData(activeSites());
    globe.pathsData(activePaleoRivers());
    globe.atmosphereColor(climateOn ? lerpHex('#cf8d4a', '#8fb4e0', clamp(-anom / 5, 0, 1)) : '#cf8d4a');
    rebuildLabels();
  }

  // panel
  const lit = litRegions();
  document.getElementById('pnCount').textContent = '~' + fmtPop(popAt(ya));
  document.getElementById('pnHead').textContent = ei.head;
  document.getElementById('pnYear').textContent = fmtYA(ya);
  document.getElementById('pnStat').innerHTML =
    `<b>${lit.length}</b> region${lit.length === 1 ? '' : 's'} peopled · <b>${activeSites().length}</b> sites`;
  buildList(lit);
}

/* ----------------------------- on-globe labels --------------------------- */
function rebuildLabels() {
  if (!globe) return;
  const labels = [];
  const tryAdd = c => { for (const l of labels) { const dy = l.lat - c.lat, dx = (l.lng - c.lng) * Math.cos(c.lat * Math.PI / 180); if (dx * dx + dy * dy < (c.min || 12)) return; } labels.push(c); };
  // sites first (priority)
  for (const s of activeSites()) tryAdd({ lat: s.lat, lng: s.lng, text: s.name, color: hexA((SITE_KIND[s.kind] || SITE_KIND.fossil).c, 0.96), size: 0.4, alt: 0.02, min: 9 });
  // then lit-region names
  for (const r of litRegions()) { const p = peopleAt(r, curYa()); tryAdd({ lat: r.label[1], lng: r.label[0], text: r.name, color: hexA(linColor(p ? p.lin : 'african'), 0.9), size: 0.52, alt: 0.012, min: 26 }); }
  // other humans
  for (const f of activeArchaic()) tryAdd({ lat: f.labLat, lng: f.labLng, text: ARCH_SHORT[f.__arc_d.id] || f.properties.name, color: hexA(f.__arc_d.c, 0.95), size: 0.4, alt: 0.018, min: 12 });
  // ice sheets
  for (const f of activeIce()) tryAdd({ lat: f.labLat, lng: f.labLng, text: f.properties.name, color: 'rgba(228,240,252,0.92)', size: 0.44, alt: 0.022, min: 22 });
  // then Ice-Age geography
  for (const f of activePaleoWater()) tryAdd({ lat: f.labLat, lng: f.labLng, text: f.properties.name, color: 'rgba(150,200,240,0.92)', size: 0.4, alt: 0.014, min: 16 });
  for (const f of activePaleoLand())  tryAdd({ lat: f.labLat, lng: f.labLng, text: f.properties.name, color: 'rgba(232,206,150,0.92)', size: 0.4, alt: 0.014, min: 16 });
  for (const p of activePaleoRivers()) tryAdd({ lat: p.labLat, lng: p.labLng, text: p.name, color: 'rgba(240,205,120,0.92)', size: 0.38, alt: 0.014, min: 16 });
  globe.labelsData(labels);
}
function onLabelClick(d) {
  const s = SITES.find(x => x.name === d.text); if (s) { flyTo(s.lat, s.lng, 1.3); showSiteDetail(s); return; }
  const r = REGIONS.find(x => x.name === d.text); if (r) { flyToRegion(r); showRegionDetail(r); return; }
  const a = ARCHAIC.find(x => (ARCH_SHORT[x.id] || x.name) === d.text); if (a) { const f = archaicFeatures.find(z => z.__arc_d.id === a.id); if (f) { flyTo(f.labLat, f.labLng, 1.8); showArchaicDetail(f); } }
}

/* ------------------------------ hover/tooltip ---------------------------- */
function moveTip(e) { const r = elViz.getBoundingClientRect(); tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px'; }
elViz.addEventListener('mousemove', e => { if (!tooltip.classList.contains('hidden')) moveTip(e); });
function showTip(html) { tooltip.innerHTML = html; tooltip.classList.remove('hidden'); if (globe) globe.controls().autoRotate = false; }
function hideTip() { tooltip.classList.add('hidden'); if (globe && spinOn && !playing && !state.hovered) globe.controls().autoRotate = true; }

function onPolyHover(f) {
  if (f && f.__ice) { state.hovered = 'i:' + f.__ice_d.id; refresh(); showTip(`<div class="tt-name">❄️ ${f.properties.name}</div><div class="tt-sub">ice sheet · too cold to live</div>`); return; }
  if (f && f.__archaic) { const s = f.__arc_d; state.hovered = 'a:' + s.id; refresh(); showTip(`<div class="tt-name">🧍 ${s.name}</div><div class="tt-sub" style="color:${s.c}">another kind of human · gone by ${fmtYA(s.ya1)}</div>`); return; }
  if (!f || f.__base || f.__land || f.__water) {
    if (f && (f.__land || f.__water)) { showTip(`<div class="tt-name">${f.__water ? '🌊' : '🏝'} ${f.properties.name}</div><div class="tt-sub">${f.__water ? 'lake now shrunk or gone' : 'Ice-Age land · later drowned'}</div>`); state.hovered = null; refresh(); return; }
    state.hovered = null; refresh(); hideTip(); return;
  }
  const r = f.__region, p = peopleAt(r, curYa());
  state.hovered = 'r:' + r.id; refresh();
  showTip(`<div class="tt-name">${r.name}</div><div class="tt-sub" style="color:${linColor(p ? p.lin : 'african')}">${p ? p.name : '—'}</div>`);
}
function onPointHover(d) { if (!d) { hideTip(); return; } const k = SITE_KIND[d.kind] || {}; showTip(`<div class="tt-name">${k.e || ''} ${d.name}</div><div class="tt-sub">${d.find} · ${fmtYA(d.ya)}</div>`); }
function onArcHover(d) { if (!d) { hideTip(); return; } showTip(`<div class="tt-name">${d.route.name}</div><div class="tt-sub" style="color:${linColor(d.lin)}">migration · reached here ${fmtYA(d.ya)}</div>`); }
function refresh() { if (globe) globe.polygonCapColor(capColor).polygonAltitude(altOf); }

/* -------------------------------- detail card ---------------------------- */
const detailCard = document.getElementById('detailCard');
const esc = s => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function setDetail(flag, name, type, rowsHtml, descHtml) {
  document.getElementById('detailFlag').textContent = flag;
  document.getElementById('detailName').textContent = name;
  document.getElementById('detailType').innerHTML = type;
  document.getElementById('detailBody').innerHTML = rowsHtml;
  const dd = document.getElementById('detailDesc');
  if (descHtml) { dd.innerHTML = descHtml; dd.classList.remove('hidden'); } else dd.classList.add('hidden');
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function rows(arr) { return arr.filter(r => r[1]).map(([k, v]) => `<div class="db-row"><span>${k}</span><b>${v}</b></div>`).join(''); }

function showRegionDetail(r) {
  state.selected = 'r:' + r.id; state.share = { region: r.id }; refresh();
  const p = peopleAt(r, curYa());
  const c = linColor(p ? p.lin : 'african');
  if (!p) { setDetail('🗺', r.name, 'Not yet peopled', `<div class="ph-intro">Humans hadn’t reached here yet at ${fmtYA(curYa())}.</div>`, ''); markListActive(r.id); return; }
  const body =
    `<div class="db-lin"><span class="db-sw" style="background:${c}"></span>${esc((LINEAGES[p.lin] || {}).label || p.lin)}</div>` +
    rows([
      ['Who', '<b style="color:' + c + '">' + esc(p.name) + '</b>'],
      ['Here since', fmtYA(p.from)],
      ['mtDNA', esc(p.mt)],
      ['Y-DNA', esc(p.y)],
      ['Ancient DNA', esc(p.adna)],
      ['Living descendants', esc(p.mod)]
    ]);
  // the region's whole sequence of peoples — click to leap to that time
  const tl = r.peoples.map(pp => `<div class="ph-row" data-ya="${pp.from}"><span class="ph-nm" style="color:${linColor(pp.lin)}">${esc(pp.name)}</span><span class="ph-yr">${fmtYA(pp.from)}</span></div>`).join('');
  setDetail('📍', r.name, 'Region · who lived here',
    body + '<div class="ph-intro" style="margin-top:12px">This place through time</div>' + tl,
    `<p>${esc(p.note)}</p><div class="dd-attr">Genetics are characteristic lineages, simplified.</div>`);
  markListActive(r.id);
}
function showSiteDetail(s) {
  state.selected = null; state.share = { site: s.name }; refresh(); markListActive(null);
  const k = SITE_KIND[s.kind] || SITE_KIND.fossil;
  setDetail(k.e, s.name, 'Discovery · ' + esc(k.label),
    rows([['Found', '<b>' + esc(s.find) + '</b>'], ['When', fmtYA(s.ya) + (s.ya <= 7000 ? ' · ' + calOf(s.ya) : '')], ['Location', s.lat.toFixed(1) + '°, ' + s.lng.toFixed(1) + '°']]),
    `<p>${esc(s.note)}</p>`);
}
function showMigrationDetail(route) {
  state.selected = null; state.share = null; refresh(); markListActive(null);
  const c = linColor(route.lin);
  setDetail('➜', route.name, 'Migration route',
    `<div class="db-lin"><span class="db-sw" style="background:${c}"></span>${esc((LINEAGES[route.lin] || {}).label || route.lin)}</div>` +
    rows([['Main era', fmtYA(route.ya)]]),
    `<p>${esc(route.note)}</p>`);
}
function showPaleoDetail(f, kind) {
  state.selected = null; state.share = null; refresh(); markListActive(null);
  const p = f.properties;
  setDetail(kind === 'water' ? '🌊' : '🏝', p.name, kind === 'water' ? 'Vanished lake or sea' : 'Ice-Age land',
    rows([['Existed', fmtYA(p.ya0) + ' – ' + fmtYA(p.ya1)]]), `<p>${esc(p.note || '')}</p>`);
}
function showIceDetail(f) {
  state.selected = 'i:' + f.__ice_d.id; refresh(); markListActive(null); state.share = null;
  const s = f.__ice_d, cl = climateLabel(tempAt(curYa()));
  setDetail('❄️', s.name, 'Ice sheet · the cold north',
    rows([['Global climate now', cl.e + ' ' + cl.txt], ['Present', s.ya1 <= 0 ? 'through every glacial — and today' : fmtYA(s.ya0) + ' – ' + fmtYA(s.ya1)]]),
    `<p>${esc(s.note)}</p>`);
}
function showArchaicDetail(f) {
  state.selected = 'a:' + f.__arc_d.id; refresh(); markListActive(null);
  const s = f.__arc_d; state.share = { archaic: s.id };
  const met = (s.id === 'neander' || s.id === 'deniso') ? 'Yes — and we interbred (their DNA is in us)' : 'Likely overlapped late';
  setDetail('🧍', s.name, 'Another kind of human',
    rows([['Here until', fmtYA(s.ya1)], ['Met modern humans?', met]]),
    `<p>${esc(s.note)}</p>`);
}
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; state.share = null; refresh(); markListActive(null); }
document.getElementById('detailClose').addEventListener('click', closeDetail);
detailCard.addEventListener('click', e => { const row = e.target.closest('.ph-row'); if (row && row.dataset.ya != null) jumpToYa(+row.dataset.ya); });

/* --------------------------------- clicks -------------------------------- */
function onPolyClick(f) {
  if (!f || f.__base) return;
  if (f.__ice) { showIceDetail(f); flyTo(f.labLat, f.labLng, 1.9); return; }
  if (f.__archaic) { showArchaicDetail(f); flyTo(f.labLat, f.labLng, 1.8); return; }
  if (f.__land) { showPaleoDetail(f, 'land'); flyTo(f.labLat, f.labLng, 1.6); return; }
  if (f.__water) { showPaleoDetail(f, 'water'); flyTo(f.labLat, f.labLng, 1.6); return; }
  const r = f.__region; showRegionDetail(r); flyToRegion(r);
}
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); stopPlay(); if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.6 }, 800); } }
function flyToRegion(r) { flyTo(r.label[1], r.label[0], 1.8); }

/* ----------------------------- panel list -------------------------------- */
function buildList(lit) {
  const sorted = [...lit].sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('pnList').innerHTML = sorted.map(r => {
    const p = peopleAt(r, curYa());
    return `<div class="pn-row" data-region="${r.id}"><span class="pn-sw" style="background:${linColor(p ? p.lin : 'african')}"></span><span class="pn-l"><b>${esc(r.name)}</b><span class="pn-who">${esc(p ? p.name : '')}</span></span></div>`;
  }).join('') || '<div class="pn-empty">No people here yet — press ▶ to watch us spread.</div>';
}
function markListActive(id) {
  document.querySelectorAll('#pnList .pn-row').forEach(r => r.classList.toggle('active', r.dataset.region === id));
  const a = id && document.querySelector(`#pnList .pn-row[data-region="${CSS.escape(id)}"]`); if (a) a.scrollIntoView({ block: 'nearest' });
}
document.getElementById('pnList').addEventListener('click', e => { const row = e.target.closest('.pn-row'); if (!row) return; const r = REGIONS.find(x => x.id === row.dataset.region); if (r) { showRegionDetail(r); flyToRegion(r); } });

/* -------------------------------- search --------------------------------- */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  const R = REGIONS.filter(r => r.name.toLowerCase().includes(q) || r.peoples.some(p => p.name.toLowerCase().includes(q) || (p.mod || '').toLowerCase().includes(q))).map(r => ({ kind: 'region', name: r.name, ref: r }));
  const S = SITES.filter(s => s.name.toLowerCase().includes(q) || s.find.toLowerCase().includes(q)).map(s => ({ kind: 'site', name: s.name, sub: fmtYA(s.ya), ref: s }));
  const M = MIGRATIONS.filter(m => m.name.toLowerCase().includes(q)).map(m => ({ kind: 'migration', name: m.name, ref: m }));
  hits = [...S, ...R, ...M].slice(0, 9);
  searchRes.innerHTML = hits.length ? hits.map((h, i) =>
    `<div class="sr-item${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="sr-ic">${h.kind === 'site' ? (SITE_KIND[h.ref.kind] || {}).e : h.kind === 'region' ? '📍' : '➜'}</span>${esc(h.name)}<span class="sr-sub">${h.sub || h.kind}</span></div>`).join('')
    : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) {
  const h = hits[i] || hits[0]; if (!h) return;
  searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
  if (h.kind === 'site') { jumpToYa(h.ref.ya); flyTo(h.ref.lat, h.ref.lng, 1.3); showSiteDetail(h.ref); }
  else if (h.kind === 'region') { jumpToYa(h.ref.peoples[0].from); flyToRegion(h.ref); showRegionDetail(h.ref); }
  else { jumpToYa(h.ref.ya); showMigrationDetail(h.ref); }
}
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ------------------------------- timeline -------------------------------- */
const slider = document.getElementById('timeSlider');
slider.min = 0; slider.max = STOPS_YA.length - 1; slider.value = yearIdx;
slider.addEventListener('input', () => { yearIdx = +slider.value; stopTour(); stopPlay(); render(); });
document.getElementById('prevEra').addEventListener('click', () => { yearIdx = Math.max(0, yearIdx - 1); stopTour(); stopPlay(); render(); });
document.getElementById('nextEra').addEventListener('click', () => { yearIdx = Math.min(STOPS_YA.length - 1, yearIdx + 1); stopTour(); stopPlay(); render(); });
function jumpToYa(ya) { let best = STOPS_YA.length - 1; for (let i = 0; i < STOPS_YA.length; i++) { if (STOPS_YA[i] <= ya) { best = i; break; } } yearIdx = best; stopPlay(); render(); }

const chipsEl = document.getElementById('chips');
chipsEl.innerHTML = CHAPTERS.map((c, i) => `<button class="chip" data-i="${i}" title="${fmtYA(c.ya)}"><span class="chip-e">${c.emoji}</span>${c.label}</button>`).join('');
chipsEl.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { stopTour(); jumpToYa(CHAPTERS[+b.dataset.i].ya); } });
function markChapter() {
  let best = 0, bd = Infinity; const y = curYa();
  CHAPTERS.forEach((c, i) => { const d = Math.abs(c.ya - y); if (d < bd) { bd = d; best = i; } });
  document.querySelectorAll('#chips .chip').forEach((c, i) => { const on = i === best; c.classList.toggle('on', on); if (on) c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
}

let playTimer = null, playDir = 1;
const playFwd = document.getElementById('playFwd'), playBack = document.getElementById('playBack');
function syncPlay() { playFwd.textContent = (playing && playDir > 0) ? '⏸' : '▶'; playBack.textContent = (playing && playDir < 0) ? '⏸' : '◀'; playFwd.classList.toggle('on', playing && playDir > 0); playBack.classList.toggle('on', playing && playDir < 0); }
function stopPlay() { playing = false; if (playTimer) { clearInterval(playTimer); playTimer = null; } syncPlay(); if (globe && !state.hovered) globe.controls().autoRotate = spinOn && !playing; }
function startPlay(dir) {
  stopTour();
  if (playing && playDir === dir) { stopPlay(); return; }
  playDir = dir; playing = true;
  if (dir > 0 && yearIdx >= STOPS_YA.length - 1) yearIdx = 0;
  if (dir < 0 && yearIdx <= 0) yearIdx = STOPS_YA.length - 1;
  syncPlay(); if (globe) globe.controls().autoRotate = false;
  if (playTimer) clearInterval(playTimer);
  playTimer = setInterval(() => { const n = yearIdx + playDir; if (n < 0 || n > STOPS_YA.length - 1) { stopPlay(); return; } yearIdx = n; render(); }, 1150);
}
playFwd.addEventListener('click', () => startPlay(1));
playBack.addEventListener('click', () => startPlay(-1));

/* --------------------------------- menu ---------------------------------- */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function toggleBtn(id, get, set) {
  const el = document.getElementById(id);
  const sync = () => { const s = el.querySelector('.mi-state'); if (s) s.textContent = get() ? 'On' : 'Off'; el.classList.toggle('on', get()); };
  el.addEventListener('click', () => { set(!get()); sync(); render(); }); sync(); return sync;
}
const miSpin = document.getElementById('miSpin');
function syncSpin() { const s = miSpin.querySelector('.mi-state'); if (s) s.textContent = spinOn ? 'On' : 'Off'; miSpin.classList.toggle('on', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !playing) globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
toggleBtn('miArcs', () => arcsOn, v => arcsOn = v);
toggleBtn('miSites', () => sitesOn, v => sitesOn = v);
toggleBtn('miArchaic', () => archaicOn, v => archaicOn = v);
toggleBtn('miClimate', () => climateOn, v => climateOn = v);
toggleBtn('miPaleo', () => paleoOn, v => paleoOn = v);
document.getElementById('miReset').addEventListener('click', () => { closeDetail(); if (globe) globe.pointOfView({ lat: 2, lng: 20, altitude: 2.3 }, 700); menu.classList.add('hidden'); });
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });

/* ------------------------------- legend ---------------------------------- */
const legend = document.getElementById('legend');
document.getElementById('legendStrip').innerHTML = Object.values(LINEAGES).map(l => `<span style="background:${l.c}"></span>`).join('');
document.getElementById('legendBody').innerHTML =
  '<div class="lg-h">Region colour — genetic lineage</div>' +
  Object.values(LINEAGES).map(l => `<div class="lg-row"><span class="lg-sw" style="background:${l.c}"></span>${esc(l.label)}</div>`).join('') +
  '<div class="lg-h" style="margin-top:8px">Site dots — discoveries</div>' +
  Object.values(SITE_KIND).map(k => `<div class="lg-row"><span class="lg-dot" style="background:${k.c}"></span>${k.e} ${esc(k.label)}</div>`).join('') +
  '<div class="lg-h" style="margin-top:8px">Other humans — we met &amp; replaced</div>' +
  ARCHAIC.map(a => `<div class="lg-row"><span class="lg-sw" style="background:${a.c}"></span>${esc(ARCH_SHORT[a.id] || a.name)}</div>`).join('') +
  '<div class="lg-h" style="margin-top:8px">The Ice-Age world</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:rgba(228,240,252,.85)"></span>Ice sheets — too cold to live</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:rgba(202,178,120,.72)"></span>Land bridges — bared as seas fell</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:rgba(86,150,212,.7)"></span>Lakes &amp; seas now gone</div>';
const toggleLegend = () => legend.classList.toggle('collapsed');
document.getElementById('legendToggle').addEventListener('click', toggleLegend);
document.getElementById('legendStrip').addEventListener('click', toggleLegend);
document.getElementById('miLegend').addEventListener('click', () => { legend.classList.remove('collapsed'); menu.classList.add('hidden'); });

/* --------------------------- about / welcome ----------------------------- */
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN_KEY = 'ahou_seen_v1';
const welcome = document.getElementById('welcomeOverlay');
const showWelcome = () => welcome.classList.remove('hidden');
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); showWelcome(); });
try { if (!localStorage.getItem(SEEN_KEY)) showWelcome(); } catch (e) { showWelcome(); }

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); aboutOverlay.classList.add('hidden'); if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === 'ArrowLeft') { yearIdx = Math.max(0, yearIdx - 1); stopTour(); stopPlay(); render(); }
  else if (e.key === 'ArrowRight') { yearIdx = Math.min(STOPS_YA.length - 1, yearIdx + 1); stopTour(); stopPlay(); render(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); spinOn = !spinOn; if (globe && !playing) globe.controls().autoRotate = spinOn; syncSpin(); }
});

/* ----------------------- share a moment + deep links --------------------- */
function shareURL() {
  let u = location.origin + location.pathname + '?ya=' + curYa();
  const s = state.share;
  if (s) { if (s.region) u += '&region=' + s.region; else if (s.site) u += '&site=' + encodeURIComponent(s.site); else if (s.archaic) u += '&archaic=' + s.archaic; }
  return u;
}
let toastTimer = null;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400); }
document.getElementById('miShare').addEventListener('click', async () => {
  menu.classList.add('hidden');
  const u = shareURL();
  try { await navigator.clipboard.writeText(u); toast('🔗 Link copied — it opens at ' + fmtYA(curYa())); }
  catch (e) { toast('Copy this link: ' + u); }
});
function applyDeepLink() {
  try {
    const q = new URLSearchParams(location.search);
    const ya = q.get('ya'); if (ya != null && ya !== '' && !isNaN(+ya)) jumpToYa(+ya);
    const rg = q.get('region'), st = q.get('site'), ar = q.get('archaic');
    if (rg) { const r = REGIONS.find(x => x.id === rg); if (r) { flyToRegion(r); showRegionDetail(r); } }
    else if (st) { const s = SITES.find(x => x.name.toLowerCase() === st.toLowerCase()); if (s) { flyTo(s.lat, s.lng, 1.3); showSiteDetail(s); } }
    else if (ar) { const f = archaicFeatures.find(x => x.__arc_d.id === ar); if (f) { flyTo(f.labLat, f.labLng, 1.8); showArchaicDetail(f); } }
    if ((ya != null && ya !== '') || rg || st || ar) hideWelcome();
  } catch (e) {}
}

/* ------------------------------ guided tour ------------------------------ */
const TOUR = [
  { ya: 200000, lat: 2, lng: 22, alt: 2.3, cap: 'We all begin here. 200,000 years ago every human alive lives in Africa — with the deepest roots in the south.' },
  { ya: 100000, lat: -30, lng: 22, alt: 1.9, cap: 'On the southern coast, the first art appears: engraved ochre and shell-bead jewellery at Blombos. Minds like ours.' },
  { ya: 60000, lat: 14, lng: 50, alt: 2.1, cap: 'The great journey out of Africa — across the Bab-el-Mandeb strait and along the coast of Arabia and India.' },
  { ya: 65000, lat: -12, lng: 128, alt: 2.0, cap: 'Astonishingly early, people cross the open sea to Australia — humanity’s first mariners.' },
  { ya: 45000, lat: 48, lng: 22, alt: 2.0, cap: 'Into Ice-Age Europe, where we meet — and slowly replace — the Neanderthals, mixing with them along the way.' },
  { ya: 20000, lat: 58, lng: -25, alt: 2.1, cap: 'The Ice-Age peak: vast ice sheets, seas 125 m lower. Land bridges open; people shelter in the warmer south.' },
  { ya: 15000, lat: 52, lng: -150, alt: 2.2, cap: 'As the ice melts, people cross Beringia into the Americas — and sweep all the way to Patagonia within millennia.' },
  { ya: 11000, lat: 36, lng: 40, alt: 1.9, cap: 'The world warms. Farming and the first towns begin in the Fertile Crescent — humanity starts to settle down.' },
  { ya: 5000, lat: 28, lng: 95, alt: 2.4, cap: 'Steppe herders reshape Eurasia; Austronesian sailors begin island-hopping deep into the empty Pacific.' },
  { ya: 750, lat: -32, lng: 174, alt: 2.0, cap: 'The last great landfall: Polynesians reach New Zealand around 1300 CE. The map of humanity is complete.' },
  { ya: 0, lat: 12, lng: 28, alt: 2.5, cap: '8.1 billion people on every continent — one family, one African origin. This is a history of us.' }
];
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; document.getElementById('tourCaption').classList.add('hidden'); document.getElementById('tourBtn').classList.remove('on'); if (globe) globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const t = TOUR[tourIdx];
  jumpToYa(t.ya);
  if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat: t.lat, lng: t.lng, altitude: t.alt }, 1500); }
  const cap = document.getElementById('tourCaption');
  cap.innerHTML = `<span class="tc-yr">${fmtYA(t.ya)}</span><span class="tc-tx">${esc(t.cap)}</span><span class="tc-skip" title="End tour">✕</span>`;
  cap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 7200);
}
function startTour() {
  if (tourActive()) { stopTour(); return; }
  stopPlay(); closeDetail(); legend.classList.add('collapsed'); menu.classList.add('hidden');
  tourIdx = 0; document.getElementById('tourBtn').classList.add('on'); tourStep();
}
document.getElementById('tourBtn').addEventListener('click', startTour);
document.getElementById('miTour').addEventListener('click', startTour);
document.getElementById('tourCaption').addEventListener('click', e => {
  if (e.target.classList.contains('tc-skip')) { stopTour(); return; }
  if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); }   // click caption = next chapter
});

/* ------------------------- paleogeography transform ---------------------- */
const calToYa = cal => NOW_CAL - cal;     // calendar year (neg = BCE) → years ago
const PALEO_OVR = {            // human-journey ya ranges [older, younger]
  'Tamanrasset (Green Sahara river)': [15000, 5000], 'Lake Mega-Chad': [15000, 5000],
  'Channel River (Fleuve Manche)': [115000, 9000], 'Po (Adriatic plain)': [115000, 9000],
  'Hudson (shelf valley)': [115000, 11000], 'Lake Agassiz': [16000, 8000],
  'Lake Bonneville': [30000, 13000], 'Lake Lahontan': [30000, 13000],
  'Khvalynian Caspian (giant Caspian)': [20000, 11000], 'West Siberian Lake (Mansi)': [90000, 12000],
  'Black Sea (freshwater lake)': [115000, 7600], 'Lake Carpentaria': [115000, 10000]
};
function makePoly(f, flag) { const ring = (f.geometry && f.geometry.coordinates) ? f.geometry.coordinates[0] : []; const [lng, lat] = centroidOf(ring); const o = { type: 'Feature', properties: Object.assign({}, f.properties), geometry: fixWinding(f.geometry), labLat: lat, labLng: lng }; o[flag] = true; return o; }

async function loadPaleo() {
  try {
    const [lb, pa] = await Promise.all([
      fetch('data/landbridges.geojson').then(r => r.json()),
      fetch('data/paleo.geojson').then(r => r.json())
    ]);
    // land bridges — exposed through the last glacial; drowned at their stated date
    paleoLand = lb.features.map(f => { const o = makePoly(f, '__land'); o.properties.ya0 = 115000; o.properties.ya1 = Math.max(0, calToYa(f.properties.toYear)); return o; });
    // paleo lakes → filled water; rivers → flowing lines
    for (const f of pa.features) {
      const nm = f.properties.name, ovr = PALEO_OVR[nm];
      const ya0 = ovr ? ovr[0] : Math.max(1, calToYa(f.properties.fromYear));
      const ya1 = ovr ? ovr[1] : Math.max(0, calToYa(f.properties.toYear));
      if (f.properties.kind === 'lake') { const o = makePoly(f, '__water'); o.properties.ya0 = ya0; o.properties.ya1 = ya1; paleoWater.push(o); }
      else { const line = f.geometry.type === 'LineString' ? f.geometry.coordinates : (f.geometry.coordinates[0] || []); if (line.length > 1) { const [lng, lat] = line[Math.floor(line.length / 2)]; paleoRivers.push({ name: nm, note: f.properties.note, coords: line, ya0, ya1, labLat: lat, labLng: lng }); } }
    }
    // the Makgadikgadi–Okavango homeland wetland (deep past, near the southern cradle)
    paleoWater.push({
      type: 'Feature', __water: true,
      properties: { name: 'Makgadikgadi palaeo-wetland', ya0: 250000, ya1: 70000, note: 'A vast wetland in northern Botswana — proposed in one study as the homeland of our deepest maternal lineage (mtDNA L0) ~200,000 ya. As it dried, populations dispersed. The idea is evocative but contested; most researchers favour a pan-African origin.' },
      geometry: fixWinding({ type: 'Polygon', coordinates: [[[22, -18], [25.5, -18.3], [26, -20.5], [24.5, -22], [22, -21], [21, -19.5], [22, -18]]] }),
      labLat: -20, labLng: 23.7
    });
  } catch (e) { console.warn('paleo load failed', e); }
}

/* --------------------------------- boot ---------------------------------- */
buildArcs();
Promise.all([
  fetch('data/countries.geojson').then(r => r.json()),
  loadPaleo()
]).then(([land]) => { initGlobe(land); applyDeepLink(); })
  .catch(err => { console.error('data load failed', err); elViz.innerHTML = '<div style="color:#caa;text-align:center;padding-top:40vh">Could not load map data.</div>'; });
