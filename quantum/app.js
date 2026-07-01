import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =====================================================================
   The Quantum Computer · 42-apps
   app.js — the 3D "dive", the charts, and every section.
   ===================================================================== */
const D  = window.QDATA || {};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp  = (a, b, t) => a + (b - a) * t;

const CAT = { theory:'#9aa6cf', algorithm:'#b46bff', hardware:'#36e6ff',
  'error-correction':'#51e6a0', company:'#ffc24d', milestone:'#ff5fcf', threat:'#ff5d6c' };
const CAT_LABEL = { theory:'Theory', algorithm:'Algorithms', hardware:'Hardware',
  'error-correction':'Error correction', company:'Industry', milestone:'Milestones', threat:'Q-Day threat' };

let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.add('hidden'),2200); }

/* =====================================================================
   1 · THE LAB — a staged dive across ~9 orders of magnitude
   ===================================================================== */
const Lab = (() => {
  const host = $('#scene');
  let renderer, scene, camera, controls, clock, raf, running = true;
  let levels = [], dive = 0, diveTarget = 0, tween = null, autoDive = false, autoDir = 1;
  let dominant = 0;
  const labelHost = $('#labels');
  let labelPool = [];

  // shared glow sprite texture
  const GLOW = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,255,255,.55)');
    g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  })();
  function glow(color, size){
    const m = new THREE.SpriteMaterial({ map:GLOW, color, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
    const s = new THREE.Sprite(m); s.scale.set(size,size,1); return s;
  }
  const std = (o) => new THREE.MeshStandardMaterial(o);

  /* ---- level builders ---- */
  function buildFridge(){
    const g = new THREE.Group();
    const gold = std({color:0xe8a93a, metalness:.95, roughness:.3});
    const copp = std({color:0xc9772f, metalness:.9, roughness:.45});
    const plates = [{r:2.4,y:3.2},{r:2.05,y:2.1},{r:1.7,y:1.0},{r:1.35,y:-0.1},{r:1.0,y:-1.2},{r:0.68,y:-2.3}];
    plates.forEach((p,i)=>{ const d=new THREE.Mesh(new THREE.CylinderGeometry(p.r,p.r,0.07,72), i%2?copp:gold); d.position.y=p.y; g.add(d); });
    for(let k=0;k<8;k++){ const a=k/8*Math.PI*2;
      for(let i=0;i<plates.length-1;i++){ const p0=plates[i],p1=plates[i+1]; const rr=Math.min(p0.r,p1.r)*0.82;
        const h=p0.y-p1.y; const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,h,8),gold);
        rod.position.set(Math.cos(a)*rr,(p0.y+p1.y)/2,Math.sin(a)*rr); g.add(rod); } }
    const coax = std({color:0xdd913c, metalness:.7, roughness:.5});
    for(let k=0;k<26;k++){ const a=k/26*Math.PI*2+0.1; const pts=[];
      plates.forEach((p,i)=> pts.push(new THREE.Vector3(Math.cos(a+i*0.1)*p.r*0.62, p.y, Math.sin(a+i*0.1)*p.r*0.62)));
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),44,0.011,6,false),coax); g.add(tube); }
    const chip=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.06,0.5), std({color:0x0a1830,emissive:0x129ad0,emissiveIntensity:.5,metalness:.5,roughness:.4}));
    chip.position.y=-2.55; g.add(chip);
    const cg=glow(0x36e6ff,2.4); cg.position.y=-2.5; g.add(cg);
    g.userData.labels=[{pos:new THREE.Vector3(0,-2.5,0),text:'quantum chip (15 mK)'},{pos:new THREE.Vector3(2.4,3.2,0),text:'300 K — room temp'}];
    g.userData.update=(t)=>{ cg.material.opacity=(0.6+0.28*Math.sin(t*2))*g.userData.diveOp; };
    return g;
  }
  function chipTex(){ const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d');
    x.fillStyle='#06121f'; x.fillRect(0,0,256,256); x.strokeStyle='#1f7fa8'; x.lineWidth=2;
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){ const px=18+i*30, py=18+j*30; x.beginPath();
      x.moveTo(px-7,py); x.lineTo(px+7,py); x.moveTo(px,py-7); x.lineTo(px,py+7); x.stroke();
      x.fillStyle='#36e6ff'; x.fillRect(px-1.5,py-1.5,3,3); }
    return new THREE.CanvasTexture(c); }
  function buildPackage(){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(3.6,0.3,3.6), std({color:0xb5732e,metalness:.9,roughness:.4})));
    const tex=chipTex();
    const die=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.12,2.3), std({color:0x0b1c33,metalness:.4,roughness:.5,map:tex,emissive:0x0c2a44,emissiveMap:tex,emissiveIntensity:1}));
    die.position.y=0.21; g.add(die);
    const wire=std({color:0xe8a93a,metalness:.9,roughness:.3});
    for(let s=0;s<4;s++)for(let k=0;k<7;k++){ const t=(k-3)/3*1.05; const pts=[]; const inner=new THREE.Vector3(),outer=new THREE.Vector3();
      if(s<2){ const sx=s?1:-1; inner.set(sx*1.15,0.27,t); outer.set(sx*1.75,0.18,t);} else { const sz=s-2?1:-1; inner.set(t,0.27,sz*1.15); outer.set(t,0.18,sz*1.75);}
      const mid=inner.clone().lerp(outer,0.5); mid.y+=0.18;
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([inner,mid,outer]),12,0.012,5,false),wire); g.add(tube); }
    g.userData.labels=[{pos:new THREE.Vector3(0,0.32,0),text:'silicon die'},{pos:new THREE.Vector3(1.6,0.2,0),text:'gold bond wires'},{pos:new THREE.Vector3(0,0.18,1.7),text:'copper package'}];
    g.userData.update=()=>{};
    return g;
  }
  function buildLattice(){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(5.2,0.1,5.2), std({color:0x07142a,metalness:.3,roughness:.6})));
    const sup=std({color:0x9fdcff,metalness:.8,roughness:.25,emissive:0x10455f,emissiveIntensity:.5});
    const N=6, step=0.78, off=(N-1)*step/2; const dots=[];
    const couplers=[];
    const cmat=std({color:0x2f6f9c,metalness:.6,roughness:.4,emissive:0x123047,emissiveIntensity:.4});
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){ const x=i*step-off,z=j*step-off;
      const a1=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.05,0.12),sup); a1.position.set(x,0.08,z);
      const a2=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.05,0.46),sup); a2.position.set(x,0.08,z); g.add(a1,a2);
      const d=new THREE.Mesh(new THREE.SphereGeometry(0.06,12,12), std({color:0xffc24d,emissive:0xffc24d,emissiveIntensity:.8})); d.position.set(x,0.12,z); g.add(d); dots.push(d);
      if(i<N-1){ const c=new THREE.Mesh(new THREE.BoxGeometry(step-0.46,0.03,0.05),cmat); c.position.set(x+step/2,0.07,z); g.add(c); }
      if(j<N-1){ const c=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,step-0.46),cmat); c.position.set(x,0.07,z+step/2); g.add(c); }
    }
    g.userData.labels=[{pos:new THREE.Vector3(0,0.5,0),text:'~36 qubits + couplers'},{pos:new THREE.Vector3(off,0.2,off),text:'one cell →'}];
    g.userData.update=(t)=>{ dots.forEach((d,i)=>{ d.material.emissiveIntensity=0.4+0.5*Math.sin(t*3+i*0.7); }); };
    return g;
  }
  function buildTransmon(){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(5.4,0.1,4), std({color:0x07142a,metalness:.3,roughness:.6})));
    const sup=std({color:0x9fdcff,metalness:.85,roughness:.2,emissive:0x10455f,emissiveIntensity:.45});
    const padL=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.09,1.7),sup); padL.position.set(-1.05,0.09,0);
    const padR=padL.clone(); padR.position.x=1.05; g.add(padL,padR);
    const jj=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.07,0.14), std({color:0xffd36b,emissive:0xffc24d,emissiveIntensity:1.2})); jj.position.set(0,0.1,0); g.add(jj);
    const jg=glow(0xffc24d,1.1); jg.position.set(0,0.25,0); g.add(jg);
    // readout resonator meander
    const rm=std({color:0x36e6ff,metalness:.6,roughness:.3,emissive:0x0e4a5e,emissiveIntensity:.6});
    const rp=[]; for(let k=0;k<10;k++){ rp.push(new THREE.Vector3(-1.6+k*0.36, 0.07, 1.45+(k%2?0.22:-0.22))); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp),60,0.03,6,false),rm));
    // charge/drive line
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,1.0), std({color:0xb46bff,emissive:0x3a1f5e,emissiveIntensity:.6})).translateY(0.07).translateZ(-1.4));
    g.userData.labels=[{pos:new THREE.Vector3(-1.05,0.18,0),text:'superconducting pad (capacitor)'},{pos:new THREE.Vector3(0,0.42,0),text:'Josephson junction'},{pos:new THREE.Vector3(1.2,0.07,1.45),text:'readout resonator'}];
    g.userData.update=(t)=>{ jg.material.opacity=(0.55+0.4*Math.sin(t*4))*g.userData.diveOp; };
    return g;
  }
  function buildJunction(){
    const g=new THREE.Group();
    const sphG=new THREE.SphereGeometry(0.13,14,14);
    const al=std({color:0x8fb6ff,metalness:.3,roughness:.4,emissive:0x16284a,emissiveIntensity:.45});
    const ox=std({color:0xff8a5c,metalness:.1,roughness:.7,emissive:0x3a1208,emissiveIntensity:.5});
    const place=(x0,x1,mat)=>{ for(let xi=0;xi<((x1-x0)/0.34|0);xi++)for(let yi=-2;yi<=2;yi++)for(let zi=-2;zi<=2;zi++){
      const m=new THREE.Mesh(sphG,mat); m.position.set(x0+xi*0.34+(yi%2)*0.05, yi*0.34, zi*0.34); g.add(m); } };
    place(-2.7,-0.45,al); place(0.45,2.7,al);
    for(let yi=-2;yi<=2;yi++)for(let zi=-2;zi<=2;zi++){ const m=new THREE.Mesh(sphG,ox); m.position.set(-0.1+0.2*(zi%2),yi*0.34,zi*0.34); m.scale.setScalar(0.8); g.add(m); }
    const pairs=[]; const pm=()=>std({color:0x36e6ff,emissive:0x36e6ff,emissiveIntensity:1.4});
    for(let k=0;k<6;k++){ const grp=new THREE.Group();
      const s1=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,10),pm()); s1.position.y=0.08;
      const s2=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,10),pm()); s2.position.y=-0.08;
      grp.add(s1,s2, glow(0x36e6ff,0.7)); g.add(grp); pairs.push({grp,ph:k/6}); }
    g.userData.labels=[{pos:new THREE.Vector3(-2.0,1.0,0),text:'aluminium (superconductor)'},{pos:new THREE.Vector3(0,1.25,0),text:'AlOₓ barrier ~1–2 nm'},{pos:new THREE.Vector3(2.0,-1.1,0),text:'Cooper pairs tunnel through →'}];
    g.userData.update=(t)=>{ pairs.forEach(p=>{ const u=(t*0.22+p.ph)%1; p.grp.position.set(-2.4+u*4.8, 0.6*Math.sin(u*Math.PI), 0.2*Math.sin(u*7)); }); };
    return g;
  }
  function buildBloch(){
    const g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2,40,28), new THREE.MeshBasicMaterial({color:0x244, transparent:true, opacity:.10, depthWrite:false})));
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(2,20,12)), new THREE.LineBasicMaterial({color:0x2a3566, transparent:true, opacity:.5})));
    const ring=(rot)=>{ const pts=[]; for(let i=0;i<=64;i++){const a=i/64*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*2,0,Math.sin(a)*2));}
      const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0x36e6ff,transparent:true,opacity:.4})); if(rot)l.rotation.x=Math.PI/2; return l; };
    g.add(ring(false));
    const axMat=new THREE.LineBasicMaterial({color:0x3a4680});
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-2.4,0),new THREE.Vector3(0,2.4,0)]),axMat));
    const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,0),2,0x36e6ff,0.45,0.26);
    g.add(arrow);
    const tip=glow(0x36e6ff,0.9); g.add(tip);
    g.userData.arrow=arrow; g.userData.tip=tip;
    g.userData.state=new THREE.Vector3(0,1,0); g.userData.target=new THREE.Vector3(0,1,0);
    g.userData.labels=[{pos:new THREE.Vector3(0,2.35,0),text:'|0⟩'},{pos:new THREE.Vector3(0,-2.35,0),text:'|1⟩'},{pos:new THREE.Vector3(2.35,0,0),text:'|+⟩ superposition'}];
    g.userData.update=(t,dt)=>{ const s=g.userData.state; s.lerp(g.userData.target, clamp(dt*7,0,1)).normalize();
      arrow.setDirection(s); tip.position.copy(s).multiplyScalar(2); tip.material.opacity=g.userData.diveOp;
      updateBlochReadout(); };
    return g;
  }

  const META = [
    { build:buildFridge,   scale:'~1 metre',  tag:'LEVEL 0 · 10⁰ m', title:'The dilution refrigerator',
      body:'The famous gold "chandelier" isn\'t the computer — it\'s the fridge. Each plate is colder than the one above, cooling the chip at the very bottom to ~15 millikelvin, colder than deep space.' },
    { build:buildPackage,  scale:'~1 cm',     tag:'LEVEL 1 · 10⁻² m', title:'The chip & its package',
      body:'At the cold tip sits the actual quantum processor: a small silicon die wired into a copper package by fine gold bond wires. This whole computer is smaller than a coin.' },
    { build:buildLattice,  scale:'~100 µm',   tag:'LEVEL 2 · 10⁻⁴ m', title:'The qubit lattice',
      body:'Zoom into the die and a grid appears: dozens of qubits (the crosses) linked by couplers that let neighbours talk. Each gold dot marks a Josephson junction — the heart of a qubit.' },
    { build:buildTransmon, scale:'~10 µm',    tag:'LEVEL 3 · 10⁻⁵ m', title:'One qubit (a transmon)',
      body:'A single qubit: two superconducting pads form a capacitor, bridged by a tiny Josephson junction. A nearby resonator reads its state; a drive line pokes it with microwaves.' },
    { build:buildJunction, scale:'~1 nm',     tag:'LEVEL 4 · 10⁻⁹ m', title:'The Josephson junction',
      body:'The magic spot: two aluminium superconductors separated by an oxide barrier only a nanometre or two thick. Pairs of electrons ("Cooper pairs") quantum-tunnel across it.' },
    { build:buildBloch,    scale:'the qubit', tag:'LEVEL 5 · the state', title:'What the qubit is "thinking"',
      body:'Forget the metal — this is the information. The arrow is the qubit\'s state on the Bloch sphere: |0⟩ at top, |1⟩ at bottom, anything in between is a superposition. Try a gate.',
      bloch:true }
  ];

  function setOpacity(g, o){
    g.traverse(n=>{ const mats = n.material ? (Array.isArray(n.material)?n.material:[n.material]) : [];
      mats.forEach(m=>{ if(m.userData.baseOp===undefined) m.userData.baseOp = (m.opacity!==undefined?m.opacity:1);
        m.transparent = true; m.opacity = m.userData.baseOp * o; }); });
    g.userData.diveOp = o;
  }

  function applyDive(p){
    dive = p; const n = META.length;
    const pos = p*(n-1); let i0 = Math.min(Math.floor(pos+1e-6), n-1); let frac = pos - i0;
    if(i0 >= n-1){ i0 = n-1; frac = 0; }
    const dom = (frac < 0.5 ? i0 : Math.min(i0+1, n-1));
    for(let k=0;k<n;k++){ const L=levels[k];
      if(k===i0){ L.visible=true; L.scale.setScalar(1+frac*1.4); setOpacity(L, 1-frac*0.95); }
      else if(k===i0+1){ L.visible=true; L.scale.setScalar(0.5+frac*0.5); setOpacity(L, Math.max(0,frac*1.1-0.1)); }
      else L.visible=false;
    }
    if(dom!==dominant){ dominant=dom; refreshLevelUI(dom); buildLabels(dom); }
    // scale readout
    $('#diveScale').textContent = META[Math.round(pos)] ? META[Math.round(pos)].scale : META[dom].scale;
    $$('.rail-stop').forEach(b=> b.classList.toggle('on', +b.dataset.level===dom));
    const slider=$('#diveSlider'); if(+slider.value!==Math.round(p*1000)) slider.value=Math.round(p*1000);
  }
  function refreshLevelUI(k){ const m=META[k];
    $('#labTag').textContent=m.tag; $('#labTitle').textContent=m.title; $('#labBody').textContent=m.body;
    const ex=$('#labExtra'); ex.innerHTML='';
    if(m.bloch){ ex.appendChild(blochUI()); updateBlochReadout(); }
  }

  /* ---- floating HTML labels ---- */
  function buildLabels(k){ labelHost.innerHTML=''; labelPool=[];
    (levels[k].userData.labels||[]).forEach(l=>{ const d=document.createElement('div'); d.className='lab-label';
      d.innerHTML='<span class="dot"></span>'+l.text; labelHost.appendChild(d); labelPool.push({el:d,pos:l.pos}); }); }
  function projectLabels(){ const wh=host.clientWidth, ht=host.clientHeight; const L=levels[dominant];
    labelPool.forEach(p=>{ const v=p.pos.clone(); L.localToWorld(v); v.project(camera);
      const vis = v.z<1 && L.userData.diveOp>0.4;
      p.el.classList.toggle('show', vis);
      p.el.style.left=((v.x*.5+.5)*wh)+'px'; p.el.style.top=((-v.y*.5+.5)*ht)+'px'; }); }

  /* ---- Bloch interaction ---- */
  function rot(axis,ang){ const L=levels[5]; const q=new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(),ang);
    L.userData.target.copy(L.userData.target).applyQuaternion(q).normalize(); }
  function blochUI(){ const w=document.createElement('div');
    const stat=document.createElement('div'); stat.className='qstat'; stat.id='blochReadout';
    const bar=document.createElement('div'); bar.className='gatebar';
    const mk=(t,fn,cls)=>{ const b=document.createElement('button'); b.className='gatebtn'+(cls?' '+cls:''); b.textContent=t; b.onclick=fn; return b; };
    bar.append(
      mk('H',()=>rot(new THREE.Vector3(1,1,0),Math.PI)),
      mk('X',()=>rot(new THREE.Vector3(1,0,0),Math.PI)),
      mk('Y',()=>rot(new THREE.Vector3(0,0,1),Math.PI)),
      mk('Z',()=>rot(new THREE.Vector3(0,1,0),Math.PI)),
      mk('｜+⟩',()=>{ levels[5].userData.target.set(1,0,0); }),
      mk('Measure ⟂',()=>measure(),'measure')
    );
    w.append(stat,bar); return w;
  }
  function measure(){ const L=levels[5]; const p0=(1+L.userData.state.y)/2; const r=Math.random();
    const up = r<p0; L.userData.target.set(0, up?1:-1, 0);
    toast(up?'Collapsed to |0⟩':'Collapsed to |1⟩'); }
  function updateBlochReadout(){ const r=$('#blochReadout'); if(!r) return; const L=levels[5]; if(!L) return;
    const p0=(1+L.userData.state.y)/2; const p1=1-p0;
    r.innerHTML=`<div>P(|0⟩)<b>${(p0*100).toFixed(0)}%</b></div><div>P(|1⟩)<b>${(p1*100).toFixed(0)}%</b></div>`; }

  /* ---- dive controls ---- */
  function tweenTo(target, dur=1100){ const start=dive, t0=performance.now(); tween={start,target,t0,dur}; }
  function stepTween(now){ if(!tween) return; let u=(now-tween.t0)/tween.dur; if(u>=1){u=1;tween=null;}
    const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2; applyDive(lerp(tween.start,tween.target,e)); }

  /* ---- loop ---- */
  function resize(){ const w=host.clientWidth,h=host.clientHeight; renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix(); }
  function frame(){ raf=requestAnimationFrame(frame); const dt=Math.min(clock.getDelta(),0.05); const t=clock.elapsedTime;
    stepTween(performance.now());
    if(autoDive && !tween){ let nd=dive+autoDir*dt*0.06; if(nd>=1){nd=1;autoDir=-1;} if(nd<=0){nd=0;autoDir=1;} applyDive(nd); }
    for(let k=0;k<levels.length;k++) if(levels[k].visible && levels[k].userData.update) levels[k].userData.update(t,dt);
    controls.update(); if(running){ renderer.render(scene,camera); projectLabels(); }
  }

  function init(){
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(host.clientWidth,host.clientHeight,false);
    host.appendChild(renderer.domElement);
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(48, host.clientWidth/host.clientHeight, 0.01, 100); camera.position.set(3.4,1.8,7.5);
    controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.08;
    controls.enablePan=false; controls.minDistance=4; controls.maxDistance=12; controls.autoRotate=true; controls.autoRotateSpeed=0.7;
    scene.add(new THREE.AmbientLight(0x8899cc,0.5));
    const p1=new THREE.PointLight(0x36e6ff,120,40); p1.position.set(6,6,6); scene.add(p1);
    const p2=new THREE.PointLight(0xff9a4d,80,40); p2.position.set(-6,-3,4); scene.add(p2);
    const p3=new THREE.PointLight(0xb46bff,70,40); p3.position.set(0,8,-6); scene.add(p3);
    scene.add(new THREE.HemisphereLight(0x99bbff,0x0a0a1a,0.4));
    levels=META.map(m=>{ const g=m.build(); g.visible=false; setOpacity(g,1); scene.add(g); return g; });
    clock=new THREE.Clock(); applyDive(0); refreshLevelUI(0); buildLabels(0);
    addEventListener('resize',resize);
    // pause render when Lab scrolled out of view
    new IntersectionObserver(es=>{ running=es[0].isIntersecting; }, {threshold:0.02}).observe($('#lab'));
    frame();
  }

  return {
    init,
    setDive:(v)=>{ autoDive=false; $('#diveAuto').classList.remove('on'); tweenTo(clamp(v,0,1)); },
    setDiveRaw:(v)=>{ autoDive=false; $('#diveAuto').classList.remove('on'); tween=null; applyDive(clamp(v,0,1)); },
    toggleAuto:()=>{ autoDive=!autoDive; tween=null; $('#diveAuto').classList.toggle('on',autoDive); if(autoDive&&dive>=1)autoDir=-1; },
    toggleSpin:()=>{ controls.autoRotate=!controls.autoRotate; $('#diveSpin').classList.toggle('on',controls.autoRotate); },
    reset:()=>{ tweenTo(0); controls.autoRotate=true; $('#diveSpin').classList.add('on'); }
  };
})();

/* =====================================================================
   2 · CHART HELPERS (hand-built SVG)
   ===================================================================== */
const SVG='http://www.w3.org/2000/svg';
function E(tag,attrs={},kids=[]){ const e=document.createElementNS(SVG,tag);
  for(const k in attrs) e.setAttribute(k,attrs[k]); (Array.isArray(kids)?kids:[kids]).forEach(c=>c&&e.appendChild(c)); return e; }
const tip=(()=>{ const d=document.createElement('div'); d.className='chart-tip'; document.body.appendChild(d); return d; })();
function showTip(html,x,y){ tip.innerHTML=html; tip.style.opacity=1;
  tip.style.left=Math.min(x+14,innerWidth-tip.offsetWidth-10)+'px'; tip.style.top=(y+14)+'px'; }
function hideTip(){ tip.style.opacity=0; }

function lineChart(host, o){
  const W=720, H=o.height||360, m={l:o.ml||56,r:18,t:18,b:34};
  const pw=W-m.l-m.r, ph=H-m.t-m.b;
  const xs=v=>m.l+(v-o.xMin)/(o.xMax-o.xMin)*pw;
  const L=Math.log10; const ys=v=> o.logY
    ? m.t+(1-(L(Math.max(v,o.yMin))-L(o.yMin))/(L(o.yMax)-L(o.yMin)))*ph
    : m.t+(1-(v-o.yMin)/(o.yMax-o.yMin))*ph;
  const svg=E('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'xMidYMid meet'});
  // zones
  (o.zones||[]).forEach(z=>{ svg.appendChild(E('rect',{x:xs(z.x0),y:m.t,width:xs(z.x1)-xs(z.x0),height:ph,fill:z.color||'rgba(255,93,108,.08)'}));
    if(z.label) svg.appendChild(E('text',{x:(xs(z.x0)+xs(z.x1))/2,y:m.t+12,'text-anchor':'middle',fill:'#ff8a96','font-family':'var(--mono)','font-size':10},document.createTextNode(z.label))); });
  // gridlines + y ticks
  (o.yTicks||[]).forEach(v=>{ const y=ys(v); svg.appendChild(E('line',{x1:m.l,y1:y,x2:m.l+pw,y2:y,class:'gridline'}));
    svg.appendChild(E('text',{x:m.l-8,y:y+3,'text-anchor':'end',class:'axis'},document.createTextNode(o.yFmt?o.yFmt(v):v))); });
  // x ticks
  (o.xTicks||[]).forEach(v=>{ svg.appendChild(E('text',{x:xs(v),y:H-12,'text-anchor':'middle',class:'axis'},document.createTextNode(o.xFmt?o.xFmt(v):v))); });
  svg.appendChild(E('line',{x1:m.l,y1:m.t+ph,x2:m.l+pw,y2:m.t+ph,class:'axis'}));
  // markers
  (o.markers||[]).forEach(mk=>{ const x=xs(mk.x); svg.appendChild(E('line',{x1:x,y1:m.t,x2:x,y2:m.t+ph,stroke:mk.color||'#9aa6cf','stroke-width':1.4,'stroke-dasharray':'4 4'}));
    svg.appendChild(E('text',{x:x,y:m.t+ph+ (mk.below?24:0) ,'text-anchor':'middle',fill:mk.color||'#9aa6cf','font-family':'var(--mono)','font-size':10}, document.createTextNode(mk.label||''))); });
  // series
  (o.series||[]).forEach(s=>{
    const pts=s.points.filter(p=>p.year>=o.xMin-0.01 && p.year<=o.xMax+0.01);
    const seg=(arr,dash)=>{ if(arr.length<2) return; const d=arr.map((p,i)=>(i?'L':'M')+xs(p.year)+' '+ys(p.value)).join(' ');
      if(s.area){ const a=d+` L ${xs(arr[arr.length-1].year)} ${ys(o.yMin)} L ${xs(arr[0].year)} ${ys(o.yMin)} Z`;
        svg.appendChild(E('path',{d:a,fill:s.color,opacity:.12})); }
      svg.appendChild(E('path',{d,fill:'none',stroke:s.color,'stroke-width':s.width||2.4,'stroke-linejoin':'round','stroke-linecap':'round',...(dash?{'stroke-dasharray':'6 5',opacity:.85}:{})})); };
    if(s.dashFrom!=null){ const solid=pts.filter(p=>p.year<=s.dashFrom); const dash=pts.filter(p=>p.year>=s.dashFrom);
      seg(solid,false); seg(dash,true); } else seg(pts,false);
    pts.forEach(p=>{ const c=E('circle',{cx:xs(p.year),cy:ys(p.value),r:4.5,fill:'#0b1024',stroke:s.color,'stroke-width':2,style:'cursor:pointer'});
      c.addEventListener('pointerenter',ev=>showTip(`<b>${s.name}</b><span class="t-sub">${p.year} · ${o.yFmt?o.yFmt(p.value):p.value}</span>${p.label?'<span class="t-sub">'+p.label+'</span>':''}`,ev.clientX,ev.clientY));
      c.addEventListener('pointerleave',hideTip); svg.appendChild(c); }); });
  // legend
  if(o.legend!==false && o.series && o.series.length){ let lx=m.l;
    o.series.forEach(s=>{ const g=E('g',{}); g.appendChild(E('rect',{x:lx,y:H-2,width:0,height:0}));
      svg.appendChild(E('line',{x1:lx,y1:14,x2:lx+18,y2:14,stroke:s.color,'stroke-width':3}));
      const tx=E('text',{x:lx+24,y:17,fill:'#9aa6cf','font-size':11},document.createTextNode(s.name)); svg.appendChild(tx);
      lx+= 34 + s.name.length*6.2; }); }
  host.innerHTML=''; host.appendChild(svg);
}

function bubbleChart(host, machines, activeMod){
  const W=720,H=380,m={l:56,r:18,t:20,b:40}; const pw=W-m.l-m.r,ph=H-m.t-m.b;
  const data=machines.filter(d=>d.fidelity!=null && d.modality!=='annealing');
  const xMin=Math.log10(10), xMax=Math.log10(2000);
  const xs=q=>m.l+(Math.log10(clamp(q,10,2000))-xMin)/(xMax-xMin)*pw;
  const yMin=99.0,yMax=100.0; const ys=f=>m.t+(1-(clamp(f,yMin,yMax)-yMin)/(yMax-yMin))*ph;
  const modColor=k=>(D.modalities.find(mm=>mm.key===k)||{}).color||'#888';
  const svg=E('svg',{viewBox:`0 0 ${W} ${H}`});
  [99.0,99.25,99.5,99.75,100].forEach(v=>{ const y=ys(v); svg.appendChild(E('line',{x1:m.l,y1:y,x2:m.l+pw,y2:y,class:'gridline'}));
    svg.appendChild(E('text',{x:m.l-8,y:y+3,'text-anchor':'end',class:'axis'},document.createTextNode(v.toFixed(2)+'%'))); });
  [10,30,100,300,1000].forEach(v=>{ svg.appendChild(E('text',{x:xs(v),y:H-22,'text-anchor':'middle',class:'axis'},document.createTextNode(v))); });
  svg.appendChild(E('text',{x:m.l+pw/2,y:H-6,'text-anchor':'middle',class:'axis'},document.createTextNode('physical qubits (log) →')));
  svg.appendChild(E('text',{x:14,y:m.t+ph/2,'text-anchor':'middle',class:'axis',transform:`rotate(-90 14 ${m.t+ph/2})`},document.createTextNode('2-qubit gate fidelity →')));
  // "sweet spot" hint
  svg.appendChild(E('text',{x:m.l+pw-6,y:m.t+12,'text-anchor':'end',fill:'#51e6a0','font-size':11,opacity:.8},document.createTextNode('▲ better')));
  data.forEach(d=>{ const c=modColor(d.modality); const on=!activeMod||activeMod===d.modality;
    const r=clamp(Math.sqrt(d.qubits)*0.9,5,22);
    const g=E('g',{opacity:on?1:0.12,style:'cursor:pointer'});
    g.appendChild(E('circle',{cx:xs(d.qubits),cy:ys(d.fidelity),r,fill:c,'fill-opacity':.22,stroke:c,'stroke-width':1.6}));
    g.appendChild(E('text',{x:xs(d.qubits),y:ys(d.fidelity)-r-4,'text-anchor':'middle',fill:'#cdd6f5','font-size':10},document.createTextNode(d.name)));
    g.addEventListener('pointerenter',ev=>showTip(`<b>${d.vendor} ${d.name}</b><span class="t-sub">${d.qubits} qubits · ${d.fidelity}% fidelity</span><span class="t-sub">${d.metric}</span>`,ev.clientX,ev.clientY));
    g.addEventListener('pointerleave',hideTip); svg.appendChild(g); });
  host.innerHTML=''; host.appendChild(svg);
}

function gauge(host, pct, asOf){
  const W=240,H=190,cx=120,cy=140,r=92; const a0=Math.PI*0.85, a1=Math.PI*2.15; // sweep
  const ang=t=>a0+(a1-a0)*t; const pt=(t,rr)=>[cx+Math.cos(ang(t))*rr, cy+Math.sin(ang(t))*rr];
  const arc=(t0,t1,rr,w,col,op)=>{ const [x0,y0]=pt(t0,rr),[x1,y1]=pt(t1,rr); const large=(ang(t1)-ang(t0))>Math.PI?1:0;
    return E('path',{d:`M ${x0} ${y0} A ${rr} ${rr} 0 ${large} 1 ${x1} ${y1}`,fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round',...(op?{opacity:op}:{})}); };
  const svg=E('svg',{viewBox:`0 0 ${W} ${H}`});
  svg.appendChild(arc(0,1,r,16,'#16203f'));
  const grad=E('linearGradient',{id:'gg',x1:'0',y1:'0',x2:'1',y2:'0'},[E('stop',{offset:'0',['stop-color']:'#36e6ff'}),E('stop',{offset:'1',['stop-color']:'#b46bff'})]);
  svg.appendChild(E('defs',{},grad));
  svg.appendChild(arc(0,clamp(pct/100,0.001,1),r,16,'url(#gg)'));
  svg.appendChild(E('text',{x:cx,y:cy-6,'text-anchor':'middle',fill:'#e8ecff','font-size':44,'font-weight':800,'font-family':'var(--mono)'},document.createTextNode(pct+'%')));
  svg.appendChild(E('text',{x:cx,y:cy+18,'text-anchor':'middle',fill:'#9aa6cf','font-size':12},document.createTextNode('quantum-safe traffic')));
  host.innerHTML=''; host.appendChild(svg);
  const cap=document.createElement('div'); cap.style.cssText='font-size:12px;color:var(--ink-faint);margin-top:6px';
  cap.textContent='hybrid PQC key exchange · '+asOf; host.appendChild(cap);
}

/* =====================================================================
   3 · SECTION RENDERERS
   ===================================================================== */
function renderHistory(){
  const cats=[...new Set(D.timeline.map(t=>t.category))];
  const fl=$('#tlFilters'); let active='all';
  const mkChip=(key,label)=>{ const b=document.createElement('button'); b.className='chip'+(key==='all'?' on':''); b.dataset.key=key;
    b.innerHTML=(key==='all'?'':`<span class="swatch" style="background:${CAT[key]}"></span>`)+label;
    b.onclick=()=>{ active=key; $$('.chip',fl).forEach(c=>c.classList.toggle('on',c===b)); draw(); }; return b; };
  fl.appendChild(mkChip('all','All')); cats.forEach(c=>fl.appendChild(mkChip(c,CAT_LABEL[c]||c)));
  const tl=$('#timeline');
  function draw(){ tl.innerHTML='';
    D.timeline.forEach(m=>{ const show=active==='all'||m.category===active; const col=CAT[m.category]||'#888';
      const it=document.createElement('div'); it.className='tl-item'+(show?'':' hidden'); it.style.color=col;
      it.innerHTML=`<span class="tl-dot" style="background:${col}"></span>
        <div class="tl-card"><div><span class="tl-year">${m.year}</span><span class="tl-cat">${CAT_LABEL[m.category]||m.category}</span></div>
        <div class="tl-title">${m.title}</div><div class="tl-who">${m.who}</div><p class="tl-what">${m.what}</p></div>`;
      tl.appendChild(it); });
    const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);} }),{threshold:.15});
    $$('.tl-item',tl).forEach(i=>io.observe(i));
  }
  draw();
  // qubit-over-time chart
  lineChart($('#chartQubits'),{
    height:300, logY:true, xMin:1998, xMax:2026, yMin:1, yMax:2000,
    xTicks:[2000,2005,2010,2015,2020,2025], yTicks:[1,10,100,1000],
    yFmt:v=>v>=1000?(v/1000)+'k':v, xFmt:v=>v,
    series:[{ name:'Largest gate-model machine', color:'#36e6ff', points:[
      {year:1998,value:2,label:'NMR'},{year:2016,value:5,label:'IBM cloud'},{year:2019,value:53,label:'Sycamore'},
      {year:2021,value:127,label:'Eagle'},{year:2022,value:433,label:'Osprey'},{year:2023,value:1121,label:'Condor'},
      {year:2024,value:1180,label:'Atom Computing'},{year:2026,value:1200,label:'quality > count'} ]}],
    legend:false
  });
}

function renderMachines(){
  const fl=$('#modFilters'); let active=null;
  const all=document.createElement('button'); all.className='chip on'; all.textContent='All modalities';
  all.onclick=()=>{ active=null; sync(); }; fl.appendChild(all);
  D.modalities.forEach(mm=>{ if(!D.machines.some(d=>d.modality===mm.key)) return;
    const b=document.createElement('button'); b.className='chip'; b.dataset.k=mm.key;
    b.innerHTML=`<span class="swatch" style="background:${mm.color}"></span>${mm.icon} ${mm.label}`;
    b.onclick=()=>{ active=active===mm.key?null:mm.key; sync(); }; fl.appendChild(b); });
  function sync(){ $$('.chip',fl).forEach(c=>c.classList.toggle('on', (active===null&&c===all)||c.dataset.k===active));
    bubbleChart($('#chartMachines'),D.machines,active); drawTable(); }
  // table
  let sortKey='qubits', sortDir=-1;
  const cols=[{k:'name',t:'Machine'},{k:'modality',t:'Type'},{k:'qubits',t:'Qubits',n:1},{k:'logical',t:'Logical',n:1},{k:'fidelity',t:'2Q fidelity',n:1},{k:'year',t:'Year',n:1},{k:'metric',t:'Notable for'}];
  function drawTable(){ const wrap=$('#machineTable');
    const rows=[...D.machines].sort((a,b)=>{ let x=a[sortKey],y=b[sortKey]; if(x==null)x=-1; if(y==null)y=-1;
      if(typeof x==='string') return sortDir*x.localeCompare(y); return sortDir*(x-y); });
    const modColor=k=>(D.modalities.find(mm=>mm.key===k)||{}).color||'#888';
    const modLabel=k=>(D.modalities.find(mm=>mm.key===k)||{}).label||k;
    const th=cols.map(c=>`<th data-k="${c.k}">${c.t} <span class="arrow">${sortKey===c.k?(sortDir<0?'▾':'▴'):''}</span></th>`).join('');
    const tr=rows.map(d=>{ const dim=active&&d.modality!==active?' class="dim"':'';
      return `<tr${dim}><td><span class="vname">${d.name}</span><div class="vendor">${d.vendor}</div></td>
        <td><span class="tag" style="color:${modColor(d.modality)}">${modLabel(d.modality)}</span></td>
        <td class="num">${d.qubits.toLocaleString()}</td>
        <td class="num">${d.logical??'—'}</td>
        <td class="num">${d.fidelity?d.fidelity+'%':'—'}</td>
        <td class="num">${d.year}</td>
        <td>${d.metric}</td></tr>`; }).join('');
    wrap.innerHTML=`<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
    $$('th',wrap).forEach(h=>h.onclick=()=>{ const k=h.dataset.k; if(k===sortKey)sortDir*=-1; else{sortKey=k;sortDir=(k==='name'||k==='modality'||k==='metric')?1:-1;} drawTable(); });
  }
  // modality cards
  $('#modalityCards').innerHTML=D.modalities.map(mm=>{ const n=D.machines.filter(d=>d.modality===mm.key).length;
    const max=Math.max(0,...D.machines.filter(d=>d.modality===mm.key).map(d=>d.qubits));
    return `<div class="card"><div class="card-top"><span class="card-ic">${mm.icon}</span><h4 style="color:${mm.color}">${mm.label}</h4></div>
      <p>${mm.blurb}</p><p style="margin-top:8px;color:var(--ink-faint);font-family:var(--mono);font-size:11px">${n} system${n>1?'s':''} · up to ${max.toLocaleString()} qubits</p></div>`; }).join('');
  sync();
}

function renderClimb(){
  lineChart($('#chartRoadmap'),{
    height:340, logY:true, xMin:2024, xMax:2033, yMin:1, yMax:100000,
    xTicks:[2024,2026,2028,2030,2032], yTicks:[1,10,100,1000,10000,100000],
    yFmt:v=> v>=1000?(v/1000)+'k':v,
    series:D.roadmaps.map(r=>({ name:r.vendor, color:r.color, dashFrom:r.projectedFrom, points:r.points })),
  });
  // lanes
  const yA=2024,yB=2033; const xs=y=>((y-yA)/(yB-yA))*100;
  $('#roadmapLanes').innerHTML=D.roadmaps.map(r=>{
    const nodes=r.points.map(p=>`<div class="lane-node" style="left:${clamp(xs(p.year),3,97)}%;color:${r.color}">
      <span class="lbl">${p.value>=1000?(p.value/1000)+'k':p.value} logical</span><span class="pip" style="background:${r.color};box-shadow:0 0 9px ${r.color}"></span><span class="yr">${p.year}</span></div>`).join('');
    return `<div class="lane"><div class="lane-name" style="color:${r.color}">${r.vendor}</div><div class="lane-track">${nodes}</div></div>`; }).join('');
  // obstacles
  $('#obstacleCards').innerHTML=D.obstacles.map(o=>`<div class="card"><div class="card-top"><span class="card-ic">${o.icon}</span><span class="sev ${o.severity}">${o.severity}</span></div>
    <h4>${o.name}</h4><p>${o.desc}</p></div>`).join('');
  // CRQC strip appended under obstacles
  const c=D.crqc; const strip=document.createElement('div'); strip.className='panel'; strip.style.marginTop='22px';
  strip.innerHTML=`<div class="panel-head"><h3>When could a quantum computer break today's encryption?</h3></div>
    <p style="color:var(--ink-dim);font-size:13.5px;margin:0 0 14px">${c.note}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap">${c.bands.map(b=>`<div style="flex:1;min-width:130px;background:var(--panel2);border:1px solid var(--line2);border-radius:12px;padding:12px 14px">
      <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--cyan)">${b.label.replace('by ','')}</div>
      <div style="font-size:12px;color:var(--ink-dim);margin-top:4px">${b.prob}</div></div>`).join('')}</div>`;
  $('#climb').appendChild(strip);
}

function renderQday(){
  const q=D.qday;
  gauge($('#qdayGauge'), q.readyPct, q.readyAsOf);
  $('#qdayKpis').innerHTML=q.kpis.map(k=>`<div class="kpi"><div class="big">${k.big}</div><div class="lbl">${k.lbl}</div><div class="sub">${k.sub}</div></div>`).join('');
  lineChart($('#chartPqc'),{
    height:300, xMin:2023, xMax:2035, yMin:0, yMax:100,
    xTicks:[2023,2025,2027,2029,2031,2033,2035], yTicks:[0,25,50,75,100], yFmt:v=>v+'%',
    series:[{name:'PQC key exchange',color:'#36e6ff',area:true,dashFrom:D.pqcAdoption.projectedFrom,points:D.pqcAdoption.points}],
    legend:false
  });
  // caveat
  const cav=document.createElement('p'); cav.style.cssText='font-size:12.5px;color:var(--ink-faint);margin:10px 2px 0';
  cav.innerHTML='⚠ '+q.caveat; $('#chartPqc').parentElement.appendChild(cav);
  $('#pqcGrid').innerHTML=D.pqcSystems.map(s=>`<div class="scell"><div class="scell-top"><span class="dotstat ${s.status}"></span><span class="ic">${s.icon}</span><h4>${s.system}</h4><span class="badge">${s.status}</span></div><p>${s.detail}</p></div>`).join('');
  $('#pqcStandards').innerHTML=D.pqcStandards.map(s=>`<div class="card"><div class="card-top"><span class="card-ic">${s.icon}</span><span class="sev ${s.status.startsWith('Final')?'low':'medium'}">${s.status}</span></div>
    <h4>${s.name} · <span style="color:var(--cyan);font-weight:600">${s.algo}</span></h4>
    <p style="color:var(--ink-faint);font-size:11.5px;font-family:var(--mono);margin:2px 0 6px">${s.purpose}</p><p>${s.desc}</p></div>`).join('');
}

function renderBitcoin(){
  const b=D.btc;
  // crossover
  const co=b.crossover;
  lineChart($('#chartCrossover'),{
    height:420, logY:true, xMin:2019, xMax:2035, yMin:10, yMax:100000000,
    xTicks:[2019,2022,2025,2028,2031,2034], yTicks:[100,10000,1000000,100000000],
    yFmt:v=>{ if(v>=1e6)return (v/1e6)+'M'; if(v>=1e3)return (v/1e3)+'k'; return v; },
    series:co.series, zones:[{x0:co.zone[0],x1:co.zone[1],color:'rgba(255,93,108,.10)',label:'likely crossover'}],
    markers:[{x:2026,label:'today',color:'#9aa6cf'},{x:co.crossoverYear,label:'Q-Day?',color:'#ff5d6c'}]
  });
  // threat KPIs (prepend into the crossover panel head area via the feature panel)
  const kp=document.createElement('div'); kp.className='kpis'; kp.style.marginTop='16px';
  const t=b.threat;
  kp.innerHTML=`
    <div class="kpi"><div class="big">${t.logical}</div><div class="lbl">logical qubits to break a key</div><div class="sub">error-corrected · estimates vary</div></div>
    <div class="kpi"><div class="big">${t.physicalNow}</div><div class="lbl">physical qubits needed (2026 est.)</div><div class="sub">was ${t.physicalThen} in 2022</div></div>
    <div class="kpi"><div class="big">${t.largestToday}</div><div class="lbl">qubits in today's largest machine</div><div class="sub">still hundreds of × too small</div></div>
    <div class="kpi"><div class="big">↓600×</div><div class="lbl">how much the bar has dropped</div><div class="sub">in just four years</div></div>`;
  $('#chartCrossover').parentElement.appendChild(kp);
  const note=document.createElement('p'); note.style.cssText='font-size:12.5px;color:var(--ink-faint);margin:12px 2px 0';
  note.textContent=t.note; $('#chartCrossover').parentElement.appendChild(note);
  // exposure
  const ex=b.exposure;
  $('#btcExposure').innerHTML=`<p style="font-size:13.5px;color:var(--ink);margin:0 0 14px">${ex.headline}</p>`+
    ex.rows.map(r=>`<div class="expo-row"><div class="expo-meta"><b>${r.label}</b><span>${r.sub}</span></div>
      <div class="expo-bar"><div class="expo-fill" style="width:${r.pct}%;${r.tone==='ok'?'background:linear-gradient(90deg,#1aa6d6,#36e6ff)':''}"></div></div>
      <div class="expo-val" style="${r.tone==='ok'?'color:var(--cyan)':''}">${r.btc}</div></div>`).join('')+
    `<p style="font-size:11.5px;color:var(--ink-faint);margin:8px 0 0">${ex.supply} · bar = share of total supply</p>`;
  // defense
  $('#btcDefense').innerHTML=`<div class="deflist">`+b.defense.map(d=>`<div class="defitem"><span class="dn">${d.n}</span>
    <div><b>${d.title}</b> &nbsp;<span class="st">${d.status}</span><p>${d.mechanism}</p><p style="color:var(--ink-faint)">${d.note}</p></div></div>`).join('')+`</div>`;
  // race
  const rc=b.race; const [ya,yb]=rc.axis; const xs=y=>clamp(((y-ya)/(yb-ya))*100,2,98);
  const lane=(items,color,icon,title)=>`<div style="margin:14px 0"><div style="font-size:13px;font-weight:700;color:${color};margin-bottom:6px">${icon} ${title}</div>
    <div style="position:relative;height:54px;background:var(--panel2);border:1px solid var(--line);border-radius:10px">
    ${items.map(it=>`<div style="position:absolute;left:${xs(it.year)}%;top:50%;transform:translate(-50%,-50%);text-align:center;width:120px">
      <div style="width:11px;height:11px;border-radius:50%;background:${color};box-shadow:0 0 9px ${color};margin:0 auto 3px"></div>
      <div style="font-family:var(--mono);font-size:10px;color:${color}">${it.year}</div>
      <div style="font-size:10.5px;color:var(--ink-dim);line-height:1.2">${it.label}</div></div>`).join('')}</div></div>`;
  $('#btcTimeline').innerHTML=`<h3>The race: attack vs. defence</h3><span class="panel-note">on a shared timeline — whichever lands first wins</span>
    ${lane(rc.attack,'#ff5d6c','⚛','Quantum attack capability')}
    ${lane(rc.defense,'#36e6ff','🛡',"Bitcoin's defence")}
    <p style="font-size:12.5px;color:var(--ink-dim);margin:14px 2px 0">${rc.footnote}</p>`;
}

/* =====================================================================
   4 · NAV · SPLASH · MODAL · INIT
   ===================================================================== */
function nav(){
  $$('.navlink').forEach(b=>b.onclick=()=>{ const el=$('#'+b.dataset.go); el && el.scrollIntoView({behavior:'smooth'}); });
  const secs=['lab','history','machines','climb','qday','bitcoin'].map(id=>$('#'+id));
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ const id=e.target.id;
    $$('.navlink').forEach(n=>n.classList.toggle('active',n.dataset.go===id)); } }); },{rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(s=>s&&io.observe(s));
  // brand → home (header-goes-home rule)
  const home=()=>{ window.scrollTo({top:0,behavior:'smooth'}); Lab.reset(); };
  $('#brand').onclick=home; $('#brand').onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();home();} };
}

function splash(){
  const sp=$('#splash');
  const go=()=>sp.classList.add('gone');
  $('#btnEnter').onclick=go;
  $('#btnDive').onclick=()=>{ go(); setTimeout(()=>Lab.toggleAuto(),300); };
  $('#btnSkip').onclick=()=>{ go(); setTimeout(()=>$('#history').scrollIntoView({behavior:'smooth'}),200); };
  $('#scrollcue').onclick=()=>$('#history').scrollIntoView({behavior:'smooth'});
}

function diveControls(){
  $('#diveSlider').addEventListener('input',e=>Lab.setDiveRaw(+e.target.value/1000));
  $('#diveAuto').onclick=()=>Lab.toggleAuto();
  $('#diveSpin').onclick=()=>Lab.toggleSpin();
  $$('.rail-stop').forEach(b=>b.onclick=()=>Lab.setDive(+b.dataset.level/5));
}

const ABOUT=`<p>An interactive map of where quantum computing actually stands — built for <a href="https://42-apps.github.io/" target="_blank" rel="noopener">42-apps</a>. The 3D lab is a real (if stylised) dilution refrigerator you can fly; the <b>DIVE</b> slider falls from the metre-scale fridge down through the chip, a single transmon qubit, its Josephson junction, and finally the qubit's quantum state on the Bloch sphere — where you can apply gates and measure it.</p>
<h4>Sources</h4>
<p>Figures are fact-checked to <b>1 July 2026</b> against primary sources where possible: NIST (PQC standards & IR 8547), the vendors' own roadmaps (IBM, Google Quantum AI, Quantinuum, IonQ, Pasqal), peer-reviewed results (Google Willow, <i>Nature</i> 2024; IonQ fidelity; Quantinuum Helios), Cloudflare Radar (post-quantum traffic share), the Global Risk Institute Quantum Threat Timeline survey, and resource-estimate papers on attacking secp256k1 (Webber et al. 2022; Gidney 2025; Google Quantum AI 2026).</p>
<h4>Honest caveats</h4>
<p>• <b>Qubit counts are a weak proxy for power.</b> A 1,000-qubit noisy chip can be less useful than a 50-qubit high-fidelity one. The field's focus shifted from count to <b>fidelity</b> and <b>logical</b> (error-corrected) qubits around 2024–25.<br>
• <b>No machine is fault-tolerant yet</b> (as of mid-2026), and no cryptographically-relevant quantum computer is known to exist. "Q-Day" timelines are expert opinion, not forecasts — and frequently hyped.<br>
• The <b>52%</b> readiness figure is post-quantum <i>key exchange</i> on Cloudflare's network only — not authentication, not the whole internet, not data at rest.<br>
• <b>Bitcoin qubit estimates swing by 1,000×</b> between papers depending on assumptions; treat any single number with skepticism. Microsoft's topological-qubit claims remain scientifically disputed.</p>
<p style="color:var(--ink-faint)">The 3D scene is an artistic rendering at honest relative scale, not an engineering schematic.</p>`;

function about(){ const m=$('#about'); $('#aboutBody').innerHTML=ABOUT;
  const open=()=>m.classList.remove('hidden'), close=()=>m.classList.add('hidden');
  $('#btnAbout').onclick=open; $('#footAbout').onclick=open; $('#aboutClose').onclick=close;
  m.onclick=e=>{ if(e.target===m) close(); };
  addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
}

function boot(){
  try{ Lab.init(); }catch(err){ console.error('Lab failed',err); $('#scene').innerHTML='<div style="position:absolute;inset:0;display:grid;place-items:center;color:#66719c;font-family:monospace">3D unavailable in this browser</div>'; }
  renderHistory(); renderMachines(); renderClimb(); renderQday(); renderBitcoin();
  nav(); splash(); diveControls(); about();
}
if(document.readyState==='loading') addEventListener('DOMContentLoaded',boot); else boot();
