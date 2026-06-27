/* ===========================================================================
   vedic-ui.js — renders the Jyotish dashboard from compute() result `r`.
   Depends on: window.Vedic, window.Astronomy, and app.js globals
   (lastR, S, $, spicaTropLon).  Vedic is ALWAYS sidereal (Lahiri unless the
   user already chose another sidereal ayanāṃśa).
   =========================================================================== */
'use strict';
(function(){
const V = window.Vedic, AZ = window.Astronomy;
const SI = V.SIGN_EN, SG = V.SIGN_GLYPH, SA = V.SIGN_SA, GL = V.GLYPH;
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let sub = 'charts', chartStyle = 'north', vargaN = 9, dashaSys = 'vimshottari', nodes59 = false;

const fmtDate = ms => { const d=new Date(ms); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const VARGA_LIST = [[1,'D1 Rāśi'],[2,'D2 Hora'],[3,'D3 Drekkāṇa'],[4,'D4 Chaturthāṃśa'],[7,'D7 Saptāṃśa'],
 [9,'D9 Navāṃśa'],[10,'D10 Daśāṃśa'],[12,'D12 Dvādaśāṃśa'],[16,'D16 Ṣoḍaśāṃśa'],[20,'D20 Viṃśāṃśa'],
 [24,'D24 Siddhāṃśa'],[27,'D27 Bhāṃśa'],[30,'D30 Triṃśāṃśa'],[40,'D40 Khavedāṃśa'],[45,'D45 Akṣavedāṃśa'],[60,'D60 Ṣaṣṭyāṃśa']];
const PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const BENEFIC = {Jupiter:1,Venus:1,Mercury:1,Moon:1};
const pColor = p => ({Sun:'#ff9e4d',Moon:'#dfe6ff',Mars:'#ff6b53',Mercury:'#7bd88f',Jupiter:'#f4d58d',Venus:'#ffc0e0',Saturn:'#8fa0c8',Rahu:'#b6a8ff',Ketu:'#c08bd9'}[p]||'#fff');

/* ---- derive the sidereal Vedic dataset from r ---------------------------- */
function vedicData(r){
  const rot = AZ.Rotation_EQJ_ECT(r.date);
  const lahiri = V.norm(spicaTropLon(r.date, rot) - 180);
  const ayan = (S.zodiac==='tropical') ? lahiri : r.ayan;   // Vedic stays sidereal
  const sid = trop => V.norm(trop - ayan);
  const g = {};
  for(const b of r.bodies){ if(['Uranus','Neptune','Pluto'].includes(b.key)) continue; g[b.key]=sid(b.lon); }
  g.Rahu = sid(r.nodeN); g.Ketu = sid(r.nodeS);
  const lagna = sid(r.asc);
  const retro = {}; for(const b of r.bodies) retro[b.key]=b.retro;
  const signs = {Lagna:V.rasi(lagna)}; for(const p of PLANETS) signs[p]=V.rasi(g[p]);
  return {ayan, lahiri, g, lagna, lagnaSign:V.rasi(lagna), signs, retro, date:r.date, obs:r.obs};
}

/* ===========================================================================
   chart rendering (North & South Indian)
   =========================================================================== */
// houses[1..12] -> array of short tokens; signByHouse[h]=sign idx
function chartHousing(planetSign, lagnaSign){
  const houses={}; for(let h=1;h<=12;h++) houses[h]=[];
  for(const p in planetSign){ const h=((planetSign[p]-lagnaSign+12)%12)+1; houses[h].push(p); }
  return houses;
}
const NI_CENTROID = {1:[200,95],2:[105,48],3:[52,103],4:[112,200],5:[52,300],6:[105,352],
 7:[200,305],8:[300,352],9:[348,300],10:[290,200],11:[348,103],12:[300,48]};
function northChart(planetSign, lagnaSign, title){
  let s = `<svg viewBox="0 0 400 400" class="vchart" role="img" aria-label="${title}">`;
  s += `<rect x="2" y="2" width="396" height="396" fill="none" stroke="var(--line2)" stroke-width="1.5"/>`;
  s += `<path d="M2 2 L398 398 M398 2 L2 398 M200 2 L398 200 L200 398 L2 200 Z" fill="none" stroke="var(--line2)" stroke-width="1"/>`;
  const houses = chartHousing(planetSign, lagnaSign);
  for(let h=1;h<=12;h++){ const [cx,cy]=NI_CENTROID[h]; const sign=(lagnaSign+(h-1))%12;
    s += `<text x="${cx}" y="${cy-14}" text-anchor="middle" font-size="11" fill="var(--faint)">${sign+1}</text>`;
    const toks = houses[h]; const per=Math.min(toks.length,4);
    toks.forEach((p,i)=>{ const col=Math.ceil(toks.length/2); const dx=((i%col)-(col-1)/2)*22, dy=Math.floor(i/col)*16;
      s += `<text x="${cx+dx}" y="${cy+4+dy}" text-anchor="middle" font-size="14" fill="${pColor(p)}" font-weight="600">${GL[p]||p}</text>`; });
    if(h===1) s += `<text x="${cx}" y="${cy+(toks.length?28:4)}" text-anchor="middle" font-size="9" fill="var(--gold)">La</text>`;
  }
  s += `</svg>`; return s;
}
const SI_CELL = {0:[0,1],1:[0,2],2:[0,3],3:[1,3],4:[2,3],5:[3,3],6:[3,2],7:[3,1],8:[3,0],9:[2,0],10:[1,0],11:[0,0]};
function southChart(planetSign, lagnaSign, title){
  let s = `<svg viewBox="0 0 400 400" class="vchart" role="img" aria-label="${title}">`;
  const houses = chartHousing(planetSign, lagnaSign);
  // signByCell
  for(let sign=0; sign<12; sign++){ const [row,col]=SI_CELL[sign]; const x=col*100, y=row*100;
    const isLag = sign===lagnaSign;
    s += `<rect x="${x}" y="${y}" width="100" height="100" fill="${isLag?'rgba(244,213,141,.08)':'none'}" stroke="var(--line2)" stroke-width="1"/>`;
    if(isLag) s += `<path d="M${x} ${y} L${x+22} ${y} L${x} ${y+22} Z" fill="var(--gold)" opacity=".55"/>`;
    s += `<text x="${x+6}" y="${y+15}" font-size="10" fill="var(--faint)">${SG[sign]}</text>`;
    const here=Object.keys(houses).flatMap(h=>houses[h].filter(p=>planetSign[p]===sign));
    here.forEach((p,i)=>{ const dx=(i%3)*30+18, dy=Math.floor(i/3)*22+44;
      s += `<text x="${x+dx}" y="${y+dy}" font-size="14" fill="${pColor(p)}" font-weight="600" text-anchor="middle">${GL[p]||p}</text>`; });
  }
  s += `<text x="200" y="195" text-anchor="middle" font-size="13" fill="var(--gold)">${title}</text>`;
  s += `<text x="200" y="215" text-anchor="middle" font-size="10" fill="var(--faint)">South Indian</text>`;
  s += `</svg>`; return s;
}
function renderChart(planetSign, lagnaSign, title){
  return chartStyle==='south' ? southChart(planetSign,lagnaSign,title) : northChart(planetSign,lagnaSign,title);
}

/* ===========================================================================
   sub-panels
   =========================================================================== */
function panelCharts(d, r){
  // D1 signs
  const d1={}; for(const p of PLANETS) d1[p]=d.signs[p];
  // varga signs
  const vN=vargaN, vlag=V.varga(d.lagna,vN), dV={}; for(const p of PLANETS) dV[p]=V.varga(d.g[p],vN);
  const vName=(VARGA_LIST.find(x=>x[0]===vN)||[,'D'+vN])[1];
  let h = `<div class="vc-controls">
     <div class="seg" id="vChartStyle"><button data-st="north" class="${chartStyle==='north'?'on':''}">North</button><button data-st="south" class="${chartStyle==='south'?'on':''}">South</button></div>
     <label class="vc-sel">Divisional chart <select id="vVargaSel">${VARGA_LIST.map(([n,nm])=>`<option value="${n}" ${n===vN?'selected':''}>${nm}</option>`).join('')}</select></label>
   </div>`;
  h += `<div class="vchart-row">
     <figure><figcaption>D1 · Rāśi (birth chart)</figcaption>${renderChart(d1,d.lagnaSign,'Rāśi')}</figure>
     <figure><figcaption>${vName}</figcaption>${renderChart(dV,vlag,vName)}</figure>
   </div>`;
  h += planetTable(d, r);
  h += avakhada(d);
  return h;
}

function planetTable(d, r){
  let rows='';
  const sunLon=d.g.Sun;
  for(const p of PLANETS){
    const L=d.g[p], nk=V.nakshatra(L), dg=V.dignity(p, L, sunLon), dd=V.dms(L);
    const navs=V.varga(L,9);
    const flags=[]; if(d.retro[p]) flags.push('<span class="vt-r">R</span>'); if(dg.combust) flags.push('<span class="vt-c">c</span>');
    const dignClass = /Exalt|Own|Moola/.test(dg.status)?'good':/Debil|Enemy/.test(dg.status)?'bad':'';
    rows += `<tr><td><span style="color:${pColor(p)}">${GL[p]}</span> ${p} ${flags.join('')}</td>`+
      `<td>${SG[dd.sign]} ${SI[dd.sign]} <span class="tag">${dd.label}</span></td>`+
      `<td>${nk.name} <span class="tag">pada ${nk.pada}</span></td>`+
      `<td>${nk.lord}</td><td>${SG[navs]} ${SI[navs]}</td>`+
      `<td class="${dignClass}">${dg.status}</td></tr>`;
  }
  return `<div class="vtable-wrap"><table class="vtable"><thead><tr><th>Graha</th><th>Rāśi (deg)</th><th>Nakṣatra</th><th>Nak lord</th><th>Navāṃśa</th><th>Dignity</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Avakhada basics from Moon
const VARNA=['Kshatriya','Shudra','Vaishya','Brahmin','Kshatriya','Shudra','Vaishya','Brahmin','Kshatriya','Shudra','Vaishya','Brahmin'];
const TATVA=['Fire','Earth','Air','Water','Fire','Earth','Air','Water','Fire','Earth','Air','Water'];
const GANA_LIST=['Deva','Manushya','Rakshasa','Manushya','Deva','Manushya','Deva','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
const NADI_NAMES=['Aadi','Madhya','Antya'];
function nadiOf(nakIdx){ const n=nakIdx+1; const aadi=[1,6,7,12,13,18,19,24,25], mid=[2,5,8,11,14,17,20,23,26];
  return aadi.includes(n)?'Aadi':mid.includes(n)?'Madhya':'Antya'; }
function avakhada(d){
  const ms=d.signs.Moon, nk=V.nakshatra(d.g.Moon);
  const card=(k,v)=>`<div class="ava"><span class="ava-k">${k}</span><span class="ava-v">${v}</span></div>`;
  return `<div class="avakhada">`+
    card('Janma Rāśi (Moon)', SG[ms]+' '+SI[ms]+' / '+SA[ms])+
    card('Janma Nakṣatra', nk.name+' (pada '+nk.pada+')')+
    card('Nakṣatra lord', nk.lord)+ card('Varṇa', VARNA[ms])+ card('Tatva', TATVA[ms])+
    card('Gaṇa', GANA_LIST[nk.index])+ card('Nāḍī', nadiOf(nk.index))+ card('Deity', nk.deity)+
    `</div>`;
}

/* ---- Dashas ---- */
function panelDashas(d, r){
  const now=new Date().getTime();
  const vim=V.vimshottari(d.g.Moon, d.date.getTime(), 3);
  const path=V.activePeriod(vim.mds, now).map(n=>n.lord);
  let h = `<div class="vc-controls"><div class="seg" id="vDashaSys">
     <button data-ds="vimshottari" class="on">Vimśottarī</button>
     <button data-ds="info" title="More dasha systems">120-yr</button></div>
     <span class="vc-note">Balance at birth: <b>${vim.startLord} ${vim.balanceYears.toFixed(2)} yrs</b> · running now: <b>${path.join(' › ')||'—'}</b></span></div>`;
  h += `<div class="dasha-tree">`;
  for(const md of vim.mds){
    const cur = now>=md.start && now<md.end;
    h += `<details class="dnode lvl0 ${cur?'cur':''}" ${cur?'open':''}><summary><span class="dl" style="color:${pColor(md.lord)}">${GL[md.lord]||''} ${md.lord}</span><span class="dr">${fmtDate(md.start)} – ${fmtDate(md.end)}</span></summary>`;
    for(const ad of md.children){
      const curA = now>=ad.start && now<ad.end;
      h += `<details class="dnode lvl1 ${curA?'cur':''}" ${curA?'open':''}><summary><span class="dl">${ad.lord}</span><span class="dr">${fmtDate(ad.start)} – ${fmtDate(ad.end)}</span></summary>`;
      for(const pd of ad.children){ const curP=now>=pd.start && now<pd.end;
        h += `<div class="dnode lvl2 ${curP?'cur':''}"><span class="dl">${pd.lord}</span><span class="dr">${fmtDate(pd.start)} – ${fmtDate(pd.end)}</span></div>`; }
      h += `</details>`;
    }
    h += `</details>`;
  }
  h += `</div>`;
  return h;
}

/* ---- Panchanga ---- */
function varaIndex(r){
  const civ = new Date(Date.UTC(S.y,S.mo-1,S.d)).getUTCDay();
  try{ const sr=AZ.SearchRiseSet(AZ.Body.Sun, r.obs, +1, new Date(Date.UTC(S.y,S.mo-1,S.d,0,0,0)), 1);
    if(sr && r.date.getTime() < sr.date.getTime()) return (civ+6)%7; }catch(e){}
  return civ;
}
function panelPanchanga(d, r){
  const pan=V.panchanga(d.g.Sun, d.g.Moon, varaIndex(r));
  const nk=pan.nakshatra;
  const card=(k,v,sub)=>`<div class="pan-card"><div class="pan-k">${k}</div><div class="pan-v">${v}</div>${sub?`<div class="pan-s">${sub}</div>`:''}</div>`;
  return `<div class="panchanga">`+
    card('Tithi', pan.tithi.name, pan.tithi.paksha+' pakṣa · '+pan.tithi.num)+
    card('Vāra', pan.vara||'—', 'weekday (from sunrise)')+
    card('Nakṣatra', nk.name+' '+nk.pada, 'lord '+nk.lord+' · '+nk.deity)+
    card('Yoga', pan.yoga.name, 'nitya yoga · '+pan.yoga.num)+
    card('Karaṇa', pan.karana.name, 'half-tithi · '+pan.karana.num)+
    `</div><p class="vc-note">Pañchāṅga = the five limbs of the Vedic almanac for your birth moment.</p>`;
}

/* ---- Strengths: Ashtakavarga + dignity ---- */
function panelStrengths(d, r){
  const av=V.ashtakavarga(d.signs);
  const mx=Math.max(...av.sav), mn=Math.min(...av.sav);
  const cell=(v)=>{ const t=(v-mn)/Math.max(1,(mx-mn)); const c=`hsl(${10+t*120},60%,${28+t*14}%)`;
    return `<td style="background:${c}">${v}</td>`; };
  let sav=`<table class="av-tab"><thead><tr><th>Sign</th>${SI.map((_,i)=>`<th>${SG[i]}</th>`).join('')}<th>Σ</th></tr></thead>`;
  sav+=`<tbody><tr><th>SAV</th>${av.sav.map(cell).join('')}<th>${av.total}</th></tr>`;
  for(const p of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']){
    sav+=`<tr><th><span style="color:${pColor(p)}">${GL[p]}</span></th>${av.bav[p].map(v=>`<td>${v}</td>`).join('')}<th>${av.bav[p].reduce((a,b)=>a+b,0)}</th></tr>`; }
  sav+=`</tbody></table>`;
  return `<h3 class="vh">Aṣṭakavarga</h3><p class="vc-note">Benefic points per sign. Sarvāṣṭakavarga (top, total always 337); below, each planet's Bhinnāṣṭakavarga. >30 strong · <25 weak.</p><div class="vtable-wrap">${sav}</div>`;
}

/* ---- Yogas ---- */
function panelYogas(d, r){
  const dig={}; for(const p of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) dig[p]=V.dignity(p,d.g[p],d.g.Sun).status;
  const yg=V.yogas({signs:d.signs, lagna:d.lagnaSign, dignities:dig});
  if(!yg.length) return `<p class="vc-note">No yogas from the curated set are present in this chart.</p>`;
  return `<div class="yoga-grid">`+yg.map(y=>`<div class="yoga-card"><div class="yoga-name">${y.name}</div><div class="yoga-note">${y.note}</div></div>`).join('')+`</div>`;
}

/* ---- KP / Jaimini ---- */
function panelKP(d, r){
  let rows='';
  for(const p of PLANETS){ const k=V.kp(d.g[p]);
    rows+=`<tr><td><span style="color:${pColor(p)}">${GL[p]}</span> ${p}</td><td>${V.NAK[k.nak][0]}</td><td>${k.starLord}</td><td>${k.subLord}</td></tr>`; }
  const ck=V.charaKarakas(d.g);
  const al=V.arudhaLagna(d.lagnaSign, d.g);
  const akSign=ck.Atmakaraka ? V.varga(d.g[ck.Atmakaraka],9) : null;   // Karakamsa = AK in navamsa
  let ckHtml=Object.entries(ck).map(([k,p])=>`<div class="ava"><span class="ava-k">${k}</span><span class="ava-v"><span style="color:${pColor(p)}">${GL[p]}</span> ${p}</span></div>`).join('');
  return `<h3 class="vh">KP — star &amp; sub lords</h3>`+
    `<div class="vtable-wrap"><table class="vtable"><thead><tr><th>Graha</th><th>Nakṣatra</th><th>Star lord</th><th>Sub lord</th></tr></thead><tbody>${rows}</tbody></table></div>`+
    `<h3 class="vh">Jaimini</h3><div class="avakhada">${ckHtml}`+
    `<div class="ava"><span class="ava-k">Arudha Lagna</span><span class="ava-v">${SG[al]} ${SI[al]}</span></div>`+
    (akSign!=null?`<div class="ava"><span class="ava-k">Kārakāṃśa (AK in D9)</span><span class="ava-v">${SG[akSign]} ${SI[akSign]}</span></div>`:'')+`</div>`;
}

/* ---- Transits (Gochara) + Sade Sati ---- */
function panelTransits(d, r){
  // current sidereal positions (today)
  let lines='', sade='';
  try{
    const now=new Date(); const rot=AZ.Rotation_EQJ_ECT(now);
    const lah=V.norm(spicaTropLon(now,rot)-180);
    const sidSignNow=key=>V.rasi(V.norm(AZ.SphereFromVector(AZ.RotateVector(rot,AZ.GeoVector(AZ.Body[key],now,true))).lon - lah));
    const satSign=sidSignNow('Saturn'), jupSign=sidSignNow('Jupiter');
    const moonNatal=d.signs.Moon;
    const fromMoon=(satSign-moonNatal+12)%12;
    const isSade = fromMoon===11||fromMoon===0||fromMoon===1;
    sade = isSade ? `<div class="yoga-card warn"><div class="yoga-name">Sade Sati — active now</div><div class="yoga-note">Transiting Saturn is in the ${fromMoon===11?'12th':fromMoon===0?'1st':'2nd'} from your natal Moon (${SI[moonNatal]}).</div></div>`
                  : `<div class="yoga-card"><div class="yoga-name">No Sade Sati now</div><div class="yoga-note">Transiting Saturn (${SI[satSign]}) is not in the 12th/1st/2nd from your natal Moon (${SI[moonNatal]}).</div></div>`;
    lines = `<div class="ava"><span class="ava-k">Saturn now</span><span class="ava-v">${SG[satSign]} ${SI[satSign]}</span></div>`+
            `<div class="ava"><span class="ava-k">Jupiter now</span><span class="ava-v">${SG[jupSign]} ${SI[jupSign]}</span></div>`+
            `<div class="ava"><span class="ava-k">Natal Moon</span><span class="ava-v">${SG[moonNatal]} ${SI[moonNatal]}</span></div>`;
  }catch(e){ return `<p class="vc-note">Transit computation unavailable.</p>`; }
  return `<h3 class="vh">Gochara — transits right now</h3><div class="avakhada">${lines}</div>${sade}`+
    `<p class="vc-note">Current sidereal positions vs your natal Moon. Sade Sati = Saturn's ~7½-year passage through the 12th–1st–2nd from the Moon.</p>`;
}

/* ===========================================================================
   main
   =========================================================================== */
const SUBS = [['charts','Charts'],['dashas','Daśās'],['panchanga','Pañchāṅga'],['strengths','Strengths'],['yogas','Yogas'],['kp','KP / Jaimini'],['transits','Transits']];
function renderVedic(r){
  if(!r || !V) return;
  const d = vedicData(r);
  // sub-tab row
  $('#vedicSubtabs').innerHTML = SUBS.map(([k,nm])=>`<button data-vsub="${k}" class="${k===sub?'on':''}">${nm}</button>`).join('');
  let body='';
  try{
    body = sub==='charts'?panelCharts(d,r): sub==='dashas'?panelDashas(d,r): sub==='panchanga'?panelPanchanga(d,r):
           sub==='strengths'?panelStrengths(d,r): sub==='yogas'?panelYogas(d,r): sub==='kp'?panelKP(d,r): panelTransits(d,r);
  }catch(e){ body=`<p class="vc-note">Error rendering this panel: ${e.message}</p>`; }
  $('#vedicPanel').innerHTML = `<div class="vedic-head">🕉 Sidereal Jyotish · whole-sign houses · ayanāṃśa ${d.ayan.toFixed(2)}°</div>` + body;
}

function initVedicUI(){
  const panel=$('#vedicPanel'), tabs=$('#vedicSubtabs');
  tabs.addEventListener('click',e=>{ const b=e.target.closest('[data-vsub]'); if(!b)return; sub=b.dataset.vsub; if(lastR) renderVedic(lastR); });
  panel.addEventListener('click',e=>{
    const st=e.target.closest('[data-st]'); if(st){ chartStyle=st.dataset.st; if(lastR)renderVedic(lastR); return; }
    const ds=e.target.closest('[data-ds]'); if(ds && ds.dataset.ds==='info'){ alert('Vimśottarī (120-yr) is shown. Yogini (36-yr) & Ashtottari (108-yr) are computed in the engine and coming to this menu.'); return; }
  });
  panel.addEventListener('change',e=>{ if(e.target.id==='vVargaSel'){ vargaN=+e.target.value; if(lastR)renderVedic(lastR); } });
}
window.renderVedic = renderVedic;
window.initVedicUI = initVedicUI;
})();
