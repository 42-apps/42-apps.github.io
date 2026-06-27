/* ============================================================
 * The Hitchhiker's Guide to the Known Galaxy — engine
 * Vanilla ES module + three.js. No build step.
 * A 3D map of the REAL Milky Way (objects placed by true J2000
 * coordinates) + the Guide device that reads each entry.
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------- data ---------- */
const DATA = window.HHGTTG_DATA || { meta:{}, categories:[], tour:[], entries:[] };
const ENTRIES = DATA.entries || [];
const byId = new Map(ENTRIES.map(e => [e.id, e]));

/* category accent colours (mirror app.css :root) */
const CATCOLOR = {
  'solar-system':'#ffd166', 'nearby-star':'#7ee6ff', 'famous-star':'#ff9e6d',
  'exoplanet':'#88ff9b', 'galactic-structure':'#c79bff', 'nebula-cluster':'#ff8fd0',
  'exotic-object':'#ff5d6c', 'concept-artifact':'#b8c3d9',
  'canon-place':'#ffd24a', 'canon-species':'#9be37d', 'canon-tech':'#b69cff',
  'canon-character':'#ff9ecf', 'canon-article':'#ffb86b', 'canon-event':'#ff7a59'
};
const CATLABEL = Object.fromEntries((DATA.categories||[]).map(c => [c.key, c.label]));
const CATEMOJI = Object.fromEntries((DATA.categories||[]).map(c => [c.key, c.emoji]));

/* realm = which Guide an entry belongs to: the REAL galaxy, or THE BOOK (canon = any 'canon-*' section). */
const isCanonCat = k => typeof k === 'string' && k.startsWith('canon-');
const entryRealm = e => isCanonCat(e && e.category) ? 'book' : 'real';
const catRealm = k => isCanonCat(k) ? 'book' : 'real';
let mode = 'real';
const realmEntries = () => ENTRIES.filter(e => entryRealm(e) === mode);
const realmCats = () => (DATA.categories||[]).filter(c => catRealm(c.key) === mode);

/* real stars are coloured by true spectral type (temperature); everything else by section colour */
function specColor(e){
  const t = (e.objtype||'').toLowerCase();
  if(t.includes('white dwarf')) return '#dfe9ff';
  const m = (e.objtype||'').match(/\b([OBAFGKM])\s*\d/);
  let cls = m ? m[1] : null;
  if(!cls){
    if(/blue|\bo[- ]?type|\bb[- ]?type/.test(t)) cls='B';
    else if(/white/.test(t)) cls='A';
    else if(/yellow/.test(t)) cls='G';
    else if(/orange/.test(t)) cls='K';
    else if(/red/.test(t)) cls='M';
  }
  return {O:'#9bb0ff',B:'#aac4ff',A:'#cdd9ff',F:'#f6f7ff',G:'#fff3d0',K:'#ffd095',M:'#ff9a68'}[cls] || '#ffe6c2';
}
function displayColor(e){
  if(e.id==='sol' || e.category==='nearby-star' || e.category==='famous-star') return specColor(e);
  return CATCOLOR[e.category] || '#ffffff';
}

/* objects whose labels are always drawn (the headline sights) */
const MAJOR = new Set(['sol','sagittarius-a-star','betelgeuse','sirius-a','vega','polaris',
  'alpha-centauri-a','proxima-centauri','orion-nebula','pleiades','rigel','arcturus',
  'crab-nebula','antares','aldebaran','deneb','milky-way','galactic-center',
  'bk-earth-mk2','bk-betelgeuse-vicinity','bk-ursa-minor-beta','bk-magrathea','bk-milliways','bk-vogsphere']);

/* focus stand-off distance (ly) by category — how close the camera parks */
const STANDOFF = { 'solar-system':14, 'nearby-star':5, 'exoplanet':5, 'famous-star':70,
  'nebula-cluster':900, 'exotic-object':500, 'galactic-structure':11000, 'concept-artifact':18,
  'canon-place':7, 'canon-species':7, 'canon-tech':7, 'canon-character':7, 'canon-article':7 };

/* objects that exist in BOTH Guides — jump between the real thing and its book entry */
const CROSSLINK = {
  'earth':'bk-earth-mk2', 'bk-earth-mk2':'earth',
  'betelgeuse':'bk-betelgeuse-vicinity', 'bk-betelgeuse-vicinity':'betelgeuse',
  'the-towel':'bk-towel', 'bk-towel':'the-towel',
  'the-answer-42':'bk-answer-42', 'bk-answer-42':'the-answer-42',
  'dont-panic':'bk-dont-panic', 'bk-dont-panic':'dont-panic'
};

const R0 = 26000;        // Sun → galactic centre, light-years
const LY_PER_LY = 1;     // scene units are light-years

/* ---------- equatorial (J2000) → galactic Cartesian (Sun-centred, ly) ---------- */
const D2R = Math.PI/180;
const NGP_RA = 192.85948*D2R, NGP_DEC = 27.12825*D2R, L_NCP = 122.93192*D2R;
function galacticXYZ(raDeg, decDeg, distLy){
  const a = raDeg*D2R, d = decDeg*D2R;
  const sinb = Math.sin(NGP_DEC)*Math.sin(d) + Math.cos(NGP_DEC)*Math.cos(d)*Math.cos(a-NGP_RA);
  const b = Math.asin(Math.max(-1,Math.min(1,sinb)));
  const y1 = Math.cos(d)*Math.sin(a-NGP_RA);
  const x1 = Math.cos(NGP_DEC)*Math.sin(d) - Math.sin(NGP_DEC)*Math.cos(d)*Math.cos(a-NGP_RA);
  let l = L_NCP - Math.atan2(y1, x1);
  // Sun-centred galactic Cartesian: x→centre (l=0), y→l=90, z→NGP
  const cb = Math.cos(b);
  return new THREE.Vector3(distLy*cb*Math.cos(l), distLy*cb*Math.sin(l), distLy*Math.sin(b));
}
function entryPos(e){
  if(e.id === 'sol') return new THREE.Vector3(0,0,0);
  if(e.ra_deg==null || e.dec_deg==null || e.distance_ly==null || e.distance_ly<=0) return null;
  return galacticXYZ(e.ra_deg, e.dec_deg, e.distance_ly);
}
/* deterministic stylized position for a purely-fictional canon place (a loose,
 * flattened cloud of story-worlds 90–430 ly around Sol — clearly "imagined") */
function strHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0)/4294967295; }
function fictionalPos(id){
  const a = strHash(id)*Math.PI*2, rad = 90 + strHash(id+'~r')*340, hz = (strHash(id+'~h')-0.5)*130;
  return new THREE.Vector3(rad*Math.cos(a), rad*Math.sin(a), hz);
}
/* map position for ANY entry (real or canon), or null if unplottable */
function mapPos(e){
  if(entryRealm(e) === 'real') return entryPos(e);
  if(e.category !== 'canon-place') return null;          // only canon PLACES go on the map
  if(e.id === 'bk-earth-mk2') return new THREE.Vector3(0,0,0);
  if(e.ra_deg!=null && e.dec_deg!=null && e.distance_ly>0) return galacticXYZ(e.ra_deg, e.dec_deg, e.distance_ly);
  return fictionalPos(e.id);
}

/* ============================================================
 * THREE setup
 * ============================================================ */
const sceneEl = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias:true, logarithmicDepthBuffer:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
renderer.setSize(innerWidth, innerHeight);
sceneEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = null;

const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.05, 600000);
camera.up.set(0,0,1);                       // galactic north is up
camera.position.set(9000,-40000,30000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 1.0;
controls.panSpeed = 0.6;
controls.minDistance = 0.4;
controls.maxDistance = 340000;
controls.target.set(8000,0,0);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.18;

/* ---------- background starfield ---------- */
(function backdrop(){
  const N = 2600, pos = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const r = 250000 + Math.random()*120000;
    const u = Math.random()*2-1, th = Math.random()*Math.PI*2, s = Math.sqrt(1-u*u);
    pos[i*3]=r*s*Math.cos(th); pos[i*3+1]=r*s*Math.sin(th); pos[i*3+2]=r*u;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const m = new THREE.PointsMaterial({ color:0x8aa0c8, size:1.4, sizeAttenuation:false, transparent:true, opacity:.55 });
  scene.add(new THREE.Points(g,m));
})();

/* ---------- the galaxy: disk arms + bulge ---------- */
function hexToRGB(h){ const n=parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; }
function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

function buildGalaxy(){
  const GC = new THREE.Vector3(R0,0,0);
  const ARMS = 4, PITCH = 0.235, RMAX = 52000, RMIN = 2600;
  const blue=hexToRGB('#9fc4ff'), white=hexToRGB('#fbfdff'), pink=hexToRGB('#ff86c8'),
        gold=hexToRGB('#ffcaa0'), warm=hexToRGB('#ffac5e');
  const N = 46000;
  const pos = new Float32Array(N*3), col = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const arm = i % ARMS;
    const rr = RMIN + (RMAX-RMIN)*Math.pow(Math.random(), 0.62);
    const base = arm*(2*Math.PI/ARMS) + Math.log(rr/RMIN)/PITCH;
    const spread = (0.16 + rr/RMAX*0.5);
    const ga = base + (Math.random()-0.5)*spread + gauss()*0.06;
    const gr = rr + gauss()*rr*0.045;
    const x = GC.x + gr*Math.cos(ga);
    const y = GC.y + gr*Math.sin(ga);
    const z = gauss()* (380 + rr*0.012);
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
    // colour: bluish arms, white sprinkle, occasional pink HII, warming inward
    let c = mix(blue, white, Math.random()*0.6);
    if(Math.random()<0.05) c = pink;
    const inward = 1 - Math.min(1, (gr-RMIN)/(RMAX-RMIN));
    c = mix(c, gold, inward*0.55);
    const b = 0.55 + Math.random()*0.55;
    col[i*3]=c[0]*b; col[i*3+1]=c[1]*b; col[i*3+2]=c[2]*b;
  }
  add(pos,col, 1.7, .9);

  // central bulge / bar
  const M = 16000;
  const p2 = new Float32Array(M*3), c2 = new Float32Array(M*3);
  const barAngle = 0.45;
  for(let i=0;i<M;i++){
    const r = Math.pow(Math.random(),2.1)*9000;
    const th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1);
    let x = r*Math.sin(ph)*Math.cos(th)*1.6;   // elongate → bar
    let y = r*Math.sin(ph)*Math.sin(th)*0.85;
    const z = r*Math.cos(ph)*0.42;
    const xr = x*Math.cos(barAngle)-y*Math.sin(barAngle);
    const yr = x*Math.sin(barAngle)+y*Math.cos(barAngle);
    p2[i*3]=GC.x+xr; p2[i*3+1]=GC.y+yr; p2[i*3+2]=z;
    const c = mix(warm, gold, Math.random()); const b=0.6+Math.random()*0.5;
    c2[i*3]=c[0]*b; c2[i*3+1]=c[1]*b; c2[i*3+2]=c[2]*b;
  }
  add(p2,c2, 1.9, .95);

  function add(posA,colA,size,op){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posA,3));
    g.setAttribute('color', new THREE.BufferAttribute(colA,3));
    const m = new THREE.PointsMaterial({ size, sizeAttenuation:false, vertexColors:true,
      transparent:true, opacity:op, blending:THREE.AdditiveBlending, depthWrite:false });
    scene.add(new THREE.Points(g,m));
  }
}
let _g1=0,_g2=0,_hasG=false;
function gauss(){ if(_hasG){_hasG=false;return _g2;} let u=0,v=0,s=0;
  do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s===0||s>=1);
  const m=Math.sqrt(-2*Math.log(s)/s); _g2=v*m;_hasG=true;return u*m; }
buildGalaxy();

/* ---------- galactic-centre glow ---------- */
function glowSprite(color, size){
  const cv = document.createElement('canvas'); cv.width=cv.height=128;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,0.95)'); g.addColorStop(0.25,color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.SpriteMaterial({ map:tex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  const s = new THREE.Sprite(m); s.scale.setScalar(size);
  return s;
}
const coreGlow = glowSprite('rgba(255,196,120,0.9)', 16000);
coreGlow.position.set(R0,0,0); scene.add(coreGlow);
const solGlow = glowSprite('rgba(255,240,180,0.95)', 30);
scene.add(solGlow);

/* ============================================================
 * Catalogue markers (custom shader points, screen-space sized)
 * ============================================================ */
const mapObjs = [];   // {entry,pos,base,realm,screen:{x,y,vis}}
ENTRIES.forEach(e => {
  const p = mapPos(e); if(!p) return;
  let base = 11;
  if(e.id==='sol') base = 22; else if(e.id==='sagittarius-a-star') base = 24;
  else if(MAJOR.has(e.id)) base = 16;
  else if(e.category==='galactic-structure'||e.category==='nebula-cluster'||e.category==='canon-place') base = 14;
  const ot=(e.objtype||'').toLowerCase();   // size luminous stars larger
  if(/hypergiant/.test(ot)) base=Math.max(base,20);
  else if(/supergiant/.test(ot)) base=Math.max(base,18);
  else if(/\bgiant\b/.test(ot)) base=Math.max(base,15);
  mapObjs.push({ entry:e, pos:p, base, realm:entryRealm(e), screen:{x:0,y:0,vis:false} });
});
const posById = new Map(mapObjs.map(o => [o.entry.id, o.pos]));
const plottedIds = new Set(mapObjs.map(o => o.entry.id));

const cN = mapObjs.length;
const cPos = new Float32Array(cN*3), cCol = new Float32Array(cN*3), cSize = new Float32Array(cN);
mapObjs.forEach((o,i) => {
  cPos[i*3]=o.pos.x; cPos[i*3+1]=o.pos.y; cPos[i*3+2]=o.pos.z;
  const c = hexToRGB(displayColor(o.entry));
  cCol[i*3]=c[0]; cCol[i*3+1]=c[1]; cCol[i*3+2]=c[2];
  cSize[i]=o.base;
});
const cGeo = new THREE.BufferGeometry();
cGeo.setAttribute('position', new THREE.BufferAttribute(cPos,3));
cGeo.setAttribute('color', new THREE.BufferAttribute(cCol,3));
cGeo.setAttribute('size', new THREE.BufferAttribute(cSize,1));
const cMat = new THREE.ShaderMaterial({
  uniforms:{ uScale:{value:(devicePixelRatio||1)} },
  vertexShader:`
    attribute float size; attribute vec3 color; varying vec3 vColor;
    uniform float uScale;
    void main(){ vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_Position=projectionMatrix*mv; gl_PointSize=size*uScale; }`,
  fragmentShader:`
    varying vec3 vColor;
    void main(){ vec2 c=gl_PointCoord-vec2(0.5); float d=length(c)*2.0;
      float core=smoothstep(1.0,0.0,d); if(core<0.03) discard;
      float ring=smoothstep(0.55,0.42,d)*0.5;
      gl_FragColor=vec4(vColor*(0.55+1.1*core)+vec3(ring), core); }`,
  transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
});
const cPoints = new THREE.Points(cGeo, cMat);
cPoints.frustumCulled = false;
scene.add(cPoints);

/* per-object label DOM nodes */
const labelLayer = document.getElementById('labels');
mapObjs.forEach(o => {
  const el = document.createElement('div');
  el.className = 'lbl' + (MAJOR.has(o.entry.id)?' major':'');
  el.style.setProperty('--dot', displayColor(o.entry));
  el.textContent = o.entry.name;
  el.addEventListener('click', ev => { ev.stopPropagation(); openEntry(o.entry.id, true); });
  o.label = el; labelLayer.appendChild(el);
});

/* ============================================================
 * Constellations — the familiar sky, drawn from real star
 * directions on a 600 ly shell (so from Sol they line up).
 * ============================================================ */
const CONSTELLATIONS = [
  { name:'Orion', stars:{ bet:[88.79,7.41], bel:[81.28,6.35], mei:[83.78,9.93], aln:[85.19,-1.94], anm:[84.05,-1.20], min:[83.00,-0.30], sai:[86.94,-9.67], rig:[78.63,-8.20] },
    lines:[['bet','bel'],['bet','mei'],['bel','mei'],['bet','aln'],['bel','min'],['aln','anm'],['anm','min'],['aln','sai'],['min','rig'],['sai','rig']] },
  { name:'Ursa Major', stars:{ dub:[165.93,61.75], mer:[165.46,56.38], phe:[178.46,53.69], meg:[183.86,57.03], ali:[193.51,55.96], miz:[200.98,54.93], alk:[206.89,49.31] },
    lines:[['dub','mer'],['mer','phe'],['phe','meg'],['meg','dub'],['meg','ali'],['ali','miz'],['miz','alk']] },
  { name:'Cassiopeia', stars:{ cap:[2.29,59.15], sch:[10.13,56.54], gam:[14.18,60.72], ruc:[21.45,60.24], seg:[28.60,63.67] },
    lines:[['cap','sch'],['sch','gam'],['gam','ruc'],['ruc','seg']] },
  { name:'Cygnus', stars:{ den:[310.36,45.28], sad:[305.56,40.26], gie:[311.55,33.97], del:[296.24,45.13], alb:[292.68,27.96] },
    lines:[['den','sad'],['sad','alb'],['gie','sad'],['sad','del']] },
  { name:'Crux', stars:{ acr:[186.65,-63.10], mim:[191.93,-59.69], gac:[187.79,-57.11], ima:[183.79,-58.75] },
    lines:[['acr','gac'],['mim','ima']] },
  { name:'Leo', stars:{ reg:[152.09,11.97], eta:[151.83,16.76], alg:[154.99,19.84], zos:[168.56,20.52], den:[177.26,14.57] },
    lines:[['reg','eta'],['eta','alg'],['alg','zos'],['zos','den'],['reg','den']] },
  { name:'Scorpius', stars:{ dsc:[240.08,-22.62], ant:[247.35,-26.43], eps:[252.97,-34.29], sar:[264.33,-42.99], sha:[263.40,-37.10] },
    lines:[['dsc','ant'],['ant','eps'],['eps','sar'],['sar','sha']] },
  { name:'Lyra', stars:{ veg:[279.23,38.78], del:[283.63,36.90], sul:[284.74,32.69], she:[282.52,33.36] },
    lines:[['veg','del'],['del','sul'],['sul','she'],['she','del']] },
  { name:'Canis Major', stars:{ mir:[95.67,-17.96], sir:[101.29,-16.72], wez:[107.10,-26.39], adh:[104.66,-28.97], alu:[111.02,-29.30] },
    lines:[['mir','sir'],['sir','wez'],['wez','adh'],['wez','alu']] },
];
const CR = 600;
const constGroup = new THREE.Group(); constGroup.visible = false; scene.add(constGroup);
const constLabels = [];
CONSTELLATIONS.forEach(c => {
  const pts = [];
  c.lines.forEach(([a,b]) => {
    const A = galacticXYZ(c.stars[a][0], c.stars[a][1], CR), B = galacticXYZ(c.stars[b][0], c.stars[b][1], CR);
    pts.push(A.x,A.y,A.z, B.x,B.y,B.z);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
  constGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color:0x86c4ff, transparent:true, opacity:0.6 })));
  const cen = new THREE.Vector3(); const keys = Object.keys(c.stars);
  keys.forEach(k => cen.add(galacticXYZ(c.stars[k][0], c.stars[k][1], CR))); cen.multiplyScalar(1/keys.length);
  const el = document.createElement('div'); el.className = 'clbl'; el.textContent = c.name; el.style.display='none';
  labelLayer.appendChild(el);
  constLabels.push({ pos:cen, el });
});
let skyOn = false;
function updateConstLabels(){
  if(!skyOn){ for(const c of constLabels) c.el.style.display='none'; return; }
  for(const c of constLabels){
    _v.copy(c.pos).project(camera);
    if(_v.z < 1){ c.el.style.display='block'; c.el.style.left=((_v.x*0.5+0.5)*innerWidth)+'px'; c.el.style.top=((-_v.y*0.5+0.5)*innerHeight)+'px'; }
    else c.el.style.display='none';
  }
}
function setSky(on){
  skyOn = on && mode==='real';
  constGroup.visible = skyOn;
  document.getElementById('btnSky').classList.toggle('on', skyOn);
  if(skyOn){ flyTo(new THREE.Vector3(0,0,0), 1500); toast('The constellations, drawn around the Sun ✦ drag to look around'); }
}

/* ============================================================
 * Render loop + projection (labels & picking)
 * ============================================================ */
const hiddenCats = new Set();
let hovered = null, selectedId = null;
const _v = new THREE.Vector3();

function project(){
  const w = innerWidth, h = innerHeight;
  const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
  for(const o of mapObjs){
    _v.copy(o.pos).project(camera);
    const inFront = _v.z < 1;
    const x = (_v.x*0.5+0.5)*w, y = (-_v.y*0.5+0.5)*h;
    o.screen.vis = inFront && x>=-40 && x<=w+40 && y>=-20 && y<=h+20 && !hiddenCats.has(o.entry.category) && o.realm===mode;
    o.screen.x = x; o.screen.y = y; o.screen.ndcz = _v.z;
  }
}
function placeLabels(){
  const shown = [];
  for(const o of mapObjs){
    const show = o.screen.vis && (MAJOR.has(o.entry.id) || o.entry.id===hovered || o.entry.id===selectedId);
    if(!show){ o.label.style.display='none'; continue; }
    shown.push(o);
  }
  // priority: selected > hovered > major; cull overlaps (skip lower priority within 26px)
  shown.sort((a,b)=> prio(b)-prio(a));
  const placed = [];
  for(const o of shown){
    let ok=true;
    for(const p of placed){ if(Math.abs(p.screen.x-o.screen.x)<70 && Math.abs(p.screen.y-o.screen.y)<16){ ok=false; break; } }
    if(!ok && o.entry.id!==selectedId && o.entry.id!==hovered){ o.label.style.display='none'; continue; }
    o.label.style.display='block';
    o.label.style.left=o.screen.x+'px'; o.label.style.top=o.screen.y+'px';
    o.label.classList.toggle('sel', o.entry.id===selectedId);
    placed.push(o);
  }
}
function prio(o){ if(o.entry.id===selectedId) return 100; if(o.entry.id===hovered) return 90; return MAJOR.has(o.entry.id)?10:1; }

/* camera tween */
let tween = null;
function flyTo(targetPos, standoff, dur=1100){
  const fromT = controls.target.clone(), fromP = camera.position.clone();
  let dir = fromP.clone().sub(fromT);
  if(dir.length() < 1e-3) dir.set(0.15,-0.8,0.6);
  dir.normalize();
  const toP = targetPos.clone().add(dir.multiplyScalar(standoff));
  tween = { fromT, toT:targetPos.clone(), fromP, toP, t:0, dur, start:performance.now() };
  controls.autoRotate = false; syncSpin();
}
function ease(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

function tick(now){
  requestAnimationFrame(tick);
  if(tween){
    const k = Math.min(1,(now-tween.start)/tween.dur), e=ease(k);
    controls.target.lerpVectors(tween.fromT, tween.toT, e);
    camera.position.lerpVectors(tween.fromP, tween.toP, e);
    if(k>=1) tween=null;
  }
  controls.update();
  solGlow.scale.setScalar(Math.max(8, controls.getDistance? controls.getDistance()*0.012 : 30));
  project(); placeLabels(); updateConstLabels();
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- pointer picking (screen-space) ---------- */
const dom = renderer.domElement;
let downXY = null;
function nearestAt(px,py,maxd){
  let best=null, bd=maxd*maxd;
  for(const o of mapObjs){
    if(!o.screen.vis) continue;
    const dx=o.screen.x-px, dy=o.screen.y-py, d=dx*dx+dy*dy;
    if(d<bd){ bd=d; best=o; }
  }
  return best;
}
dom.addEventListener('pointermove', ev => {
  const o = nearestAt(ev.clientX, ev.clientY, 16);
  const id = o?o.entry.id:null;
  if(id!==hovered){ hovered=id; dom.style.cursor = id?'pointer':'grab'; }
});
dom.addEventListener('pointerdown', ev => { downXY=[ev.clientX,ev.clientY]; });
dom.addEventListener('pointerup', ev => {
  if(!downXY) return;
  const moved = Math.hypot(ev.clientX-downXY[0], ev.clientY-downXY[1]);
  downXY=null;
  if(moved>6) return;                       // was a drag
  const o = nearestAt(ev.clientX, ev.clientY, 18);
  if(o) openEntry(o.entry.id, true);
});

/* ============================================================
 * The Guide device (entry rendering)
 * ============================================================ */
const guide = document.getElementById('guide');
const screenBody = document.getElementById('screenBody');
const VOYAGER_YR_PER_LY = 17636;   // ~years per light-year at Voyager 1's speed

function fmtNum(n){
  if(n>=1e9) return (n/1e9).toFixed(1)+' billion';
  if(n>=1e6) return (n/1e6).toFixed(1)+' million';
  if(n>=1e3) return Math.round(n).toLocaleString();
  return Math.round(n).toLocaleString();
}
function distLine(e){
  if(e.distance_ly==null) return '';
  if(e.distance_ly===0){
    if(e.id==='sol') return `<div class="e-dist">Distance: <b>8.3 light-minutes</b> · close enough to feel it</div>`;
    return `<div class="e-dist">Distance: <b>within the Solar System</b></div>`;
  }
  const ly = e.distance_ly;
  const yr = ly*VOYAGER_YR_PER_LY;
  return `<div class="e-dist">Distance: <b>${ly>=1000?fmtNum(ly):ly} light-years</b> · ≈ ${fmtNum(yr)} yr at Voyager's pace</div>`;
}
function renderEntry(e){
  const color = CATCOLOR[e.category]||'#fff';
  const canon = entryRealm(e)==='book';
  const xl = CROSSLINK[e.id]; const xlOk = xl && byId.has(xl);
  const xlLabel = canon ? '🔭 See the real one' : '📖 Find it in The Book';
  const facts = (e.facts||[]).map(f=>`<dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd>`).join('');
  const tags = (e.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('');
  const aka = (e.aka&&e.aka.length)?`<div class="e-aka">also: ${e.aka.map(esc).join(' · ')}</div>`:'';
  const plottable = plottedIds.has(e.id);
  let locNote = '';
  if(canon && e.category==='canon-place'){
    locNote = e.fictional===false
      ? `<div class="e-fiction">★ Anchored to a real star — shown at its true position.</div>`
      : `<div class="e-fiction">A place from the books — its spot on the map is for show, not from any star chart.</div>`;
  }
  screenBody.innerHTML = `
    ${canon?`<div class="e-realm">★ From the Books</div>`:''}
    <div class="e-cat"><span class="ed" style="background:${color};box-shadow:0 0 8px ${color}"></span>${esc(CATLABEL[e.category]||e.category)}</div>
    <div class="e-name">${esc(e.name)}</div>
    ${aka}
    <div class="e-type">${esc(e.objtype||'')}</div>
    <div class="e-verdict">${esc(e.verdict||'')}</div>
    <div class="e-body">${esc(e.guide||'')}</div>
    ${distLine(e)}
    ${locNote}
    ${facts?`<dl class="e-facts">${facts}</dl>`:''}
    ${e.panic?`<div class="e-panic"><span class="pk">▸ DON'T PANIC</span><span class="pv">${esc(e.panic)}</span></div>`:''}
    ${tags?`<div class="e-tags">${tags}</div>`:''}
    ${xlOk?`<div class="e-link"><button id="xlink" class="${canon?'to-real':'to-book'}">${xlLabel} →</button></div>`:''}
    ${plottable?`<div class="e-fly"><button id="flyHere">🚀 Fly here</button><button id="flyBack">${canon?'📖 The Book':'☀️ Back to Sol'}</button></div>`:''}
  `;
  screenBody.scrollTop = 0;
  if(plottable){
    document.getElementById('flyHere').onclick = () => focusEntry(e, true);
    document.getElementById('flyBack').onclick = () => setView(canon?'book':'sol');
  }
  if(xlOk) document.getElementById('xlink').onclick = () => openEntry(xl, true);
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function openEntry(id, fly){
  const e = byId.get(id); if(!e) return;
  if(entryRealm(e) !== mode) setMode(entryRealm(e));
  selectedId = id;
  renderEntry(e);
  guide.classList.remove('closed');
  hideSplash();
  if(fly) focusEntry(e, false);
  pushURL();
  rotateStatus();
}
function focusEntry(e, close){
  const p = posById.get(e.id); if(!p) return;
  flyTo(p, STANDOFF[e.category]||40);
}
document.getElementById('guideClose').onclick = () => { guide.classList.add('closed'); selectedId=null; pushURL(); };

/* prev / next within the same category */
function step(dir){
  if(!selectedId) return;
  const e = byId.get(selectedId);
  const sib = ENTRIES.filter(x=>x.category===e.category);
  const i = sib.findIndex(x=>x.id===selectedId);
  const n = sib[(i+dir+sib.length)%sib.length];
  if(n) openEntry(n.id, true);
}
document.getElementById('entryPrev').onclick = ()=>step(-1);
document.getElementById('entryNext').onclick = ()=>step(1);
const STATUS = ['SUB-ETHA · ONLINE','SHARE & ENJOY','FROGSTAR ROAMING','SIRIUS CYBERNETICS','BISTROMATHICS OK','FIELD: PERCEPTION','INFINITE IMPROBABILITY'];
let _si=0; function rotateStatus(){ document.getElementById('entryWhere').textContent = STATUS[_si++%STATUS.length]; }

/* ============================================================
 * Views
 * ============================================================ */
const VIEWS = {
  home: ()=>{ flyTo(new THREE.Vector3(8000,0,0), 0); // standoff 0 → keep dir, set explicit below
    tween=null; controls.target.set(8000,0,0); camera.position.set(9000,-40000,30000); },
  sol:  ()=>flyTo(new THREE.Vector3(0,0,0), 17),
  core: ()=>{ const s=byId.get('sagittarius-a-star'); flyTo(s?entryPos(s):new THREE.Vector3(R0,0,0), 11000); },
  book: ()=>{ tween=null; controls.target.set(60,0,0); camera.position.set(180,-820,520); },
};
function setView(v){
  document.querySelectorAll('#mapctl .mbtn[data-view]').forEach(b=>b.classList.toggle('on', b.dataset.view===v));
  (VIEWS[v]||VIEWS.home)();
}
document.querySelectorAll('#mapctl .mbtn[data-view]').forEach(b => b.onclick = ()=>setView(b.dataset.view));
const btnSpin = document.getElementById('btnSpin');
function syncSpin(){ btnSpin.classList.toggle('on', controls.autoRotate); }
btnSpin.onclick = ()=>{ controls.autoRotate=!controls.autoRotate; syncSpin(); };
document.getElementById('btnSky').onclick = ()=> setSky(!skyOn);

/* ---------- Guide mode (Real galaxy ⟷ The Book) ---------- */
function updateBanner(){
  const el = document.getElementById('modeBanner');
  if(mode==='book'){
    el.innerHTML = `<b>📖 The Book.</b> The Guide as Douglas Adams wrote it — Earth, Ford's home near Betelgeuse &amp; Megadodo on Ursa Minor Beta sit at their real stars; the rest exist only in the books.`;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}
function syncModePills(){
  document.querySelectorAll('#modeToggle .mode-pill').forEach(b=>{
    const on = b.dataset.mode===mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on?'true':'false');
  });
}
function setMode(m){
  if((m!=='real' && m!=='book') || m===mode) return;
  mode = m;
  document.body.classList.toggle('mode-book', m==='book');
  constGroup.visible = skyOn && m==='real';
  syncModePills();
  if(selectedId && entryRealm(byId.get(selectedId))!==m){ guide.classList.add('closed'); selectedId=null; }
  closeSearch(); endTour();
  hiddenCats.clear();
  buildLegend(); buildBrowse(); applyCatFilter(); updateBanner();
  setView(m==='book'?'book':'home');
  pushURL();
}
document.querySelectorAll('#modeToggle .mode-pill').forEach(b => b.onclick = ()=>setMode(b.dataset.mode));

/* ============================================================
 * Search
 * ============================================================ */
const search = document.getElementById('search');
const searchResults = document.getElementById('searchResults');
let srActive = -1, srItems = [];
function runSearch(q){
  q = q.trim().toLowerCase();
  if(!q){ searchResults.classList.add('hidden'); return; }
  const hits = realmEntries().map(e=>{
    const hay = (e.name+' '+(e.aka||[]).join(' ')+' '+(e.tags||[]).join(' ')+' '+(CATLABEL[e.category]||'')+' '+(e.objtype||'')).toLowerCase();
    let s=-1;
    if(e.name.toLowerCase().startsWith(q)) s=0;
    else if(e.name.toLowerCase().includes(q)) s=1;
    else if(hay.includes(q)) s=2;
    return s<0?null:{e,s};
  }).filter(Boolean).sort((a,b)=>a.s-b.s || a.e.name.localeCompare(b.e.name)).slice(0,40);
  renderResults(hits.map(h=>h.e));
}
function renderResults(list){
  srItems = list; srActive = -1;
  if(!list.length){ searchResults.innerHTML = `<div class="sr-empty">Nothing in the Guide matches. The Guide is, after all, incomplete.</div>`; searchResults.classList.remove('hidden'); return; }
  searchResults.innerHTML = list.map((e,i)=>`
    <div class="sr" data-id="${e.id}" data-i="${i}">
      <span class="srdot" style="background:${displayColor(e)};box-shadow:0 0 7px ${displayColor(e)}"></span>
      <span style="min-width:0">
        <div class="srn">${esc(e.name)}</div>
        <div class="srt">${CATEMOJI[e.category]||''} ${esc(CATLABEL[e.category]||'')}${e.objtype?' · '+esc(e.objtype):''}</div>
      </span>
    </div>`).join('');
  searchResults.classList.remove('hidden');
  searchResults.querySelectorAll('.sr').forEach(el => el.onclick = ()=>{ openEntry(el.dataset.id, true); closeSearch(); });
}
function closeSearch(){ searchResults.classList.add('hidden'); search.value=''; }
search.addEventListener('input', ()=>runSearch(search.value));
search.addEventListener('focus', ()=>{ if(search.value) runSearch(search.value); });
search.addEventListener('keydown', ev=>{
  if(ev.key==='Escape'){ closeSearch(); search.blur(); return; }
  if(!srItems.length) return;
  if(ev.key==='ArrowDown'){ ev.preventDefault(); srActive=Math.min(srItems.length-1,srActive+1); markActive(); }
  else if(ev.key==='ArrowUp'){ ev.preventDefault(); srActive=Math.max(0,srActive-1); markActive(); }
  else if(ev.key==='Enter'){ const e = srItems[srActive<0?0:srActive]; if(e){ openEntry(e.id,true); closeSearch(); search.blur(); } }
});
function markActive(){ searchResults.querySelectorAll('.sr').forEach((el,i)=>el.classList.toggle('active', i===srActive)); }
document.addEventListener('click', ev=>{ if(!ev.target.closest('#searchWrap')) searchResults.classList.add('hidden'); });

/* ============================================================
 * Browse drawer + legend
 * ============================================================ */
const browse = document.getElementById('browse');
const browseList = document.getElementById('browseList');
function buildBrowse(){
  const counts = {};
  realmEntries().forEach(e=>counts[e.category]=(counts[e.category]||0)+1);
  browseList.innerHTML = realmCats().map(c=>`
    <div class="cat" data-key="${c.key}">
      <span class="ce">${c.emoji||'•'}</span>
      <span style="min-width:0"><div class="cl">${esc(c.label)}</div><div class="cb">${esc(c.blurb||'')}</div></span>
      <span class="cc">${counts[c.key]||0}</span>
    </div>`).join('');
  browseList.querySelectorAll('.cat').forEach(el=>el.onclick=()=>{
    const list = ENTRIES.filter(e=>e.category===el.dataset.key);
    renderResults(list); browse.classList.add('hidden');
    search.focus();
  });
}
document.getElementById('btnBrowse').onclick = ()=>{ browse.classList.toggle('hidden'); };
document.addEventListener('click', ev=>{ if(!ev.target.closest('#browse') && !ev.target.closest('#btnBrowse')) browse.classList.add('hidden'); });

const legend = document.getElementById('legend');
function buildLegend(){
  const spec = `<div class="lg-spec" title="Stars are coloured by their real spectral type">${
    [['O','#9bb0ff'],['B','#aac4ff'],['A','#cdd9ff'],['F','#f6f7ff'],['G','#fff3d0'],['K','#ffd095'],['M','#ff9a68']]
    .map(s=>`<span style="background:${s[1]}">${s[0]}</span>`).join('')}<i>star = temperature</i></div>`;
  legend.innerHTML = realmCats().map(c=>`
    <div class="lg" data-key="${c.key}"><span class="d" style="background:${CATCOLOR[c.key]};color:${CATCOLOR[c.key]}"></span>${esc(c.label)}</div>`).join('')
    + (mode==='real' ? spec : `<div class="lg-note">Only places appear on the map.</div>`);
  legend.querySelectorAll('.lg').forEach(el=>el.onclick=()=>{
    const k=el.dataset.key;
    if(hiddenCats.has(k)){ hiddenCats.delete(k); el.classList.remove('off'); }
    else { hiddenCats.add(k); el.classList.add('off'); }
    applyCatFilter();
  });
}
function applyCatFilter(){
  const sz = cGeo.getAttribute('size');
  mapObjs.forEach((o,i)=> sz.array[i] = (o.realm!==mode || hiddenCats.has(o.entry.category)) ? 0 : o.base );
  sz.needsUpdate = true;
}

/* ============================================================
 * Tour
 * ============================================================ */
const tourbar = document.getElementById('tourbar');
const TOUR_REAL = (DATA.tour||[]).filter(s=>byId.has(s.id));
const TOUR_BOOK = (DATA.canonTour||[]).filter(s=>byId.has(s.id));
const tourList = () => mode==='book' ? TOUR_BOOK : TOUR_REAL;
let tourIdx = -1;
function startTour(){
  const T = tourList(); if(!T.length) return;
  hideSplash(); tourIdx=0; tourbar.classList.remove('hidden'); showTour();
}
function showTour(){
  const T = tourList(); const s = T[tourIdx]; if(!s) return;
  openEntry(s.id, true);
  document.getElementById('tourLine').textContent = s.line || byId.get(s.id)?.verdict || '';
  document.getElementById('tourCount').textContent = `Stop ${tourIdx+1} of ${T.length}`;
}
function endTour(){ tourbar.classList.add('hidden'); tourIdx=-1; }
document.getElementById('tourPrev').onclick=()=>{ const n=tourList().length; if(n){ tourIdx=(tourIdx-1+n)%n; showTour(); } };
document.getElementById('tourNext').onclick=()=>{ const n=tourList().length; if(n){ tourIdx=(tourIdx+1)%n; showTour(); } };
document.getElementById('tourEnd').onclick=endTour;
document.getElementById('btnTour').onclick=startTour;

/* ============================================================
 * Random / share / help / splash / home
 * ============================================================ */
document.getElementById('btnRandom').onclick = ()=>{
  const pool = realmEntries(); if(!pool.length) return;
  const pick = pool[Math.floor(Math.random()*pool.length)];
  if(pick) openEntry(pick.id, true);
};

function shareURL(){
  const u = new URL(location.href); u.search='';
  if(mode==='book') u.searchParams.set('mode','book');
  if(selectedId) u.searchParams.set('e', selectedId);
  return u;
}
function pushURL(){ history.replaceState(null,'',shareURL()); }
document.getElementById('btnShare').onclick = ()=>{
  const u = shareURL().toString();
  navigator.clipboard?.writeText(u).then(()=>toast('Link copied — share and enjoy.'), ()=>toast(u));
};
function toast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),2600);
}

/* help */
const help = document.getElementById('help');
document.getElementById('helpBody').innerHTML = `
  <p>${esc(DATA.meta.howto||'')}</p>
  <h3>Two Guides in one</h3>
  <p>Use the toggle up top to switch between <b>🔭 Real Galaxy</b> — a true map of the Milky Way — and <b>📖 The Book</b>, the Guide as Douglas Adams wrote it: Magrathea, the Vogons, Marvin, 42 and the rest. In The Book, a few places that genuinely tie to real stars (Earth, Ford's home near Betelgeuse, Megadodo on Ursa Minor Beta) sit at their true positions; everything else lives only in the story, so it's there to read rather than to fly to.</p>
  <h3>The map</h3>
  <p>Every glowing dot is a <b>real object</b>, placed at its true position from Earth's coordinates (J2000 right ascension &amp; declination) and distance. The bright core is <b>Sagittarius A*</b>, the galaxy's central black hole; the yellow dot you start beside is the <b>Sun</b>. Drag to orbit, scroll to zoom, click anything that glows.</p>
  <h3>The Guide</h3>
  <p>Everything is genuine astronomy — distances, types and dates are fact-checked — but written in the spirit of the Guide. Verdicts and DON'T PANIC tips are editorial. Colours mark the eight sections (see the key, lower-right).</p>
  <h3>Honest bits</h3>
  <p>Distances to far objects carry real uncertainty; the spiral arms are an artistic rendering at true scale, not a star-by-star survey. "Years at Voyager's pace" assumes ~17 km/s in a straight line, which no one would actually do.</p>
  <p style="color:var(--faint);margin-top:14px">Part of the <a href="https://42-apps.github.io/" style="color:var(--acc)">42-apps</a> collection. The Answer is 42; the map is the question.</p>`;
document.getElementById('btnHelp').onclick=()=>help.classList.remove('hidden');
document.getElementById('helpClose').onclick=()=>help.classList.add('hidden');
help.addEventListener('click',ev=>{ if(ev.target===help) help.classList.add('hidden'); });

/* splash */
const splash = document.getElementById('splash');
document.getElementById('coverTagline').textContent = DATA.meta.tagline||'';
document.getElementById('coverIntro').textContent = DATA.meta.intro||'';
document.getElementById('coverHowto').textContent = DATA.meta.howto||'';
function hideSplash(){ splash.classList.add('gone'); }
function firstHint(){
  try{ if(localStorage.getItem('hhg-hint')) return; localStorage.setItem('hhg-hint','1'); }catch(e){}
  setTimeout(()=>toast('Drag to orbit · scroll to zoom · click anything that glows ✦'), 800);
}
document.getElementById('btnBegin').onclick = ()=>{ hideSplash(); setView('home'); firstHint(); };
document.getElementById('btnBook').onclick = ()=>{ hideSplash(); setMode('book'); firstHint(); };
document.getElementById('btnTourStart').onclick = ()=>{ startTour(); };

/* home reset (brand/logo → full reset) */
function goHome(){
  selectedId=null; hovered=null;
  guide.classList.add('closed');
  browse.classList.add('hidden'); help.classList.add('hidden');
  closeSearch(); endTour();
  mode='real'; document.body.classList.remove('mode-book'); syncModePills(); updateBanner();
  hiddenCats.clear();
  buildLegend(); buildBrowse(); applyCatFilter();
  controls.autoRotate=false; syncSpin();
  setSky(false);
  setView('home');
  history.replaceState(null,'',location.pathname);
}
const brand = document.getElementById('brand');
brand.onclick = goHome;
brand.addEventListener('keydown', ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); goHome(); } });

addEventListener('keydown', ev=>{
  if(ev.key==='Escape'){
    if(!help.classList.contains('hidden')) help.classList.add('hidden');
    else if(!tourbar.classList.contains('hidden')) endTour();
    else if(!guide.classList.contains('closed')){ guide.classList.add('closed'); selectedId=null; pushURL(); }
  }
  if(ev.key==='/' && document.activeElement!==search){ ev.preventDefault(); search.focus(); }
});

/* ============================================================
 * Boot
 * ============================================================ */
buildBrowse(); buildLegend(); syncSpin();
setView('home');

(function deepLink(){
  const p = new URLSearchParams(location.search);
  if(p.get('mode')==='book') setMode('book');
  if(p.get('tour')!=null){ hideSplash(); setTimeout(startTour,300); return; }
  const e = p.get('e');
  if(e && byId.has(e)){ hideSplash(); setTimeout(()=>openEntry(e,true),250); }
})();
