/* ============================================================================
   CEDAR Explorer — interactive 3D globe of the world's intentional communities.
   Centre for Ecovillage Development and Research.

   Each community in data/communities.js becomes a glowing point on the globe.
   A live "success score" (0–100) is computed from four ingredients — size,
   longevity, international reach and recognition — see scoreOf(). The left
   panel ranks every community and re-sorts by any single measure; clicking a
   point or a row flies there and opens its detail card. Engine: globe.gl.
   ========================================================================== */
'use strict';

const NOW = 2026;
const C = window.COMMUNITIES || [];

/* ----------------------------- community types --------------------------- */
const TYPES = {
  ecovillage:  { label:'Ecovillage',            c:'#5fd08a' },
  intentional: { label:'Intentional community', c:'#e7b24a' },
  kibbutz:     { label:'Kibbutz / moshav',      c:'#4aa6e0' },
  commune:     { label:'Commune',               c:'#ef6b6b' },
  spiritual:   { label:'Spiritual community',   c:'#b98cf0' },
  cohousing:   { label:'Cohousing',             c:'#34d0c0' },
  research:    { label:'Research community',     c:'#f2a13a' },
};
const typeColor = t => (TYPES[t] || {}).c || '#9fb0a5';
const typeLabel = t => (TYPES[t] || {}).label || t;

/* ----------------------------- helpers ----------------------------------- */
const esc = s => (s == null ? '' : ('' + s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
function fmtNum(n) { return n == null ? '—' : n.toLocaleString('en-US'); }

/* ----------------------------- success score ----------------------------- */
// Four transparent ingredients, each 0..1, combined into a 0..100 composite.
function awardPoints(awards) {
  if (!awards || !awards.length) return 0;
  let pts = 0;
  for (const a of awards) {
    const s = a.toLowerCase();
    let w = 0.7;                                              // any documented honour
    if (s.includes('unesco')) w = Math.max(w, 2.2);
    else if (s.includes('world habitat') || s.includes('un-habitat') || s.includes('habitat best')) w = Math.max(w, 1.8);
    else if (s.includes('right livelihood')) w = Math.max(w, 1.8);
    else if (s.includes('unep') || s.includes('champions of the earth')) w = Math.max(w, 1.5);
    else if (s.includes('magsaysay') || s.includes('gandhi') || s.includes('niwano') || s.includes('peace prize') || s.includes('peace messenger')) w = Math.max(w, 1.3);
    else if (s.includes('ecosoc') || s.includes('unwto') || s.includes('un tourism') || s.includes(' un ') || s.includes('global forum') || s.includes('national historic landmark')) w = Math.max(w, 1.2);
    else if (s.includes('gen ') || s.includes('global ecovillage') || s.includes('ecovillage excellence')) w = Math.max(w, 0.95);
    pts += w;
  }
  return pts;
}
function scoreOf(c) {
  const yrs = NOW - c.founded;
  const sAge  = clamp(yrs / 80, 0, 1);                                  // 80+ years → full
  const sPop  = clamp((Math.log10(Math.max(c.pop || 1, 1)) - 1) / (Math.log10(10000) - 1), 0, 1); // 10→0, 10k→1
  const sReach = c.nat != null ? clamp(c.nat / 60, 0, 1) : 0.12;        // Auroville's 60 is the ceiling
  const sAward = clamp(awardPoints(c.awards) / 5, 0, 1);
  const composite = 0.24 * sAge + 0.24 * sPop + 0.28 * sReach + 0.24 * sAward;
  return { total: Math.round(composite * 100), yrs,
    parts: { size: Math.round(sPop * 100), age: Math.round(sAge * 100), reach: Math.round(sReach * 100), honours: Math.round(sAward * 100) } };
}

// Decorate every community once.
C.forEach(c => { c.id = slug(c.name); const s = scoreOf(c); c.score = s.total; c.yrs = s.yrs; c.parts = s.parts; c.flagship = c.id === 'auroville'; });
C.sort((a, b) => b.score - a.score);
const byId = id => C.find(c => c.id === id);
const FLAGSHIP = byId('auroville');

/* ----------------------------- state ------------------------------------- */
const state = { hovered: null, selected: null, sort: 'score', filter: 'all' };
let globe, spinOn = true, panelOn = true;
const elViz = document.getElementById('globeViz');
const tooltip = document.getElementById('tooltip');

const visible = () => C.filter(c => state.filter === 'all' || c.type === state.filter);
function sortVal(c) { return state.sort === 'pop' ? (c.pop || 0) : state.sort === 'age' ? c.yrs : state.sort === 'nat' ? (c.nat || 0) : c.score; }
function sorted() { return visible().slice().sort((a, b) => sortVal(b) - sortVal(a) || b.score - a.score); }

/* ============================== Globe ==================================== */
function initGlobe(geo) {
  const land = geo.features.filter(f => (f.properties.ADMIN || f.properties.NAME) !== 'Antarctica');

  globe = Globe()(elViz)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#6fd58a').atmosphereAltitude(0.17)
    // calm "living Earth" land
    .polygonsData(land)
    .polygonCapColor(() => 'rgba(86,150,104,0.20)')
    .polygonSideColor(() => 'rgba(20,48,32,0.55)')
    .polygonStrokeColor(() => 'rgba(140,206,160,0.22)')
    .polygonAltitude(0.006).polygonsTransitionDuration(0)
    // community points
    .pointsData(visible())
    .pointLat(d => d.lat).pointLng(d => d.lon)
    .pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius)
    .pointResolution(14).pointsMerge(false).pointsTransitionDuration(0)
    .onPointHover(onPointHover).onPointClick(c => selectCommunity(c, true))
    // pulsing ring on the flagship
    .ringColor(() => (t => `rgba(231,178,74,${Math.sqrt(1 - t)})`))
    .ringMaxRadius(2.6).ringPropagationSpeed(1.4).ringRepeatPeriod(1300)
    .ringsData(FLAGSHIP ? [{ lat: FLAGSHIP.lat, lng: FLAGSHIP.lon }] : []);

  try { const m = globe.globeMaterial(); m.color.set('#0c2417'); m.emissive.set('#06140d'); m.emissiveIntensity = 0.94; m.shininess = 2; } catch (e) {}
  const ctr = globe.controls();
  ctr.autoRotate = true; ctr.autoRotateSpeed = 0.34; ctr.enableDamping = true; ctr.dampingFactor = 0.14;
  ctr.minDistance = 165; ctr.maxDistance = 540; ctr.zoomSpeed = 1.4;
  globe.pointOfView({ lat: 22, lng: 40, altitude: 2.4 }, 0);
  try { globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}
  sizeGlobe();
  requestAnimationFrame(sizeGlobe);
  if (window.ResizeObserver) new ResizeObserver(sizeGlobe).observe(elViz);
}
function sizeGlobe() { if (globe) globe.width(elViz.clientWidth || window.innerWidth).height(elViz.clientHeight || (window.innerHeight - 56)); }
window.addEventListener('resize', sizeGlobe);

function pointColor(d) { const sel = state.selected === d.id, hov = state.hovered === d.id; return hexA(typeColor(d.type), sel ? 1 : hov ? 0.95 : 0.82); }
function pointAlt(d) { return state.selected === d.id ? 0.16 : state.hovered === d.id ? 0.08 : 0.01; }
function pointRadius(d) { const base = 0.2 + (d.score / 100) * 0.55; return state.selected === d.id ? base + 0.28 : state.hovered === d.id ? base + 0.12 : base; }
function refreshPoints() { if (globe) globe.pointColor(pointColor).pointAltitude(pointAlt).pointRadius(pointRadius); }
function applyFilterToGlobe() { if (globe) globe.pointsData(visible()); refreshPoints(); }

/* ----------------------------- hover tooltip ----------------------------- */
elViz.addEventListener('mousemove', e => { if (!tooltip.classList.contains('hidden')) { const r = elViz.getBoundingClientRect(); tooltip.style.left = (e.clientX - r.left) + 'px'; tooltip.style.top = (e.clientY - r.top) + 'px'; } });
function onPointHover(d) {
  state.hovered = d ? d.id : null;
  refreshPoints();
  if (globe) globe.controls().autoRotate = !d && spinOn;
  if (!d) { tooltip.classList.add('hidden'); return; }
  tooltip.innerHTML =
    `<div class="tt-head"><span class="tt-flag">${d.flag}</span><span><div class="tt-name">${esc(d.name)}</div>` +
    `<div class="tt-sub" style="color:${typeColor(d.type)}">${esc(typeLabel(d.type))} · ${esc(d.country)}</div></span></div>` +
    `<div class="tt-row"><span>📅 <b>${d.founded}</b></span><span>👥 <b>${fmtNum(d.pop)}</b></span>` +
    (d.nat ? `<span>🌍 <b>${d.nat}</b> nat.</span>` : '') + `</div>` +
    `<div class="tt-score">success score <b>${d.score}</b>/100</div>`;
  tooltip.classList.remove('hidden');
}

/* ----------------------------- selection / fly --------------------------- */
function flyTo(lat, lng, alt) { spinOn = false; syncSpin(); if (globe) { globe.controls().autoRotate = false; globe.pointOfView({ lat, lng, altitude: alt || 1.5 }, 850); } }
function selectCommunity(c, doFly) {
  if (!c) return;
  state.selected = c.id;
  refreshPoints();
  showDetail(c);
  markActive(c.id);
  if (doFly) flyTo(c.lat, c.lon, 1.45);
}

/* ============================== Detail card ============================== */
const detailCard = document.getElementById('detailCard');
function row(label, val) { return val == null || val === '' ? '' : `<div class="db-row"><span>${label}</span><b>${val}</b></div>`; }
function showDetail(c) {
  document.getElementById('detailFlag').textContent = c.flag;
  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailType').innerHTML = `<span class="type-dot" style="background:${typeColor(c.type)}"></span>${esc(typeLabel(c.type))}`;

  const badge = document.getElementById('detailBadge');
  if (c.badge) { badge.textContent = c.badge; badge.classList.remove('hidden'); } else badge.classList.add('hidden');

  const p = c.parts;
  document.getElementById('detailScore').innerHTML =
    `<div><div class="ds-num">${c.score}<span class="ds-of"> /100</span></div></div>` +
    `<div class="ds-bars"><div class="ds-label">Success score</div>` +
    bar('Size', p.size) + bar('Age', p.age) + bar('Reach', p.reach) + bar('Honours', p.honours) + `</div>`;

  document.getElementById('detailRows').innerHTML =
    row('Founded', `${c.founded} <span style="color:var(--muted);font-weight:500">· ${c.yrs} yrs</span>`) +
    row('Population', fmtNum(c.pop) + (c.pop ? ' residents' : '')) +
    row('Nationalities', c.nat ? c.nat + ' countries' : '<span style="color:var(--muted);font-weight:500">not documented</span>') +
    row('Land area', c.area ? c.area.toLocaleString('en-US') + ' ha' : '') +
    row('Location', esc(c.city)) +
    row('Founded by', esc(c.founder));

  const aw = document.getElementById('detailAwards');
  if (c.awards && c.awards.length) { aw.innerHTML = `<div class="detail-sec-h">Awards &amp; recognition</div>` + c.awards.map(a => `<div class="aw-chip">${esc(a)}</div>`).join(''); aw.classList.remove('hidden'); } else aw.classList.add('hidden');

  const hi = document.getElementById('detailHi');
  if (c.highlights && c.highlights.length) { hi.innerHTML = `<div class="detail-sec-h">Highlights</div><ul>` + c.highlights.map(h => `<li>${esc(h)}</li>`).join('') + `</ul>`; hi.classList.remove('hidden'); } else hi.classList.add('hidden');

  const dd = document.getElementById('detailDesc');
  if (c.desc) { dd.textContent = c.desc; dd.classList.remove('hidden'); } else dd.classList.add('hidden');

  const tg = document.getElementById('detailTags');
  if (c.tags && c.tags.length) { tg.innerHTML = c.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(''); tg.classList.remove('hidden'); } else tg.classList.add('hidden');

  const link = document.getElementById('detailLink');
  if (c.url) { link.href = c.url; link.classList.remove('hidden'); } else link.classList.add('hidden');

  detailCard.classList.remove('hidden'); detailCard.scrollTop = 0;
}
function bar(label, v) { return `<div class="ds-bar"><span>${label}</span><div class="ds-track"><i style="width:${v}%"></i></div></div>`; }
function closeDetail() { detailCard.classList.add('hidden'); state.selected = null; refreshPoints(); markActive(null); }
document.getElementById('detailClose').addEventListener('click', closeDetail);

/* ============================== Ranking panel ============================ */
const rankList = document.getElementById('rankList');
function buildFilters() {
  const present = Object.keys(TYPES).filter(t => C.some(c => c.type === t));
  const chips = [{ k: 'all', label: 'All' }].concat(present.map(t => ({ k: t, label: typeLabel(t).replace(' community', '').replace(' / moshav', '') })));
  document.getElementById('rpFilters').innerHTML = chips.map(ch => {
    const on = state.filter === ch.k;
    const col = ch.k === 'all' ? 'var(--accent)' : typeColor(ch.k);
    const style = on ? `style="background:${col};border-color:${col}"` : '';
    return `<button class="fchip${on ? ' on' : ''}" data-k="${ch.k}" ${style}>${esc(ch.label)}</button>`;
  }).join('');
}
function buildRank() {
  const list = sorted();
  const metric = { score: 'score', pop: 'residents', age: 'years', nat: 'nationalities' }[state.sort];
  document.getElementById('rpStat').innerHTML = `<b>${list.length}</b> communities · ${C.length} surveyed worldwide`;
  rankList.innerHTML = list.map((c, i) => {
    const rank = i + 1;
    const topCls = rank <= 3 ? ' top' + rank : '';
    const mv = state.sort === 'pop' ? fmtNum(c.pop) : state.sort === 'age' ? c.yrs + ' yr' : state.sort === 'nat' ? (c.nat || '—') : c.score;
    const sub = state.sort === 'score'
      ? `<div class="rk-bar"><i style="width:${c.score}%;background:${typeColor(c.type)}"></i></div>`
      : `<div class="rk-mini">${esc(metric === 'years' ? 'since ' + c.founded : metric)}</div>`;
    return `<div class="rk-row${topCls}${c.flagship ? ' flagship' : ''}${state.selected === c.id ? ' active' : ''}" data-id="${c.id}">` +
      `<span class="rk-rank">${rank}</span><span class="rk-flag">${c.flag}</span>` +
      `<span class="rk-main"><span class="rk-name">${c.flagship ? '<span class="rk-star">★</span>' : ''}${esc(c.name)}</span>` +
      `<span class="rk-meta"><span class="rk-type-dot" style="background:${typeColor(c.type)}"></span>${esc(typeLabel(c.type).replace(' community',''))}<span class="dot">·</span>${esc(c.country)}</span></span>` +
      `<span class="rk-right"><span class="rk-score">${mv}</span>${sub}</span></div>`;
  }).join('');
}
function markActive(id) {
  rankList.querySelectorAll('.rk-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
  if (id) { const el = rankList.querySelector(`.rk-row[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); }
}
rankList.addEventListener('click', e => { const r = e.target.closest('.rk-row'); if (r) selectCommunity(byId(r.dataset.id), true); });
document.getElementById('rpSort').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  state.sort = b.dataset.sort;
  document.querySelectorAll('#rpSort button').forEach(x => x.classList.toggle('on', x === b));
  buildRank();
});
document.getElementById('rpFilters').addEventListener('click', e => {
  const b = e.target.closest('.fchip'); if (!b) return;
  state.filter = b.dataset.k; buildFilters(); buildRank(); applyFilterToGlobe();
});

/* panel collapse */
const rankPanel = document.getElementById('rankPanel'), rpShow = document.getElementById('rpShow');
function setPanel(on) { panelOn = on; rankPanel.classList.toggle('hidden', !on); rpShow.classList.toggle('hidden', on); syncMenu('miPanel', on); }
document.getElementById('rpCollapse').addEventListener('click', () => setPanel(false));
rpShow.addEventListener('click', () => setPanel(true));

/* ============================== Search =================================== */
const searchEl = document.getElementById('search'), searchRes = document.getElementById('searchResults');
let hits = [];
function runSearch() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { searchRes.classList.add('hidden'); hits = []; return; }
  hits = C.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q)).slice(0, 9);
  searchRes.innerHTML = hits.length
    ? hits.map((c, i) => `<div class="sr-item${i === 0 ? ' sel' : ''}" data-i="${i}"><span class="sr-ic">${c.flag}</span>${esc(c.name)}<span class="sr-sub">${esc(c.country)}</span></div>`).join('')
    : '<div class="sr-none">No match</div>';
  searchRes.classList.remove('hidden');
}
function pickHit(i) {
  const c = hits[i] || hits[0]; if (!c) return;
  searchEl.value = ''; searchRes.classList.add('hidden'); hits = []; searchEl.blur();
  if (state.filter !== 'all' && c.type !== state.filter) { state.filter = 'all'; buildFilters(); buildRank(); applyFilterToGlobe(); }
  selectCommunity(c, true);
}
searchEl.addEventListener('input', runSearch);
searchEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pickHit(0); } else if (e.key === 'Escape') { searchEl.value = ''; searchRes.classList.add('hidden'); searchEl.blur(); } });
searchRes.addEventListener('click', e => { const it = e.target.closest('.sr-item'); if (it) pickHit(+it.dataset.i); });
document.addEventListener('click', e => { if (!document.getElementById('searchWrap').contains(e.target)) searchRes.classList.add('hidden'); });

/* ============================== Legend =================================== */
document.getElementById('legendStrip').innerHTML = Object.values(TYPES).map(t => `<span style="background:${t.c}"></span>`).join('');
document.getElementById('legendBody').innerHTML =
  Object.entries(TYPES).map(([k, t]) => C.some(c => c.type === k) ? `<div class="lg-row"><span class="lg-dot" style="background:${t.c}"></span>${esc(t.label)}</div>` : '').join('') +
  `<div class="lg-note">Point size grows with the success score. ★ rings mark the flagship, Auroville.</div>`;
const legend = document.getElementById('legend');
const toggleLegend = () => legend.classList.toggle('collapsed');
document.getElementById('legendToggle').addEventListener('click', toggleLegend);
document.getElementById('legendStrip').addEventListener('click', toggleLegend);
legend.classList.add('collapsed');

/* ============================== Menu ===================================== */
const menu = document.getElementById('menu'), menuBtn = document.getElementById('menuBtn');
menuBtn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('click', e => { if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) menu.classList.add('hidden'); });
function syncMenu(id, on) { const el = document.getElementById(id); if (!el) return; const s = el.querySelector('.mi-state'); if (s) s.textContent = on ? 'On' : 'Off'; el.classList.toggle('on', on); }
const miSpin = document.getElementById('miSpin');
function syncSpin() { syncMenu('miSpin', spinOn); }
miSpin.addEventListener('click', () => { spinOn = !spinOn; if (globe && !state.hovered) globe.controls().autoRotate = spinOn; syncSpin(); });
syncSpin();
function resetView() { closeDetail(); spinOn = true; syncSpin(); if (globe) { globe.controls().autoRotate = true; globe.pointOfView({ lat: 22, lng: 40, altitude: 2.4 }, 800); } }
document.getElementById('miReset').addEventListener('click', () => { resetView(); menu.classList.add('hidden'); });
document.getElementById('brandHome').addEventListener('click', resetView);
document.getElementById('miFull').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); menu.classList.add('hidden'); });
document.getElementById('miFlagship').addEventListener('click', () => { menu.classList.add('hidden'); if (FLAGSHIP) selectCommunity(FLAGSHIP, true); });
document.getElementById('miPanel').addEventListener('click', () => { setPanel(!panelOn); menu.classList.add('hidden'); });

/* ============================== Guided tour ============================== */
const TOUR = [
  ['auroville', 'We begin at the flagship: Auroville, the largest and most international community on Earth — 3,300 people from 60+ countries, since 1968.'],
  ['findhorn-ecovillage', 'North to Scotland and Findhorn — birthplace of the Global Ecovillage Network and a UN-Habitat best-practice model.'],
  ['tamera', 'To southern Portugal: Tamera, a peace-research community that re-greened arid land with its famous Water Retention Landscape.'],
  ['federation-of-damanhur', 'In the Italian Alps, Damanhur carved vast underground Temples of Humankind — and runs its own constitution and currency.'],
  ['degania-alef', 'The Sea of Galilee: Degania, founded 1910 — the world\'s first kibbutz, mother of a movement of 270+.'],
  ['sekem', 'On reclaimed Egyptian desert, SEKEM brought biodynamic farming to the Nile — a Right Livelihood laureate.'],
  ['crystal-waters', 'To Queensland: Crystal Waters, the world\'s first permaculture village and a UN World Habitat Award winner.'],
  ['freetown-christiania', 'And Copenhagen\'s Freetown Christiania — 900 people self-governing a former barracks since 1971. Explore the other 100+ yourself.'],
];
let tourIdx = -1, tourTimer = null;
const tourActive = () => tourIdx >= 0;
const tourCap = document.getElementById('tourCaption');
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; } if (tourIdx < 0) return; tourIdx = -1; tourCap.classList.add('hidden'); syncMenu('miTour', false); if (globe) globe.controls().autoRotate = spinOn; }
function tourStep() {
  if (tourIdx >= TOUR.length) { stopTour(); return; }
  const [id, cap] = TOUR[tourIdx], c = byId(id);
  if (c) selectCommunity(c, true);
  tourCap.innerHTML = `<span class="tc-yr">Stop ${tourIdx + 1} / ${TOUR.length}</span><span class="tc-tx">${esc(cap)}</span><span class="tc-skip" title="End tour">✕</span>`;
  tourCap.classList.remove('hidden');
  tourTimer = setTimeout(() => { tourIdx++; tourStep(); }, 8000);
}
function startTour() { if (tourActive()) { stopTour(); return; } menu.classList.add('hidden'); syncMenu('miTour', true); tourIdx = 0; tourStep(); }
document.getElementById('miTour').addEventListener('click', startTour);
tourCap.addEventListener('click', e => { if (e.target.classList.contains('tc-skip')) return stopTour(); if (tourActive()) { clearTimeout(tourTimer); tourIdx++; tourStep(); } });

/* ============================== Share / deep link ======================== */
let toastTimer = null;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }
document.getElementById('miShare').addEventListener('click', async () => {
  menu.classList.add('hidden');
  const u = location.origin + location.pathname + (state.selected ? '?c=' + state.selected : '');
  try { await navigator.clipboard.writeText(u); toast(state.selected ? '🔗 Link copied — opens at ' + byId(state.selected).name : '🔗 Link copied'); }
  catch (e) { toast('Copy this link: ' + u); }
});
function applyDeepLink() {
  try { const c = new URLSearchParams(location.search).get('c'); if (c && byId(c)) { selectCommunity(byId(c), true); hideWelcome(); } } catch (e) {}
}

/* ============================== About / welcome ========================== */
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('miAbout').addEventListener('click', () => { menu.classList.add('hidden'); aboutOverlay.classList.remove('hidden'); });
document.getElementById('aboutClose').addEventListener('click', () => aboutOverlay.classList.add('hidden'));
aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) aboutOverlay.classList.add('hidden'); });
const SEEN = 'cedar_seen_v1';
const welcome = document.getElementById('welcomeOverlay');
const elWelCount = document.getElementById('welCount'); if (elWelCount) elWelCount.textContent = C.length;
function hideWelcome() { welcome.classList.add('hidden'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} }
document.getElementById('welStart').addEventListener('click', hideWelcome);
welcome.addEventListener('click', e => { if (e.target === welcome) hideWelcome(); });
document.getElementById('miHelp').addEventListener('click', () => { menu.classList.add('hidden'); welcome.classList.remove('hidden'); });

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { menu.classList.add('hidden'); if (tourActive()) return stopTour(); if (!welcome.classList.contains('hidden')) return hideWelcome(); if (!aboutOverlay.classList.contains('hidden')) return aboutOverlay.classList.add('hidden'); if (!detailCard.classList.contains('hidden')) closeDetail(); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); spinOn = !spinOn; if (globe && !state.hovered) globe.controls().autoRotate = spinOn; syncSpin(); }
});

/* ============================== Boot ===================================== */
buildFilters();
buildRank();
fetch('data/countries.geojson')
  .then(r => r.json())
  .then(geo => { initGlobe(geo); applyDeepLink(); })
  .catch(err => { console.error('Failed to load map data', err); elViz.innerHTML = '<div style="color:var(--muted);text-align:center;padding-top:38vh">Could not load map data.</div>'; });
try { if (!localStorage.getItem(SEEN)) welcome.classList.remove('hidden'); } catch (e) { welcome.classList.remove('hidden'); }
