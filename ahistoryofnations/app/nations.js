/* ============================================================================
   A History of Nations — interactive globe + timeline.
   • TODAY: present-day sovereign states & territories (Natural Earth 1:50m).
   • HISTORY: time-enabled polity polygons from Cliopatria/Seshat (CC-BY,
     3400 BCE → 2024) — the set alive in the chosen year.
   Scrub the timeline; the borders + the count/list change with the year.
   Engine reused from World Languages Explorer (globe.gl).
   ========================================================================== */
'use strict';

const TODAY = 2026;
// Stepped timeline — coarse in antiquity, finer toward the present; last stop = Today (NE).
const STOPS = [-3000,-2500,-2000,-1500,-1200,-1000,-800,-600,-500,-400,-300,-200,-100,1,100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1750,1800,1850,1900,1914,1939,1960,1980,2000,2024,TODAY];
let yearIdx = STOPS.length - 1;                 // open on Today
const curYear = () => STOPS[yearIdx];
const isToday = () => curYear() >= 2025;
const fmtYr = y => y >= TODAY ? 'Today' : y < 0 ? (-y) + ' BC' : y + (y <= 1500 ? ' CE' : '');
// a recognizable historical-era name for the current year (conventional boundaries)
function eraName(y) {
  if (y >= TODAY)  return 'The world today';
  if (y >= 1991)   return 'Contemporary era';
  if (y >= 1914)   return 'The World Wars & after';
  if (y >= 1789)   return 'Empires & revolutions';
  if (y >= 1500)   return 'Early modern era';
  if (y >= 476)    return 'The Middle Ages';
  if (y >= -550)   return 'Classical antiquity';
  if (y >= -1200)  return 'The Iron Age';
  if (y >= -3300)  return 'The Bronze Age';
  return 'Prehistory';
}

const A3_TO_A2 = { FRA: 'FR', NOR: 'NO', CYN: 'CY', SOL: 'SO' };
const isoOf = p => { const a = p.ISO_A2; if (a && a !== '-99') return a; return A3_TO_A2[p.ADM0_A3] || p.ADM0_A3 || null; };

const PALETTE = ['#d98c5f','#5fae9b','#c97b86','#7d9cc7','#c2a25e','#9b8bbd','#84b06a','#cf9b6e','#6fa0b0','#c08aa6','#8fae7d','#b08f6f','#7fa6a0'];
function hashColor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
function colorForNE(f) { const mc = f.properties.MAPCOLOR13; return (mc && mc > 0) ? PALETTE[(mc - 1) % PALETTE.length] : hashColor(f.properties.ADMIN || f.properties.NAME || ''); }

// ---- generic accessors: work for both NE "today" features and Cliopatria "history" features ----
const isHist = f => f.properties.FromYear !== undefined;
// Cliopatria wraps some names in parentheses (loose/aggregate polities); strip for a clean display.
const stripParen = s => { s = (s || '').trim(); return (s.startsWith('(') && s.endsWith(')')) ? s.slice(1, -1).trim() : s; };
const featName = f => isHist(f) ? stripParen(f.properties.Name) : (f.properties.ADMIN || f.properties.NAME || f.properties.SOVEREIGNT || '—');
const featKey  = f => isHist(f) ? 'h:' + f.properties.Name + ':' + f.properties.FromYear : isoOf(f.properties);
const featColor = f => isHist(f) ? hashColor(f.properties.Name || '') : colorForNE(f);

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n>>16)&255}, ${(n>>8)&255}, ${n&255}, ${a})`; }
function flagEmoji(iso) { if (!iso || iso.length !== 2) return '🏳️'; return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)); }
const fmtPop = n => !n || n < 0 ? '—' : n >= 1e9 ? (n/1e9).toFixed(2)+' bn' : n >= 1e6 ? (n/1e6).toFixed(1)+' M' : n >= 1e3 ? (n/1e3).toFixed(0)+' k' : ''+n;

const state = { hovered: null, selected: null };
let globe, neCountries = [], histAll = null, spinOn = true;
let ghostFeatures = [], ghostToday = true;    // faint "today's borders" reference layer (history mode only) — on by default
const elViz = document.getElementById('globeViz');
const tooltip = document.getElementById('tooltip');

/* ---- "My nations" (today only) — persisted Been / Want-to-go ---- */
const MINE_KEY = 'hon_mine_v1';
const MINE_COLOR = { been: '#2ecc71', want: '#ff4f9a' };
const mine = { been: new Set(), want: new Set() };
let tagMode = null;
function loadMine() { try { const o = JSON.parse(localStorage.getItem(MINE_KEY) || '{}'); (o.been||[]).forEach(x => mine.been.add(x)); (o.want||[]).forEach(x => mine.want.add(x)); } catch (e) {} }
function saveMine() { try { localStorage.setItem(MINE_KEY, JSON.stringify({ been: [...mine.been], want: [...mine.want] })); } catch (e) {} }

/* ----------------------------- the active set ----------------------------- */
function activeFeatures() {
  if (isToday()) return neCountries;
  if (!histAll) return [];
  const y = curYear();
  // RELATION features are diplomatic ties (alliances, vassalages, personal unions) — not nations; exclude.
  return histAll.features.filter(f => f.properties.Type !== 'RELATION' && f.properties.FromYear <= y && y <= f.properties.ToYear);
}

function capColor(f) {
  if (f.__ghost) return 'rgba(0,0,0,0)';      // transparent underlay — only its faint outline shows
  const key = featKey(f);
  const sel = state.selected && key === state.selected, hov = state.hovered && key === state.hovered;
  if (isToday()) {
    if (mine.been.has(key)) return hexA(MINE_COLOR.been, sel ? 1 : hov ? 0.96 : 0.86);
    if (mine.want.has(key)) return hexA(MINE_COLOR.want, sel ? 1 : hov ? 0.96 : 0.86);
    const dim = tagMode ? 0.5 : 1;
    return hexA(featColor(f), (sel ? 0.99 : hov ? 0.95 : 0.8) * dim);
  }
  // history: when the today-overlay is on, make polities a touch more translucent so modern borders read through
  return hexA(featColor(f), (sel ? 0.99 : hov ? 0.95 : 0.82) * (ghostToday ? 0.72 : 1));
}
const altOf = f => { if (f.__ghost) return 0; const key = featKey(f); return state.selected === key ? 0.06 : state.hovered === key ? 0.04 : 0.01; };

function initGlobe(geo) {
  neCountries = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');
  // stable, reusable "today" reference features (same object refs → globe.gl won't re-extrude them each scrub)
  ghostFeatures = neCountries.map(f => ({ type: 'Feature', properties: f.properties, geometry: f.geometry, __ghost: true }));
  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#8fb7ff').atmosphereAltitude(0.16)
    .polygonsData(activeFeatures())
    .polygonCapColor(capColor)
    .polygonSideColor(f => f.__ghost ? 'rgba(0,0,0,0)' : 'rgba(10,16,30,0.5)')
    .polygonStrokeColor(f => f.__ghost ? 'rgba(208,223,247,0.42)' : 'rgba(8,12,24,0.65)')
    .polygonAltitude(altOf)
    .polygonsTransitionDuration(0)
    .onPolygonHover(onHover)
    .onPolygonClick(onClick);
  const c = globe.controls(); c.autoRotate = true; c.autoRotateSpeed = 0.35; c.enableDamping = true;
  globe.pointOfView({ lat: 20, lng: 10, altitude: 2.3 });
  sizeGlobe();
  render();
}
function refreshGlobe() { if (globe) globe.polygonCapColor(capColor).polygonAltitude(altOf); }
function sizeGlobe() { if (!globe) return; globe.width(elViz.clientWidth).height(elViz.clientHeight); }
window.addEventListener('resize', sizeGlobe);

/* ------------------------------- render a year ------------------------------- */
function render() {
  document.getElementById('eraLabel').textContent = fmtYr(curYear());
  document.getElementById('eraName').textContent = eraName(curYear());
  document.getElementById('timeSlider').value = yearIdx;
  markEraJump();
  if (!isToday() && tagMode) exitTagMode();                // tagging is a "today" feature — leave it on, stay in the year
  if (state.selected) closeDetail();                       // selection may not exist in the new year
  const active = activeFeatures();
  // overlay today's borders faintly underneath, in history mode only (ghosts first = drawn beneath)
  const polys = (!isToday() && ghostToday) ? ghostFeatures.concat(active) : active;
  if (globe) globe.polygonsData(polys);
  refreshGlobe();
  // panel count + sub-label
  document.getElementById('pnCount').textContent = active.length;
  const sub = document.querySelector('#panel .pn-sub'), split = document.getElementById('pnSplit');
  document.getElementById('pnYear').textContent = fmtYr(curYear());
  if (isToday()) {
    sub.textContent = 'nations & territories';
    const sov = active.filter(f => ['Sovereign country', 'Country'].includes(f.properties.TYPE)).length;
    split.innerHTML = `<b>${sov}</b> sovereign states · <b>${active.length - sov}</b> territories`;
  } else {
    sub.textContent = 'polities & empires';
    split.innerHTML = `mapped in <b>${fmtYr(curYear())}</b> &middot; <span style="color:var(--muted)">borders are estimated, esp. deep past</span>`;
  }
  buildList(active);
  updateMineUI();
}

/* ----------------------------- hover / detail ----------------------------- */
function onHover(f) {
  if (f && f.__ghost) f = null;                // the faint today-overlay is non-interactive
  state.hovered = f ? featKey(f) : null;
  refreshGlobe();
  if (globe) globe.controls().autoRotate = !f && spinOn && !playing;
  if (!f) { tooltip.classList.add('hidden'); return; }
  const p = f.properties;
  const sub = isHist(f) ? (p.Type ? p.Type[0] + p.Type.slice(1).toLowerCase() : 'Polity') + ' · ' + fmtYr(p.FromYear) + '–' + fmtYr(p.ToYear === TODAY ? 2024 : p.ToYear)
                        : (p.TYPE || 'Territory') + ' · ' + (p.SUBREGION || p.CONTINENT || '');
  tooltip.innerHTML = `<div class="tt-name">${isHist(f) ? '' : flagEmoji(isoOf(p)) + ' '}${featName(f)}</div><div class="tt-sub">${sub}</div>`;
  tooltip.classList.remove('hidden');
}
elViz.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('hidden')) return;
  const r = elViz.getBoundingClientRect(); tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px';
});
const detailCard = document.getElementById('detailCard');
function showDetail(f) {
  const p = f.properties, key = featKey(f);
  state.selected = key; refreshGlobe();
  document.getElementById('detailFlag').textContent = isHist(f) ? '🏛' : flagEmoji(isoOf(p));
  document.getElementById('detailName').textContent = featName(f);
  let rows;
  if (isHist(f)) {
    document.getElementById('detailType').textContent = (p.Type ? p.Type[0] + p.Type.slice(1).toLowerCase() : 'Polity');
    const wd = p.Wikidata ? `<a href="https://www.wikidata.org/wiki/${p.Wikidata}" target="_blank" rel="noopener">${p.Wikidata} ↗</a>` : '—';
    rows = [['Existed', fmtYr(p.FromYear) + ' – ' + fmtYr(p.ToYear === TODAY ? 2024 : p.ToYear)], ['Wikidata', wd]];
  } else {
    document.getElementById('detailType').textContent = (p.TYPE || 'Territory') + (p.SOVEREIGNT && p.SOVEREIGNT !== featName(f) ? ' · ' + p.SOVEREIGNT : '');
    rows = [
      ['Formal name', p.FORMAL_EN && p.FORMAL_EN !== '-99' ? p.FORMAL_EN : featName(f)],
      ['Region', [p.SUBREGION, p.CONTINENT].filter(Boolean).join(' · ')],
      ['Population', fmtPop(p.POP_EST) + (p.POP_YEAR ? ' (' + p.POP_YEAR + ')' : '')],
      ['ISO code', [p.ISO_A2, p.ISO_A3].filter(c => c && c !== '-99').join(' / ') || '—'],
    ];
  }
  document.getElementById('detailBody').innerHTML = rows.map(([k, v]) => `<div class="db-row"><span>${k}</span><b>${v || '—'}</b></div>`).join('');
  detailCard.classList.remove('hidden');
  markListActive(key);
}
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; refreshGlobe(); markListActive(null); }
document.getElementById('detailClose').addEventListener('click', closeDetail);
function onClick(f) {
  if (!f || f.__ghost) return;
  if (isToday() && tagMode) { toggleMine(featKey(f)); return; }
  showDetail(f);
  const b = f.bbox || bboxOf(f);
  const lng = (b[0] + b[2]) / 2, lat = (b[1] + b[3]) / 2;
  spinOn = false; syncSpin();
  if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: 1.7 }, 800); }
}
function bboxOf(f) { let x0=180,y0=90,x1=-180,y1=-90; const walk=c=>{ if(typeof c[0]==='number'){x0=Math.min(x0,c[0]);x1=Math.max(x1,c[0]);y0=Math.min(y0,c[1]);y1=Math.max(y1,c[1]);} else c.forEach(walk); }; walk(f.geometry.coordinates); return [x0,y0,x1,y1]; }

/* ----------------------------- list ----------------------------- */
function buildList(active) {
  const sorted = [...active].sort((a, b) => featName(a).localeCompare(featName(b)));
  document.getElementById('pnList').innerHTML = sorted.map(f =>
    `<div class="pn-row" data-key="${featKey(f)}"><span class="pn-sw" style="background:${featColor(f)}"></span><span class="pn-l">${featName(f)}</span><span class="pn-mine"></span></div>`).join('');
}
function markListActive(key) {
  document.querySelectorAll('#pnList .pn-row').forEach(r => r.classList.toggle('active', r.dataset.key === key));
  const a = key && document.querySelector(`#pnList .pn-row[data-key="${CSS.escape(key)}"]`); if (a) a.scrollIntoView({ block: 'nearest' });
}
function findActive(key) { return activeFeatures().find(f => featKey(f) === key); }
document.getElementById('pnList').addEventListener('click', e => {
  const row = e.target.closest('.pn-row'); if (!row) return;
  const f = findActive(row.dataset.key); if (f) onClick(f);
});

/* ------------------------------- search ------------------------------- */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = activeFeatures().map(f => ({ f, n: featName(f) })).filter(o => o.n.toLowerCase().includes(q))
    .sort((a, b) => a.n.toLowerCase().indexOf(q) - b.n.toLowerCase().indexOf(q) || a.n.localeCompare(b.n)).slice(0, 8);
  searchRes.innerHTML = hits.length ? hits.map((o, i) =>
    `<div class="sr-item${i===0?' sel':''}" data-key="${featKey(o.f)}"><span class="sr-flag">${isHist(o.f) ? '🏛' : flagEmoji(isoOf(o.f.properties))}</span>${o.n}</div>`).join('') : '<div class="sr-none">No match this year</div>';
  searchRes.classList.remove('hidden');
}
function pick(key) {
  if (!key && hits.length) key = featKey(hits[0].f);
  const f = key && findActive(key); if (!f) return;
  onClick(f); searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
}
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pick(); } else if (e.key === 'Escape') { searchEl.value=''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pick(it.dataset.key); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ------------------------------- timeline ------------------------------- */
const slider = document.getElementById('timeSlider');
slider.min = 0; slider.max = STOPS.length - 1; slider.value = yearIdx;
slider.addEventListener('input', () => { yearIdx = +slider.value; stopPlay(); render(); });
document.getElementById('prevEra').addEventListener('click', () => { yearIdx = Math.max(0, yearIdx - 1); stopPlay(); render(); });
document.getElementById('nextEra').addEventListener('click', () => { yearIdx = Math.min(STOPS.length - 1, yearIdx + 1); stopPlay(); render(); });
document.getElementById('nowBtn').addEventListener('click', () => { yearIdx = STOPS.length - 1; stopPlay(); render(); document.getElementById('miReset').click(); });
/* notable-era quick-jumps — leap the timeline to a famous moment */
const ERA_JUMPS = [
  { y: -2000, label: 'Bronze Age' },
  { y: -500,  label: 'Classical'  },
  { y: 100,   label: 'Roman peak' },
  { y: 1000,  label: 'Medieval'   },
  { y: 1500,  label: 'Discovery'  },
  { y: 1900,  label: 'Empires'    },
  { y: 1939,  label: 'World Wars' },
  { y: TODAY, label: 'Today'      },
];
const eraJumpsEl = document.getElementById('eraJumps');
eraJumpsEl.innerHTML = ERA_JUMPS.map(e => { const i = STOPS.indexOf(e.y);
  return `<button class="era-chip" data-idx="${i}" title="Jump to ${fmtYr(e.y)}">${e.label}</button>`; }).join('');
eraJumpsEl.addEventListener('click', e => { const c = e.target.closest('.era-chip'); if (!c) return; yearIdx = +c.dataset.idx; stopPlay(); render(); });
function markEraJump() { document.querySelectorAll('#eraJumps .era-chip').forEach(c => c.classList.toggle('on', +c.dataset.idx === yearIdx)); }

let playing = false, playTimer = null;
const playBtn = document.getElementById('playBtn');
function stopPlay() { playing = false; if (playTimer) { clearInterval(playTimer); playTimer = null; } playBtn.textContent = '▶'; playBtn.classList.remove('on'); if (globe) globe.controls().autoRotate = spinOn; }
function startPlay() {
  if (yearIdx >= STOPS.length - 1) yearIdx = 0;
  playing = true; playBtn.textContent = '⏸'; playBtn.classList.add('on');
  if (globe) globe.controls().autoRotate = false;
  playTimer = setInterval(() => { if (yearIdx >= STOPS.length - 1) { stopPlay(); return; } yearIdx++; render(); }, 1100);
}
playBtn.addEventListener('click', () => { playing ? stopPlay() : startPlay(); });

/* ------------------------------- menu ------------------------------- */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
const miSpin = document.getElementById('miSpin');
function syncSpin() { const s = miSpin.querySelector('.mi-state'); if (s) s.textContent = spinOn ? 'On' : 'Off'; miSpin.classList.toggle('on', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !playing) globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
document.getElementById('miReset').addEventListener('click', () => { closeDetail(); if (globe) globe.pointOfView({ lat: 20, lng: 10, altitude: 2.3 }, 700); menu.classList.add('hidden'); });
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
const miGhost = document.getElementById('miGhost');
function syncGhost() { const s = miGhost.querySelector('.mi-state'); if (s) s.textContent = ghostToday ? 'On' : 'Off'; miGhost.classList.toggle('on', ghostToday); }
miGhost.addEventListener('click', () => { ghostToday = !ghostToday; syncGhost(); render(); });
syncGhost();
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });

/* ---- Welcome (first run + "How it works") ---- */
const SEEN_KEY = 'hon_seen_v1';
const welcomeOverlay = document.getElementById('welcomeOverlay');
const showWelcome = () => welcomeOverlay.classList.remove('hidden');
function hideWelcome() { welcomeOverlay.classList.add('hidden'); try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcomeOverlay.addEventListener('click', e => { if (e.target === welcomeOverlay) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); showWelcome(); });
try { if (!localStorage.getItem(SEEN_KEY)) showWelcome(); } catch (e) { showWelcome(); }

/* ------------------------------- My nations ------------------------------- */
function toggleMine(key) {
  if (!key || !tagMode || !isToday()) return;
  const set = mine[tagMode], other = mine[tagMode === 'been' ? 'want' : 'been'];
  if (set.has(key)) set.delete(key); else { set.add(key); other.delete(key); }
  saveMine(); refreshGlobe(); updateMineUI();
}
const mineBanner = document.getElementById('mineBanner');
function renderBanner() {
  if (!tagMode) return;
  const verb = tagMode === 'been' ? 'been to' : 'want to visit';
  mineBanner.className = tagMode;
  mineBanner.innerHTML = `Tap the countries you've <b>${verb}</b> &nbsp;·&nbsp; ✅ <b>${mine.been.size}</b> &nbsp; 🎯 <b>${mine.want.size}</b><span class="mb-x">done ✕</span>`;
}
function setTagMode(m) {
  if (!isToday()) { yearIdx = STOPS.length - 1; render(); }   // tagging only makes sense today
  tagMode = (tagMode === m) ? null : m;
  document.getElementById('miBeen').classList.toggle('on', tagMode === 'been');
  document.getElementById('miWant').classList.toggle('on', tagMode === 'want');
  if (tagMode) { mineBanner.classList.remove('hidden'); renderBanner(); spinOn = false; syncSpin(); if (globe) globe.controls().autoRotate = false; }
  else mineBanner.classList.add('hidden');
  refreshGlobe();
}
// turn tagging off without changing the year (used when scrubbing into history)
function exitTagMode() { tagMode = null; document.getElementById('miBeen').classList.remove('on'); document.getElementById('miWant').classList.remove('on'); mineBanner.classList.add('hidden'); }
function updateMineUI() {
  document.getElementById('cntBeen').textContent = mine.been.size;
  document.getElementById('cntWant').textContent = mine.want.size;
  renderBanner();
  document.querySelectorAll('#pnList .pn-row').forEach(r => { const m = r.querySelector('.pn-mine'); if (m) m.textContent = isToday() ? (mine.been.has(r.dataset.key) ? '✅' : mine.want.has(r.dataset.key) ? '🎯' : '') : ''; });
  const stat = document.getElementById('mineStat'), n = mine.been.size + mine.want.size;
  if (isToday() && n) {
    stat.classList.remove('hidden');
    const pct = Math.round(mine.been.size / (neCountries.length || 1) * 100);
    stat.innerHTML = `<span><span class="ms-b">✅ ${mine.been.size}</span> been <span style="color:var(--muted)">· ${pct}% of the world</span></span><span><span class="ms-w">🎯 ${mine.want.size}</span> to go</span>`;
  } else stat.classList.add('hidden');
}
mineBanner.addEventListener('click', e => { if (e.target.classList.contains('mb-x')) setTagMode(tagMode); });
document.getElementById('miBeen').addEventListener('click', () => { setTagMode('been'); menu.classList.add('hidden'); });
document.getElementById('miWant').addEventListener('click', () => { setTagMode('want'); menu.classList.add('hidden'); });
document.getElementById('miClearMine').addEventListener('click', () => {
  menu.classList.add('hidden');
  if (!mine.been.size && !mine.want.size) return;
  if (!confirm('Clear all your “been” and “want to go” nations?')) return;
  mine.been.clear(); mine.want.clear(); saveMine(); refreshGlobe(); updateMineUI();
});

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden');
    if (!welcomeOverlay.classList.contains('hidden')) { hideWelcome(); return; }
    aboutOverlay.classList.add('hidden'); if (tagMode) setTagMode(tagMode); else if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === 'ArrowLeft') { yearIdx = Math.max(0, yearIdx - 1); stopPlay(); render(); }
  else if (e.key === 'ArrowRight') { yearIdx = Math.min(STOPS.length - 1, yearIdx + 1); stopPlay(); render(); }
});

/* --------------------------------- boot --------------------------------- */
loadMine();
Promise.all([
  fetch('data/countries.geojson?v=2').then(r => r.json()),
  fetch('data/cliopatria.topojson?v=1').then(r => r.json()),
]).then(([geo, topo]) => {
  try { histAll = topojson.feature(topo, topo.objects.cliopatria_polities_only); } catch (e) { console.error('topojson convert failed', e); histAll = { features: [] }; }
  initGlobe(geo);
}).catch(err => {
  console.error('data load failed', err);
  elViz.innerHTML = '<div style="color:#93a0c5;text-align:center;padding-top:40vh">Could not load map data.</div>';
});
