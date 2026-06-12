// Network Quality Monitor — shared metric logic (used by service worker AND popup).

export const STATES = {
  good: {
    rank: 0, color: '#22c55e', emoji: '😄',
    label: 'Good for calls',
    blurb: 'Crystal clear — dial away!',
  },
  fair: {
    rank: 1, color: '#f59e0b', emoji: '😅',
    label: 'Usable, with hiccups',
    blurb: 'Minor wobbles — calls may stutter now and then.',
  },
  bad: {
    rank: 2, color: '#ef4444', emoji: '🤖',
    label: 'Rough for calls',
    blurb: 'Expect robot voice and "can you hear me?"s.',
  },
  offline: {
    rank: 3, color: '#64748b', emoji: '🔌',
    label: 'Offline',
    blurb: 'No internet detected — check Wi-Fi or cable.',
  },
  unknown: {
    rank: -1, color: '#94a3b8', emoji: '🤔',
    label: 'Measuring…',
    blurb: 'Taking the first readings.',
  },
  paused: {
    rank: -2, color: '#64748b', emoji: '😴',
    label: 'Paused',
    blurb: 'Monitoring is off — wake it in settings.',
  },
};

// Classic VoIP guidance. rtt is round-trip in ms; loss is % (smoothed over recent bursts).
export const THRESHOLDS = {
  rtt:    { good: 200, fair: 450 },
  jitter: { good: 30,  fair: 60 },
  loss:   { good: 2.2, fair: 6 },
  mos:    { good: 4.0, fair: 3.6 }, // higher is better
};

// Probe targets. Extensions can't send ICMP pings, so we time tiny HTTPS requests
// to anycast edges instead — including Google DNS at literally 8.8.8.8 (DoH).
export const ENDPOINTS = [
  { id: 'google',     label: 'Google edge (gstatic)', url: 'https://www.gstatic.com/generate_204' },
  { id: 'cloudflare', label: 'Cloudflare edge',       url: 'https://cp.cloudflare.com/generate_204' },
  { id: 'gdns',       label: 'Google DNS (8.8.8.8)',  url: 'https://8.8.8.8/resolve?name=g.co&type=A' },
  { id: 'google2',    label: 'Google (www fallback)', url: 'https://www.google.com/generate_204' },
];

export function bandOf(metric, value) {
  const t = THRESHOLDS[metric];
  return value <= t.good ? 'good' : value <= t.fair ? 'fair' : 'bad';
}

// Simplified ITU-T G.107 E-model → MOS estimate for a G.711 call over this network.
// One-way delay ≈ RTT/2 + jitter-buffer (~2× jitter) + ~30 ms codec/packetization.
export function mosFrom(rttMs, jitterMs, lossPct) {
  const d = rttMs / 2 + 2 * jitterMs + 30;
  const Id = 0.024 * d + (d > 177.3 ? 0.11 * (d - 177.3) : 0);
  const Ie = 95 * (lossPct / (lossPct + 25.1)); // G.711 + PLC, random loss (Bpl = 25.1)
  const R = Math.max(0, Math.min(100, 93.2 - Id - Ie));
  const mos = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6;
  return Math.max(1, Math.min(4.5, mos));
}

// State = worst band across latency, jitter, loss and MOS.
export function classify({ rtt, jitter }, lossPct) {
  const mos = mosFrom(rtt, jitter, lossPct);
  const bands = {
    rtt: bandOf('rtt', rtt),
    jitter: bandOf('jitter', jitter),
    loss: bandOf('loss', lossPct),
    mos: mos >= THRESHOLDS.mos.good ? 'good' : mos >= THRESHOLDS.mos.fair ? 'fair' : 'bad',
  };
  const order = ['good', 'fair', 'bad'];
  const state = order[Math.max(...Object.values(bands).map((b) => order.indexOf(b)))];
  return { state, mos, bands };
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Jitter = mean absolute difference between consecutive RTT samples (RFC 3550 spirit).
export function jitterOf(rtts) {
  if (rtts.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < rtts.length; i++) sum += Math.abs(rtts[i] - rtts[i - 1]);
  return sum / (rtts.length - 1);
}

export const fmtMs = (v) => (v == null ? '—' : v < 10 ? `${v.toFixed(1)} ms` : `${Math.round(v)} ms`);
export const fmtPct = (v) => (v == null ? '—' : `${v < 10 ? +v.toFixed(1) : Math.round(v)}%`);
export const fmtMos = (v) => (v == null ? '–' : v.toFixed(1));
export const starsPct = (mos) => (mos == null ? 0 : (mos / 5) * 100);
