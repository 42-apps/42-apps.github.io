/* ============================================================================
   GEM — Entheogen-friendliness ranking
   Scores every country 0–100 by legal ACCESS across the 11 substances, weighted
   toward the entheogens & medical use, and shows a sortable table. Click a row
   to fly the globe to that country. Exposes window.GEM_openRankings().
   ========================================================================== */
'use strict';
(function () {
  const SS = { legal: 5, med: 4, decrim: 3, tol: 2, ill: 1, cap: 0 };
  // weights — lean toward the classic entheogens & medical relevance; down-weight
  // the weak differentiators (ketamine is medical almost everywhere; cocaine illegal almost everywhere).
  const WT = { can: 1.5, psi: 1.5, mdma: 1.2, lsd: 1.0, dmt: 1.0, mes: 0.8, ibo: 1.0, cbd: 0.5, ket: 0.7, coc: 0.3, coca: 0.5 };
  const ORDER = ['can', 'cbd', 'psi', 'lsd', 'mdma', 'dmt', 'mes', 'ket', 'ibo', 'coc', 'coca'];
  const NODATA = '#39425f';
  let overlay;

  const colorOf = st => (st && window.STATUSES[st]) ? window.STATUSES[st].color : NODATA;
  const shortOf = st => (st && window.STATUSES[st]) ? window.STATUSES[st].short : 'No data';
  function flag(iso) {
    if (!iso || iso.length !== 2) return '🏳️';
    return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
  }

  function compute() {
    const rows = [];
    for (const [iso, r] of Object.entries(window.LAW_DATA || {})) {
      let num = 0, den = 0; const sts = {};
      for (const k of ORDER) {
        const st = (r.st && r.st[k]) || r.def;
        sts[k] = st;
        if (st && (st in SS)) { num += WT[k] * SS[st]; den += WT[k] * 5; }
      }
      if (!den) continue;
      rows.push({ iso, n: r.n, score: num / den * 100, sts });
    }
    rows.sort((a, b) => b.score - a.score || a.n.localeCompare(b.n));
    return rows;
  }

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'rankOverlay';
    overlay.className = 'overlay hidden';
    const rows = compute();
    const medal = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);

    const body = rows.map((r, i) => {
      const hue = Math.round(Math.max(0, Math.min(100, r.score)) * 1.2); // 0=red → 120=green
      const dots = ORDER.map(k =>
        `<span class="rk-dot" title="${window.SUBSTANCES[k].name}: ${shortOf(r.sts[k])}" ` +
        `style="background:${colorOf(r.sts[k])}${r.sts[k] === 'cap' ? ';box-shadow:0 0 0 1px #d9486b' : ''}"></span>`).join('');
      return `<tr data-name="${r.n.replace(/"/g, '&quot;')}">` +
        `<td class="rk-rank">${medal(i)}</td>` +
        `<td class="rk-country"><span class="rk-flag">${flag(r.iso)}</span>${r.n}</td>` +
        `<td class="rk-score"><span class="rk-bar" style="width:${r.score.toFixed(0)}%;background:hsl(${hue},66%,48%)"></span>` +
        `<span class="rk-num">${r.score.toFixed(0)}</span></td>` +
        `<td class="rk-strip">${dots}</td></tr>`;
    }).join('');

    overlay.innerHTML =
      `<div class="rank-modal" role="dialog" aria-modal="true">
         <button class="modal-close" id="rankClose" aria-label="Close">✕</button>
         <div class="rank-head">🏆 Entheogen-Friendliness Ranking</div>
         <div class="rank-sub">All ${rows.length} countries scored <b>0–100</b> by legal access across 11 substances,
           weighted toward the entheogens &amp; medical use. Higher = more accessible. Click a row to fly there.</div>
         <div class="rank-table-wrap">
           <table class="rank-table">
             <thead><tr><th></th><th>Country</th><th>Score</th><th>Cannabis → Coca</th></tr></thead>
             <tbody>${body}</tbody>
           </table>
         </div>
         <div class="rank-foot">Weights: cannabis &amp; psilocybin ×1.5 · MDMA ×1.2 · LSD/DMT/ibogaine ×1.0 · mescaline ×0.8 ·
           ketamine ×0.7 · CBD/coca ×0.5 · cocaine ×0.3 (status: legal 5 → severe 0). An approximate, web-verified
           snapshot — orientation only, <b>not legal advice</b>.</div>
       </div>`;
    document.body.appendChild(overlay);

    document.getElementById('rankClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) close(); });
    // click a row → select that country on the globe
    overlay.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => {
      const input = document.getElementById('countrySearch');
      if (input) { input.value = tr.dataset.name; input.dispatchEvent(new Event('change')); }
      close();
    }));
  }

  function open() { if (!overlay) build(); overlay.classList.remove('hidden'); }
  function close() { if (overlay) overlay.classList.add('hidden'); }

  window.GEM_openRankings = open;
  const btn = document.getElementById('rankBtn');
  if (btn) btn.addEventListener('click', open);
})();
