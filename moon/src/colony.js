// ============================================================================
// Build mode — place lunar structures on the surface, track colony stats
// ============================================================================
import * as THREE from 'three';
import { BUILDINGS } from './data.js';

const UP = new THREE.Vector3(0,1,0);

export class Colony {
  constructor(ctx){
    this.ctx = ctx;
    this.group = new THREE.Group();
    ctx.moon.add(this.group);          // structures live in the Moon's frame
    this.structures = [];
    this.selected = BUILDINGS[0];
    this.raycaster = new THREE.Raycaster();
    this.active = false;
    this._buildPalette();
    this._wireButtons();
    this._bindCanvas();
    this.refreshStats();
  }

  // ---- UI -------------------------------------------------------------------
  _buildPalette(){
    const pal = document.getElementById('palette');
    pal.innerHTML = '';
    this.tiles = BUILDINGS.map(b => {
      const t = document.createElement('div');
      t.className = 'ptile' + (b === this.selected ? ' sel' : '');
      t.innerHTML = `<span class="pi">${b.ico}</span><span class="pn">${b.name}</span><span class="pc">${b.cat}</span>`;
      t.onclick = () => {
        this.selected = b;
        this.tiles.forEach(x => x.classList.toggle('sel', x === t));
        document.getElementById('buildHint').textContent = `${b.ico} ${b.build}`;
      };
      pal.appendChild(t);
      return t;
    });
  }

  _wireButtons(){
    document.getElementById('clearColony').onclick = () => this.clearAll();
    document.getElementById('suggestSite').onclick = () => this.suggestSite();
  }

  _bindCanvas(){
    const c = this.ctx.renderer.domElement;
    let downX=0, downY=0, downT=0;
    c.addEventListener('pointerdown', e => { downX=e.clientX; downY=e.clientY; downT=performance.now(); });
    c.addEventListener('pointerup', e => {
      if (!this.active) return;
      const moved = Math.hypot(e.clientX-downX, e.clientY-downY);
      if (moved > 6 || performance.now()-downT > 500) return; // was a drag/orbit
      this._placeAt(e.clientX, e.clientY);
    });
  }

  // ---- lifecycle ------------------------------------------------------------
  enter(){
    this.active = true;
    this.group.visible = true;
    document.getElementById('buildHint').textContent = `${this.selected.ico} ${this.selected.build}`;
    this.ctx.controls.maxDistance = 60;
  }
  exit(){ this.active = false; }

  // ---- placement ------------------------------------------------------------
  _placeAt(clientX, clientY){
    const { camera, moon } = this.ctx;
    const ndc = new THREE.Vector2(
      (clientX/innerWidth)*2 - 1,
      -(clientY/innerHeight)*2 + 1
    );
    this.raycaster.setFromCamera(ndc, camera);
    const hit = this.raycaster.intersectObject(moon, false)[0];
    if (!hit) return;
    const local = moon.worldToLocal(hit.point.clone());
    this.addStructure(this.selected, local);
  }

  addStructure(def, localPos){
    const normal = localPos.clone().normalize();
    const model = makeStructure(def);
    model.position.copy(normal).multiplyScalar(this.ctx.MOON_R + 0.001);
    model.quaternion.setFromUnitVectors(UP, normal);
    // pop-in animation
    model.scale.setScalar(0.01);
    model.userData.targetScale = 1;
    this.group.add(model);

    // latitude for site-quality bonuses (lat from normal.y)
    const lat = Math.asin(THREE.MathUtils.clamp(normal.y, -1, 1)) * 180/Math.PI;
    this.structures.push({ def, model, lat });
    this.refreshStats(def, lat);
  }

  clearAll(){
    for (const s of this.structures) this.group.remove(s.model);
    this.structures.length = 0;
    this.refreshStats();
    document.getElementById('buildHint').textContent = 'Colony cleared. Place a structure to begin again.';
  }

  suggestSite(){
    // fly to the lunar south pole (Shackleton) — best real estate
    const target = new THREE.Vector3(0, -1, 0).multiplyScalar(this.ctx.MOON_R + 6);
    this.ctx.controls.target.set(0,0,0);
    this._flyTo = target;
    document.getElementById('buildHint').textContent =
      '✨ The south pole (Shackleton): water-ice in shadow + sunlit ridges for power. Build here first.';
  }

  // ---- stats ----------------------------------------------------------------
  refreshStats(lastDef, lastLat){
    let pop=0, powerGen=0, powerUse=0, water=0, food=0, science=0;
    let iceNearPole=false, hasSolarPolar=false;
    for (const s of this.structures){
      const d = s.def, polar = Math.abs(s.lat) > 70;
      pop += d.pop;
      if (d.power > 0) powerGen += d.power * (d.id==='solar' && polar ? 1.4 : 1);
      else powerUse += -d.power;
      let w = d.water;
      if (d.id==='ice') w = polar ? d.water : Math.round(d.water*0.15); // ice only pays at poles
      if (w > 0) water += w; else water += w;
      food += d.food;
      science += d.science;
      if (d.id==='ice' && polar) iceNearPole = true;
      if (d.id==='solar' && polar) hasSolarPolar = true;
    }
    const powerNet = powerGen - powerUse;
    const el = document.getElementById('colonyStats');
    const cell = (k,v,good) => `<div class="stat"><div class="sv" style="color:${good===undefined?'':good?'#5ad1a0':'#ff9d6e'}">${v}</div><div class="sk">${k}</div></div>`;
    el.innerHTML =
      cell('Residents', pop.toLocaleString()) +
      cell('Power', (powerNet>=0?'+':'')+powerNet, powerNet>=0) +
      cell('Water', (water>=0?'+':'')+water, water>=0) +
      cell('Food', (food>=0?'+':'')+food, food>=0) +
      cell('Science', science) +
      cell('Buildings', this.structures.length);

    // contextual hint after a placement
    if (lastDef){
      const polar = Math.abs(lastLat) > 70;
      let msg = `${lastDef.ico} ${lastDef.name} placed`;
      if (lastDef.id==='ice')   msg += polar ? ' — great spot, rich in water-ice! ❄️' : ' — far from the poles, little ice here. Try the south pole.';
      if (lastDef.id==='solar') msg += polar ? ' — polar ridge: +40% sunlight. ☀️' : '.';
      if (powerNet < 0) msg += ' ⚠️ Power deficit — add a solar farm or fusion plant.';
      document.getElementById('buildHint').textContent = msg;
    }
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt, frame){
    this.ctx.controls.update();
    if (this._flyTo){
      this.ctx.camera.position.lerp(this._flyTo, 0.06);
      if (this.ctx.camera.position.distanceTo(this._flyTo) < 0.3) this._flyTo = null;
    }
    for (const s of this.structures){
      const m = s.model;
      if (m.userData.targetScale && m.scale.x < 1){
        m.scale.lerp(new THREE.Vector3(1,1,1), 0.18);
        if (m.scale.x > 0.985){ m.scale.setScalar(1); m.userData.targetScale = 0; }
      }
      if (m.userData.spin) m.userData.spin.rotation.y += dt * m.userData.spinSpeed;
      if (m.userData.beacon){
        m.userData.beacon.material.opacity = 0.4 + 0.4*Math.sin(frame*0.08 + m.position.x);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Procedural structure models (small, oriented so +Y = up from surface)
// ---------------------------------------------------------------------------
function mat(color, opts={}){ return new THREE.MeshStandardMaterial({ color, roughness:0.55, metalness:0.3, ...opts }); }
function emat(color, i=1){ return new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:i, roughness:0.4 }); }

function makeStructure(def){
  const g = new THREE.Group();
  switch(def.id){
    case 'dome': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.32,0.06,20), mat(0x6b7488));
      base.position.y = 0.03; g.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3,24,16,0,Math.PI*2,0,Math.PI/2),
        new THREE.MeshStandardMaterial({ color:0x9fd0ff, transparent:true, opacity:0.55, roughness:0.1, metalness:0.1, emissive:0x335577, emissiveIntensity:0.4 }));
      dome.position.y = 0.06; g.add(dome);
      // little glowing windows ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29,0.012,8,24), emat(0xffe9a8,0.8));
      ring.rotation.x = Math.PI/2; ring.position.y = 0.09; g.add(ring);
      break;
    }
    case 'hotel': {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.5,0.16), mat(0xd8dde8, {metalness:0.6, roughness:0.3}));
      tower.position.y = 0.25; g.add(tower);
      for (let i=0;i<4;i++){
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.02,0.18), emat(0xffd28a,0.9));
        f.position.y = 0.12 + i*0.1; g.add(f);
      }
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.14,4), mat(0xffd28a,{emissive:0x553300,emissiveIntensity:0.5}));
      top.position.y = 0.56; g.add(top);
      break;
    }
    case 'solar': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.16,6), mat(0x888));
      pole.position.y=0.08; g.add(pole);
      const spin = new THREE.Group(); spin.position.y=0.16; g.add(spin);
      for (let i=-1;i<=1;i++){
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.01,0.18),
          new THREE.MeshStandardMaterial({color:0x2a4d8f,emissive:0x12325f,emissiveIntensity:0.5,metalness:0.7,roughness:0.3}));
        panel.position.set(i*0.0,0,0); panel.rotation.z=0.35; panel.position.x=i*0.4; spin.add(panel);
      }
      g.userData.spin = spin; g.userData.spinSpeed = 0.25;
      break;
    }
    case 'reactor': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18,18,14), mat(0xbcd0e6,{metalness:0.6,roughness:0.25}));
      dome.position.y=0.18; g.add(dome);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2,0.02,8,24), emat(0x9ad1ff,1.2));
      ring.rotation.x=Math.PI/2; ring.position.y=0.18; g.add(ring);
      g.userData.beacon = ring;
      break;
    }
    case 'ice': {
      const rig = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.12,0.34,6), mat(0x8fa6c0,{metalness:0.5}));
      rig.position.y=0.17; g.add(rig);
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.12,16,12),
        new THREE.MeshStandardMaterial({color:0xbfe9ff,transparent:true,opacity:0.8,emissive:0x6fb6e0,emissiveIntensity:0.4}));
      tank.position.set(0.16,0.12,0); g.add(tank);
      break;
    }
    case 'green': {
      const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.13,0.34,6,12),
        new THREE.MeshStandardMaterial({color:0x9fe8b8,transparent:true,opacity:0.6,emissive:0x2f7d4f,emissiveIntensity:0.6}));
      tube.rotation.z=Math.PI/2; tube.position.y=0.13; g.add(tube);
      break;
    }
    case 'lab': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.16,0.22), mat(0xc9bfe6,{metalness:0.4}));
      b.position.y=0.08; g.add(b);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.1,16,8,0,Math.PI*2,0,Math.PI/2.4),
        new THREE.MeshStandardMaterial({color:0xeee,side:THREE.DoubleSide,metalness:0.3}));
      dish.position.set(0.1,0.2,0); dish.rotation.x=-0.6; g.add(dish);
      break;
    }
    case 'pad': {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.04,24), mat(0x4a4a52));
      pad.position.y=0.02; g.add(pad);
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.12,0.2,24), emat(0xff9d6e,0.8));
      mark.rotation.x=-Math.PI/2; mark.position.y=0.045; g.add(mark);
      const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.3,12), mat(0xe6e9f0,{metalness:0.7}));
      rocket.position.y=0.2; g.add(rocket);
      g.userData.beacon = mark;
      break;
    }
  }
  return g;
}
