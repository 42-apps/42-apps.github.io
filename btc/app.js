const $ = id => document.getElementById(id);

// API base: same-origin for the local Node app; a Cloudflare Worker URL for the
// public static deploy. Override at runtime with ?api=<url>.
const SETUP_SENTINEL = 'REPLACE_WITH_WORKER_URL';
const rawApi = (new URLSearchParams(location.search).get('api') || window.SPCX_API || '');
const NEEDS_SETUP = rawApi === SETUP_SENTINEL;
const API = (NEEDS_SETUP ? '' : rawApi).replace(/\/$/, '');
const PUBLIC_MODE = !!API || NEEDS_SETUP;
if (PUBLIC_MODE) document.documentElement.classList.add('public-mode');

const PHASES = {
  starting: { label: 'Booting…',                       cls: 'is-starting' },
  waiting:  { label: 'Standing by — not listed yet',   cls: 'is-waiting'  },
  listed:      { label: 'Listed — not open yet',                cls: 'is-listed'   },
  pending_ipo: { label: '📋 Upcoming IPO — awaiting first trade', cls: 'is-pending' },
  tradable:    { label: 'Active & tradable — imminent',          cls: 'is-tradable' },
  trading:  { label: '🚀 TRADING NOW',                 cls: 'is-trading'  },
  extended: { label: '⏰ Extended hours',              cls: 'is-extended' },
  closed:   { label: '🌙 Market closed · last session', cls: 'is-closed'  },
  error:    { label: 'Connection error',               cls: 'is-error'    },
};

let lastStatus = null;
let liveLastPrice = null;
let prevDayHigh = null, prevDayLow = null;
let tapeAudioOn = localStorage.getItem('spcx_tape_audio') === '1';

function flashExtreme(txt, isLow) {
  const e = $('hodFlash');
  e.textContent = txt;
  e.classList.toggle('low', isLow);
  e.hidden = false;
  clearTimeout(flashExtreme._t);
  flashExtreme._t = setTimeout(() => { e.hidden = true; }, 8000);
}

function updateTitle(s) {
  if (s.live && s.live.price != null) {
    const ch = s.live.dayOpen ? (s.live.price - s.live.dayOpen) / s.live.dayOpen * 100 : null;
    document.title = `${s.symbol} $${s.live.price.toFixed(2)}${ch != null ? ` ${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(1)}%` : ''}`;
  } else {
    document.title = `🚀 ${s.symbol} Monitor`;
  }
}

// Minutes-since-midnight + weekday in US Eastern, DST-correct via Intl (no hardcoded EDT/EST).
function easternClock(d) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const get = t => (parts.find(p => p.type === t) || {}).value;
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { mins, dow };
}
function updateHaltBanner(s) {
  const hb = $('haltBanner');
  let show = false;
  if (s.phase === 'trading' && s.live && s.live.tradeTime) {
    const gap = (new Date(s.serverTime) - new Date(s.live.tradeTime)) / 1000;
    const { mins, dow } = easternClock(new Date(s.serverTime));
    const marketOpen = dow >= 1 && dow <= 5 && mins >= 570 && mins < 960; // 9:30–16:00 ET, DST-correct
    if (marketOpen && gap > (s.haltSeconds || 120)) {
      hb.textContent = `⚠️ No prints for ${Math.round(gap)}s — possible halt/pause (or an IEX feed gap)`;
      show = true;
    }
  }
  hb.hidden = !show;
}

function renderExtras(s) {
  const L = s.live || {}, m = s.metrics || {}, c = s.company || {};
  const bars = L.bars || [];
  let heat = null;
  if (bars.length > 6) {
    const complete = bars.slice(0, -1); // drop the still-forming current minute
    const avg = complete.reduce((a, b) => a + b.v, 0) / complete.length;
    const lastFull = complete[complete.length - 1].v;
    if (avg > 0) heat = lastFull / avg;
  }
  $('sVolHeat').textContent = heat != null ? '×' + heat.toFixed(1) : '—';
  $('sMktLive').textContent = (L.price != null && c.sharesOutstanding) ? '$' + fmtNum(L.price * c.sharesOutstanding) : '—';
  $('sFloatTraded').textContent = (m.cumVol != null && c.float) ? (m.cumVol / c.float * 100).toFixed(1) + '%' : '—';
  if (L.price != null && s.milestoneStep) {
    const next = (Math.floor(L.price / s.milestoneStep) + 1) * s.milestoneStep;
    $('sNextMs').textContent = `$${next} (${(next / L.price * 100 - 100).toFixed(1)}% away)`;
  } else $('sNextMs').textContent = '—';
}

function rel(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 0) return 'just now';
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function fmtTime(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleString(); } catch { return iso; } }
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

async function tick() {
  if (NEEDS_SETUP) {
    document.body.className = 'is-error';
    $('pillText').textContent = '⚙️ Worker URL not set';
    $('detail').textContent = 'Set window.SPCX_API in config.js to your Cloudflare Worker URL (see web/DEPLOY.md), or append ?api=<worker-url> to this page to test.';
    return;
  }
  try {
    const r = await fetch(API + '/api/status', { cache: 'no-store' });
    const s = await r.json();
    render(s);
    lastStatus = s;
  } catch {
    document.body.className = 'is-error';
    $('pillText').textContent = 'Lost connection to the monitor';
    $('detail').textContent = PUBLIC_MODE ? 'The data API is unreachable — is the Worker deployed and the URL set in config.js?' : 'Is the server still running? (node server.js)';
  }
}

function render(s) {
  const ph = PHASES[s.phase] || PHASES.waiting;
  document.body.className = ph.cls;
  $('sym').textContent = s.symbol;
  $('emailTo').textContent = s.emailTo || '—';
  $('pillText').textContent = ph.label;
  $('detail').textContent = s.lastError ? `⚠️ ${s.lastError}` : (s.detail || '—');
  $('g_phase').textContent = s.phase;
  $('g_price').textContent = (s.phase === 'trading' && s.lastPrice != null)
    ? `$${s.lastPrice}`
    : (s.indicativePrice != null ? `~$${s.indicativePrice} (indic.)` : '—');
  $('g_trade').textContent = s.lastTradeTime ? fmtTime(s.lastTradeTime) : '—';
  $('g_exch').textContent = s.exchange || '—';
  $('g_name').textContent = s.assetName || '—';
  $('g_check').textContent = rel(s.lastCheck);
  $('bigprice').textContent = (s.phase === 'trading' && s.lastPrice != null) ? `$${s.lastPrice}` : '';
  $('rocket').classList.toggle('launched', s.phase === 'trading' || s.phase === 'extended');

  if (s.live) {
    $('bigprice').textContent = ''; // the live panel owns the price now
    renderLive(s.live, s);
  } else {
    $('live').hidden = true;
    liveLastPrice = null;
  }

  if (s.metrics) renderMetrics(s.metrics);
  if (s.live) renderExtras(s);
  renderIntel(s);
  renderOnchain(s);
  renderMarket(s);
  renderLogs(s.logs);
  updateTitle(s);
  updateHaltBanner(s);
  $('srvTime').textContent = 'server ' + fmtTime(s.serverTime);
  $('emailState').textContent = s.emailConfigured
    ? `✉️ email armed → ${s.emailTo}`
    : '✉️ email not set up yet — popup + macOS notification still fire';

  if (s.alerts && s.alerts.length) {
    $('log').innerHTML = s.alerts.map(a =>
      `<li class="${a.kind}"><b>${esc(a.title)}</b><span class="t">${rel(a.ts)}</span><br><span class="muted">${esc(a.body)}</span></li>`
    ).join('');

    // Pop the newest alert once, only if it's genuinely fresh (last 10 min).
    const a = s.alerts[0];
    if (a.id !== localStorage.getItem('spcx_last_alert_id')) {
      localStorage.setItem('spcx_last_alert_id', a.id);
      if (Date.now() - new Date(a.ts).getTime() < 10 * 60 * 1000) showPopup(a);
    }
  }
}

function showPopup(a) {
  $('modalIcon').textContent = a.kind === 'main' ? '🚀' : a.kind === 'milestone' ? '🌕' : a.kind === 'test' ? '✅' : '🔔';
  $('modalTitle').textContent = a.title;
  $('modalBody').textContent = a.body;
  $('modal').classList.toggle('main', a.kind === 'main');
  $('overlay').hidden = false;
  beep(a.kind);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(a.title, { body: a.body }); } catch {}
  }
}
$('modalClose').onclick = () => { $('overlay').hidden = true; };
$('overlay').onclick = e => { if (e.target === $('overlay')) $('overlay').hidden = true; };

// WebAudio chime so no sound file is needed.
let actx = null;
function beep(kind) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const seq = kind === 'main' ? [523, 659, 784, 1047] : [660, 880];
    seq.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.start(t); o.stop(t + 0.17);
    });
  } catch {}
}

$('btnNotif').onclick = async () => {
  if (!('Notification' in window)) { alert('This browser has no notification support.'); return; }
  const p = await Notification.requestPermission();
  $('btnNotif').textContent = p === 'granted' ? '🔔 Desktop notifications on' : '🔔 Notifications blocked';
};
$('btnTest').onclick = async () => {
  $('btnTest').disabled = true; $('btnTest').textContent = 'Sending…';
  try { await fetch(API + '/api/test-alert', { method: 'POST' }); } catch {}
  setTimeout(() => { $('btnTest').disabled = false; $('btnTest').textContent = '✅ Send test alert'; tick(); }, 600);
};
$('btnCopy').onclick = copySnapshot;
$('btnAudio').onclick = () => {
  tapeAudioOn = !tapeAudioOn;
  localStorage.setItem('spcx_tape_audio', tapeAudioOn ? '1' : '0');
  $('btnAudio').textContent = tapeAudioOn ? '🔊 Tape audio on' : '🔇 Tape audio';
  if (tapeAudioOn) tapeClick(0, 1);
};
if (tapeAudioOn) $('btnAudio').textContent = '🔊 Tape audio on';
if (PUBLIC_MODE) $('footNote').textContent = 'Live read-only data via Cloudflare Worker · Alpaca IEX + Finnhub · no keys in this page';

if ('Notification' in window && Notification.permission === 'granted') {
  $('btnNotif').textContent = '🔔 Desktop notifications on';
}

tick();
setInterval(tick, 3000);
setInterval(() => {
  if (!lastStatus) return;
  $('g_check').textContent = rel(lastStatus.lastCheck);
  // price-age staleness chip (client clock vs last print)
  const e = $('priceAge');
  if (lastStatus.phase === 'trading' && lastStatus.live && lastStatus.live.tradeTime) {
    const age = (Date.now() - new Date(lastStatus.live.tradeTime).getTime()) / 1000;
    e.textContent = `last print ${age < 60 ? Math.max(0, Math.floor(age)) + 's' : Math.floor(age / 60) + 'm'} ago`;
    e.className = 'priceage' + (age > 60 ? ' stale-red' : age > 15 ? ' stale-amber' : '');
    e.hidden = false;
  } else e.hidden = true;
}, 1000);

// ---------------------------------------------------------------- live view
function fmtUSD(p) {
  return (p == null || isNaN(p)) ? '—' : '$' + Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  n = Number(n);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
function setChg(el, cur, ref, suffix) {
  el.classList.remove('up', 'down', 'flat');
  if (cur == null || ref == null || !ref) { el.textContent = '—'; el.classList.add('flat'); return; }
  const d = cur - ref, pct = d / ref * 100;
  el.classList.add(d > 0 ? 'up' : d < 0 ? 'down' : 'flat');
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '▬';
  const sign = d >= 0 ? '+' : '';
  el.textContent = `${arrow} ${sign}${d.toFixed(2)} (${sign}${pct.toFixed(2)}%)${suffix ? ' ' + suffix : ''}`;
}
function renderRange(price, lo, hi, vwap) {
  const pos = (v) => (lo == null || hi == null || hi <= lo || v == null) ? null : Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
  const pp = pos(price), vp = pos(vwap);
  const mark = $('rMark'), vmark = $('rVwap');
  if (pp == null) mark.style.display = 'none'; else { mark.style.display = ''; mark.style.left = pp + '%'; }
  if (vp == null) vmark.style.display = 'none'; else { vmark.style.display = ''; vmark.style.left = vp + '%'; }
  $('rLo').textContent = 'L ' + fmtUSD(lo);
  $('rHi').textContent = 'H ' + fmtUSD(hi);
  $('rVwapLbl').textContent = 'VWAP ' + fmtUSD(vwap);
}
function maSeries(closes, w) {
  const out = []; let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= w) sum -= closes[i - w];
    out.push(i >= w - 1 ? sum / w : null);
  }
  return out;
}
function renderChart(bars, vwap, lv = {}) {
  const svg = $('chart');
  const W = 720, padX = 8, padR = 46, padTop = 10, priceH = 165, volTop = 185, volH = 50;
  if (!bars || bars.length < 2) {
    svg.innerHTML = '<text x="360" y="120" fill="#8a93b8" font-size="14" text-anchor="middle">Gathering bars…</text>';
    $('chartspan').textContent = '';
    return;
  }
  const closes = bars.map(b => b.c);
  let lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h));
  if (hi <= lo) hi = lo + 1;
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const maxV = Math.max(...bars.map(b => b.v), 1);
  const n = bars.length;
  const x = i => padX + i * (W - padX - padR) / (n - 1);
  const y = p => padTop + (hi - p) / (hi - lo) * priceH;
  const up = closes[n - 1] >= closes[0];
  const col = up ? '#27d17f' : '#ff5470';
  const right = W - padR;

  // y-axis gridlines + price labels
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const p = lo + (hi - lo) * g / 3, gy = y(p).toFixed(1);
    grid += `<line x1="${padX}" y1="${gy}" x2="${right}" y2="${gy}" stroke="rgba(255,255,255,.06)"/>`
      + `<text x="${W - 4}" y="${(+gy + 3.5)}" fill="#5a6488" font-size="10" text-anchor="end">$${p.toFixed(2)}</text>`;
  }
  // dashed level overlays (only when inside the visible range)
  const level = (p, color, label) => {
    if (p == null || p < lo || p > hi) return '';
    const ly = y(p).toFixed(1);
    return `<line x1="${padX}" y1="${ly}" x2="${right}" y2="${ly}" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" opacity="0.8"/>`
      + `<text x="${padX + 2}" y="${(+ly - 3)}" fill="${color}" font-size="9">${label}</text>`;
  };
  let levels = level(vwap, '#ffb020', 'VWAP') + level(lv.open, '#5b8cff', 'OPEN')
    + level(lv.orH, '#8a93b8', 'OR-H') + level(lv.orL, '#8a93b8', 'OR-L')
    + level(lv.ipoRef, '#a98bff', 'IPO');
  // last-price tag at right edge
  const last = closes[n - 1];
  if (last >= lo && last <= hi) {
    const lyy = y(last);
    levels += `<line x1="${padX}" y1="${lyy.toFixed(1)}" x2="${right}" y2="${lyy.toFixed(1)}" stroke="${col}" stroke-width="0.7" opacity="0.6"/>`
      + `<rect x="${right + 1}" y="${(lyy - 8).toFixed(1)}" width="${padR - 2}" height="16" rx="3" fill="${col}"/>`
      + `<text x="${right + (padR - 1) / 2}" y="${(lyy + 3.5).toFixed(1)}" fill="#06101f" font-size="10" font-weight="bold" text-anchor="middle">$${last.toFixed(2)}</text>`;
  }
  // moving averages
  const maPath = (series, color) => {
    let d = '', started = false;
    series.forEach((v, i) => { if (v == null) return; d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; started = true; });
    return d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.1" opacity="0.85"/>` : '';
  };
  const mas = maPath(maSeries(closes, 9), '#5b8cff') + maPath(maSeries(closes, 20), '#a98bff');
  // HOD / LOD markers
  const hodI = bars.reduce((bi, b, i) => b.h > bars[bi].h ? i : bi, 0);
  const lodI = bars.reduce((bi, b, i) => b.l < bars[bi].l ? i : bi, 0);
  const markers =
    `<circle cx="${x(hodI).toFixed(1)}" cy="${y(bars[hodI].h).toFixed(1)}" r="3" fill="#27d17f"/>`
    + `<text x="${x(hodI).toFixed(1)}" y="${(y(bars[hodI].h) - 5).toFixed(1)}" fill="#27d17f" font-size="9" text-anchor="middle">HOD ${bars[hodI].h.toFixed(2)}</text>`
    + `<circle cx="${x(lodI).toFixed(1)}" cy="${y(bars[lodI].l).toFixed(1)}" r="3" fill="#ff5470"/>`
    + `<text x="${x(lodI).toFixed(1)}" y="${(y(bars[lodI].l) + 11).toFixed(1)}" fill="#ff5470" font-size="9" text-anchor="middle">LOD ${bars[lodI].l.toFixed(2)}</text>`;

  const line = bars.map((b, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(b.c).toFixed(1)).join(' ');
  const area = `M${x(0).toFixed(1)} ${(padTop + priceH).toFixed(1)} `
    + bars.map((b, i) => 'L' + x(i).toFixed(1) + ' ' + y(b.c).toFixed(1)).join(' ')
    + ` L${x(n - 1).toFixed(1)} ${(padTop + priceH).toFixed(1)} Z`;
  const bw = Math.max(1, (W - padX - padR) / n - 1);
  const vols = bars.map((b, i) => {
    const h = (b.v / maxV) * volH;
    const fill = (b.c >= b.o) ? 'rgba(39,209,127,.5)' : 'rgba(255,84,112,.5)';
    return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(volTop + volH - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`;
  }).join('');
  svg.innerHTML =
    `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.28"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>`
    + grid
    + `<path d="${area}" fill="url(#cg)"/>` + levels + mas
    + `<path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    + markers + vols
    + `<text x="${padX + 2}" y="${volTop - 4}" fill="#5b8cff" font-size="9">MA9</text><text x="${padX + 32}" y="${volTop - 4}" fill="#a98bff" font-size="9">MA20</text>`;
  const hm = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('chartspan').textContent = `${hm(bars[0].t)}–${hm(bars[n - 1].t)} · ${n} bars`;
}
let lastTapeTop = null;
function renderTape(trades) {
  const ul = $('tape');
  if (!trades || !trades.length) { ul.innerHTML = '<li class="muted">Waiting for prints…</li>'; $('tapeRate').textContent = ''; return; }
  let html = '';
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i], prev = trades[i + 1];
    const dir = prev ? (t.p > prev.p ? 'up' : t.p < prev.p ? 'down' : 'flat') : 'flat';
    const tm = new Date(t.t).toLocaleTimeString([], { hour12: false });
    html += `<li class="${dir}"><span class="tt">${tm}</span><span class="tp">${fmtUSD(t.p)}</span><span class="ts">${fmtNum(t.s)}</span></li>`;
  }
  ul.innerHTML = html;
  // tape pace: prints/min across the visible window
  const spanMs = new Date(trades[0].t) - new Date(trades[trades.length - 1].t);
  $('tapeRate').textContent = spanMs > 0 ? `${Math.round((trades.length - 1) / (spanMs / 60000))} prints/min` : '';
  // opt-in "Geiger counter": click per fresh print, pitched by direction
  if (tapeAudioOn && lastTapeTop != null) {
    let fresh = 0;
    for (const t of trades) { if (t.t <= lastTapeTop) break; fresh++; }
    for (let i = 0; i < Math.min(fresh, 8); i++) {
      const dir = (i + 1 < trades.length) ? Math.sign(trades[i].p - trades[i + 1].p) : 0;
      tapeClick(i * 45, dir);
    }
  }
  lastTapeTop = trades[0].t;
}
function tapeClick(delayMs, dir) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square'; o.frequency.value = dir > 0 ? 1320 : dir < 0 ? 660 : 990;
    o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime + delayMs / 1000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.start(t); o.stop(t + 0.035);
  } catch {}
}
function renderLive(L, sRef) {
  $('live').hidden = false;
  const price = L.price;
  const el = $('livePrice');
  el.textContent = fmtUSD(price);
  if (price != null && liveLastPrice != null && price !== liveLastPrice) {
    el.classList.remove('flashUp', 'flashDn'); void el.offsetWidth; // restart animation
    el.classList.add(price > liveLastPrice ? 'flashUp' : 'flashDn');
  }
  if (price != null) liveLastPrice = price;

  setChg($('liveChgTxt'), price, L.dayOpen, 'vs open');

  // new-high / new-low flash (compare to previous tick's day extremes)
  if (prevDayHigh != null && L.dayHigh != null && L.dayHigh > prevDayHigh) flashExtreme(`🌕 NEW HIGH $${L.dayHigh.toFixed(2)}`, false);
  else if (prevDayLow != null && L.dayLow != null && L.dayLow < prevDayLow) flashExtreme(`🧊 NEW LOW $${L.dayLow.toFixed(2)}`, true);
  prevDayHigh = L.dayHigh; prevDayLow = L.dayLow;

  $('qBid').textContent = fmtUSD(L.bid);
  $('qBidSz').textContent = L.bidSize != null ? '×' + L.bidSize : '';
  $('qAsk').textContent = fmtUSD(L.ask);
  $('qAskSz').textContent = L.askSize != null ? '×' + L.askSize : '';
  $('qSpread').textContent = L.spread != null ? 'spread $' + L.spread.toFixed(2) : '';

  renderRange(price, L.dayLow, L.dayHigh, L.vwap);

  $('sOpen').textContent = fmtUSD(L.dayOpen);
  $('sHigh').textContent = fmtUSD(L.dayHigh);
  $('sLow').textContent = fmtUSD(L.dayLow);
  $('sVwap').textContent = fmtUSD(L.vwap);
  $('sVol').textContent = fmtNum(L.dayVol);
  $('sVelo').textContent = L.minVol != null ? fmtNum(L.minVol) + '/min' : '—';
  $('sSpread').textContent = L.spread != null ? '$' + L.spread.toFixed(2) : '—';
  if (L.ipoRef != null) { $('sIpoCard').hidden = false; setChg($('sIpo'), price, L.ipoRef, ''); }
  else { $('sIpoCard').hidden = true; }

  const mm = (sRef && sRef.metrics) || {};
  renderChart(L.bars || [], L.vwap, { open: L.dayOpen, orH: mm.openRangeHigh, orL: mm.openRangeLow, ipoRef: L.ipoRef });
  renderTape(L.trades || []);
}

// ---------------------------------------------------------------- metrics / order flow
function setVal(el, v, suffix, color) {
  el.classList.remove('up', 'down');
  if (v == null) { el.textContent = '—'; return; }
  el.textContent = `${v >= 0 ? '+' : ''}${v}${suffix || ''}`;
  if (color) el.classList.add(v >= 0 ? 'up' : 'down');
}
function renderMetrics(m) {
  if (!m) return;
  $('sTurnover').textContent = m.turnover != null ? '$' + fmtNum(m.turnover) : '—';
  $('sTrades').textContent = m.tradeCount != null ? fmtNum(m.tradeCount) : '—';
  $('sAvgTrade').textContent = m.avgTradeSize != null ? fmtNum(m.avgTradeSize) + ' sh' : '—';
  setVal($('sDistVwap'), m.distVwapPct, '%', true);
  $('sOpenRange').textContent = (m.openRangeLow != null && m.openRangeHigh != null) ? `$${m.openRangeLow.toFixed(2)}–$${m.openRangeHigh.toFixed(2)}` : '—';
  $('sRangeD').textContent = m.rangeDollar != null ? '$' + m.rangeDollar.toFixed(2) : '—';
  $('sRvol').textContent = m.realizedVolPerMin != null ? m.realizedVolPerMin.toFixed(2) + '%' : '—';
  setVal($('sPctOpen'), m.pctFromOpen, '%', true);

  $('lpThresh').textContent = m.largePrintShares != null ? fmtNum(m.largePrintShares) : '—';
  const buy = m.buyVol || 0, sell = m.sellVol || 0, tot = buy + sell;
  const buyPct = tot ? buy / tot * 100 : 50;
  $('ofBuy').style.width = buyPct.toFixed(1) + '%';
  $('ofSell').style.width = (100 - buyPct).toFixed(1) + '%';
  $('ofBuyLbl').textContent = `Buy ${fmtNum(buy)} (${buyPct.toFixed(0)}%)`;
  $('ofSellLbl').textContent = `Sell ${fmtNum(sell)} (${(100 - buyPct).toFixed(0)}%)`;
  const delta = m.delta || 0, dEl = $('ofDelta');
  dEl.classList.remove('up', 'down'); dEl.classList.add(delta >= 0 ? 'up' : 'down');
  dEl.textContent = `Δ ${delta >= 0 ? '+' : ''}${fmtNum(delta)} sh`;
  $('ofSince').textContent = m.flowSince ? new Date(m.flowSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  // rolling 5-min window — "who's in control right now"
  const b5 = m.buy5m || 0, s5 = m.sell5m || 0, t5 = b5 + s5;
  const b5pct = t5 ? b5 / t5 * 100 : 50;
  $('of5Buy').style.width = b5pct.toFixed(1) + '%';
  $('of5Sell').style.width = (100 - b5pct).toFixed(1) + '%';
  $('of5BuyLbl').textContent = t5 ? `Buy ${fmtNum(b5)} (${b5pct.toFixed(0)}%)` : 'no classified prints yet';
  $('of5SellLbl').textContent = t5 ? `Sell ${fmtNum(s5)} (${(100 - b5pct).toFixed(0)}%)` : '';
  const d5 = m.delta5m || 0, d5El = $('of5Delta');
  d5El.classList.remove('up', 'down'); d5El.classList.add(d5 >= 0 ? 'up' : 'down');
  d5El.textContent = t5 ? `Δ ${d5 >= 0 ? '+' : ''}${fmtNum(d5)} sh` : '';

  const ul = $('bigprints');
  const lp = m.largePrints || [];
  ul.innerHTML = lp.length
    ? lp.map(t => `<li><span class="tt">${new Date(t.t).toLocaleTimeString([], { hour12: false })}</span><span class="tp">${fmtUSD(t.p)}</span><span class="ts">${fmtNum(t.s)}</span></li>`).join('')
    : '<li class="muted">No block prints yet.</li>';
}

// ---------------------------------------------------------------- intel: company + news
function renderIntel(s) {
  const company = s.company, news = s.news;
  let show = false;
  if (company) {
    const c = company;
    $('cShares').textContent = c.sharesOutstanding != null ? fmtNum(c.sharesOutstanding) : '—';
    $('cFloat').textContent = c.float != null ? fmtNum(c.float) : '—';
    $('cFloatPct').textContent = c.floatPct != null ? c.floatPct + '%' : '—';
    $('cMktCap').textContent = c.marketCap != null ? '$' + fmtNum(c.marketCap) : '—';
    $('cEmp').textContent = c.employees != null ? fmtNum(c.employees) : '—';
    $('cListed').textContent = c.listDate || '—';
    $('cIndustry').textContent = (c.industry && c.industry !== 'N/A') ? c.industry : '—';
    const nm = k => ({ massive: 'Massive', finnhub: 'Finnhub', coingecko: 'CoinGecko' }[k] || (k.charAt(0).toUpperCase() + k.slice(1)));
    const src = Object.keys(c.sources || {}).filter(k => c.sources[k]).map(nm);
    $('companySrc').textContent = src.join(' + ');
    const errs = Object.entries(c.errors || {}).filter(([, v]) => v).map(([k, v]) => nm(k) + ' — ' + v);
    let note = '';
    if (errs.length) note = (src.length ? 'Also: ' : 'Add a valid key in config.json — ') + errs.join(' · ');
    else if (!src.length) note = 'Awaiting fundamental data.';
    $('companyNote').textContent = note;
    if (c.sharesOutstanding || c.marketCap || c.employees || c.listDate || errs.length) show = true;
  }
  if (news && news.length) {
    show = true;
    $('news').innerHTML = news.slice(0, 8).map(n => {
      const tm = new Date(n.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const cls = n.sentiment || 'neu';
      const badge = cls === 'pos' ? '▲' : cls === 'neg' ? '▼' : '▬';
      return `<li class="${cls}"><span class="sbadge">${badge}</span><a href="${esc(n.url || '#')}" target="_blank" rel="noopener">${esc(n.headline || '')}</a><div class="nmeta">${esc(n.source || '')} · ${tm}</div></li>`;
    }).join('');
    const pos = news.filter(n => n.sentiment === 'pos').length;
    const neg = news.filter(n => n.sentiment === 'neg').length;
    $('newsMood').textContent = `mood ${pos}▲ ${neg}▼`;
  }
  $('intel').hidden = !show;
}

// On-chain + market panels — populated only when the API provides the data
// (so they stay hidden on the stock dashboard, which never returns them).
function renderOnchain(s) {
  const o = s.onchain, sec = document.getElementById('onchain');
  if (!sec) return;
  if (!o) { sec.hidden = true; return; }
  sec.hidden = false;
  $('ocBlock').textContent = o.blockHeight != null ? Number(o.blockHeight).toLocaleString() : '—';
  $('ocFee').textContent = (o.fees && o.fees.fastestFee != null) ? o.fees.fastestFee + ' sat/vB' : '—';
  $('ocMempool').textContent = o.mempoolCount != null ? fmtNum(o.mempoolCount) + ' tx' : '—';
  $('ocTx').textContent = o.txCount24h != null ? fmtNum(o.txCount24h) : '—';
  $('ocHash').textContent = o.hashrate != null ? (o.hashrate / 1e18).toFixed(0) + ' EH/s' : '—';
  const dv = $('ocDiff'); dv.className = 'v';
  if (o.diffChangePct != null) { dv.textContent = (o.diffChangePct >= 0 ? '+' : '') + o.diffChangePct + '%'; dv.classList.add(o.diffChangePct >= 0 ? 'up' : 'down'); } else dv.textContent = '—';
  $('ocBlockTime').textContent = o.minutesBetweenBlocks != null ? o.minutesBetweenBlocks + ' min' : '—';
  if (o.halvingBlocks != null) { const days = Math.round(o.halvingBlocks * 10 / 60 / 24); $('ocHalving').textContent = fmtNum(o.halvingBlocks) + ' blk · ~' + (days >= 365 ? (days / 365).toFixed(1) + 'y' : days + 'd'); } else $('ocHalving').textContent = '—';
}
function renderMarket(s) {
  const m = s.market, sec = document.getElementById('market');
  if (!sec) return;
  if (!m) { sec.hidden = true; return; }
  sec.hidden = false;
  $('mkDom').textContent = m.btcDominance != null ? m.btcDominance + '%' : '—';
  $('mkTotal').textContent = m.totalCryptoMcap != null ? '$' + fmtNum(m.totalCryptoMcap) : '—';
  const fg = $('mkFng'); fg.className = 'v';
  if (m.fearGreed != null) { fg.textContent = m.fearGreed + ' · ' + (m.fearGreedLabel || ''); const c = m.fearGreed >= 55 ? 'up' : m.fearGreed <= 45 ? 'down' : null; if (c) fg.classList.add(c); } else fg.textContent = '—';
  const fr = $('mkFunding'); fr.className = 'v';
  if (m.fundingRatePct != null) { fr.textContent = (m.fundingRatePct >= 0 ? '+' : '') + m.fundingRatePct + '%'; fr.classList.add(m.fundingRatePct >= 0 ? 'up' : 'down'); } else fr.textContent = '—';
  $('mkOi').textContent = m.openInterestBTC != null ? fmtNum(m.openInterestBTC) + ' BTC' : '—';
  [['mkChg24', m.change24h], ['mkChg7', m.change7d], ['mkChg30', m.change30d]].forEach(([id, val]) => {
    const el = $(id); el.className = 'v';
    if (val != null) { el.textContent = (val >= 0 ? '+' : '') + val + '%'; el.classList.add(val >= 0 ? 'up' : 'down'); } else el.textContent = '—';
  });
}

function renderLogs(logs) {
  if (!logs) { $('logState').textContent = ''; return; }
  const b = logs.total;
  const sz = b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  $('logState').textContent = `🗜️ logs ${sz} (gz) · ${fmtNum(logs.linesWritten)} rows this session`;
}

// ---------------------------------------------------------------- clipboard share-card
function flashBtn(btn, txt) { const o = btn.dataset.label || btn.textContent; btn.dataset.label = o; btn.textContent = txt; setTimeout(() => { btn.textContent = o; }, 1800); }
async function copySnapshot() {
  const s = lastStatus;
  if (!s) return;
  drawShareCard(s);
  $('shareCanvas').toBlob(async (blob) => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        flashBtn($('btnCopy'), '✅ Copied!');
      } else throw new Error('clipboard unsupported');
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${s.symbol}-snapshot.png`;
      a.click();
      flashBtn($('btnCopy'), '⬇️ Saved PNG');
    }
  }, 'image/png');
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawSpark(ctx, bars, x, y, w, h, volH) {
  if (!bars || bars.length < 2) {
    ctx.fillStyle = '#5a6488'; ctx.font = '13px sans-serif'; ctx.fillText('Gathering bars…', x, y + h / 2);
    return;
  }
  const cs = bars.map(b => b.c), lo = Math.min(...cs), hi = Math.max(...cs), rng = (hi - lo) || 1;
  const up = cs[cs.length - 1] >= cs[0];
  const col = up ? '#27d17f' : '#ff5470';
  // area fill
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, up ? 'rgba(39,209,127,.25)' : 'rgba(255,84,112,.25)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(x, y + h);
  bars.forEach((b, i) => ctx.lineTo(x + i * w / (bars.length - 1), y + h - (b.c - lo) / rng * h));
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // price line
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  bars.forEach((b, i) => { const px = x + i * w / (bars.length - 1), py = y + h - (b.c - lo) / rng * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.stroke();
  // hi/lo labels
  ctx.fillStyle = '#5a6488'; ctx.font = '11px sans-serif';
  ctx.fillText('$' + hi.toFixed(2), x + w - 60, y + 11);
  ctx.fillText('$' + lo.toFixed(2), x + w - 60, y + h - 3);
  // volume bars under the price line
  if (volH) {
    const maxV = Math.max(...bars.map(b => b.v), 1), bw = Math.max(1, w / bars.length - 1);
    bars.forEach((b, i) => {
      const bh = (b.v / maxV) * volH;
      ctx.fillStyle = b.c >= b.o ? 'rgba(39,209,127,.45)' : 'rgba(255,84,112,.45)';
      ctx.fillRect(x + i * w / (bars.length - 1) - bw / 2, y + h + 8 + (volH - bh), bw, bh);
    });
  }
}
// Share-card v2: the WHOLE dashboard on one PNG — price, day stats, order flow,
// analytics, company/float, large prints, sentiment-colored news, chart.
function drawShareCard(s) {
  const c = $('shareCanvas');
  c.width = 900; c.height = 1500;
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  const L = s.live || {}, m = s.metrics || {}, co = s.company || {}, news = s.news || [];
  const X = 40, CW = W - 2 * X;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#10183a'); g.addColorStop(1, '#070b18');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  const usd = v => v != null ? '$' + Number(v).toFixed(2) : '—';
  const sect = (label, y) => { ctx.fillStyle = '#5b8cff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(label.toUpperCase(), X, y); return y + 12; };
  const tiles = (list, y0, perRow) => {
    const gap = 12, w = (CW - gap * (perRow - 1)) / perRow, h = 64;
    list.forEach((t, i) => {
      const colI = i % perRow, row = Math.floor(i / perRow);
      const x = X + colI * (w + gap), yy = y0 + row * (h + gap);
      ctx.fillStyle = '#121933'; roundRect(ctx, x, yy, w, h, 10); ctx.fill();
      ctx.fillStyle = '#8a93b8'; ctx.font = '11px sans-serif'; ctx.fillText(String(t[0]).toUpperCase(), x + 12, yy + 22);
      ctx.fillStyle = t[2] || '#e8ecff'; ctx.font = 'bold 19px sans-serif'; ctx.fillText(String(t[1]), x + 12, yy + 48);
    });
    return y0 + Math.ceil(list.length / perRow) * (h + gap);
  };

  // header
  ctx.fillStyle = '#5b8cff'; ctx.font = 'bold 30px -apple-system,Segoe UI,sans-serif';
  ctx.fillText('🚀 SPCX Monitor', X, 54);
  ctx.fillStyle = '#8a93b8'; ctx.font = '14px sans-serif';
  ctx.fillText(new Date(s.serverTime).toLocaleString(), X, 78);

  // price block
  ctx.fillStyle = '#e8ecff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(s.symbol, X, 122);
  ctx.fillStyle = '#8a93b8'; ctx.font = '14px sans-serif'; ctx.fillText((s.assetName || '').slice(0, 60), X + 90, 122);
  const price = L.price != null ? L.price : s.lastPrice;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px sans-serif';
  ctx.fillText(price != null ? '$' + Number(price).toFixed(2) : '—', X, 192);
  let chgX = X;
  if (L.dayOpen && price != null) {
    const d = price - L.dayOpen, pct = d / L.dayOpen * 100;
    ctx.fillStyle = d >= 0 ? '#27d17f' : '#ff5470'; ctx.font = 'bold 20px sans-serif';
    const txt = `${d >= 0 ? '▲' : '▼'} ${d >= 0 ? '+' : ''}${d.toFixed(2)} (${d >= 0 ? '+' : ''}${pct.toFixed(2)}%) vs open`;
    ctx.fillText(txt, X, 226); chgX += ctx.measureText(txt).width + 24;
  }
  if (L.ipoRef && price != null) {
    const pct = (price - L.ipoRef) / L.ipoRef * 100;
    ctx.fillStyle = '#a98bff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs $${L.ipoRef} IPO ref`, chgX, 226);
  }

  // chart
  let y = sect('Price · 1-min bars · MAs omitted', 262);
  drawSpark(ctx, L.bars || [], X, y + 6, CW, 130, 36);
  y += 190;

  // day stats
  y = sect('Session (IEX partial tape)', y);
  y = tiles([
    ['Open', usd(L.dayOpen)], ['High', usd(L.dayHigh)], ['Low', usd(L.dayLow)], ['VWAP', usd(L.vwap)],
    ['Volume', m.cumVol != null ? fmtNum(m.cumVol) : '—'], ['Turnover', m.turnover != null ? '$' + fmtNum(m.turnover) : '—'],
    ['Trades', m.tradeCount != null ? fmtNum(m.tradeCount) : '—'], ['Avg trade', m.avgTradeSize != null ? fmtNum(m.avgTradeSize) + ' sh' : '—'],
    ['Bid', usd(L.bid)], ['Ask', usd(L.ask)], ['Spread', L.spread != null ? '$' + L.spread.toFixed(2) : '—'], ['Vol/min', L.minVol != null ? fmtNum(L.minVol) : '—'],
  ], y + 8, 4) + 14;

  // order flow
  y = sect('Order flow (approx, session)', y);
  const buy = m.buyVol || 0, sell = m.sellVol || 0, tot = buy + sell;
  const bp = tot ? buy / tot : 0.5;
  ctx.fillStyle = '#0e1430'; roundRect(ctx, X, y + 6, CW, 18, 9); ctx.fill();
  if (tot) {
    ctx.save(); roundRect(ctx, X, y + 6, CW, 18, 9); ctx.clip();
    ctx.fillStyle = '#27d17f'; ctx.fillRect(X, y + 6, CW * bp, 18);
    ctx.fillStyle = '#ff5470'; ctx.fillRect(X + CW * bp, y + 6, CW * (1 - bp), 18);
    ctx.restore();
  }
  ctx.fillStyle = '#8a93b8'; ctx.font = '13px sans-serif';
  ctx.fillText(`Buy ${fmtNum(buy)} (${(bp * 100).toFixed(0)}%)`, X, y + 44);
  const sellTxt = `Sell ${fmtNum(sell)} (${((1 - bp) * 100).toFixed(0)}%)`;
  ctx.fillText(sellTxt, X + CW - ctx.measureText(sellTxt).width, y + 44);
  const d5 = m.delta5m || 0, t5 = (m.buy5m || 0) + (m.sell5m || 0);
  ctx.fillStyle = d5 >= 0 ? '#27d17f' : '#ff5470';
  ctx.fillText(t5 ? `Last 5 min: Δ ${d5 >= 0 ? '+' : ''}${fmtNum(d5)} sh (${m.buy5mPct != null ? m.buy5mPct + '% buy' : ''})` : '', X + CW / 2 - 80, y + 44);
  y += 70;

  // analytics
  y = sect('Analytics', y);
  const cUp = '#27d17f', cDn = '#ff5470';
  y = tiles([
    ['Δ from VWAP', m.distVwapPct != null ? (m.distVwapPct >= 0 ? '+' : '') + m.distVwapPct + '%' : '—', m.distVwapPct >= 0 ? cUp : cDn],
    ['Open range 5m', (m.openRangeLow != null && m.openRangeHigh != null) ? `$${m.openRangeLow.toFixed(2)}–$${m.openRangeHigh.toFixed(2)}` : '—'],
    ['Day range', m.rangeDollar != null ? '$' + m.rangeDollar.toFixed(2) : '—'],
    ['Real. vol /min', m.realizedVolPerMin != null ? m.realizedVolPerMin.toFixed(2) + '%' : '—'],
    ['% from open', m.pctFromOpen != null ? (m.pctFromOpen >= 0 ? '+' : '') + m.pctFromOpen + '%' : '—', m.pctFromOpen >= 0 ? cUp : cDn],
    ['Mkt cap (live)', (price != null && co.sharesOutstanding) ? '$' + fmtNum(price * co.sharesOutstanding) : '—'],
    ['Float traded', (m.cumVol != null && co.float) ? (m.cumVol / co.float * 100).toFixed(1) + '% (IEX)' : '—'],
    ['Buy share', m.buyPct != null ? m.buyPct + '%' : '—'],
  ], y + 8, 4) + 14;

  // company — read labels+values from the rendered panel so the card matches the
  // page (stock float OR crypto supply) without hardcoding asset-specific labels
  const cpTiles = [...document.querySelectorAll('#companyPanel .lcard')].slice(0, 4)
    .map(el => [el.querySelector('.k').textContent, el.querySelector('.v').textContent]);
  y = sect('Company', y);
  y = tiles(cpTiles.length ? cpTiles : [['—', '—']], y + 8, 4) + 14;

  // large prints
  y = sect(`Large prints ≥ ${fmtNum(m.largePrintShares || 1000)} sh`, y) + 10;
  ctx.font = '14px sans-serif';
  const lp = (m.largePrints || []).slice(0, 5);
  if (lp.length) {
    lp.forEach(t => {
      ctx.fillStyle = '#8a93b8';
      ctx.fillText(new Date(t.t).toLocaleTimeString([], { hour12: false }), X, y + 8);
      ctx.fillStyle = '#e8ecff'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(usd(t.p), X + 110, y + 8);
      ctx.font = '14px sans-serif'; ctx.fillStyle = '#8a93b8';
      ctx.fillText(fmtNum(t.s) + ' sh', X + 220, y + 8);
      y += 22;
    });
  } else { ctx.fillStyle = '#5a6488'; ctx.fillText('No block prints yet.', X, y + 8); y += 22; }
  y += 18;

  // news with sentiment colors
  y = sect('News (▲ positive · ▼ negative)', y) + 10;
  ctx.font = '14px sans-serif';
  const nn = news.slice(0, 4);
  if (nn.length) {
    nn.forEach(n => {
      const col2 = n.sentiment === 'pos' ? '#27d17f' : n.sentiment === 'neg' ? '#ff5470' : '#8a93b8';
      ctx.fillStyle = col2;
      ctx.fillText(n.sentiment === 'pos' ? '▲' : n.sentiment === 'neg' ? '▼' : '▬', X, y + 8);
      ctx.fillStyle = n.sentiment === 'neu' ? '#c7cdea' : col2;
      ctx.fillText(String(n.headline || '').slice(0, 88), X + 24, y + 8);
      y += 24;
    });
  } else { ctx.fillStyle = '#5a6488'; ctx.fillText('No headlines yet.', X, y + 8); y += 24; }

  // footer
  ctx.fillStyle = '#3a4570'; ctx.font = '13px sans-serif';
  ctx.fillText('Source: Alpaca IEX (partial tape) + Finnhub · local SPCX Monitor', X, H - 18);
}
