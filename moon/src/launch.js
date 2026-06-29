// ============================================================================
// Launch mode — Starship from Earth to the Moon, realistic timeline
// ============================================================================
import * as THREE from 'three';
import { PHASES, FACTS } from './data.js';
import { fmtDuration, fmtKm, lerp, clamp } from './util.js';

const UP = new THREE.Vector3(0,1,0);

// cumulative phase start times (seconds, mission-elapsed)
const STARTS = [];
{ let acc = 0; for (const ph of PHASES){ STARTS.push(acc); acc += ph.dur; } }
const TOTAL = STARTS[STARTS.length-1];

// representative real speeds (km/s) at the END of each phase, for telemetry
const SPEED_END = { liftoff:2.4, staging:2.4, ascent:7.8, park:7.8, tli:10.9,
                    coast:1.0, loi:1.6, descent:0.0, landed:0.0 };

export class Launch {
  constructor(ctx){
    this.ctx = ctx;
    this.t = 0;                // mission-elapsed seconds
    this.playing = false;
    this.scale = 100;          // time multiplier
    this.follow = true;
    this.done = false;

    this._buildGeometry();
    this._buildShip();
    this._buildUI();
  }

  // ---- world geometry & path ------------------------------------------------
  _buildGeometry(){
    const { EARTH_POS, EARTH_R, MOON_R } = this.ctx;
    const MOON = new THREE.Vector3(0,0,0);
    this.EARTH = EARTH_POS.clone(); this.MOON = MOON;
    this.EARTH_R = EARTH_R; this.MOON_R = MOON_R;

    // launch pad direction (earth-local), tilted toward the Moon (-Z) & up
    this.padDir = new THREE.Vector3(0.35, 0.55, -0.75).normalize();
    this.pad = this.EARTH.clone().addScaledVector(this.padDir, EARTH_R);

    // Earth parking-orbit basis
    this.Ro = EARTH_R * 1.16;
    const am = MOON.clone().sub(this.EARTH).normalize();         // earth->moon axis
    const n = new THREE.Vector3().crossVectors(this.padDir, am).normalize();
    this.e1 = this.padDir.clone();                               // radial at injection
    this.e2 = new THREE.Vector3().crossVectors(n, this.e1).normalize();
    this.orbitN = n;

    // park end / TLI departure
    this.parkArc = Math.PI * 1.4;                                // how far it sweeps before TLI
    this.P0 = this._earthOrbitPos(this.parkArc);

    // Moon arrival orbit (earth-facing side so it's visible)
    this.Rm = MOON_R * 1.6;
    this.arriveDir = new THREE.Vector3(0.25, 0.15, 1).normalize();
    this.Pm = MOON.clone().addScaledVector(this.arriveDir, this.Rm);

    // transfer (coast) curve — quadratic bezier with an arcing control point
    const mid = this.P0.clone().add(this.Pm).multiplyScalar(0.5);
    this.Cc = mid.clone().add(new THREE.Vector3(55, 70, 10));
    this.coastCurve = new THREE.QuadraticBezierCurve3(this.P0, this.Cc, this.Pm);

    // landing site (near-side, visible from the Earth approach)
    this.landDir = new THREE.Vector3(0.3, 0.12, 1).normalize();
    this.land = MOON.clone().addScaledVector(this.landDir, MOON_R + 0.02);

    // draw the trajectory
    const pts = this.coastCurve.getPoints(120);
    this.trajLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color:0x7fb4ff, transparent:true, opacity:0.5 })
    );
    this.trajLine.visible = false;
    this.ctx.scene.add(this.trajLine);
  }

  _earthOrbitPos(a){
    return this.EARTH.clone()
      .addScaledVector(this.e1, Math.cos(a)*this.Ro)
      .addScaledVector(this.e2, Math.sin(a)*this.Ro);
  }
  _moonOrbitPos(a){
    // orbit in plane spanned by arriveDir and a perpendicular
    const r = this.Rm;
    const f1 = this.arriveDir;
    const f2 = new THREE.Vector3().crossVectors(this.orbitN, f1).normalize();
    return this.MOON.clone()
      .addScaledVector(f1, Math.cos(a)*r)
      .addScaledVector(f2, Math.sin(a)*r);
  }

  // ---- Starship model -------------------------------------------------------
  _buildShip(){
    const steel = new THREE.MeshStandardMaterial({ color:0xd9dde6, metalness:0.85, roughness:0.32 });
    const dark  = new THREE.MeshStandardMaterial({ color:0x2a2d34, metalness:0.6, roughness:0.5 });

    this.ship = new THREE.Group();

    // --- Super Heavy booster ---
    this.booster = new THREE.Group();
    const bh = 2.6;
    const bbody = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,bh,28), steel);
    bbody.position.y = bh/2; this.booster.add(bbody);
    // engine skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.42,0.18,28), dark);
    skirt.position.y = 0.09; this.booster.add(skirt);
    // grid fins
    for (let i=0;i<4;i++){
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18,0.03), dark);
      const a = i*Math.PI/2;
      fin.position.set(Math.cos(a)*0.5, bh-0.25, Math.sin(a)*0.5);
      fin.lookAt(this.booster.position.clone().setY(bh-0.25));
      this.booster.add(fin);
    }
    this.ship.add(this.booster);

    // --- Starship upper stage ---
    this.upper = new THREE.Group();
    const uh = 1.7;
    const ubody = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.42,uh,28), steel);
    ubody.position.y = uh/2; this.upper.add(ubody);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.4,0.7,28), steel);
    nose.position.y = uh + 0.33; this.upper.add(nose);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8), steel);
    tip.position.y = uh + 0.68; this.upper.add(tip);
    // forward & aft flaps
    for (const [yy,sx] of [[uh-0.15,0.5],[0.35,0.6]]){
      for (const side of [-1,1]){
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.26), dark);
        flap.position.set(side*0.42, yy, 0); this.upper.add(flap);
      }
    }
    this.upper.position.y = bh + 0.05;
    this.ship.add(this.upper);

    // --- engine plume (lives at the active stage base) ---
    this.plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 1.5, 20, 1, true),
      new THREE.MeshBasicMaterial({ color:0xfff0c0, transparent:true, opacity:0.0, side:THREE.DoubleSide })
    );
    this.plume.position.y = -0.7; this.plume.rotation.x = Math.PI; // point down (-Y)
    this.plumeCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.9, 16, 1, true),
      new THREE.MeshBasicMaterial({ color:0x9fd4ff, transparent:true, opacity:0.0, side:THREE.DoubleSide })
    );
    this.plumeCore.position.y = -0.45; this.plumeCore.rotation.x = Math.PI;
    this.plumeHolder = new THREE.Group();
    this.plumeHolder.add(this.plume); this.plumeHolder.add(this.plumeCore);
    this.ship.add(this.plumeHolder);

    // detached booster (after staging)
    this.freeBooster = null;

    this.ship.scale.setScalar(1.0);
    this.ctx.scene.add(this.ship);
    this.ship.visible = false;
  }

  // ---- UI -------------------------------------------------------------------
  _buildUI(){
    // speed buttons
    const speeds = [1,10,100,1000,10000,100000];
    const wrap = document.getElementById('speeds'); wrap.innerHTML='';
    this.speedBtns = speeds.map(s => {
      const b = document.createElement('button');
      b.textContent = s >= 1000 ? (s/1000)+'k' : s;
      b.classList.toggle('on', s === this.scale);
      b.onclick = () => { this.scale = s; this.speedBtns.forEach(x=>x.classList.toggle('on', x===b)); };
      wrap.appendChild(b); return b;
    });
    document.getElementById('launchBtn').onclick = () => this._togglePlay();
    document.getElementById('resetBtn').onclick = () => this.reset();
    document.getElementById('followShip').onchange = e => { this.follow = e.target.checked; };

    // phase list
    const pl = document.getElementById('phaseList'); pl.innerHTML='';
    this.phaseEls = PHASES.map((ph,i) => {
      const el = document.createElement('div'); el.className='phaseItem';
      el.innerHTML = `<span class="dot"></span><span class="pn">${ph.ico} ${ph.name}</span><span class="pt">T+${fmtDuration(STARTS[i])}</span>`;
      pl.appendChild(el); return el;
    });
  }

  _togglePlay(){
    if (this.done) this.reset();
    this.playing = !this.playing;
    document.getElementById('launchBtn').textContent = this.playing ? '❚❚ Pause' : '▶ Launch';
  }

  // ---- lifecycle ------------------------------------------------------------
  enter(){
    const { controls, camera, earthGroup } = this.ctx;
    earthGroup.visible = true;
    this.ship.visible = true;
    this.trajLine.visible = true;
    controls.enabled = true;
    controls.minDistance = 6;
    controls.maxDistance = 700;
    controls.target.copy(this.pad);
    // frame the pad
    camera.position.copy(this.pad).add(new THREE.Vector3(20, 12, 18));
    this._applyState();
  }
  exit(){
    this.ctx.earthGroup.visible = false;
    this.ship.visible = false;
    this.trajLine.visible = false;
    if (this.freeBooster){ this.ctx.scene.remove(this.freeBooster); this.freeBooster=null; }
  }
  reset(){
    this.t = 0; this.playing = false; this.done = false;
    document.getElementById('launchBtn').textContent = '▶ Launch';
    if (this.freeBooster){ this.ctx.scene.remove(this.freeBooster); this.freeBooster=null; }
    this.booster.visible = true;
    this.upper.position.y = this._boosterH() + 0.05;
    this._applyState();
    const { camera, controls } = this.ctx;
    controls.target.copy(this.pad);
    camera.position.copy(this.pad).add(new THREE.Vector3(20, 12, 18));
  }
  _boosterH(){ return 2.6; }

  // ---- phase lookup ---------------------------------------------------------
  _phaseAt(t){
    let i = 0;
    for (; i < PHASES.length-1; i++){ if (t < STARTS[i+1]) break; }
    const start = STARTS[i];
    const dur = PHASES[i].dur || 1;
    const f = clamp((t - start) / dur, 0, 1);
    return { i, id: PHASES[i].id, f };
  }

  // ---- position along the mission ------------------------------------------
  posAt(t){
    const { i, id, f } = this._phaseAt(t);
    const M = this.MOON, E = this.EARTH;
    switch(id){
      case 'liftoff': {
        // rise from pad, gentle pitch into start of climb
        const alt = this.EARTH_R * (0.02 + 0.5*f*f);
        return this.pad.clone().addScaledVector(this.padDir, alt - this.EARTH_R*0.0);
      }
      case 'staging': {
        const alt = this.EARTH_R * (0.52 + 0.18*f);
        return E.clone().addScaledVector(this.padDir, alt + this.EARTH_R*1.0);
      }
      case 'ascent': {
        // arc from above-pad up to the parking orbit at angle 0
        const from = E.clone().addScaledVector(this.padDir, this.EARTH_R*1.7);
        const to = this._earthOrbitPos(0);
        const p = from.clone().lerp(to, f);
        // bend outward
        return p;
      }
      case 'park': {
        const a = lerp(0, this.parkArc, f);
        return this._earthOrbitPos(a);
      }
      case 'tli': {
        // ease from orbit point onto the start of the coast curve
        const p = this._earthOrbitPos(this.parkArc);
        return p.clone().lerp(this.coastCurve.getPoint(0.02), f);
      }
      case 'coast': {
        return this.coastCurve.getPoint(f);
      }
      case 'loi': {
        // from arrival point, sweep a half orbit to line up for descent
        const a = lerp(0, Math.PI, f);
        return this._moonOrbitPos(a);
      }
      case 'descent': {
        const from = this._moonOrbitPos(Math.PI);
        return from.clone().lerp(this.land, f*f);
      }
      case 'landed':
      default:
        return this.land.clone();
    }
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt, frame){
    if (this.playing && !this.done){
      this.t += dt * this.scale;
      if (this.t >= TOTAL){ this.t = TOTAL; this.done = true; this.playing = false;
        document.getElementById('launchBtn').textContent = '▶ Replay'; }
    }
    this._applyState(frame);

    // free-falling booster drift
    if (this.freeBooster){
      this.freeBooster.position.addScaledVector(this.freeBooster.userData.vel, dt*this.scale*0.02);
      this.freeBooster.rotation.x += dt*0.5; this.freeBooster.rotation.z += dt*0.3;
    }
    // gentle Earth spin
    if (this.ctx.earthGroup.userData.earth) this.ctx.earthGroup.userData.earth.rotation.y += dt*0.01;

    this.ctx.controls.update();
  }

  _applyState(frame=0){
    const { camera, controls } = this.ctx;
    const ph = this._phaseAt(this.t);
    const pos = this.posAt(this.t);
    // heading: look slightly ahead on the timeline
    const ahead = this.posAt(Math.min(TOTAL, this.t + 2));
    let dir = ahead.clone().sub(pos);
    if (dir.lengthSq() < 1e-6) dir.copy(this.padDir);
    dir.normalize();

    this.ship.position.copy(pos);

    // orientation
    if (ph.id === 'descent' || ph.id === 'landed'){
      const nrm = pos.clone().sub(this.MOON).normalize();   // stand upright on surface
      this.ship.quaternion.setFromUnitVectors(UP, nrm);
    } else {
      this.ship.quaternion.setFromUnitVectors(UP, dir);
    }

    // staging visuals
    const staged = this.t >= STARTS[2]; // after 'staging' begins -> ascent uses upper only
    if (staged && this.booster.visible){
      this.booster.visible = false;
      this.upper.position.y = 0;        // upper stage flies on its own
      // spawn a tumbling free booster
      this._spawnFreeBooster(pos, dir);
    } else if (!staged && !this.booster.visible){
      this.booster.visible = true;
      this.upper.position.y = this._boosterH() + 0.05;
    }

    // plume on during powered phases
    const powered = { liftoff:1, staging:0.7, ascent:1, tli:0.9, loi:0.7, descent:0.85 };
    const pw = powered[ph.id] || 0;
    const flick = 0.85 + 0.15*Math.sin(frame*0.6);
    this.plume.material.opacity = pw * 0.7 * flick;
    this.plumeCore.material.opacity = pw * 0.9 * flick;
    const plen = 0.6 + pw*0.9;
    this.plume.scale.set(1, plen, 1);
    // place plume at the base of the active stage
    this.plumeHolder.position.y = staged ? 0 : 0;
    this.plumeHolder.visible = pw > 0;

    // ship scale: a touch larger when far away so it stays visible
    const camD = camera.position.distanceTo(pos);
    this.ship.scale.setScalar(clamp(camD/60, 1, 6));

    // camera follow
    if (this.follow){
      const back = clamp(camD, 8, 80);
      const desired = pos.clone()
        .addScaledVector(dir, -back*0.25)
        .add(new THREE.Vector3(0, back*0.18, 0))
        .addScaledVector(this._sideVec(dir), back*0.32);
      camera.position.lerp(desired, 0.04);
      controls.target.lerp(pos, 0.1);
    }

    this._updateUI(ph);
  }

  _sideVec(dir){
    return new THREE.Vector3().crossVectors(dir, UP).normalize();
  }

  _spawnFreeBooster(pos, dir){
    if (this.freeBooster) return;
    const steel = new THREE.MeshStandardMaterial({ color:0xb9bdc6, metalness:0.8, roughness:0.4 });
    const fb = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,2.6,20), steel);
    fb.position.copy(pos).addScaledVector(dir, -1.8);
    fb.userData.vel = dir.clone().multiplyScalar(-1).add(new THREE.Vector3(0.2,-0.3,0));
    this.freeBooster = fb;
    this.ctx.scene.add(fb);
  }

  // ---- telemetry & phase list ----------------------------------------------
  _updateUI(ph){
    const phaseEl = document.getElementById('missionPhase');
    phaseEl.textContent = `${PHASES[ph.i].ico} ${PHASES[ph.i].name} — ${PHASES[ph.i].blurb}`;

    // speed: lerp from previous phase end to this phase end
    const prevSpeed = ph.i>0 ? SPEED_END[PHASES[ph.i-1].id] : 0;
    const speed = lerp(prevSpeed, SPEED_END[ph.id], ph.f);

    // distances (mapped to real km)
    const distMoon = this._realDistToMoon(ph);
    const distEarth = FACTS.moonDistKm - distMoon;

    const tele = document.getElementById('telemetry');
    tele.innerHTML =
      this._cell('Mission time', 'T+ ' + fmtDuration(this.t)) +
      this._cell('Speed', speed.toFixed(2) + ' km/s') +
      this._cell('To the Moon', fmtKm(distMoon)) +
      this._cell('From Earth', fmtKm(distEarth));

    // phase list states
    this.phaseEls.forEach((el,i) => {
      el.classList.toggle('done', i < ph.i);
      el.classList.toggle('active', i === ph.i);
    });
  }
  _cell(k,v){ return `<div class="tcell"><div class="tv">${v}</div><div class="tk">${k}</div></div>`; }

  _realDistToMoon(ph){
    // before TLI you're essentially at Earth (full distance); during coast it closes
    const D = FACTS.moonDistKm;
    switch(ph.id){
      case 'liftoff': case 'staging': case 'ascent': case 'park': return D;
      case 'tli': return D * (1 - 0.001*ph.f);
      case 'coast': return D * (1 - ph.f);
      case 'loi': return D * 0.002 * (1-ph.f) + 1800*(1-ph.f);
      case 'descent': return 1800 * (1-ph.f);
      case 'landed': default: return 0;
    }
  }
}
