// Network Quality Monitor — popup UI.
// Runs in two modes: real (inside the extension, talks to the service worker)
// and demo (opened as a plain web page — fakes data so the UI can be previewed).

import { STATES, ENDPOINTS, classify, fmtMs, fmtPct, fmtMos, starsPct } from '../lib/metrics.js';

const IS_EXT = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

const $ = (id) => document.getElementById(id);
const app = $('app');
const els = {
  emoji: $('emoji'), verdict: $('verdict'), verdictSub: $('verdictSub'),
  starsFill: $('starsFill'), mosNum: $('mosNum'),
  valRtt: $('valRtt'), valJit: $('valJit'), valLoss: $('valLoss'),
  dotRtt: $('dotRtt'), dotJit: $('dotJit'), dotLoss: $('dotLoss'),
  endpointNote: $('endpointNote'), lastChecked: $('lastChecked'),
  spark: $('spark'), strip: $('strip'),
  btnTest: $('btnTest'), btnGear: $('btnGear'), btnBack: $('btnBack'),
  heroFace: $('heroFace'), settingsPanel: $('settings'), demoPill: $('demoPill'),
  selInterval: $('selInterval'), selEndpoint: $('selEndpoint'),
  tglMonitor: $('tglMonitor'), tglNotify: $('tglNotify'),
  tglRecover: $('tglRecover'), tglBadge: $('tglBadge'),
};

const MAX_POINTS = 80;
let settings = { intervalSec: 30, endpoint: 'auto', notifyDegrade: true, notifyRecover: true, showBadge: true, paused: false };
let history = [];   // compact entries {t,s,r,j,l,m}
let last = null;    // latest full snapshot
let lastT = null;

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
  renderClock();
  drawSpark();
  drawStrip();
}

function renderClock() {
  if (!lastT) { els.lastChecked.textContent = 'no checks yet'; return; }
  const s = Math.max(0, Math.round((Date.now() - lastT) / 1000));
  els.lastChecked.textContent =
    s < 5 ? 'checked just now' : s < 60 ? `checked ${s}s ago` : `checked ${Math.round(s / 60)}m ago`;
}
setInterval(renderClock, 1000);

// ---------------------------------------------------------------- sparkline

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
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('collecting samples…', W / 2, H / 2 + 4);
    return;
  }

  const rtts = pts.map((p) => p.r).sort((a, b) => a - b);
  const p95 = rtts[Math.floor(rtts.length * 0.95)];
  const max = Math.max(220, p95 * 1.3);
  const x = (i) => 2 + (i / (pts.length - 1)) * (W - 8);
  const y = (r) => H - 6 - (Math.min(r, max) / max) * (H - 16);

  // 200 ms guide line
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

  // area fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, accent + '59'); // ~35% alpha
  grad.addColorStop(1, accent + '00');
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.r)) : ctx.moveTo(x(0), y(p.r))));
  ctx.lineTo(x(pts.length - 1), H - 2); ctx.lineTo(x(0), H - 2); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.r)) : ctx.moveTo(x(0), y(p.r))));
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  // loss markers
  ctx.fillStyle = '#f87171';
  pts.forEach((p, i) => {
    if (p.l > 0) { ctx.beginPath(); ctx.arc(x(i), 5, 2.4, 0, Math.PI * 2); ctx.fill(); }
  });

  // last point
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
    const when = new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.title = p.r == null
      ? `${when} · offline`
      : `${when} · ${Math.round(p.r)} ms · jitter ${Math.round(p.j)} ms · loss ${p.l}% · ${STATES[p.s].label}`;
    return div;
  }));
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
      app.dataset.live = '1';
      port.onMessage.addListener((msg) => { if (msg?.type === 'snapshot') acceptSnapshot(msg.snap); });
      port.onDisconnect.addListener(() => {
        app.dataset.live = '';
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
    async testNow() {
      const res = await chrome.runtime.sendMessage({ type: 'testNow' });
      if (res?.snap) acceptSnapshot(res.snap);
    },
    async saveSettings(next) {
      const res = await chrome.runtime.sendMessage({ type: 'updateSettings', settings: next });
      if (res?.settings) settings = res.settings;
      render();
    },
  };
}

// Demo backend: plausible fake data + click the face to cycle states.
function demoBackend() {
  els.demoPill.hidden = false;
  const REGIMES = {
    good: { rtt: [30, 58], j: [1.5, 7], loss: 0 },
    fair: { rtt: [130, 270], j: [26, 54], loss: 1.4 },
    bad: { rtt: [280, 490], j: [58, 115], loss: 6 },
    offline: null,
  };
  let regime = 'good';
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

  return {
    async init() {
      const now = Date.now();
      for (let i = 46; i > 0; i--) {
        const reg = i > 26 && i < 33 ? 'fair' : i === 29 ? 'bad' : 'good';
        const s = fakeSnap(reg, now - i * 30_000);
        history.push({ t: s.t, s: s.state, r: s.rtt, j: s.jitter, l: s.lossBurst, m: s.mos });
      }
      acceptSnapshot(fakeSnap(regime, now));
      fillSettingsForm();
      app.dataset.live = '1';
      setInterval(() => acceptSnapshot(fakeSnap(regime, Date.now())), 2500);
      els.heroFace.addEventListener('click', () => {
        const order = ['good', 'fair', 'bad', 'offline'];
        regime = order[(order.indexOf(regime) + 1) % order.length];
        acceptSnapshot(fakeSnap(regime, Date.now()));
      });
    },
    async testNow() {
      await new Promise((r) => setTimeout(r, 900));
      acceptSnapshot(fakeSnap(regime, Date.now()));
    },
    async saveSettings(next) { settings = next; render(); },
  };
}

// ---------------------------------------------------------------- wiring

els.btnTest.addEventListener('click', async () => {
  els.btnTest.disabled = true;
  els.btnTest.classList.add('busy');
  els.btnTest.textContent = 'Testing…';
  try { await backend.testNow(); } finally {
    els.btnTest.disabled = false;
    els.btnTest.classList.remove('busy');
    els.btnTest.textContent = 'Test now';
  }
});

if (IS_EXT) els.heroFace.addEventListener('click', () => els.btnTest.click());

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
