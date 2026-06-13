/* ============================================================================
   GEM — Molecule & Brain explorer
   A dependency-free 3D ball-and-stick renderer (canvas painter's algorithm over
   real PubChem coordinates) + an animated, honestly-labelled brain schematic
   showing each substance's primary receptor target and affected regions.
   Exposes window.GEM_openMolecule(substanceKey).
   ========================================================================== */
'use strict';
(function () {
  const M = window.MOLECULES || {};
  const REG = window.BRAIN_REGIONS || {};

  // CPK-ish element palette tuned for a dark background, + relative radii.
  const CPK = { H:'#d6d8e2', C:'#7c8398', N:'#5a86f0', O:'#ef5b53', P:'#f0922f',
                S:'#f4c145', Cl:'#5fd66e', F:'#6ee7b7', Br:'#c0795a', I:'#b07cf0', def:'#aab0c4' };
  const RAD = { H:0.34, C:0.47, N:0.45, O:0.43, P:0.6, S:0.56, Cl:0.58, F:0.4, Br:0.62, def:0.5 };

  let overlay, canvas, ctx, raf = 0, cur = null;
  let yaw = 0.6, pitch = 0.22, dragging = false, lastX = 0, lastY = 0, autospin = true;

  /* ---- colour helpers ---- */
  const rgb = c => `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
  const hex2 = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (c, t, tgt) => c.map((v, i) => v + (tgt[i] - v) * t);
  const dim = (c, m) => c.map(v => v * m);

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'molOverlay';
    overlay.className = 'overlay hidden';
    overlay.innerHTML =
      `<div class="mol-modal" role="dialog" aria-modal="true">
         <button class="modal-close" id="molClose" aria-label="Close">✕</button>
         <div class="mol-tabs" id="molTabs"></div>
         <div class="mol-body">
           <div class="mol-left">
             <canvas id="molCanvas"></canvas>
             <div class="mol-cap">
               <span class="mol-formula" id="molFormula"></span>
               <span class="mol-hint">drag to rotate · 3D structure (PubChem)</span>
             </div>
           </div>
           <div class="mol-right">
             <div class="mol-name" id="molName"></div>
             <div class="mol-target" id="molTarget"></div>
             <div class="mol-mech" id="molMech"></div>
             <div class="mol-brainwrap">
               <div class="mol-brain-h">🧠 In the brain <span>— simplified schematic, not a literal simulation</span></div>
               <div class="mol-brain" id="molBrain"></div>
             </div>
             <div class="mol-facts" id="molFacts"></div>
           </div>
         </div>
       </div>`;
    document.body.appendChild(overlay);

    canvas = document.getElementById('molCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('molClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // tabs
    const tabs = document.getElementById('molTabs');
    tabs.innerHTML = Object.keys(M).map(k => {
      const s = window.SUBSTANCES[k] || { emoji: '•', name: M[k].name };
      return `<button data-key="${k}"><span>${s.emoji}</span>${s.name}</button>`;
    }).join('');
    tabs.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => { cur = b.dataset.key; render(); }));

    // drag to rotate
    canvas.addEventListener('pointerdown', e => { dragging = true; autospin = false; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.01; pitch += (e.clientY - lastY) * 0.01;
      pitch = Math.max(-1.3, Math.min(1.3, pitch));
      lastX = e.clientX; lastY = e.clientY;
    });
    const end = () => { dragging = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) close(); });
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    const s = Math.max(220, Math.min(box.width || 320, 360));
    canvas.width = s * dpr; canvas.height = s * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas._logical = s;
  }

  function render() {
    const mol = M[cur]; if (!mol) return;
    document.querySelectorAll('#molTabs button').forEach(b => b.classList.toggle('active', b.dataset.key === cur));
    const sub = window.SUBSTANCES[cur] || {};
    document.getElementById('molName').textContent = `${sub.emoji || ''} ${mol.long || mol.name}`;
    document.getElementById('molFormula').innerHTML = formulaHTML(mol);
    const p = mol.pharm;
    document.getElementById('molTarget').innerHTML = `<b>${p.target}</b> · ${p.action}`;
    document.getElementById('molMech').textContent = p.mech;
    document.getElementById('molBrain').innerHTML = brainSVG(p);
    document.getElementById('molFacts').innerHTML =
      fact('Duration', p.duration) + fact('Felt as', p.effect) + fact('Clinical use', p.clinical) +
      (p.safety ? `<div class="mol-fact safety"><span>Safety</span>${p.safety}</div>` : '');
    sizeCanvas();
  }

  const fact = (k, v) => v ? `<div class="mol-fact"><span>${k}</span>${v}</div>` : '';

  function formulaHTML(mol) {
    // subscript the digits in e.g. C21H30O2
    const f = (window.MOL_FORMULA && window.MOL_FORMULA[cur]) || mol.formula || '';
    const pretty = molFormula(mol);
    return pretty.replace(/(\d+)/g, '<sub>$1</sub>');
  }
  // derive formula from atom list (so we don't need a separate table)
  function molFormula(mol) {
    const c = {}; for (const a of mol.atoms) c[a[0]] = (c[a[0]] || 0) + 1;
    const order = ['C', 'H', 'Br', 'Cl', 'F', 'I', 'N', 'O', 'P', 'S'];  // Hill system
    let s = '';
    for (const el of order) if (c[el]) { s += el + (c[el] > 1 ? c[el] : ''); delete c[el]; }
    for (const el of Object.keys(c)) s += el + (c[el] > 1 ? c[el] : '');
    return s;
  }

  /* ---- brain schematic ---- */
  function brainSVG(p) {
    const active = new Set(p.regions || []);
    const connect = /5-HT2A/.test(p.target);   // classic psychedelics → draw connectivity web
    const outline =
      `<path class="br-outline" d="M58,118 C56,74 104,44 172,46 C246,48 296,78 293,126
        C291,165 256,176 222,179 C221,193 212,205 196,205 C193,195 191,188 185,184
        C152,189 96,182 73,159 C60,147 58,132 58,118 Z"/>` +
      `<path class="br-fold" d="M92,150 C120,120 150,140 178,112"/>` +
      `<path class="br-fold" d="M110,86 C140,108 180,80 210,104"/>` +
      `<circle class="br-cereb" cx="256" cy="184" r="17"/>` +
      `<path class="br-stem" d="M196,196 q6,18 -2,30"/>`;

    let web = '';
    if (connect && active.size > 1) {
      const a = [...active].filter(r => REG[r]);
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        web += `<line class="br-web" x1="${REG[a[i]].x}" y1="${REG[a[i]].y}" x2="${REG[a[j]].x}" y2="${REG[a[j]].y}"/>`;
      }
    }

    let dots = '', labels = '';
    for (const [id, r] of Object.entries(REG)) {
      const on = active.has(id);
      if (!on) { dots += `<circle class="br-dot off" cx="${r.x}" cy="${r.y}" r="2.6"/>`; continue; }
      const supp = id === 'dmn';   // default mode network is SUPPRESSED by psychedelics
      dots += `<circle class="br-halo${supp ? ' supp' : ''}" cx="${r.x}" cy="${r.y}" r="9"/>` +
              `<circle class="br-dot on${supp ? ' supp' : ''}" cx="${r.x}" cy="${r.y}" r="4.2"/>`;
      const anchor = r.x < 168 ? 'end' : 'start';
      const lx = r.x < 168 ? r.x - 11 : r.x + 11;
      labels += `<text class="br-label" x="${lx}" y="${r.y + 3}" text-anchor="${anchor}">${(supp ? '↓ ' : '') + r.label}</text>`;
    }
    return `<svg viewBox="0 0 340 232" xmlns="http://www.w3.org/2000/svg">${outline}${web}${dots}${labels}</svg>`;
  }

  /* ---- 3D molecule render loop ---- */
  function drawMolecule() {
    const mol = M[cur]; if (!mol || !ctx) return;
    const S = canvas._logical || 320, cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);

    let maxR = 0.001;
    for (const a of mol.atoms) { const d = Math.hypot(a[1], a[2], a[3]); if (d > maxR) maxR = d; }
    const scale = (S * 0.42) / maxR;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

    const P = mol.atoms.map(a => {
      const x = a[1], y = a[2], z = a[3];
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return { el: a[0], sx: cx + x1 * scale, sy: cy - y1 * scale, z: z2 };
    });
    let zmin = Infinity, zmax = -Infinity;
    for (const p of P) { if (p.z < zmin) zmin = p.z; if (p.z > zmax) zmax = p.z; }
    const tOf = z => (z - zmin) / ((zmax - zmin) || 1);

    // bonds (sticks split at midpoint, coloured by each atom, depth-sorted)
    const bonds = mol.bonds.map(b => {
      const A = P[b[0]], B = P[b[1]]; return { A, B, z: (A.z + B.z) / 2 };
    }).sort((m, n) => m.z - n.z);
    for (const bd of bonds) {
      const t = tOf(bd.z), w = scale * 0.16 * (0.55 + 0.45 * t);
      const mx = (bd.A.sx + bd.B.sx) / 2, my = (bd.A.sy + bd.B.sy) / 2;
      stick(bd.A.sx, bd.A.sy, mx, my, bd.A.el, w, t);
      stick(bd.B.sx, bd.B.sy, mx, my, bd.B.el, w, t);
    }
    // atoms (depth-sorted, far first)
    for (const p of [...P].sort((m, n) => m.z - n.z)) atom(p.sx, p.sy, p.el, tOf(p.z), scale);
  }

  function stick(x1, y1, x2, y2, el, w, t) {
    const base = dim(mix(hex2(CPK[el] || CPK.def), 0.1, [0, 0, 0]), 0.5 + 0.5 * t);
    ctx.strokeStyle = rgb(base); ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function atom(sx, sy, el, t, scale) {
    const r = (RAD[el] || RAD.def) * scale * (0.82 + 0.32 * t);
    const base = hex2(CPK[el] || CPK.def), m = 0.5 + 0.5 * t;
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, r * 0.1, sx, sy, r);
    g.addColorStop(0, rgb(dim(mix(base, 0.6, [255, 255, 255]), m)));
    g.addColorStop(0.55, rgb(dim(base, m)));
    g.addColorStop(1, rgb(dim(mix(base, 0.45, [0, 0, 0]), m)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill();
  }

  function frame() {
    if (autospin && !dragging) yaw += 0.006;
    drawMolecule();
    raf = requestAnimationFrame(frame);
  }

  function open(key) {
    if (!overlay) build();
    cur = (key && M[key]) ? key : 'psi';
    autospin = true; yaw = 0.6; pitch = 0.22;
    overlay.classList.remove('hidden');
    render();
    // re-measure once the modal has actually laid out, then start the loop crisp.
    cancelAnimationFrame(raf);
    requestAnimationFrame(() => { sizeCanvas(); frame(); });
  }
  function close() {
    overlay.classList.add('hidden');
    cancelAnimationFrame(raf); raf = 0;
  }
  window.addEventListener('resize', () => { if (overlay && !overlay.classList.contains('hidden')) sizeCanvas(); });

  window.GEM_openMolecule = open;
})();
