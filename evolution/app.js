/* ============================================================================
   A short history of evolution on earth — engine.
   A continuous deep-time globe: real drifting continents (GPlates/Merdith 2021),
   life forms that ignite at their true age & palaeo-place, animated cataclysms,
   and a morphing "headline life-form" spotlight. Data: dataset.js + data.js.
   Forked in spirit from the "A History of Us" globe (globe.gl). 42-apps.
   ========================================================================== */
'use strict';

/* --------------------------------- state --------------------------------- */
let ma = MA_MAX;                 // current time (Ma ago) — begin at the beginning
let pos = maToPos(ma);           // warped axis position 0..1 (oldest→today)
let globe, SLICE_AGES = [], PALEO = {}, sliceCache = {};
let playing = false, playDir = 1, spinOn = true;
let lifeOn = true, eventsOn = true, platesOn = true;
const SPEEDS = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250];
let speedIdx = 2;                // 1×
const BASE_SECONDS = 150;        // full 4.5-Gyr sweep at 1×
const state = { hovered: null, selected: null };

const elViz = document.getElementById('globeViz');
const tooltip = document.getElementById('tooltip');
const flashEl = document.getElementById('flash');
const bannerEl = document.getElementById('eventBanner');

/* ------------------------------ formatting ------------------------------- */
function fmtMa(m) {
  if (m <= 0) return 'Today';
  if (m < 0.0025) return Math.round(m * 1e6).toLocaleString() + ' years ago';
  if (m < 1) return Math.round(m * 1000).toLocaleString() + ',000 years ago';
  if (m < 1000) return (m < 10 ? m.toFixed(1) : Math.round(m).toLocaleString()) + ' million years ago';
  return (m / 1000).toFixed(2) + ' billion years ago';
}
function fmtMaShort(m) {
  if (m <= 0) return 'now';
  if (m < 1) return Math.round(m * 1000) + ' ka';
  if (m < 1000) return (m < 10 ? m.toFixed(1) : Math.round(m)) + ' Ma';
  return (m / 1000).toFixed(2) + ' Ga';
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = s => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function lerpHex(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t),
        g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t),
        bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`; }

/* ------------------------------ chronology ------------------------------- */
function spanOf(rank, m) { for (const s of GEOSCALE) if (s.rank === rank && m <= s.start && m > s.end - 1e-9) return s; return null; }
function chrono(m) {
  return { eon: spanOf('eon', m), era: spanOf('era', m), period: spanOf('period', m), epoch: spanOf('epoch', m) };
}

/* ------------------------------ land slices ------------------------------ */
function nearestSlice(m) { let best = SLICE_AGES[0], bd = Infinity; for (const a of SLICE_AGES) { const d = Math.abs(a - m); if (d < bd) { bd = d; best = a; } } return best; }
function landKey(m) {
  if (m > 4000) return 'magma';
  if (m > 1000) return 'craton' + Math.round(m / 50) * 50;
  return 'slice' + nearestSlice(m);
}
function buildSliceFeatures(age) {
  if (sliceCache['slice' + age]) return sliceCache['slice' + age];
  const rings = PALEO[String(age)] || [];
  const feats = rings.map(r => ({ type: 'Feature', __land: true, properties: {}, geometry: { type: 'Polygon', coordinates: [r] } }));
  sliceCache['slice' + age] = feats; return feats;
}
function buildCratons(m) {
  const feats = [];
  for (const c of CRATONS) {
    if (m > c.appear) continue;
    // grow in over ~300 Myr after appearance
    const grow = clamp((c.appear - m) / 300, 0.15, 1);
    feats.push({ type: 'Feature', __land: true, __craton: true, __grow: grow, properties: { name: c.name }, geometry: { type: 'Polygon', coordinates: [c.poly] } });
  }
  return feats;
}
function landFeatures(m) {
  if (!platesOn) return [];
  if (m > 4000) return [];
  if (m > 1000) return buildCratons(m);
  return buildSliceFeatures(nearestSlice(m));
}

/* ------------------------------- world tint ------------------------------ */
function worldTint(m) {
  const sb = snowballAt(m);
  let globeColor, emissive, emiI, atmo, atmoAlt;
  if (m > 4000) {                                   // Hadean magma
    const t = clamp((4600 - m) / 600, 0, 1);        // 0 at 4600 → 1 at 4000
    globeColor = lerpHex('#ff5a1e', '#40160a', t);
    emissive = lerpHex('#ff7a2a', '#601505', t);
    emiI = 1.25 - 0.55 * t;
    atmo = lerpHex('#ff8a3a', '#c85a2a', t); atmoAlt = 0.30 - 0.06 * t;
  } else {
    // ocean colour: methane-orange archean → blue after the GOE (~2400 Ma)
    const g = clamp((2600 - m) / 500, 0, 1);         // 0 before GOE → 1 well after
    globeColor = lerpHex('#243b2e', '#123a58', g);   // greenish anoxic → blue
    emissive = '#050c14'; emiI = 0.9;
    atmo = lerpHex('#d68a34', '#6fa8e0', g); atmoAlt = 0.18;
  }
  if (sb > 0) {                                      // snowball / ice age whitening
    globeColor = lerpHex(globeColor.startsWith('#') ? globeColor : rgbToHex(globeColor), '#e6eef4', sb * 0.72);
    atmo = lerpHex(atmo.startsWith('#') ? atmo : rgbToHex(atmo), '#cfe6f6', sb * 0.6);
    emiI *= (1 - sb * 0.5);
  }
  return { globeColor, emissive, emiI, atmo, atmoAlt };
}
function rgbToHex(rgb) { const m = rgb.match(/\d+/g); if (!m) return '#123a58'; return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join(''); }

/* ------------------------------- markers ---------------------------------
   A marker "ignites" as time nears its age and fades as time moves on. The
   visibility window scales with the item's OWN age (a proportional tolerance):
   the deep, sparse past gets wide windows; the crowded recent past gets tight
   ones — so agriculture (12 ka) never bleeds into 300 ka. */
function markerCoords(o) {  // paleo coords if available else modern
  const la = (o.plat != null ? o.plat : o.lat), ln = (o.plng != null ? o.plng : o.lng);
  return (la == null || ln == null) ? null : [la, ln];
}
function windowTol(age) { return clamp(0.09 * age, 0.02, 320); }   // Ma
function lifeAlpha(m, appear) { const t = windowTol(appear); const d = Math.abs(m - appear); return d >= t ? 0 : 1 - d / t; }
function eventAlpha(m, at) { const t = windowTol(at) * 1.15; const d = Math.abs(m - at); return d >= t ? 0 : 1 - d / t; }

function activeLife() {
  if (!lifeOn) return [];
  const out = [];
  for (const l of LIFE) {
    const a = lifeAlpha(ma, l.appear_ma); if (a <= 0.02) continue;
    const c = markerCoords(l); if (!c) continue;
    out.push({ kind: 'life', ref: l, name: l.name, lat: c[0], lng: c[1], color: cladeColor(l.clade), alpha: a, imp: l.importance || 2 });
  }
  return out;
}
function activeEvents() {
  if (!eventsOn) return [];
  const out = [];
  for (const e of EVENTS) {
    const a = eventAlpha(ma, e.ma); if (a <= 0.02) continue;
    const c = markerCoords(e);
    out.push({ kind: 'event', ref: e, name: e.name, lat: c ? c[0] : null, lng: c ? c[1] : null, color: eventColor(e), alpha: a, imp: e.importance || 2, global: !c });
  }
  return out;
}
const EVENT_COLORS = { impact: '#ff7a3a', volcanic: '#ff5a3a', formation: '#ffb04a', tectonic: '#c9a05e', atmosphere: '#7fd0e0', climate: '#bfe4ff', ocean: '#5fc7e0', geologic: '#c0a878', milestone: '#8ff0bd' };
function eventColor(e) { return EVENT_COLORS[e.kind] || '#d8c8a0'; }

// ring layer = dramatic located events (impacts/volcanic) near their moment
function ringSet() {
  if (!eventsOn) return [];
  return activeEvents().filter(e => e.lat != null && (e.ref.kind === 'impact' || e.ref.kind === 'volcanic' || e.imp >= 5))
    .map(e => ({ lat: e.lat, lng: e.lng, color: e.color, alpha: e.alpha, maxR: 3 + e.imp * 1.6, ref: e.ref }));
}

/* --------------------------------- globe --------------------------------- */
function keyOf(ref) { return (ref.appear_ma != null ? 'l:' : 'e:') + ref.name; }
function hex6(c) { if (c.startsWith('#')) return c; const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join(''); }
// combined emoji-marker set: life forms + located events, with co-located spread.
// Uses a persistent registry so globe.gl reuses DOM elements across frames
// (stable identity) — markers fade/scale live instead of flickering on rebuild.
const markerReg = new Map();
function markerSet() {
  const arr = activeLife().concat(activeEvents().filter(e => e.lat != null));
  const groups = {};
  for (const m of arr) { const k = Math.round(m.lat * 2) / 2 + ',' + Math.round(m.lng * 2) / 2; (groups[k] = groups[k] || []).push(m); }
  for (const k in groups) {
    const g = groups[k]; g.sort((a, b) => b.imp - a.imp || b.alpha - a.alpha);
    if (g.length > 1) { const rad = 1.4 + 0.5 * g.length; g.forEach((m, i) => { const ang = i / g.length * 2 * Math.PI - Math.PI / 2; m.dlat = m.lat + rad * Math.sin(ang); m.dlng = m.lng + rad * Math.cos(ang) / Math.max(0.34, Math.cos(m.lat * Math.PI / 180)); }); }
    g.forEach((m, i) => { m._labelOK = (m.imp >= 4 && m.alpha > 0.5) && (g.length <= 2 || i === 0); });
  }
  const out = [], seen = new Set();
  for (const m of arr) {
    const key = keyOf(m.ref); if (seen.has(key)) continue; seen.add(key);
    let w = markerReg.get(key);
    if (!w) { w = { key: key, ref: m.ref, kind: m.kind, color: m.color }; markerReg.set(key, w); }
    w.name = m.name; w.lat = m.lat; w.lng = m.lng; w.dlat = m.dlat; w.dlng = m.dlng; w.alpha = m.alpha; w.imp = m.imp;
    w._labelOK = m._labelOK;
    if (w._el) styleMarkerEl(w._el, w);
    out.push(w);
  }
  for (const k of Array.from(markerReg.keys())) if (!seen.has(k)) markerReg.delete(k);
  return out;
}
function buildMarkerEl(d) {
  const el = document.createElement('div');
  el.className = 'mk mk-' + d.kind + (d.imp >= 5 ? ' mk-big' : d.imp >= 4 ? ' mk-mid' : '');
  const col = hex6(d.color);
  const emoji = (d.ref.emoji || (d.kind === 'life' ? '•' : '✦'));
  const labelSpan = d.imp >= 4 ? `<span class="mk-l" style="color:${hexA(col, .96)}">${esc(d.name)}</span>` : '';
  el.innerHTML = `<span class="mk-e" style="--gl:${col}">${emoji}</span>` + labelSpan;
  el.title = d.name;
  el.addEventListener('mouseenter', () => onMarkerHover(d));
  el.addEventListener('mouseleave', () => { state.hovered = null; hideTip(); });
  el.addEventListener('click', ev => { ev.stopPropagation(); onMarkerClick(d); });
  d._el = el; styleMarkerEl(el, d);
  return el;
}
function styleMarkerEl(el, d) {
  el.style.opacity = clamp(0.22 + 0.78 * d.alpha, 0, 1);
  el.style.setProperty('--sc', (0.7 + 0.09 * (d.imp || 2) + 0.14 * d.alpha).toFixed(2));
  const lab = el.querySelector('.mk-l'); if (lab) lab.style.display = d._labelOK ? '' : 'none';
}

function mixHex(a, b, t) { const c = lerpHex(a, b, t), m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join(''); }
function landCap(m) {
  const sb = snowballAt(m);
  let base = m > 1000 ? '#8f7850' : '#cba063';        // ancient shields vs continents
  if (m <= 430) base = mixHex('#cba063', '#7cb050', clamp((430 - m) / 100, 0, 0.66)); // greening after land plants
  if (sb > 0) base = mixHex(base, '#eef4f8', sb * 0.7);
  return base;
}

function initGlobe() {
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#6fa8e0').atmosphereAltitude(0.18)
    .polygonsData(landFeatures(ma))
    .polygonCapColor(() => hexA(landCap(ma), 0.97))
    .polygonSideColor(() => 'rgba(40,30,15,0.35)')
    .polygonStrokeColor(() => 'rgba(30,22,10,0.5)')
    .polygonAltitude(f => f.__craton ? 0.006 : 0.008).polygonsTransitionDuration(0)
    .onPolygonHover(() => {}).onPolygonClick(() => {})
    .htmlElementsData(markerSet())
    .htmlLat(d => d.dlat != null ? d.dlat : d.lat).htmlLng(d => d.dlng != null ? d.dlng : d.lng)
    .htmlAltitude(d => 0.028 + 0.02 * (d.imp || 2) / 5)
    .htmlElement(buildMarkerEl)
    .ringsData(ringSet())
    .ringLat(d => d.lat).ringLng(d => d.lng)
    .ringColor(d => (t => hexA(d.color.startsWith('#') ? d.color : rgbToHex(d.color), (1 - t) * d.alpha)))
    .ringMaxRadius(d => d.maxR).ringPropagationSpeed(d => d.maxR * 0.9).ringRepeatPeriod(() => 900);

  const c = globe.controls();
  c.autoRotate = true; c.autoRotateSpeed = 0.34; c.enableDamping = true; c.dampingFactor = 0.18; c.zoomToCursor = true;
  const setZoom = () => { c.zoomSpeed = 2.2; }; setZoom(); setTimeout(setZoom, 300); c.addEventListener('change', setZoom);
  applyGlobeMaterial();
  // ambient fill + a camera-following "headlight" so whatever face you look at is lit
  let dirLight = null;
  try { globe.lights().forEach(l => { if (l.type === 'AmbientLight') l.intensity = 1.9; else if (l.type === 'DirectionalLight') { l.intensity = 2.1; dirLight = l; } }); } catch (e) {}
  try { const cam = globe.camera(); const headlight = () => { if (dirLight && cam) dirLight.position.copy(cam.position); }; c.addEventListener('change', headlight); headlight(); } catch (e) {}
  globe.pointOfView({ lat: 12, lng: 20, altitude: 2.6 });
  sizeGlobe();
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  render();
}
function applyGlobeMaterial() {
  try {
    const w = worldTint(ma), m = globe.globeMaterial();
    m.color.set(w.globeColor); m.emissive.set(w.emissive); m.emissiveIntensity = w.emiI; m.shininess = 4;
    globe.atmosphereColor(w.atmo).atmosphereAltitude(w.atmoAlt);
  } catch (e) {}
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth).height(elViz.clientHeight); }
window.addEventListener('resize', sizeGlobe);

/* --------------------------------- render -------------------------------- */
let lastLandKey = '';
function renderGlobe() {
  if (!globe) return;
  const lk = landKey(ma);
  if (lk !== lastLandKey) { globe.polygonsData(landFeatures(ma)); lastLandKey = lk; }
  globe.polygonCapColor(() => hexA(landCap(ma), 0.97));
  globe.htmlElementsData(markerSet());
  globe.ringsData(ringSet());
  applyGlobeMaterial();
}
function render() { renderGlobe(); updateHUD(); }

/* --------------------------------- HUD ----------------------------------- */
const $ = id => document.getElementById(id);
function updateHUD() {
  $('eraLabel').textContent = fmtMa(ma);
  const ch = chrono(ma);
  const chron = [ch.eon && ch.eon.name, ch.period && ch.period.name, ch.epoch && ch.epoch.name].filter(Boolean).join(' · ');
  $('eraChrono').textContent = chron;
  $('timeSlider').value = Math.round(maToPos(ma) * 1000);

  // spotlight
  const st = stageAt(ma);
  const stColor = ch.period ? ch.period.color : (ch.eon ? ch.eon.color : '#7fd0a0');
  const art = $('spArt');
  if (art.dataset.sid !== st.id) { art.dataset.sid = st.id; art.innerHTML = `<svg viewBox="0 0 120 80">${SIL[st.id] || ''}</svg>`; }
  art.style.color = stColor;
  $('spName').textContent = st.name;
  $('spSub').textContent = st.sub;
  $('spWhat').innerHTML = whatsHappening();

  // gauges
  $('ggEonV').textContent = [ch.eon && ch.eon.name, ch.era && ch.era.name].filter(Boolean).join(' · ') || '—';
  $('ggPeriodV').textContent = (ch.period ? ch.period.name : '—') + (ch.epoch ? ' · ' + ch.epoch.name : '');
  const o2 = interpMa(O2, ma);
  $('ggO2V').textContent = o2 < 0.5 ? '≈ none' : o2.toFixed(o2 < 5 ? 1 : 0) + '%';
  $('ggO2Bar').style.width = clamp(o2 / 35 * 100, 1, 100) + '%';
  const tp = interpMa(TEMP, ma), sb = snowballAt(ma);
  $('ggTempV').innerHTML = climateLabel(tp, sb);
  const nLife = activeLife().length, nEv = activeEvents().length;
  $('ggLifeV').textContent = nLife + ' form' + (nLife === 1 ? '' : 's') + (nEv ? ' · ' + nEv + ' event' + (nEv === 1 ? '' : 's') : '');

  // climate badge
  const badge = $('climateBadge');
  if (sb > 0.3) { badge.className = 'climate-badge cold'; badge.innerHTML = '❄️ <b>Snowball / ice age</b>'; badge.classList.remove('hidden'); }
  else if (ma > 4000) { badge.className = 'climate-badge hot'; badge.innerHTML = '🌋 <b>Molten world</b>'; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');

  // rate readout
  $('rateRead').textContent = rateText();
  markChapter();
}
function climateLabel(tp, sb) {
  if (sb > 0.3) return '❄️ frozen · ' + Math.round(tp) + '°C';
  if (tp >= 200) return '🌋 molten';
  if (tp >= 26) return '🔥 hothouse · ' + Math.round(tp) + '°C';
  if (tp >= 18) return '☀️ warm · ' + Math.round(tp) + '°C';
  if (tp >= 10) return '🌡️ temperate · ' + Math.round(tp) + '°C';
  return '🥶 icehouse · ' + Math.round(tp) + '°C';
}
function whatsHappening() {
  let best = null, bd = Infinity;
  for (const e of EVENTS) { if ((e.importance || 0) < 4) continue; const t = windowTol(e.ma) * 1.15, d = Math.abs(ma - e.ma) / t; if (d < 1 && d < bd) { bd = d; best = { emoji: e.emoji, txt: e.blurb }; } }
  for (const l of LIFE) { if ((l.importance || 0) < 4) continue; const t = windowTol(l.appear_ma), d = Math.abs(ma - l.appear_ma) / t; if (d < 1 && d < bd) { bd = d; best = { emoji: l.emoji, txt: 'First appearance: <b>' + esc(l.name) + '</b>. ' + l.blurb }; } }
  if (!best) { const st = stageAt(ma); return `<span class="sp-emoji">🌍</span> ${esc(st.sub)}.`; }
  return `<span class="sp-emoji">${best.emoji || '✨'}</span> ${best.txt}`;
}
function rateText() {
  const dpos = SPEEDS[speedIdx] / BASE_SECONDS;       // pos per second
  const eps = 0.0015, p = maToPos(ma);
  const dmadp = Math.abs(posToMa(clamp(p + eps, 0, 1)) - posToMa(clamp(p - eps, 0, 1))) / (2 * eps);
  const myrPerSec = dmadp * dpos;                     // Ma per real second
  let s;
  if (myrPerSec >= 1000) s = (myrPerSec / 1000).toFixed(1) + ' Gyr/s';
  else if (myrPerSec >= 1) s = Math.round(myrPerSec) + ' Myr/s';
  else if (myrPerSec >= 0.001) s = Math.round(myrPerSec * 1000) + ' kyr/s';
  else s = Math.round(myrPerSec * 1e6) + ' yr/s';
  return '≈ ' + s;
}

/* ------------------------------- playback -------------------------------- */
let rafId = null, lastT = 0, heavyAccum = 0;
function frame(t) {
  if (!lastT) lastT = t; const dt = t - lastT; lastT = t;
  if (playing) {
    const prevMa = ma;
    pos = clamp(pos + playDir * (dt / 1000) / BASE_SECONDS * SPEEDS[speedIdx], 0, 1);
    ma = posToMa(pos);
    updateHUD();
    heavyAccum += dt;
    if (heavyAccum >= 80) { heavyAccum = 0; renderGlobe(); }
    checkTriggers(prevMa, ma);
    if (pos >= 1 && playDir > 0) { ma = 0; pos = 1; stopPlay(); render(); }
    if (pos <= 0 && playDir < 0) { stopPlay(); }
    rafId = requestAnimationFrame(frame);
  }
}
function startPlay() {
  if (playing) return;
  if (pos >= 1) { pos = 0; ma = MA_MAX; }
  playing = true; lastT = 0; heavyAccum = 0;
  if (globe) globe.controls().autoRotate = false;
  syncPlay(); rafId = requestAnimationFrame(frame);
}
function stopPlay() { playing = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; if (globe && !state.hovered) globe.controls().autoRotate = spinOn; syncPlay(); }
function togglePlay() { playing ? stopPlay() : startPlay(); }
function syncPlay() { const b = $('playBtn'); b.textContent = playing ? '⏸' : '▶'; b.classList.toggle('on', playing); }

/* --------------------------- event triggers ------------------------------ */
let bannerTimer = null, lastBannerName = '';
function checkTriggers(prev, cur) {
  const lo = Math.min(prev, cur), hi = Math.max(prev, cur);
  // mass extinctions
  for (const x of EXTINCTIONS) if (x.ma > lo && x.ma <= hi && (x.importance || 0) >= 4) fireCataclysm('💀 ' + x.name, (x.pct ? x.pct + '% of species lost — ' : '') + x.cause, '#ff5a4a');
  // giant impacts / traps
  for (const e of EVENTS) if (e.ma > lo && e.ma <= hi && (e.importance || 0) >= 5 && (e.kind === 'impact' || e.kind === 'volcanic')) {
    fireCataclysm((e.emoji || '☄️') + ' ' + e.name, e.blurb, e.kind === 'impact' ? '#ffae5a' : '#ff6a4a');
  }
}
function fireCataclysm(title, sub, color) {
  if (title === lastBannerName) return; lastBannerName = title;
  flashEl.style.background = `radial-gradient(circle at 50% 45%, ${hexA(color.replace('rgb', '').startsWith('#') ? color : '#ff8a4a', 0.0)} 0%, ${color}55 40%, transparent 72%)`;
  flashEl.style.background = `radial-gradient(circle at 50% 42%, ${color}77 0%, ${color}22 38%, transparent 70%)`;
  flashEl.classList.remove('flash-run'); void flashEl.offsetWidth; flashEl.classList.add('flash-run');
  bannerEl.innerHTML = `<span class="bn-t">${esc(title)}</span><span class="bn-s">${esc(sub)}</span>`;
  bannerEl.classList.remove('hidden'); bannerEl.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { bannerEl.classList.remove('show'); setTimeout(() => bannerEl.classList.add('hidden'), 500); lastBannerName = ''; }, 4200);
}

/* ------------------------------ interaction ------------------------------ */
function setMa(m, { fly } = {}) { ma = clamp(m, 0, MA_MAX); pos = maToPos(ma); render(); }
const lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
function moveTip() { const r = elViz.getBoundingClientRect(); tooltip.style.left = (lastMouse.x - r.left) + 'px'; tooltip.style.top = (lastMouse.y - r.top) + 'px'; }
document.addEventListener('mousemove', e => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; if (!tooltip.classList.contains('hidden')) moveTip(); });
function showTip(html) { tooltip.innerHTML = html; moveTip(); tooltip.classList.remove('hidden'); if (globe) globe.controls().autoRotate = false; }
function showTipAt(d, html) { showTip(html); }
function hideTip() { tooltip.classList.add('hidden'); if (globe && spinOn && !playing && !state.hovered) globe.controls().autoRotate = true; }

function onMarkerHover(d) {
  if (!d) { state.hovered = null; hideTip(); return; }
  state.hovered = keyOf(d.ref);
  const r = d.ref, when = r.appear_ma != null ? r.appear_ma : r.ma;
  showTipAt(d, `<div class="tt-name">${r.emoji || ''} ${esc(d.name)}</div><div class="tt-sub" style="color:${hex6(d.color)}">${d.kind === 'life' ? (CLADE_LABEL[r.clade] || r.clade || 'life form') : kindLabel(r.kind)} · ${fmtMaShort(when)}</div>`);
}
function onMarkerClick(d) { if (!d) return; const r = d.ref; const c = markerCoords(r); if (c) flyTo(c[0], c[1], 1.5); if (r.appear_ma != null) showLifeDetail(r); else showEventDetail(r); }
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.6 }, 800); } }

/* -------------------------------- detail --------------------------------- */
const detailCard = $('detailCard');
function setDetail(flag, name, type, artId, rowsHtml, descHtml) {
  $('detailFlag').textContent = flag;
  $('detailName').textContent = name;
  $('detailType').innerHTML = type;
  const art = $('detailArt');
  if (artId && SIL[artId]) { art.innerHTML = `<svg viewBox="0 0 120 80">${SIL[artId]}</svg>`; art.classList.remove('hidden'); }
  else art.classList.add('hidden');
  $('detailBody').innerHTML = rowsHtml;
  const dd = $('detailDesc');
  if (descHtml) { dd.innerHTML = descHtml; dd.classList.remove('hidden'); } else dd.classList.add('hidden');
  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function rows(arr) { return arr.filter(r => r[1]).map(([k, v]) => `<div class="db-row"><span>${k}</span><b>${v}</b></div>`).join(''); }
function stageIdForClade(clade) { // pick a silhouette that matches a life form's clade
  const map = { 'bacteria':'microbe','archaea':'microbe','cyanobacteria':'stromatolite','prebiotic':'vent','eukaryote':'eukaryote','protist':'eukaryote','fungus':'algae','plant:algae':'algae','plant:land':'landplant','plant:flower':'landplant','animal:sponge':'ediacaran','animal:cnidarian':'ediacaran','animal:ediacaran':'ediacaran','animal:arthropod':'trilobite','animal:mollusc':'trilobite','animal:echinoderm':'trilobite','vertebrate:fish':'fish','vertebrate:amphibian':'tetrapod','vertebrate:tetrapod':'tetrapod','vertebrate:reptile':'amniote','vertebrate:synapsid':'synapsid','vertebrate:dinosaur':'dinosaur','vertebrate:bird':'bird','vertebrate:mammal':'mammal','mammal:primate':'ape','mammal:hominin':'human' };
  return map[clade] || 'microbe';
}
function showLifeDetail(l) {
  state.selected = keyOf(l); refresh();
  const c = cladeColor(l.clade);
  const lived = l.extinct_ma == null ? 'still alive today' : (fmtMaShort(l.appear_ma) + ' → ' + fmtMaShort(l.extinct_ma));
  setDetail(l.emoji || '🦴', l.name, `<span style="color:${c}">Life form · ${esc(CLADE_LABEL[l.clade] || l.clade || '')}</span>`, stageIdForClade(l.clade),
    rows([
      [l.common && l.common !== l.name ? 'Also' : '', l.common && l.common !== l.name ? esc(l.common) : ''],
      ['First appears', fmtMa(l.appear_ma)],
      ['Lived', lived],
      ['Where found', l.lat != null ? l.lat.toFixed(1) + '°, ' + l.lng.toFixed(1) + '° (today)' : 'widespread'],
      ['Era', esc(l.era || '')]
    ]),
    `<p>${esc(l.blurb)}</p>`);
  art_tint(c);
}
function showEventDetail(e) {
  state.selected = keyOf(e); refresh();
  const c = eventColor(e);
  setDetail(e.emoji || '✨', e.name, `<span style="color:${c}">${esc(kindLabel(e.kind))}</span>`, null,
    rows([['When', fmtMa(e.ma)], ['Type', esc(kindLabel(e.kind))], ['Where', e.lat != null ? e.lat.toFixed(1) + '°, ' + e.lng.toFixed(1) + '° (today)' : 'planet-wide'], ['Era', esc(e.era || '')]]),
    `<p>${esc(e.blurb)}</p>`);
}
function showExtinctionDetail(x) {
  setDetail('💀', x.name, '<span style="color:#ff6a5a">Mass extinction</span>', null,
    rows([['When', fmtMa(x.ma)], ['Severity', x.pct != null ? '~' + x.pct + '% of species' : '—'], ['Cause', esc(x.cause || '')], ['Era', esc(x.era || '')]]),
    `<p>${esc(x.blurb)}</p>`);
}
function art_tint(c) { const a = $('detailArt'); if (a) a.style.color = c; }
const KIND_LABEL = { impact:'Impact', volcanic:'Volcanism', formation:'Formation', tectonic:'Tectonics', atmosphere:'Atmosphere', climate:'Climate', ocean:'Ocean', geologic:'Geology', milestone:'Milestone' };
function kindLabel(k) { return KIND_LABEL[k] || 'Event'; }
function refresh() {}
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; refresh(); }
$('detailClose').addEventListener('click', closeDetail);

/* -------------------------------- search --------------------------------- */
const searchEl = $('search'), searchRes = $('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  const L = LIFE.filter(l => l.name.toLowerCase().includes(q) || (l.common || '').toLowerCase().includes(q)).map(l => ({ kind: 'life', name: l.name, emoji: l.emoji, sub: fmtMaShort(l.appear_ma), ref: l }));
  const E = EVENTS.filter(e => e.name.toLowerCase().includes(q)).map(e => ({ kind: 'event', name: e.name, emoji: e.emoji, sub: fmtMaShort(e.ma), ref: e }));
  const X = EXTINCTIONS.filter(x => x.name.toLowerCase().includes(q)).map(x => ({ kind: 'ext', name: x.name, emoji: '💀', sub: fmtMaShort(x.ma), ref: x }));
  hits = [...L, ...E, ...X].sort((a, b) => (b.ref.importance || 0) - (a.ref.importance || 0)).slice(0, 10);
  searchRes.innerHTML = hits.length ? hits.map((h, i) => `<div class="sr-item${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="sr-ic">${h.emoji || '•'}</span>${esc(h.name)}<span class="sr-sub">${h.sub}</span></div>`).join('') : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) {
  const h = hits[i] || hits[0]; if (!h) return;
  searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
  const r = h.ref, when = r.appear_ma != null ? r.appear_ma : r.ma;
  stopPlay(); setMa(when);
  const c = markerCoords(r); if (c) flyTo(c[0], c[1], 1.5);
  if (h.kind === 'life') showLifeDetail(r); else if (h.kind === 'event') showEventDetail(r); else showExtinctionDetail(r);
}
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!$('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ------------------------------- timeline -------------------------------- */
const slider = $('timeSlider');
slider.addEventListener('input', () => { stopPlay(); stopTour(); pos = +slider.value / 1000; ma = posToMa(pos); render(); });
$('prevEra').addEventListener('click', () => stepChapter(-1));
$('nextEra').addEventListener('click', () => stepChapter(1));
function stepChapter(dir) {
  stopPlay(); stopTour();
  const cur = ma; let target = null;
  const sorted = CHAPTERS.map(c => c.ma).sort((a, b) => b - a);   // old→new
  if (dir < 0) { for (const m of sorted) if (m > cur + 0.001) { target = m; break; } }   // earlier = older = larger ma
  else { for (let i = sorted.length - 1; i >= 0; i--) if (sorted[i] < cur - 0.001) { target = sorted[i]; break; } }
  if (target != null) setMa(target);
}

// geologic band
function buildGeoband() {
  const el = $('geoband');
  const periods = GEOSCALE.filter(s => s.rank === 'period');
  const eons = GEOSCALE.filter(s => s.rank === 'eon');
  let html = '<div class="gb-row gb-eons">';
  for (const s of eons) { const a = maToPos(s.start) * 100, b = maToPos(s.end) * 100; html += `<span class="gb-seg" style="left:${a}%;width:${b - a}%;background:${s.color}" title="${esc(s.name)}"><i>${s.name}</i></span>`; }
  html += '</div><div class="gb-row gb-periods">';
  // precambrian filler
  const pcEnd = maToPos(538.8) * 100;
  html += `<span class="gb-seg gb-pc" style="left:0%;width:${pcEnd}%" title="Precambrian"><i>Precambrian</i></span>`;
  for (const s of periods) { const a = maToPos(s.start) * 100, b = maToPos(s.end) * 100; html += `<span class="gb-seg" style="left:${a}%;width:${b - a}%;background:${s.color}" title="${esc(s.name)}"><i>${s.name.slice(0, b - a < 4 ? 1 : 20)}</i></span>`; }
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('.gb-seg').forEach(seg => seg.addEventListener('click', () => { const nm = seg.getAttribute('title'); const s = GEOSCALE.find(g => g.name === nm); if (s) { stopPlay(); stopTour(); setMa((s.start + Math.max(s.end, 0)) / 2); } }));
}

// chapters
const chipsEl = $('chips');
chipsEl.innerHTML = CHAPTERS.map((c, i) => `<button class="chip" data-i="${i}" title="${fmtMa(c.ma)}"><span class="chip-e">${c.emoji}</span>${c.label}</button>`).join('');
chipsEl.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { stopPlay(); stopTour(); setMa(CHAPTERS[+b.dataset.i].ma); } });
function markChapter() {
  let best = 0, bd = Infinity; const p = maToPos(ma);
  CHAPTERS.forEach((c, i) => { const d = Math.abs(maToPos(c.ma) - p); if (d < bd) { bd = d; best = i; } });
  document.querySelectorAll('#chips .chip').forEach((c, i) => { const on = i === best; c.classList.toggle('on', on); if (on) c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
}

// play + speed
$('playBtn').addEventListener('click', togglePlay);
$('spUp').addEventListener('click', () => { speedIdx = Math.min(SPEEDS.length - 1, speedIdx + 1); syncSpeed(); });
$('spDown').addEventListener('click', () => { speedIdx = Math.max(0, speedIdx - 1); syncSpeed(); });
function syncSpeed() { $('spMult').textContent = (SPEEDS[speedIdx] % 1 === 0 ? SPEEDS[speedIdx] : SPEEDS[speedIdx]) + '×'; $('rateRead').textContent = rateText(); }
syncSpeed();

/* --------------------------------- menu ---------------------------------- */
const menu = $('menu'), menuBtn = $('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function toggleBtn(id, get, set) { const el = $(id); const sync = () => { const s = el.querySelector('.mi-state'); if (s) s.textContent = get() ? 'On' : 'Off'; el.classList.toggle('on', get()); }; el.addEventListener('click', () => { set(!get()); sync(); lastLandKey = ''; render(); }); sync(); return sync; }
const miSpin = $('miSpin');
function syncSpin() { const s = miSpin.querySelector('.mi-state'); if (s) s.textContent = spinOn ? 'On' : 'Off'; miSpin.classList.toggle('on', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !playing) globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
toggleBtn('miLife', () => lifeOn, v => lifeOn = v);
toggleBtn('miEvents', () => eventsOn, v => eventsOn = v);
toggleBtn('miPlates', () => platesOn, v => platesOn = v);
$('miReset').addEventListener('click', () => { closeDetail(); if (globe) globe.pointOfView({ lat: 12, lng: 20, altitude: 2.6 }, 700); menu.classList.add('hidden'); });
$('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });

/* ------------------------------- legend ---------------------------------- */
const legend = $('legend');
$('legendStrip').innerHTML = Object.values(CLADE_COLORS).slice(0, 14).map(c => `<span style="background:${c}"></span>`).join('');
$('legendBody').innerHTML =
  '<div class="lg-h">The tree of life — marker colour</div>' +
  CLADE_GROUP.map(([label, keys]) => `<div class="lg-grp">${esc(label)}</div>` + keys.map(k => `<div class="lg-row"><span class="lg-sw" style="background:${cladeColor(k)}"></span>${esc(CLADE_LABEL[k] || k)}</div>`).join('')).join('') +
  '<div class="lg-h" style="margin-top:8px">Events</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:#ff7a3a"></span>☄️ Impacts &amp; volcanism</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:#7fd0e0"></span>🌍 Geology, climate &amp; atmosphere</div>' +
  '<div class="lg-row"><span class="lg-sw" style="background:#eaf1f6"></span>❄️ Snowball / ice age (globe whitens)</div>';
const toggleLegend = () => legend.classList.toggle('collapsed');
$('legendToggle').addEventListener('click', toggleLegend);
$('legendStrip').addEventListener('click', toggleLegend);
$('miLegend').addEventListener('click', () => { legend.classList.remove('collapsed'); menu.classList.add('hidden'); });

/* --------------------------- about / welcome ----------------------------- */
const aboutOverlay = $('aboutOverlay');
$('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
$('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN_KEY = 'evo_seen_v1';
const welcome = $('welcomeOverlay');
const showWelcome = () => welcome.classList.remove('hidden');
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
$('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
$('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); showWelcome(); });
try { if (!localStorage.getItem(SEEN_KEY)) showWelcome(); } catch (e) { showWelcome(); }

/* ------------------------------ header home ------------------------------ */
function resetHome() {
  stopPlay(); stopTour(); closeDetail(); menu.classList.add('hidden'); aboutOverlay.classList.add('hidden');
  legend.classList.add('collapsed'); searchEl.value = ''; searchRes.classList.add('hidden');
  spinOn = true; syncSpin(); speedIdx = 2; syncSpeed();
  ma = MA_MAX; pos = maToPos(ma); lastLandKey = '';
  if (globe) { globe.controls().autoRotate = true; globe.pointOfView({ lat: 12, lng: 20, altitude: 2.6 }, 800); }
  render();
}
$('brandHome').addEventListener('click', resetHome);

/* -------------------------------- keys ----------------------------------- */
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); aboutOverlay.classList.add('hidden'); if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === 'ArrowLeft') { stopPlay(); stopTour(); pos = clamp(pos - 0.004, 0, 1); ma = posToMa(pos); render(); }
  else if (e.key === 'ArrowRight') { stopPlay(); stopTour(); pos = clamp(pos + 0.004, 0, 1); ma = posToMa(pos); render(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === '+' || e.key === '=') { speedIdx = Math.min(SPEEDS.length - 1, speedIdx + 1); syncSpeed(); }
  else if (e.key === '-' || e.key === '_') { speedIdx = Math.max(0, speedIdx - 1); syncSpeed(); }
});

/* ---------------------------- share deep-link ---------------------------- */
let toastTimer = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400); }
$('miShare').addEventListener('click', async () => {
  menu.classList.add('hidden');
  const u = location.origin + location.pathname + '?ma=' + ma.toFixed(3);
  try { await navigator.clipboard.writeText(u); toast('🔗 Link copied — opens at ' + fmtMa(ma)); } catch (e) { toast('Copy this link: ' + u); }
});
function applyDeepLink() {
  try { const q = new URLSearchParams(location.search); const m = q.get('ma'); if (m != null && m !== '' && !isNaN(+m)) { setMa(+m); hideWelcome(); } } catch (e) {}
}

/* ------------------------------ guided tour ------------------------------ */
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; $('tourCaption').classList.add('hidden'); if (globe) globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const t = TOUR[tourIdx];
  setMa(t.ma);
  if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat: t.lat, lng: t.lng, altitude: t.alt }, 1500); }
  const cap = $('tourCaption');
  cap.innerHTML = `<span class="tc-yr">${fmtMa(t.ma)}</span><span class="tc-tx">${esc(t.cap)}</span><span class="tc-skip" title="End tour">✕</span>`;
  cap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 8200);
}
function startTour() { if (tourActive()) { stopTour(); return; } stopPlay(); closeDetail(); legend.classList.add('collapsed'); menu.classList.add('hidden'); hideWelcome(); tourIdx = 0; tourStep(); }
$('miTour').addEventListener('click', startTour);
$('tourCaption').addEventListener('click', e => { if (e.target.classList.contains('tc-skip')) { stopTour(); return; } if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); } });

/* --------------------------------- boot ---------------------------------- */
fetch('data/paleocoast.json').then(r => r.json()).then(d => {
  PALEO = d; SLICE_AGES = Object.keys(d).map(Number).sort((a, b) => a - b);
  buildGeoband();
  initGlobe();
  applyDeepLink();
}).catch(err => { console.error('paleocoast load failed', err); elViz.innerHTML = '<div style="color:#caa;text-align:center;padding-top:40vh">Could not load map data.</div>'; });
