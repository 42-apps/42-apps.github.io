// Network Quality Monitor — popup UI.
// Runs in two modes: real (inside the extension, talks to the service worker)
// and demo (opened as a plain web page — fakes data so the UI can be previewed).

import { STATES, ENDPOINTS, classify, median, fmtMs, fmtPct, fmtMos, starsPct } from '../lib/metrics.js';

const IS_EXT = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

const $ = (id) => document.getElementById(id);
const app = $('app');
const els = {
  emoji: $('emoji'), verdict: $('verdict'), verdictSub: $('verdictSub'),
  starsFill: $('starsFill'), mosNum: $('mosNum'),
  valRtt: $('valRtt'), valJit: $('valJit'), valLoss: $('valLoss'),
  dotRtt: $('dotRtt'), dotJit: $('dotJit'), dotLoss: $('dotLoss'),
  endpointNote: $('endpointNote'),
  spark: $('spark'), strip: $('strip'),
  panel: $('panel'), sparkNote: $('sparkNote'), sparkSpan: $('sparkSpan'), sparkCadence: $('sparkCadence'),
  liveStatus: $('liveStatus'), liveText: $('liveText'),
  btnTrends: $('btnTrends'), btnGear: $('btnGear'), btnBack: $('btnBack'),
  heroFace: $('heroFace'), settingsPanel: $('settings'), demoPill: $('demoPill'),
  selInterval: $('selInterval'), selEndpoint: $('selEndpoint'),
  tglMonitor: $('tglMonitor'), tglNotify: $('tglNotify'),
  tglRecover: $('tglRecover'), tglBadge: $('tglBadge'),
  trendsPanel: $('trends'), btnTrendsBack: $('btnTrendsBack'), ranges: $('ranges'),
  trendChart: $('trendChart'), trendEmpty: $('trendEmpty'),
  trendSpan: $('trendSpan'), trendCadence: $('trendCadence'), tstats: $('tstats'),
};

const MAX_POINTS = 90;
let settings = { intervalSec: 30, endpoint: 'auto', notifyDegrade: true, notifyRecover: true, showBadge: true, paused: false };
let history = [];     // recent compact entries {t,s,r,j,l,m} — drives the live sparkline
let fullHistory = []; // full saved history — drives the trends overlay
let trendMin = 60;
let last = null;      // latest full snapshot
let lastT = null;
let connected = !IS_EXT;

const clockOf = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function fmtSpan(ms) {
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = ms / 3_600_000;
  return `${h < 10 ? h.toFixed(1) : Math.round(h)} h`;
}

// ---------------------------------------------------------------- rendering

function stateKey() {
  if (settings.paused) return 'paused';
  return last ? last.state : 'unknown';
}

function render() {
  const key = stateKey();
  const meta = STATES[key];
  if (app.dataset.state !== key) {
    app.dataset.state = key;
    app.classList.remove('bounce');
    void app.offsetWidth; // restart animation
    app.classList.add('bounce');
  }
  els.emoji.textContent = meta.emoji;
  els.verdict.textContent = meta.label;
  els.verdictSub.textContent = meta.blurb;

  const mos = last?.mos ?? null;
  els.starsFill.style.width = `${starsPct(mos)}%`;
  els.mosNum.textContent = `${fmtMos(mos)} / 5`;

  els.valRtt.textContent = fmtMs(last?.rtt);
  els.valJit.textContent = fmtMs(last?.jitter);
  els.valLoss.textContent = last ? fmtPct(last.lossSmoothed) : '—';
  const bands = last?.bands;
  els.dotRtt.style.background = bands ? STATES[bands.rtt].color : 'var(--muted)';
  els.dotJit.style.background = bands ? STATES[bands.jitter].color : 'var(--muted)';
  els.dotLoss.style.background = bands ? STATES[bands.loss].color : 'var(--muted)';

  const ep = ENDPOINTS.find((e) => e.id === last?.endpointId);
  els.endpointNote.textContent =
    key === 'offline' ? 'no route out' :
    key === 'paused' ? 'monitoring paused' :
    ep ? `via ${ep.label}` : 'VoIP readiness, live';

  lastT = last?.t ?? lastT;
  renderFooter(key);
  drawSpark();
  drawStrip();
}

function renderFooter(key) {
  const live = !settings.paused && connected;
  app.dataset.live = live ? '1' : '';
  els.liveText.textContent =
    key === 'paused' ? 'monitoring paused' :
    key === 'offline' ? 'offline — watching' :
    live ? 'live · every 1s' : 'reconnecting…';
  els.sparkNote.textContent =
    key === 'paused' ? 'latency · paused' : 'latency · live';
}

// ---------------------------------------------------------------- sparkline (live, ~1s/point)

function drawSpark() {
  const canvas = els.spark;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 308, H = 72;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pts = history.filter((p) => p.r != null).slice(-MAX_POINTS);
  const accent = getComputedStyle(app).getPropertyValue('--accent').trim() || '#94a3b8';

  if (pts.length < 2) {
    els.sparkSpan.textContent = 'warming up…';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('collecting samples…', W / 2, H / 2 + 4);
    return;
  }

  const span = pts[pts.length - 1].t - pts[0].t;
  els.sparkSpan.textContent = `last ${fmtSpan(span)}`;

  const rtts = pts.map((p) => p.r).sort((a, b) => a - b);
  const p95 = rtts[Math.floor(rtts.length * 0.95)];
  const max = Math.max(220, p95 * 1.3);
  const x = (i) => 2 + (i / (pts.length - 1)) * (W - 8);
  const y = (r) => H - 6 - (Math.min(r, max) / max) * (H - 16);

  if (max > 200) {
    const gy = y(200);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(2, gy); ctx.lineTo(W - 2, gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('200 ms', W - 4, gy - 3);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, accent + '59');
  grad.addColorStop(1, accent + '00');
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.r)) : ctx.moveTo(x(0), y(p.r))));
  ctx.lineTo(x(pts.length - 1), H - 2); ctx.lineTo(x(0), H - 2); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.r)) : ctx.moveTo(x(0), y(p.r))));
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  ctx.fillStyle = '#f87171';
  pts.forEach((p, i) => {
    if (p.l > 0) { ctx.beginPath(); ctx.arc(x(i), 5, 2.4, 0, Math.PI * 2); ctx.fill(); }
  });

  const lp = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(x(pts.length - 1), y(lp.r), 3.2, 0, Math.PI * 2);
  ctx.fillStyle = accent; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2; ctx.stroke();
}

// ---------------------------------------------------------------- history strip

function drawStrip() {
  const items = history.slice(-40);
  els.strip.replaceChildren(...items.map((p) => {
    const div = document.createElement('div');
    div.className = 'seg';
    div.style.background = STATES[p.s]?.color || 'rgba(255,255,255,.08)';
    if (p.s === 'offline') div.style.opacity = '0.55';
    const when = clockOf(p.t);
    div.title = p.r == null
      ? `${when} · offline`
      : `${when} · ${Math.round(p.r)} ms · jitter ${Math.round(p.j)} ms · loss ${p.l}% · ${STATES[p.s].label}`;
    return div;
  }));
}

// ---------------------------------------------------------------- trends overlay (saved record, 30s/point)

async function openTrends() {
  els.trendsPanel.classList.add('open');
  els.trendsPanel.setAttribute('aria-hidden', 'false');
  fullHistory = (await backend.getHistory()) || history;
  drawTrend();
}

function closeTrends() {
  els.trendsPanel.classList.remove('open');
  els.trendsPanel.setAttribute('aria-hidden', 'true');
}

function setRange(min, btn) {
  trendMin = min;
  for (const b of els.ranges.querySelectorAll('.rbtn')) b.classList.toggle('active', b === btn);
  drawTrend();
}

function renderStats(items) {
  els.tstats.replaceChildren(...items.map((it) => {
    const d = document.createElement('div'); d.className = 'ts';
    const b = document.createElement('b'); b.textContent = it.v;
    const l = document.createElement('label'); l.textContent = it.l;
    d.append(b, l);
    return d;
  }));
}

function drawTrend() {
  const nowT = Date.now();
  const cutoff = nowT - trendMin * 60_000;
  const pts = fullHistory.filter((p) => p.t >= cutoff);
  const valid = pts.filter((p) => p.r != null);
  const enough = valid.length >= 2;

  els.trendEmpty.hidden = enough;
  els.trendChart.style.opacity = enough ? '1' : '0.12';
  els.trendCadence.textContent = 'a point every 30s';
  els.trendSpan.textContent = pts.length
    ? `last ${fmtSpan(nowT - pts[0].t)} · ${pts.length} checks`
    : 'no data in this range yet';

  const canvas = els.trendChart;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 308, H = 150;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!enough) { els.tstats.replaceChildren(); return; }

  const rtts = valid.map((p) => p.r).sort((a, b) => a - b);
  const p95 = rtts[Math.floor(rtts.length * 0.95)];
  const max = Math.max(220, p95 * 1.25);
  // Scale x to the data we actually have so the line fills the width and lines up
  // with the start/end clock labels (when history is shorter than the chosen range).
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const xspan = Math.max(1, t1 - t0);
  const x = (t) => 3 + ((t - t0) / xspan) * (W - 10);
  const y = (r) => H - 18 - (Math.min(r, max) / max) * (H - 32);

  for (const [val, label] of [[200, '200'], [450, '450']]) {
    if (max <= val) continue;
    const gy = y(val);
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(3, gy); ctx.lineTo(W - 3, gy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(`${label} ms`, W - 4, gy - 3);
  }

  // line, colored per the state at each point
  ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.r == null || b.r == null) continue;
    ctx.strokeStyle = STATES[b.s]?.color || '#94a3b8';
    ctx.beginPath(); ctx.moveTo(x(a.t), y(a.r)); ctx.lineTo(x(b.t), y(b.r)); ctx.stroke();
  }

  // offline moments as red ticks along the baseline
  ctx.fillStyle = '#ef4444';
  for (const p of pts) if (p.r == null) ctx.fillRect(x(p.t) - 1, H - 14, 2, 9);

  // time axis ends
  ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.font = '9px system-ui';
  ctx.textAlign = 'left'; ctx.fillText(clockOf(pts[0].t), 3, H - 3);
  ctx.textAlign = 'right'; ctx.fillText(clockOf(pts[pts.length - 1].t), W - 3, H - 3);

  const jitAvg = valid.reduce((a, p) => a + (p.j || 0), 0) / valid.length;
  const worstLoss = pts.reduce((m, p) => Math.max(m, p.l || 0), 0);
  const goodPct = (100 * pts.filter((p) => p.s === 'good').length) / pts.length;
  renderStats([
    { v: fmtMs(median(valid.map((p) => p.r))), l: 'median' },
    { v: fmtMs(jitAvg), l: 'avg jitter' },
    { v: fmtPct(worstLoss), l: 'worst loss' },
    { v: `${Math.round(goodPct)}%`, l: 'time good' },
  ]);
}

// ---------------------------------------------------------------- data plumbing

function acceptSnapshot(snap) {
  if (!snap) return;
  last = snap;
  if (!history.length || history[history.length - 1].t !== snap.t) {
    history.push({
      t: snap.t, s: snap.state,
      r: snap.rtt == null ? null : Math.round(snap.rtt * 10) / 10,
      j: snap.jitter == null ? null : Math.round(snap.jitter * 10) / 10,
      l: Math.round(snap.lossBurst * 10) / 10,
      m: snap.mos == null ? null : Math.round(snap.mos * 100) / 100,
    });
    if (history.length > 400) history.shift();
  }
  render();
}

function fillSettingsForm() {
  els.selInterval.value = String(settings.intervalSec);
  els.selEndpoint.value = settings.endpoint;
  els.tglMonitor.checked = !settings.paused;
  els.tglNotify.checked = settings.notifyDegrade;
  els.tglRecover.checked = settings.notifyRecover;
  els.tglBadge.checked = settings.showBadge;
}

function readSettingsForm() {
  return {
    intervalSec: Number(els.selInterval.value),
    endpoint: els.selEndpoint.value,
    paused: !els.tglMonitor.checked,
    notifyDegrade: els.tglNotify.checked,
    notifyRecover: els.tglRecover.checked,
    showBadge: els.tglBadge.checked,
  };
}

// ---------------------------------------------------------------- backends

const backend = IS_EXT ? extBackend() : demoBackend();

function extBackend() {
  let port = null;
  function connect() {
    try {
      port = chrome.runtime.connect({ name: 'nqm-live' });
      connected = true;
      port.onMessage.addListener((msg) => { if (msg?.type === 'snapshot') acceptSnapshot(msg.snap); });
      port.onDisconnect.addListener(() => {
        connected = false;
        render();
        setTimeout(connect, 600); // service worker may have restarted
      });
    } catch { /* popup closing */ }
  }
  return {
    async init() {
      const res = await chrome.runtime.sendMessage({ type: 'getState' });
      if (res) {
        settings = res.settings;
        history = res.history || [];
        last = res.last;
      }
      fillSettingsForm();
      render();
      connect();
    },
    async getHistory() {
      const res = await chrome.runtime.sendMessage({ type: 'getHistory' });
      return res?.history || history;
    },
    async saveSettings(next) {
      const res = await chrome.runtime.sendMessage({ type: 'updateSettings', settings: next });
      if (res?.settings) settings = res.settings;
      render();
    },
  };
}

// Demo backend: plausible fake data so the UI can be previewed as a plain web page.
// Click the face to cycle states. Seeds 6 h of saved history for the trends view.
function demoBackend() {
  els.demoPill.hidden = false;
  const REGIMES = {
    good: { rtt: [26, 60], j: [1.5, 9], loss: 0 },
    fair: { rtt: [130, 270], j: [26, 54], loss: 1.4 },
    bad: { rtt: [280, 490], j: [58, 115], loss: 6 },
    offline: null,
  };
  let regime = 'good';
  const demoFull = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function fakeSnap(reg, t) {
    if (reg === 'offline') {
      return { t, state: 'offline', rtt: null, jitter: null, lossBurst: 100, lossSmoothed: 100, mos: null, bands: null, endpointId: null };
    }
    const r = REGIMES[reg];
    const rtt = rnd(...r.rtt), jitter = rnd(...r.j);
    const loss = Math.random() < 0.7 ? r.loss : r.loss + rnd(0, 2);
    const { state, mos, bands } = classify({ rtt, jitter }, loss);
    return { t, state, rtt, jitter, lossBurst: loss, lossSmoothed: loss, mos, bands, endpointId: 'google' };
  }
  const toCompact = (s) => ({ t: s.t, s: s.state, r: s.rtt, j: s.jitter, l: s.lossBurst, m: s.mos });

  return {
    async init() {
      const now = Date.now();
      // 6 h of saved record at 30 s, with a few rough patches — for the trends overlay.
      for (let i = 720; i > 0; i--) {
        const t = now - i * 30_000;
        let reg = 'good';
        if (i > 150 && i < 168) reg = 'fair';
        else if (i > 360 && i < 372) reg = 'bad';
        else if (i > 366 && i < 369) reg = 'offline';
        else if (Math.random() < 0.05) reg = 'fair';
        demoFull.push(toCompact(fakeSnap(reg, t)));
      }
      // last ~75 s of live samples at 1 s — for the sparkline.
      for (let i = 75; i > 0; i--) history.push(toCompact(fakeSnap('good', now - i * 1000)));

      acceptSnapshot(fakeSnap(regime, now));
      fillSettingsForm();
      connected = true;
      render();
      setInterval(() => acceptSnapshot(fakeSnap(regime, Date.now())), 1000);
      els.heroFace.addEventListener('click', () => {
        const order = ['good', 'fair', 'bad', 'offline'];
        regime = order[(order.indexOf(regime) + 1) % order.length];
        acceptSnapshot(fakeSnap(regime, Date.now()));
      });
    },
    async getHistory() { return demoFull; }, // saved 30 s record only (matches the real extension)
    async saveSettings(next) { settings = next; render(); },
  };
}

// ---------------------------------------------------------------- wiring

els.btnTrends.addEventListener('click', openTrends);
els.panel.addEventListener('click', openTrends);
els.btnTrendsBack.addEventListener('click', closeTrends);
els.ranges.addEventListener('click', (e) => {
  const btn = e.target.closest('.rbtn');
  if (btn) setRange(Number(btn.dataset.min), btn);
});

els.btnGear.addEventListener('click', () => {
  els.settingsPanel.classList.add('open');
  els.settingsPanel.setAttribute('aria-hidden', 'false');
});
els.btnBack.addEventListener('click', () => {
  els.settingsPanel.classList.remove('open');
  els.settingsPanel.setAttribute('aria-hidden', 'true');
});

for (const el of [els.selInterval, els.selEndpoint, els.tglMonitor, els.tglNotify, els.tglRecover, els.tglBadge]) {
  el.addEventListener('change', () => {
    settings = { ...settings, ...readSettingsForm() };
    backend.saveSettings(readSettingsForm());
    render();
  });
}

backend.init();
