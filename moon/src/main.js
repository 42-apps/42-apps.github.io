// ============================================================================
// Living on the Moon — core scene, explore mode, mode switching, render loop
// ============================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { POI } from './data.js';
import { latLonToVec3, clamp } from './util.js';
import { Colony } from './colony.js';
import { Launch } from './launch.js';

export const MOON_R = 10;
export const EARTH_R = 36.7;          // 3.67 × Moon (true ratio)
export const EARTH_POS = new THREE.Vector3(0, 0, 240); // compressed distance

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// Robust viewport size — never let a zero-height window produce a NaN aspect.
const vp = () => ({ w: window.innerWidth || 1280, h: window.innerHeight || 720 });
renderer.setSize(vp().w, vp().h);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, vp().w / vp().h, 0.05, 5000);
camera.position.set(25, 8, 6); // looking down +X at the classic near side

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = MOON_R + 0.45;   // skim the surface
controls.maxDistance = 90;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.9;

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff6e8, 3.0);
sun.position.set(60, 18, 30);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x223047, 0.5));     // faint earthshine fill
const rim = new THREE.DirectionalLight(0x4466aa, 0.35);
rim.position.set(-40, -10, -30);
scene.add(rim);

// ---------------------------------------------------------------------------
// Loading manager -> loader bar
// ---------------------------------------------------------------------------
const lbarFill = document.getElementById('lbarFill');
const lmsg = document.getElementById('lmsg');
const loader = document.getElementById('loader');
const manager = new THREE.LoadingManager();
let loaderHidden = false;
function hideLoader(){
  if (loaderHidden) return; loaderHidden = true;
  lbarFill.style.width = '100%';
  loader.classList.add('gone');
  // fully remove from the layout so it can never intercept clicks or linger
  setTimeout(() => { loader.style.display = 'none'; }, 650);
}
manager.onProgress = (url, done, total) => {
  if (!loaderHidden) lbarFill.style.width = Math.round(100 * done / total) + '%';
};
manager.onLoad = () => setTimeout(hideLoader, 200);
manager.onError = (url) => { console.warn('[moon] asset failed to load:', url); };
// Watchdog: never leave the loading screen stuck if a texture stalls.
setTimeout(hideLoader, 12000);
// Let the user dismiss it manually too (tap / Esc).
loader.style.cursor = 'pointer';
loader.title = 'Click to skip';
loader.addEventListener('click', hideLoader);
const texLoader = new THREE.TextureLoader(manager);
function tex(path, srgb=false){
  const t = texLoader.load(path);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// ---------------------------------------------------------------------------
// Starfield (Milky Way sky dome)
// ---------------------------------------------------------------------------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(3000, 48, 48),
  new THREE.MeshBasicMaterial({ map: tex('assets/tex/8k_stars.jpg', true), side: THREE.BackSide })
);
scene.add(sky);

// ---------------------------------------------------------------------------
// Moon (hero)
// ---------------------------------------------------------------------------
const moonMap = tex('assets/tex/8k_moon.jpg', true);
const moonBump = tex('assets/tex/8k_moon.jpg');
const moonMat = new THREE.MeshStandardMaterial({
  map: moonMap, bumpMap: moonBump, bumpScale: 0.55,
  roughness: 0.98, metalness: 0.0
});
const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 256, 256), moonMat);
moon.name = 'moon';
scene.add(moon);

// subtle ground-glow ring so the limb reads against black
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(MOON_R * 1.012, 64, 64),
  new THREE.MeshBasicMaterial({ color:0x8aa6d8, transparent:true, opacity:0.05, side:THREE.BackSide })
);
scene.add(glow);

// ---------------------------------------------------------------------------
// Earth (used in Launch mode) — built lazily but added now, hidden
// ---------------------------------------------------------------------------
const earthGroup = new THREE.Group();
earthGroup.position.copy(EARTH_POS);
earthGroup.visible = false;
scene.add(earthGroup);
{
  const eMat = new THREE.MeshStandardMaterial({
    map: tex('assets/tex/8k_earth_day.jpg', true),
    emissiveMap: tex('assets/tex/8k_earth_night.jpg', true),
    emissive: 0xffffff, emissiveIntensity: 0.0, // raised on the night side via shader-ish trick below
    roughness: 0.85, metalness: 0.0
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 128, 128), eMat);
  earth.name = 'earth';
  earthGroup.add(earth);
  // clouds
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.01, 96, 96),
    new THREE.MeshStandardMaterial({ map: tex('assets/tex/8k_earth_clouds.jpg', true),
      transparent:true, opacity:0.85, depthWrite:false })
  );
  earthGroup.add(clouds);
  // atmosphere shell
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.04, 96, 96),
    new THREE.MeshBasicMaterial({ color:0x5b9bff, transparent:true, opacity:0.12, side:THREE.BackSide })
  );
  earthGroup.add(atmo);
  earthGroup.userData = { earth, clouds, atmo };
}

// ---------------------------------------------------------------------------
// Post-processing (bloom for plumes / highlights)
// ---------------------------------------------------------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(vp().w, vp().h), 0.55, 0.7, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// POI markers + DOM labels
// ---------------------------------------------------------------------------
const labelLayer = document.createElement('div');
labelLayer.id = 'labels';
document.body.appendChild(labelLayer);

const markerGroup = new THREE.Group();
scene.add(markerGroup);

const KIND_COLOR = { mare:0x7fb4ff, crater:0xc7cad6, landing:0xffd28a, base:0x5ad1a0 };
const pois = POI.map(p => {
  const pos = latLonToVec3(p.lat, p.lon, MOON_R * 1.001);
  // tiny 3D dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: KIND_COLOR[p.kind] || 0xffffff })
  );
  dot.position.copy(pos);
  markerGroup.add(dot);
  // DOM label
  const el = document.createElement('div');
  el.className = 'lbl ' + p.kind;
  el.innerHTML = `<span class="pin"></span><span class="tx">${p.name}</span>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); openPOI(p, pos); });
  labelLayer.appendChild(el);
  return { p, pos, dot, el };
});

const _v = new THREE.Vector3(), _p2 = new THREE.Vector3();
function projectLabels(){
  for (const it of pois){
    _p2.copy(it.pos).project(camera);
    it._ndcX = _p2.x; it._ndcY = _p2.y; it._ndcZ = _p2.z;
  }
}
function updateLabels(){
  const showLabels = visToggles.labels;
  const camDist = camera.position.length();
  for (const it of pois){
    const kindOn = visToggles[it.p.kind];
    if (!kindOn){ it.el.style.display='none'; it.dot.visible=false; continue; }
    it.dot.visible = true;
    // near-side test: marker normal points toward the camera
    _v.copy(camera.position).sub(it.pos);
    const facing = it.pos.dot(_v) > 0;
    const onScreen = it._ndcZ < 1 && Math.abs(it._ndcX) < 1.08 && Math.abs(it._ndcY) < 1.08;
    if (facing && onScreen && showLabels){
      it.el.style.display = 'block';
      const _vp = vp();
      it.el.style.left = ((it._ndcX*0.5+0.5)*_vp.w)  + 'px';
      it.el.style.top  = ((-it._ndcY*0.5+0.5)*_vp.h) + 'px';
      it.el.classList.toggle('faint', camDist > 42);
    } else {
      it.el.style.display = 'none';
    }
  }
}

let labelsActive = true;
const visToggles = { mare:true, crater:true, landing:true, base:true, labels:true };

// ---------------------------------------------------------------------------
// POI info card
// ---------------------------------------------------------------------------
const poiCard = document.getElementById('poiCard');
function openPOI(p, pos){
  document.getElementById('poiIco').textContent = p.ico || '🌑';
  document.getElementById('poiName').textContent = p.name;
  document.getElementById('poiTag').textContent = p.tag || p.kind;
  document.getElementById('poiDesc').textContent = p.desc || '';
  const meta = document.getElementById('poiMeta'); meta.innerHTML='';
  const bits = [];
  if (p.year) bits.push('📅 ' + p.year);
  if (p.crew) bits.push('👤 ' + p.crew);
  if (p.site) bits.push('📍 ' + p.site);
  if (p.why)  bits.push('💡 ' + p.why);
  bits.push(`🌐 ${p.lat.toFixed(1)}°, ${p.lon.toFixed(1)}°`);
  for (const b of bits){ const s=document.createElement('span'); s.textContent=b; meta.appendChild(s); }
  poiCard.hidden = false;
  // gently swing the camera so the feature faces us
  flyToSurface(pos);
}
document.getElementById('poiClose').onclick = () => poiCard.hidden = true;

// ---------------------------------------------------------------------------
// Camera fly-to a surface point (keeps current distance, rotates view)
// ---------------------------------------------------------------------------
let flyTarget = null, flyT = 0;
function flyToSurface(pos){
  const dist = clamp(camera.position.length(), MOON_R + 2.5, 24);
  flyTarget = pos.clone().normalize().multiplyScalar(dist);
  flyT = 0;
}

// ---------------------------------------------------------------------------
// Mode management
// ---------------------------------------------------------------------------
const ctx = { THREE, scene, camera, controls, renderer, moon, MOON_R, EARTH_R,
  earthGroup, EARTH_POS, sun, latLonToVec3, bloom };
const colony = new Colony(ctx);
const launch = new Launch(ctx);

let mode = 'explore';
const panels = {
  explore: document.getElementById('explorePanel'),
  build:   document.getElementById('buildPanel'),
  launch:  document.getElementById('launchPanel'),
};
function setMode(m){
  if (m === mode) return;
  // leave
  if (mode === 'build') colony.exit();
  if (mode === 'launch') launch.exit();
  mode = m;
  for (const k in panels) panels[k].hidden = (k !== m);
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  labelsActive = (m === 'explore');
  markerGroup.visible = (m !== 'launch');
  if (m === 'launch') labelLayer.style.display = 'none';
  poiCard.hidden = true;
  if (m === 'explore'){ enterMoonView(); }
  if (m === 'build'){ enterMoonView(); colony.enter(); }
  if (m === 'launch'){ launch.enter(); }
  document.getElementById('compass').style.display = (m === 'launch') ? 'none' : 'block';
}
document.querySelectorAll('.mode').forEach(b => b.onclick = () => setMode(b.dataset.mode));

function enterMoonView(){
  earthGroup.visible = false;
  controls.enabled = true;
  controls.minDistance = MOON_R + 0.45;
  controls.maxDistance = 90;
  controls.target.set(0,0,0);
  glow.visible = true;
  markerGroup.visible = true;
}

// ---------------------------------------------------------------------------
// Explore UI wiring
// ---------------------------------------------------------------------------
const reliefSlider = document.getElementById('relief');
reliefSlider.oninput = () => { moonMat.bumpScale = (reliefSlider.value/100) * 1.1; };
moonMat.bumpScale = (reliefSlider.value/100) * 1.1;

const sunSlider = document.getElementById('sunAngle');
function applySun(){
  const a = sunSlider.value * Math.PI/180;
  sun.position.set(Math.cos(a)*70, 16, Math.sin(a)*70);
}
sunSlider.oninput = applySun; applySun();

const bind = (id, key) => {
  const el = document.getElementById(id);
  el.onchange = () => { visToggles[key] = el.checked; };
};
bind('tgMaria','mare'); bind('tgCraters','crater'); bind('tgLandings','landing');
bind('tgBases','base');
document.getElementById('tgLabels').onchange = e => { visToggles.labels = e.target.checked; };

// quick-jump chips
const jump = document.getElementById('jumpList');
[['Apollo 11','Apollo 11'],['Tycho','Tycho'],['Copernicus','Copernicus'],
 ['South Pole','Shackleton Crater'],['Far side','Tsiolkovskiy'],['Aristarchus','Aristarchus']]
 .forEach(([label,name]) => {
   const b = document.createElement('button'); b.textContent = label;
   b.onclick = () => { const it = pois.find(x => x.p.name === name); if (it) openPOI(it.p, it.pos); };
   jump.appendChild(b);
 });

// ---------------------------------------------------------------------------
// Help modal
// ---------------------------------------------------------------------------
const overlay = document.getElementById('overlay');
document.getElementById('helpBtn').onclick = () => overlay.hidden = false;
document.getElementById('aboutClose').onclick = () => overlay.hidden = true;
overlay.onclick = e => { if (e.target === overlay) overlay.hidden = true; };
// Escape closes any open overlay / card, and dismisses the loader.
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  overlay.hidden = true;
  poiCard.hidden = true;
  hideLoader();
});
document.querySelector('.credits').innerHTML =
  'Imagery: NASA / Solar System Scope lunar &amp; Earth maps (CC BY 4.0). ' +
  'Starship modelled procedurally. Built for fun — distances in Launch mode are compressed for visibility; times are realistic.';

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onResize(){
  const { w, h } = vp();
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}
addEventListener('resize', onResize);
onResize();

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let frame = 0;
function animate(){
  requestAnimationFrame(animate);
  step(Math.min(clock.getDelta(), 0.05));
}
function step(dt){
  frame++;

  // fly-to easing
  if (flyTarget){
    flyT = Math.min(1, flyT + dt*1.6);
    camera.position.lerp(flyTarget, 0.08);
    if (flyT >= 1 || camera.position.distanceTo(flyTarget) < 0.05) flyTarget = null;
  }

  if (mode === 'launch') launch.update(dt, frame);
  else { controls.update(); }

  if (mode === 'build') colony.update(dt, frame);

  // labels only on the moon side
  if (labelsActive){
    projectLabels();
    updateLabels();
  } else {
    labelLayer.style.display = 'none';
  }
  if (labelsActive) labelLayer.style.display = 'block';

  // earth cloud drift
  if (earthGroup.visible && earthGroup.userData.clouds)
    earthGroup.userData.clouds.rotation.y += dt * 0.006;

  composer.render();
}
animate();

// Debug hook for verification
window.__moon = {
  get mode(){ return mode; },
  setMode, openPOI: (name) => { const it = pois.find(x=>x.p.name===name); if(it) openPOI(it.p, it.pos); },
  poiCount: pois.length,
  camDist: () => camera.position.length(),
  colony, launch,
  loaded: () => loader.classList.contains('gone'),
  dbg: (names) => {
    projectLabels();
    const cam = camera.position.toArray().map(n=>+n.toFixed(2));
    const visN = pois.filter(it => it.el.style.display==='block').length;
    const pick = (names||['Mare Tranquillitatis','Tycho','Copernicus','Mare Imbrium']);
    const rows = pick.map(nm => { const it = pois.find(x=>x.p.name===nm); if(!it) return {nm,miss:1};
      _v.copy(camera.position).sub(it.pos);
      const facing = it.pos.dot(_v) > 0;
      const onScreen = it._ndcZ < 1 && Math.abs(it._ndcX) < 1.08 && Math.abs(it._ndcY) < 1.08;
      return { nm, facing, onScreen, ndc:[+it._ndcX.toFixed(2),+it._ndcY.toFixed(2),+it._ndcZ.toFixed(3)],
        disp: it.el.style.display, pos: it.pos.toArray().map(n=>+n.toFixed(1)) };
    });
    return { cam, aspect:+camera.aspect.toFixed(3), m0:+camera.projectionMatrix.elements[0].toFixed(3),
      labelsActive, showLabels: visToggles.labels, visibleLabels: visN, rows };
  },
  camera, renderer, composer,
  step: (n=1, dt=1/60) => { for (let i=0;i<n;i++) step(dt); },
  resize: onResize,
  // Sample the moon texture brightness under each named marker (alignment check)
  texCheck: (names) => {
    const img = moonMap.image;
    if (!img || !img.width) return 'texture not ready';
    const W=1024,H=512;
    const cv = document.createElement('canvas'); cv.width=W; cv.height=H;
    const g = cv.getContext('2d'); g.drawImage(img,0,0,W,H);
    const data = g.getImageData(0,0,W,H).data;
    const out = {};
    for (const nm of names){
      const it = pois.find(x=>x.p.name===nm); if(!it) continue;
      const d = it.pos.clone().normalize();
      const phi = Math.acos(THREE.MathUtils.clamp(d.y,-1,1));        // 0..PI
      let theta = Math.atan2(d.z, -d.x);                             // -PI..PI
      let u = theta/(2*Math.PI); if (u<0) u+=1;                      // 0..1
      const v = phi/Math.PI;                                         // 0..1 (north->south)
      const px = Math.min(W-1, Math.floor(u*W));
      const py = Math.min(H-1, Math.floor(v*H));                     // flipY handled below
      const i = (py*W+px)*4;
      out[nm] = Math.round((data[i]+data[i+1]+data[i+2])/3);
    }
    return out;
  },
};
