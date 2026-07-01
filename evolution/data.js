/* ============================================================================
   A short history of life on earth — the hand-authored framework.
   (The big dated dataset — EVENTS / LIFE / EXTINCTIONS / GEOSCALE — lives in
   dataset.js, compiled + fact-checked separately. This file holds the deep-time
   "engine furniture": the non-linear time warp, the atmosphere/temperature
   curves, the morphing life-form silhouettes, stylised deep-time cratons,
   chapters, and the guided tour.)

   Deep time is in Ma — MILLIONS of years ago. 0 = today, 4600 = Earth's birth.
   Everything is an APPROXIMATION of a fast-moving science; the deeper the past,
   the fuzzier. See About & sources.
   ========================================================================== */
'use strict';

const MA_MAX = 4600;          // Earth accretion
const NOW_LABEL = 'Today';

/* ---- The non-linear deep-time axis ----------------------------------------
   A linear 4.6-billion-year bar would bury all complex life in its last 2%.
   We warp it: the whole Precambrian (4600→541 Ma, 88% of time) takes the LEFT
   half; the Phanerozoic (541→0, the age of visible life) takes the RIGHT half,
   with the recent past stretched most. `pos` runs 0 (oldest) → 1 (today). */
const WARP = [
  [0.000, 4600], [0.045, 4000], [0.130, 3000], [0.220, 2000], [0.320, 1200],
  [0.400, 900],  [0.455, 720],  [0.500, 541],  [0.560, 444],  [0.620, 359],
  [0.690, 252],  [0.760, 201],  [0.830, 145],  [0.900, 66],   [0.945, 23],
  [0.975, 5.3],  [0.992, 2.58], [0.999, 0.3],  [1.000, 0]
];
function posToMa(p) {
  p = Math.max(0, Math.min(1, p));
  for (let i = 0; i < WARP.length - 1; i++) {
    const [p1, m1] = WARP[i], [p2, m2] = WARP[i + 1];
    if (p >= p1 && p <= p2) { const f = (p - p1) / (p2 - p1); return m1 + (m2 - m1) * f; }
  }
  return 0;
}
function maToPos(ma) {
  ma = Math.max(0, Math.min(MA_MAX, ma));
  for (let i = 0; i < WARP.length - 1; i++) {
    const [p1, m1] = WARP[i], [p2, m2] = WARP[i + 1];   // ma decreases as pos increases
    if (ma <= m1 && ma >= m2) { const f = (m1 - ma) / (m1 - m2); return p1 + (p2 - p1) * f; }
  }
  return 1;
}

/* ---- Atmosphere & climate curves (ma DESCENDING, indicative only) ---------- */
const O2 = [ // free oxygen, % of atmosphere
  [4600,0],[2500,0.001],[2400,1],[2200,2],[1800,3],[1000,3],[720,4],[635,8],
  [541,13],[500,16],[420,17],[400,18],[359,22],[330,30],[300,32],[280,28],
  [252,16],[201,15],[150,19],[100,25],[66,23],[34,21],[0,20.9]
];
const CO2 = [ // ppm, wildly approximate (log-ish)
  [4600,1000000],[4000,200000],[3000,100000],[2000,30000],[1000,8000],[635,3000],
  [541,6000],[445,4000],[359,3000],[300,300],[252,2500],[200,2000],[145,1500],
  [66,1000],[50,900],[34,700],[15,400],[0,420]
];
const TEMP = [ // global mean surface, °C — the story arc: magma → hot → snowballs → hothouses → ice ages
  [4600,2000],[4500,250],[4400,200],[4000,85],[3800,60],[3000,55],[2500,32],
  [2400,-25],[2200,28],[1800,24],[1200,22],[1000,22],[720,-28],[690,12],[660,10],
  [650,-28],[635,17],[600,16],[541,22],[500,27],[460,25],[445,8],[430,24],[400,24],
  [380,26],[359,20],[335,14],[300,12],[280,18],[252,29],[230,26],[201,24],[180,23],
  [150,24],[120,26],[100,28],[90,29],[66,24],[56,30],[50,28],[34,17],[23,16],[15,15],
  [5,13],[3,13],[2.58,11],[0.02,9],[0.012,14],[0,15]
];
function interpMa(curve, ma) { // curve ma-descending
  if (ma >= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (ma <= last[0]) return last[1];
  for (let i = 0; i < curve.length - 1; i++) {
    const [m1, v1] = curve[i], [m2, v2] = curve[i + 1];
    if (ma <= m1 && ma >= m2) { const f = (m1 - ma) / (m1 - m2); return v1 + (v2 - v1) * f; }
  }
  return last[1];
}

/* ---- Global glaciations / "Snowball Earth" episodes (whiten the globe) ----- */
const SNOWBALLS = [
  { name: 'Huronian glaciation',  from: 2450, to: 2220, i: 0.9 },
  { name: 'Sturtian Snowball',    from: 717,  to: 660,  i: 1.0 },
  { name: 'Marinoan Snowball',    from: 650,  to: 635,  i: 1.0 },
  { name: 'Gaskiers glaciation',  from: 580,  to: 579,  i: 0.6 },
  { name: 'End-Ordovician ice',   from: 445,  to: 443,  i: 0.7 },
  { name: 'Late Paleozoic Ice Age', from: 360, to: 260, i: 0.45 },
  { name: 'Pleistocene Ice Ages', from: 2.58, to: 0.012, i: 0.55 }
];
function snowballAt(ma) { let s = 0; for (const g of SNOWBALLS) if (ma <= g.from && ma >= g.to) s = Math.max(s, g.i); return s; }

/* ---- Clade → colour (life markers + legend) -------------------------------- */
const CLADE_COLORS = {
  'prebiotic':'#c0693a', 'bacteria':'#6fcf7f', 'archaea':'#4bbf9a', 'cyanobacteria':'#3fae84',
  'eukaryote':'#7fd0c0', 'protist':'#79c7c0', 'fungus':'#c9a05e',
  'plant:algae':'#6bbf5a', 'plant:land':'#5aa83e', 'plant:flower':'#e46fae',
  'animal:sponge':'#d7a3c8', 'animal:cnidarian':'#d98fb8', 'animal:ediacaran':'#b98fd6',
  'animal:arthropod':'#e0a13a', 'animal:mollusc':'#c98a4a', 'animal:echinoderm':'#e0b062',
  'vertebrate:fish':'#54b7cb', 'vertebrate:tetrapod':'#6bd0a0', 'vertebrate:amphibian':'#6bcf8a',
  'vertebrate:reptile':'#8bc34a', 'vertebrate:synapsid':'#d98a5a', 'vertebrate:dinosaur':'#e07b4a',
  'vertebrate:bird':'#5fc7e0', 'vertebrate:mammal':'#e0925a', 'mammal:primate':'#e0a86a',
  'mammal:hominin':'#f0c060'
};
function cladeColor(c) { if (CLADE_COLORS[c]) return CLADE_COLORS[c]; const base = (c || '').split(':')[0] + ':x'; return CLADE_COLORS[c] || CLADE_COLORS[base] || '#9fb0c0'; }
const CLADE_GROUP = [ // for the legend, grouped
  ['Microbes & first cells', ['bacteria','archaea','cyanobacteria']],
  ['Complex cells & algae',  ['eukaryote','protist','plant:algae','fungus']],
  ['First animals',          ['animal:sponge','animal:cnidarian','animal:ediacaran']],
  ['Invertebrates',          ['animal:arthropod','animal:mollusc','animal:echinoderm']],
  ['Plants on land',         ['plant:land','plant:flower']],
  ['Fish → tetrapods',       ['vertebrate:fish','vertebrate:amphibian','vertebrate:tetrapod']],
  ['Reptiles & dinosaurs',   ['vertebrate:reptile','vertebrate:synapsid','vertebrate:dinosaur','vertebrate:bird']],
  ['Mammals & us',           ['vertebrate:mammal','mammal:primate','mammal:hominin']]
];
const CLADE_LABEL = {
  'bacteria':'Bacteria','archaea':'Archaea','cyanobacteria':'Cyanobacteria','eukaryote':'Eukaryotes',
  'protist':'Protists','plant:algae':'Algae','fungus':'Fungi','animal:sponge':'Sponges',
  'animal:cnidarian':'Jellyfish & corals','animal:ediacaran':'Ediacaran biota','animal:arthropod':'Arthropods',
  'animal:mollusc':'Molluscs','animal:echinoderm':'Echinoderms','plant:land':'Land plants','plant:flower':'Flowering plants',
  'vertebrate:fish':'Fish','vertebrate:amphibian':'Amphibians','vertebrate:tetrapod':'Early tetrapods',
  'vertebrate:reptile':'Reptiles','vertebrate:synapsid':'Synapsids','vertebrate:dinosaur':'Dinosaurs',
  'vertebrate:bird':'Birds','vertebrate:mammal':'Mammals','mammal:primate':'Primates','mammal:hominin':'Humans & kin'
};

/* ---- Stylised deep-time cratons (>1000 Ma, where no coastline model exists) -
   Indicative growing continental nuclei — NOT real geography. They fade in
   through the Archean and persist as ancient shields. --------------------- */
const CRATONS = [
  { name:'Kaapvaal', appear:3600, poly:[[24,-26],[30,-28],[31,-32],[26,-33],[22,-30]] },
  { name:'Pilbara',  appear:3500, poly:[[117,-20],[122,-21],[122,-24],[118,-24]] },
  { name:'Slave',    appear:4000, poly:[[-114,62],[-108,63],[-109,66],[-115,65]] },
  { name:'Superior', appear:2900, poly:[[-90,48],[-80,49],[-79,53],[-91,52]] },
  { name:'Baltica',  appear:2700, poly:[[26,60],[34,61],[33,65],[25,64]] },
  { name:'Amazonia', appear:2600, poly:[[-62,-4],[-55,-3],[-56,-9],[-63,-8]] },
  { name:'Siberia',  appear:2500, poly:[[105,60],[115,61],[114,66],[104,65]] },
  { name:'India',    appear:3200, poly:[[76,14],[82,15],[81,22],[75,21]] },
  { name:'North China', appear:2500, poly:[[110,36],[118,37],[117,41],[109,40]] }
];

/* ---- Morphing life-form silhouettes — the star of the show ----------------
   Each STAGE owns the "headline form" for its slice of deep time; the spotlight
   panel cross-fades between them as you scrub, so you literally watch life morph
   from molten rock → cell → trilobite → fish → dinosaur → human.
   SIL fragments draw at viewBox 0 0 120 80, fill:currentColor (era-tinted). */
const STAGES = [
  { from: 4600, id:'magma',       name:'A molten world',        sub:'No life — an ocean of magma' },
  { from: 4300, id:'bombard',     name:'Bombarded crust',       sub:'Meteorites rain; first thin crust' },
  { from: 4000, id:'ocean',       name:'The first oceans',      sub:'Steam condenses into a global sea' },
  { from: 3800, id:'vent',        name:'Origin of life',        sub:'First cells stir at hydrothermal vents' },
  { from: 3500, id:'microbe',     name:'First microbes',        sub:'Bacteria & archaea — LUCA’s children' },
  { from: 3000, id:'stromatolite',name:'Stromatolite reefs',    sub:'Cyanobacteria start making oxygen' },
  { from: 2400, id:'oxygen',      name:'The Great Oxidation',   sub:'Oxygen poisons the old world' },
  { from: 1800, id:'eukaryote',   name:'The complex cell',      sub:'A cell swallows a bacterium: mitochondria' },
  { from: 1000, id:'algae',       name:'Seaweeds & sex',        sub:'Multicellular algae; sexual reproduction' },
  { from: 600,  id:'ediacaran',   name:'The first animals',     sub:'Soft, strange Ediacaran fronds' },
  { from: 538,  id:'trilobite',   name:'The Cambrian explosion',sub:'Shells, eyes, legs — trilobites rule' },
  { from: 480,  id:'fish',        name:'The first fish',        sub:'Backbones take to the open sea' },
  { from: 430,  id:'landplant',   name:'Green land',            sub:'Plants & bugs colonise the shore' },
  { from: 375,  id:'tetrapod',    name:'Onto land',             sub:'Fish grow limbs and crawl out' },
  { from: 320,  id:'amniote',     name:'Coal forests',          sub:'Giant bugs; the first egg-layers' },
  { from: 300,  id:'synapsid',    name:'The mammal line',       sub:'Sail-backs & mammal-like reptiles' },
  { from: 233,  id:'dinosaur',    name:'Age of dinosaurs',      sub:'Archosaurs seize the Earth' },
  { from: 150,  id:'bird',        name:'Feathers & flight',     sub:'The first birds take wing' },
  { from: 66,   id:'mammal',      name:'Age of mammals',        sub:'Warm-blooded survivors radiate' },
  { from: 25,   id:'ape',         name:'The apes',              sub:'Primates take to the trees' },
  { from: 6,    id:'hominin',     name:'Standing up',           sub:'Hominins walk on two legs' },
  { from: 0.3,  id:'human',       name:'Homo sapiens',          sub:'One clever, restless ape' }
];
function stageAt(ma) { let s = STAGES[0]; for (const st of STAGES) { if (ma <= st.from) s = st; else break; } return s; }

const SIL = {
  magma: `<circle cx="60" cy="42" r="30" fill="currentColor"/><circle cx="50" cy="34" r="6" fill="#fff" opacity=".25"/><circle cx="70" cy="48" r="8" fill="#000" opacity=".2"/><circle cx="58" cy="52" r="5" fill="#000" opacity=".18"/>`,
  bombard: `<circle cx="60" cy="44" r="28" fill="currentColor"/><circle cx="52" cy="40" r="6" fill="#000" opacity=".22"/><circle cx="68" cy="50" r="4" fill="#000" opacity=".22"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="20" y1="8" x2="40" y2="26"/><line x1="98" y1="10" x2="82" y2="28"/><line x1="104" y1="40" x2="88" y2="46"/></g><circle cx="20" cy="8" r="3" fill="currentColor"/><circle cx="98" cy="10" r="3" fill="currentColor"/>`,
  ocean: `<circle cx="60" cy="42" r="30" fill="currentColor" opacity=".85"/><path d="M32 40 q8 -6 16 0 t16 0 t16 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".5"/><path d="M34 52 q8 -6 16 0 t16 0 t14 0" stroke="#fff" stroke-width="2.5" fill="none" opacity=".35"/>`,
  vent: `<path d="M40 78 L52 40 Q60 30 68 40 L80 78 Z" fill="currentColor"/><circle cx="60" cy="30" r="5" fill="currentColor" opacity=".7"/><circle cx="54" cy="20" r="3.5" fill="currentColor" opacity=".5"/><circle cx="66" cy="14" r="2.5" fill="currentColor" opacity=".4"/>`,
  microbe: `<ellipse cx="60" cy="42" rx="30" ry="18" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="52" cy="42" r="4" fill="currentColor"/><path d="M90 42 q10 -6 16 2" stroke="currentColor" stroke-width="3" fill="none"/><path d="M90 46 q10 8 18 2" stroke="currentColor" stroke-width="3" fill="none"/>`,
  stromatolite: `<path d="M34 78 Q40 30 60 30 Q80 30 86 78 Z" fill="currentColor"/><g stroke="#000" stroke-opacity=".18" stroke-width="2" fill="none"><path d="M40 70 Q60 48 80 70"/><path d="M42 60 Q60 42 78 60"/><path d="M45 50 Q60 38 75 50"/></g>`,
  oxygen: `<g fill="none" stroke="currentColor" stroke-width="3.5"><circle cx="44" cy="46" r="12"/><circle cx="72" cy="36" r="9"/><circle cx="78" cy="58" r="7"/><circle cx="56" cy="28" r="6"/></g><text x="41" y="50" font-size="11" fill="currentColor">O₂</text>`,
  eukaryote: `<ellipse cx="60" cy="42" rx="32" ry="24" fill="currentColor" opacity=".28" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="42" r="11" fill="currentColor"/><ellipse cx="42" cy="34" rx="5" ry="3" fill="currentColor" opacity=".7"/><ellipse cx="78" cy="52" rx="5" ry="3" fill="currentColor" opacity=".7"/>`,
  algae: `<path d="M60 80 L60 30" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60 46 Q44 40 40 24 M60 46 Q76 40 80 24 M60 34 Q50 30 46 18 M60 34 Q70 30 74 18 M60 60 Q46 54 42 42 M60 60 Q74 54 78 42" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  ediacaran: `<path d="M60 80 Q58 50 60 22 Q62 50 60 80" fill="currentColor"/><g stroke="currentColor" stroke-width="3"><path d="M60 30 Q44 26 40 40 M60 38 Q46 36 42 50 M60 46 Q48 46 44 60 M60 30 Q76 26 80 40 M60 38 Q74 36 78 50 M60 46 Q72 46 76 60"/></g>`,
  trilobite: `<path d="M40 24 Q60 14 80 24 Q86 42 76 62 Q60 72 44 62 Q34 42 40 24 Z" fill="currentColor"/><path d="M48 26 Q60 20 72 26" stroke="#000" stroke-opacity=".2" stroke-width="2.5" fill="none"/><g stroke="#000" stroke-opacity=".18" stroke-width="2"><line x1="60" y1="30" x2="60" y2="66"/><path d="M52 34 Q45 44 50 60 M68 34 Q75 44 70 60"/></g>`,
  fish: `<path d="M22 42 Q46 24 82 40 Q92 42 82 44 Q46 60 22 42 Z" fill="currentColor"/><path d="M82 40 L100 28 L98 42 L100 56 L82 44 Z" fill="currentColor"/><circle cx="36" cy="40" r="3" fill="#000" opacity=".4"/>`,
  landplant: `<path d="M60 80 L60 28" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M60 40 Q42 34 34 20 M60 52 Q78 46 86 32 M60 30 Q52 22 50 12 M60 30 Q68 22 70 12" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  tetrapod: `<path d="M22 44 Q48 30 78 40 Q92 40 96 34 Q98 44 88 46 Q60 58 30 52 Q20 50 22 44 Z" fill="currentColor"/><g stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="40" y1="52" x2="36" y2="68"/><line x1="70" y1="50" x2="74" y2="66"/></g><circle cx="90" cy="38" r="2.5" fill="#000" opacity=".4"/>`,
  amniote: `<g fill="currentColor"><path d="M20 50 Q40 42 66 46 Q80 46 88 40 L96 44 L88 50 Q64 60 34 58 Q18 56 20 50Z"/></g><g stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="36" y1="56" x2="32" y2="70"/><line x1="72" y1="54" x2="76" y2="68"/></g><g stroke="currentColor" stroke-width="2" opacity=".8"><path d="M30 24 L26 12 M40 22 L42 8 M20 30 L10 24"/></g><ellipse cx="34" cy="22" rx="10" ry="5" fill="currentColor" opacity=".5" transform="rotate(-20 34 22)"/>`,
  synapsid: `<path d="M18 52 Q40 44 70 48 Q84 48 92 42 L100 46 L92 52 Q64 62 34 60 Q16 58 18 52Z" fill="currentColor"/><path d="M30 46 Q34 22 40 46 M40 46 Q46 18 52 46 M52 46 Q58 20 64 46 M64 46 Q70 24 74 48" fill="currentColor" opacity=".85"/><g stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="36" y1="58" x2="32" y2="72"/><line x1="74" y1="56" x2="78" y2="70"/></g>`,
  dinosaur: `<path d="M84 22 Q92 24 90 32 Q88 38 80 38 L74 44 Q78 58 66 60 L66 74 L58 74 L58 60 Q46 60 42 50 L28 62 Q22 60 30 50 Q22 46 30 42 Q46 34 62 38 Q70 30 84 22 Z" fill="currentColor"/><circle cx="84" cy="30" r="2.5" fill="#000" opacity=".45"/>`,
  bird: `<path d="M30 44 Q54 36 78 34 Q90 32 96 26 Q94 36 84 40 Q92 42 98 50 Q86 50 76 46 Q56 54 36 52 Q26 50 30 44Z" fill="currentColor"/><path d="M40 46 Q30 62 16 66 Q30 60 44 52 Z" fill="currentColor" opacity=".8"/><circle cx="90" cy="30" r="2" fill="#000" opacity=".4"/>`,
  mammal: `<path d="M26 50 Q40 40 64 44 Q78 44 84 38 Q90 34 92 40 Q90 46 84 46 Q88 40 84 50 Q64 58 36 56 Q22 54 26 50Z" fill="currentColor"/><path d="M84 40 Q86 30 92 32 M78 38 Q82 30 86 34" stroke="currentColor" stroke-width="3" fill="none"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="40" y1="55" x2="38" y2="66"/><line x1="70" y1="52" x2="72" y2="64"/></g>`,
  ape: `<path d="M60 20 Q74 20 76 36 Q84 40 82 52 Q80 66 66 68 L66 78 L54 78 L54 68 Q40 66 38 52 Q36 40 44 36 Q46 20 60 20Z" fill="currentColor"/><circle cx="60" cy="38" r="10" fill="#000" opacity=".18"/>`,
  hominin: `<circle cx="60" cy="18" r="9" fill="currentColor"/><path d="M60 27 L60 52 M60 33 L46 44 M60 33 L74 44 M60 52 L50 74 M60 52 L70 74" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  human: `<circle cx="60" cy="16" r="9" fill="currentColor"/><path d="M60 25 L60 50 M60 30 L44 40 M60 30 L76 40 M60 50 L51 74 M60 50 L69 74" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M36 40 q4 -3 8 0" stroke="currentColor" stroke-width="3" fill="none" opacity=".6"/>`
};

/* ---- Chapters (chips): the great milestones you can jump to ---------------- */
const CHAPTERS = [
  { ma: 4540, emoji:'🌋', label:'Earth forms' },
  { ma: 4500, emoji:'🌕', label:'Moon-forming impact' },
  { ma: 4000, emoji:'🌊', label:'First oceans' },
  { ma: 3700, emoji:'🧬', label:'Origin of life' },
  { ma: 2400, emoji:'💨', label:'Oxygen crisis' },
  { ma: 1800, emoji:'🔬', label:'Complex cells' },
  { ma: 720,  emoji:'❄️', label:'Snowball Earth' },
  { ma: 575,  emoji:'🍃', label:'First animals' },
  { ma: 538,  emoji:'🦐', label:'Cambrian explosion' },
  { ma: 470,  emoji:'🐟', label:'Age of fishes' },
  { ma: 430,  emoji:'🌿', label:'Life invades land' },
  { ma: 375,  emoji:'🦎', label:'Onto land' },
  { ma: 320,  emoji:'🐛', label:'Coal forests' },
  { ma: 252,  emoji:'💀', label:'The Great Dying' },
  { ma: 233,  emoji:'🦕', label:'Dinosaurs' },
  { ma: 150,  emoji:'🪶', label:'First birds' },
  { ma: 66,   emoji:'☄️', label:'Dinosaurs die' },
  { ma: 34,   emoji:'🐒', label:'Age of mammals' },
  { ma: 3.2,  emoji:'🚶', label:'Walking upright' },
  { ma: 0.3,  emoji:'🧑', label:'Homo sapiens' },
  { ma: 0,    emoji:'🌍', label:'Today' }
];

/* ---- Guided tour ----------------------------------------------------------- */
const TOUR = [
  { ma:4540, lat:10, lng:20, alt:2.6, cap:'4.54 billion years ago. Earth is a ball of molten rock, glowing red, still being hammered by the debris of the young Solar System.' },
  { ma:4500, lat:20, lng:-40, alt:2.7, cap:'A Mars-sized world, Theia, slams into the Earth. The debris flung into orbit becomes the Moon — and tilts our planet.' },
  { ma:4000, lat:0, lng:60, alt:2.4, cap:'The bombardment eases. Steam condenses; the first global ocean falls as rain that lasts for ages. The sky is orange with methane.' },
  { ma:3500, lat:-21, lng:119, alt:1.9, cap:'In the Pilbara of Australia, layered mounds called stromatolites — cities of microbes — leave the oldest clear traces of life.' },
  { ma:2400, lat:46, lng:-84, alt:2.3, cap:'Cyanobacteria have been exhaling oxygen for ages. Now it floods the air — the Great Oxidation. To most life then, oxygen was poison.' },
  { ma:1800, lat:73, lng:-80, alt:2.4, cap:'One cell swallows another and keeps it alive as a power plant: the mitochondrion. The complex cell — the ancestor of all plants and animals — is born.' },
  { ma:700,  lat:0, lng:0, alt:2.6, cap:'“Snowball Earth.” Ice reaches the equator; the whole planet may freeze over — twice. When it thaws, animals appear.' },
  { ma:560,  lat:-30.9, lng:138.5, alt:1.8, cap:'The Ediacara Hills of Australia hold the first big animals: soft, quilted fronds unlike anything alive today.' },
  { ma:508,  lat:51.4, lng:-116.5, alt:1.7, cap:'The Cambrian explosion. In the Burgess Shale, weird armoured animals — trilobites, Anomalocaris — reveal a sea suddenly full of eyes, legs and jaws.' },
  { ma:375,  lat:76, lng:-88, alt:2.0, cap:'In Arctic Canada, Tiktaalik — a fish with a neck and the beginnings of limbs — is caught in the act of crawling onto land.' },
  { ma:300,  lat:5, lng:10, alt:1.9, cap:'Vast coal swamps blanket the tropics of Pangaea. The oxygen-rich air lets dragonflies grow to the size of hawks.' },
  { ma:252,  lat:60, lng:100, alt:2.2, cap:'The Great Dying. Siberian volcanism cooks the planet and nearly ends life — up to 96% of ocean species vanish. The worst day in Earth’s history.' },
  { ma:150,  lat:48.9, lng:11.2, alt:1.9, cap:'Dinosaurs rule the land. At Solnhofen in Germany, Archaeopteris… Archaeopteryx — half dinosaur, half bird — shows feathers taking to the air.' },
  { ma:66,   lat:21.4, lng:-89.5, alt:1.9, cap:'A 10-km asteroid strikes the Yucatán. In hours the sky burns; in years it freezes. The dinosaurs — except the birds — are gone.' },
  { ma:3.2,  lat:11, lng:40, alt:1.8, cap:'On the plains of Ethiopia, a small ape called Lucy walks upright. Her lineage will one day look up and figure all of this out.' },
  { ma:0,    lat:20, lng:20, alt:2.5, cap:'Today. From molten rock to a living, breathing, thinking planet — 4.5 billion years, and you are the part of the universe that noticed. This is a short history of life on Earth.' }
];
