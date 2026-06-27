/* ===========================================================================
   As Above · Your Birth Sky
   Pick a place + moment -> real positions of Sun/Moon/planets, the sky dome,
   the zodiac wheel, the lunar nodes, Ascendant & Midheaven.
   Positions via Astronomy Engine (tropical, ecliptic of date). Vanilla JS.
   =========================================================================== */
'use strict';
const A = window.Astronomy;
const D2R = Math.PI/180, R2D = 180/Math.PI;
const $  = s => document.querySelector(s);

/* ---- catalogue ---------------------------------------------------------- */
const BODIES = [
  {key:'Sun',     glyph:'☉', color:'#ffd34d', big:1},
  {key:'Moon',    glyph:'☽', color:'#e6ebff'},
  {key:'Mercury', glyph:'☿', color:'#cda96b'},
  {key:'Venus',   glyph:'♀', color:'#ffe7a8'},
  {key:'Mars',    glyph:'♂', color:'#ff6b53'},
  {key:'Jupiter', glyph:'♃', color:'#f3c98b'},
  {key:'Saturn',  glyph:'♄', color:'#e2c074'},
  {key:'Uranus',  glyph:'♅', color:'#8fe0e8'},
  {key:'Neptune', glyph:'♆', color:'#6aa0ff'},
  {key:'Pluto',   glyph:'♇', color:'#c08bd9'},
];
const SIGNS = [
  ['Aries','♈','fire'],['Taurus','♉','earth'],['Gemini','♊','air'],['Cancer','♋','water'],
  ['Leo','♌','fire'],['Virgo','♍','earth'],['Libra','♎','air'],['Scorpio','♏','water'],
  ['Sagittarius','♐','fire'],['Capricorn','♑','earth'],['Aquarius','♒','air'],['Pisces','♓','water'],
];
const ELEM = {fire:'#ff7a59',earth:'#7bd88f',air:'#ffd86b',water:'#6cb6ff'};
const C8 = ['N','NE','E','SE','S','SW','W','NW'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const PHASE_NAMES = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
const PHASE_EMOJI = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];

const norm = x => ((x % 360) + 360) % 360;
const signIdx = lon => Math.floor(norm(lon)/30);
const compass = az => C8[Math.round(norm(az)/45) % 8];
function dms(lon){ lon = norm(lon); const i = signIdx(lon); const d = lon - i*30;
  const deg = Math.floor(d), mn = Math.round((d-deg)*60);
  return {sign:SIGNS[i], deg, mn, label:`${deg}°${String(mn).padStart(2,'0')}′`}; }

/* ---- time zone -> UTC ---------------------------------------------------- */
function tzOffset(utcMs, tz){
  const dtf = new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const p = {}; for(const x of dtf.formatToParts(new Date(utcMs))) p[x.type]=x.value;
  let hh = +p.hour; if(hh===24) hh=0;
  return Date.UTC(+p.year, +p.month-1, +p.day, hh, +p.minute, +p.second) - utcMs;
}
function zonedToUTC(y,mo,d,h,mi,tz){
  const guess = Date.UTC(y, mo-1, d, h, mi);
  const o1 = tzOffset(guess, tz); let utc = guess - o1;
  const o2 = tzOffset(utc, tz); if(o2!==o1) utc = guess - o2;
  return new Date(utc);
}

/* ---- astronomy ----------------------------------------------------------- */
function obliquity(t){ const T = t.tt/36525;
  return 23.439291 - 0.0130042*T - 1.64e-7*T*T + 5.04e-7*T*T*T; }       // deg, mean of date
function tropLon(key, date, rot){
  const v = key==='Moon' ? A.GeoMoon(date) : A.GeoVector(A.Body[key], date, true);
  return norm(A.SphereFromVector(A.RotateVector(rot, v)).lon);
}
function eclSph(key, date, rot){
  const v = key==='Moon' ? A.GeoMoon(date) : A.GeoVector(A.Body[key], date, true);
  return A.SphereFromVector(A.RotateVector(rot, v));
}
function isRetro(key, date){
  if(key==='Sun'||key==='Moon') return false;
  const t = A.MakeTime(date);
  const l0 = tropLon(key, t,            A.Rotation_EQJ_ECT(t));
  const t1 = t.AddDays(1);
  const l1 = tropLon(key, t1,           A.Rotation_EQJ_ECT(t1));
  let d = l1 - l0; if(d>180) d-=360; if(d<-180) d+=360;
  return d < 0;
}
function trueNode(date, rot){                                            // ascending node ecliptic longitude
  const t = A.MakeTime(date), dt = 60/86400;
  const r  = A.RotateVector(rot, A.GeoMoon(t));
  const p1 = A.RotateVector(rot, A.GeoMoon(t.AddDays(-dt)));
  const p2 = A.RotateVector(rot, A.GeoMoon(t.AddDays( dt)));
  const v = {x:p2.x-p1.x, y:p2.y-p1.y, z:p2.z-p1.z};
  const h = {x:r.y*v.z-r.z*v.y, y:r.z*v.x-r.x*v.z, z:r.x*v.y-r.y*v.x};
  return norm(Math.atan2(h.x, -h.y) * R2D);
}
function ascMC(date, lat, lon){
  const t = A.MakeTime(date);
  const lst = A.SiderealTime(date) + lon/15;                            // sidereal hours
  const ramc = norm(lst*15) * D2R;
  const e = obliquity(t)*D2R, phi = lat*D2R;
  const mc  = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc)*Math.cos(e)) * R2D);
  const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(e)+Math.tan(phi)*Math.sin(e))) * R2D);
  return {asc, mc};
}
function eclToHorizon(date, obs, lonDeg){                                // a point on the ecliptic (lat 0)
  const t = A.MakeTime(date), e = obliquity(t)*D2R, l = lonDeg*D2R;
  const ra  = norm(Math.atan2(Math.cos(e)*Math.sin(l), Math.cos(l)) * R2D)/15;
  const dec = Math.asin(Math.sin(e)*Math.sin(l)) * R2D;
  const h = A.Horizon(date, obs, ra, dec, 'normal');
  return {az:h.azimuth, alt:h.altitude};
}

/* ---- state --------------------------------------------------------------- */
const today = new Date();
const MIN_YEAR = 1800;
const dayMs = 86400000;
const todayMid = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
const maxDaysBack = Math.floor((todayMid - Date.UTC(MIN_YEAR,0,1)) / dayMs);

const S = {
  lat:51.5074, lng:-0.1278, place:'London, United Kingdom', tz:'Europe/London',
  y:today.getFullYear(), mo:today.getMonth()+1, d:today.getDate(),
  h:12, mi:0, timeKnown:true, showAspects:false,
};

/* ---- city search & reverse lookup --------------------------------------- */
const CITIES = window.BIRTHSKY_CITIES || [];
const TZ = window.BIRTHSKY_TZ || [];
const COUNTRIES = window.BIRTHSKY_COUNTRIES || {};
const cityName = r => `${r[0]}, ${COUNTRIES[r[1]]||r[1]}`;
const cityKeys = CITIES.map(r => r[0].toLowerCase());

function searchCities(q){
  q = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  if(q.length < 2) return [];
  const starts = [], has = [];
  for(let i=0;i<CITIES.length;i++){
    const k = cityKeys[i];
    if(k.startsWith(q)) starts.push(i);
    else if(k.includes(q)) has.push(i);
    if(starts.length > 60) break;
  }
  return starts.concat(has).slice(0,40);
}
function nearestCity(lat,lng){
  let best=null, bd=Infinity, cl=Math.cos(lat*D2R);
  for(const r of CITIES){
    const dx=(r[3]-lng)*cl, dy=r[2]-lat, dd=dx*dx+dy*dy;
    if(dd<bd){bd=dd;best=r;}
  }
  return best;
}

/* ---- compute ------------------------------------------------------------- */
function compute(){
  const useH = S.timeKnown ? S.h : 12, useM = S.timeKnown ? S.mi : 0;
  const date = zonedToUTC(S.y, S.mo, S.d, useH, useM, S.tz);
  const obs  = new A.Observer(S.lat, S.lng, 0);
  const rot  = A.Rotation_EQJ_ECT(date);
  const out  = {date, obs, bodies:[]};

  for(const b of BODIES){
    const eq  = A.Equator(A.Body[b.key], date, obs, true, true);
    const hor = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
    const sph = eclSph(b.key, date, rot);
    out.bodies.push({...b, az:hor.azimuth, alt:hor.altitude,
      lon:norm(sph.lon), eclLat:sph.lat, dist:sph.dist, retro:isRetro(b.key,date)});
  }
  const nodeLon = trueNode(date, rot);
  out.nodeN = nodeLon; out.nodeS = norm(nodeLon+180);
  out.nodeNh = eclToHorizon(date, obs, out.nodeN);
  out.nodeSh = eclToHorizon(date, obs, out.nodeS);
  const am = ascMC(date, S.lat, S.lng);
  out.asc = am.asc; out.mc = am.mc;
  out.ascH = eclToHorizon(date, obs, am.asc);
  out.mcH  = eclToHorizon(date, obs, am.mc);

  const sun = out.bodies[0].lon, moon = out.bodies[1].lon;
  out.phase = norm(moon - sun);
  out.illum = (1 - Math.cos(out.phase*D2R))/2;
  out.phaseIx = Math.round(out.phase/45) % 8;
  return out;
}

/* ---- describe ------------------------------------------------------------ */
function skyPhrase(b){
  if(!S.timeKnown) return '';
  const dir = compass(b.az);
  if(b.alt < -2) return `below the horizon, beneath the ${dir}`;
  if(b.alt < 0)  return `right on the ${dir} horizon`;
  if(b.alt > 78) return `almost directly overhead`;
  if(b.alt <= 7){
    const rising = b.az < 180;
    return `low on the ${dir} horizon, ${rising?'rising':'setting'}`;
  }
  return `${Math.round(b.alt)}° up in the ${dir}`;
}

/* ===========================================================================
   RENDER
   =========================================================================== */
function render(){
  const r = compute();
  renderSummary(r);
  renderSky(r);
  renderWheel(r);
  renderTable(r);
}

/* ---- summary ------------------------------------------------------------- */
function renderSummary(r){
  const sun = r.bodies[0], moon = r.bodies[1];
  const dt = new Date(Date.UTC(S.y, S.mo-1, S.d));
  const wd = WD[dt.getUTCDay()];
  const timeStr = S.timeKnown ? fmtTime(S.h,S.mi) : 'an unknown time';
  const sunSign = dms(sun.lon).sign, moonSign = dms(moon.lon).sign;
  const ph = PHASE_NAMES[r.phaseIx], em = PHASE_EMOJI[r.phaseIx];
  let html = `<div class="lead">As above, so below</div>`;
  html += `On <b>${wd} ${S.d} ${MONTHS[S.mo-1]} ${S.y}</b> at <b>${timeStr}</b> in <b>${esc(S.place)}</b>, `;
  html += `the Sun ${sky2(sun,'was')} in <b>${sunSign[0]}</b>, and the <span class="moon-emoji">${em}</span> Moon `;
  html += `(<b>${ph}</b>, ${Math.round(r.illum*100)}% lit) ${sky2(moon,'was')} in <b>${moonSign[0]}</b>. `;
  if(S.timeKnown){
    const a = dms(r.asc).sign;
    html += `<b>${a[0]}</b> was rising on the eastern horizon — your Ascendant.`;
  } else {
    html += `<span style="color:var(--faint)">Birth time unknown, so the Ascendant &amp; houses are hidden.</span>`;
  }
  $('#summary').innerHTML = html;
  $('#summary').classList.remove('hidden');
}
function sky2(b,verb){
  if(!S.timeKnown) return verb;
  const dir = compass(b.az);
  if(b.alt < -2) return `${verb} below the ${dir} horizon`;
  if(b.alt <= 7) return `${verb} ${b.az<180?'rising in the '+dir:'setting in the '+dir}`;
  if(b.alt > 78) return `${verb} high overhead`;
  return `${verb} ${Math.round(b.alt)}° up in the ${dir}`;
}
function fmtTime(h,mi){ const ap=h<12?'am':'pm'; let hh=h%12; if(hh===0) hh=12;
  return `${hh}:${String(mi).padStart(2,'0')} ${ap}`; }

/* ---- sky dome ------------------------------------------------------------ */
function renderSky(r){
  const W=440, C=220, R=176;
  const pos = (az,alt) => { const rr = (1 - Math.max(alt,0)/90)*R;
    return [C - rr*Math.sin(az*D2R), C - rr*Math.cos(az*D2R)]; };
  let s = `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Sky dome">`;
  s += `<defs><radialGradient id="skyG" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stop-color="#1a1746"/><stop offset="70%" stop-color="#100c30"/><stop offset="100%" stop-color="#0a0822"/></radialGradient></defs>`;
  // below-horizon band + sky disc
  s += `<circle cx="${C}" cy="${C}" r="${R+22}" fill="#06040f" stroke="${'rgba(120,110,180,.18)'}"/>`;
  s += `<circle cx="${C}" cy="${C}" r="${R}" fill="url(#skyG)" stroke="rgba(244,213,141,.5)" stroke-width="1.5"/>`;
  // altitude rings
  for(const alt of [30,60]){ const rr=(1-alt/90)*R;
    s += `<circle cx="${C}" cy="${C}" r="${rr}" fill="none" stroke="rgba(180,170,255,.16)" stroke-dasharray="2 5"/>`;
    s += `<text class="ringlbl" x="${C+3}" y="${C-rr+2}">${alt}°</text>`; }
  s += `<circle cx="${C}" cy="${C}" r="2.5" fill="rgba(244,213,141,.7)"/><text class="ringlbl" x="${C+5}" y="${C+3}">zenith</text>`;
  // cardinal + intercardinal ticks
  const card=[['N',0],['E',90],['S',180],['W',270]];
  for(const [lab,az] of card){ const o=R+13, x=C-o*Math.sin(az*D2R), y=C-o*Math.cos(az*D2R);
    s += `<text class="cardinal" x="${x}" y="${y+4}" text-anchor="middle">${lab}</text>`; }
  for(const az of [45,135,225,315]){ const [x1,y1]=pos(az,0);
    s += `<line x1="${C}" y1="${C}" x2="${x1}" y2="${y1}" stroke="rgba(180,170,255,.07)"/>`; }
  // nodes + asc/mc as faint reference points
  const refs = [
    {g:'☊',p:r.nodeNh,c:'#b6a8ff',name:'North Node'},
    {g:'☋',p:r.nodeSh,c:'#8c82c4',name:'South Node'},
  ];
  if(S.timeKnown){ refs.push({g:'Asc',p:r.ascH,c:'#f4d58d',small:1,name:'Ascendant'},
                              {g:'MC',p:r.mcH,c:'#f4d58d',small:1,name:'Midheaven'}); }
  for(const f of refs){ const below=f.p.alt<0;
    const rr=below?R+11:(1-f.p.alt/90)*R; const x=C-rr*Math.sin(f.p.az*D2R), y=C-rr*Math.cos(f.p.az*D2R);
    s += `<g class="${below?'below':''}"><text x="${x}" y="${y+3}" text-anchor="middle" fill="${f.c}" `+
         `font-size="${f.small?9:13}" data-tip="${f.name}|${compass(f.p.az)} · alt ${f.p.alt.toFixed(0)}°">${f.g}</text></g>`; }
  // bodies
  for(const b of r.bodies){
    const below = b.alt < 0;
    let x,y;
    if(below){ const rr=R+11; x=C-rr*Math.sin(b.az*D2R); y=C-rr*Math.cos(b.az*D2R); }
    else { [x,y]=pos(b.az,b.alt); }
    const halo = b.key==='Sun'?12:(b.big?9:8);
    s += `<g class="body-glyph ${below?'below':''}" data-tip="${b.key} ${b.retro?'℞':''}|${dms(b.lon).sign[0]} ${dms(b.lon).label} · ${skyPhrase(b)||'sign only'}">`;
    if(!below) s += `<circle cx="${x}" cy="${y}" r="${halo}" fill="${b.color}" opacity="${b.key==='Sun'?.28:.16}"/>`;
    s += `<text x="${x}" y="${y+5}" text-anchor="middle" font-size="${b.big?18:15}" fill="${b.color}">${b.glyph}</text></g>`;
  }
  s += `</svg>`;
  $('#skyChart').innerHTML = s;
}

/* ---- zodiac wheel -------------------------------------------------------- */
function renderWheel(r){
  const W=440, C=220;
  const Rsign=204, Rsign2=176, Rtick=176, Rplanet=150, Rasp=120, Rinner=108;
  const ascLon = S.timeKnown ? r.asc : 0;
  const ang = lon => (180 + (norm(lon)-ascLon)) * D2R;           // screen radians (math, y-up handled below)
  const P = (lon,rad) => [C + rad*Math.cos(ang(lon)), C - rad*Math.sin(ang(lon))];

  let s = `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Zodiac wheel">`;
  s += `<circle cx="${C}" cy="${C}" r="${Rsign}" fill="#0c0926"/>`;
  // sign sectors
  for(let i=0;i<12;i++){
    const a0=ang(i*30), a1=ang(i*30+30);
    const x0=C+Rsign*Math.cos(a0), y0=C-Rsign*Math.sin(a0);
    const x1=C+Rsign*Math.cos(a1), y1=C-Rsign*Math.sin(a1);
    const xi0=C+Rsign2*Math.cos(a0), yi0=C-Rsign2*Math.sin(a0);
    const xi1=C+Rsign2*Math.cos(a1), yi1=C-Rsign2*Math.sin(a1);
    const col=ELEM[SIGNS[i][2]];
    s += `<path d="M${x0} ${y0} A${Rsign} ${Rsign} 0 0 0 ${x1} ${y1} L${xi1} ${yi1} A${Rsign2} ${Rsign2} 0 0 1 ${xi0} ${yi0} Z" fill="${col}" opacity=".13" stroke="rgba(180,170,255,.18)"/>`;
    const [gx,gy]=P(i*30+15,(Rsign+Rsign2)/2);
    s += `<text x="${gx}" y="${gy+6}" text-anchor="middle" font-size="17" fill="${col}">${SIGNS[i][1]}</text>`;
  }
  // degree ticks every 5°/10°
  for(let dlon=0; dlon<360; dlon+=5){
    const len = (dlon%30===0)?10:(dlon%10===0?6:3);
    const [x0,y0]=P(dlon,Rtick), [x1,y1]=P(dlon,Rtick-len);
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="rgba(180,170,255,.28)"/>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${Rinner}" fill="none" stroke="rgba(180,170,255,.18)"/>`;

  // angles: ASC / DSC / MC / IC spokes
  if(S.timeKnown){
    const angles=[[r.asc,'Asc'],[norm(r.asc+180),'Dsc'],[r.mc,'MC'],[norm(r.mc+180),'IC']];
    for(const [lon,lab] of angles){
      const [x0,y0]=P(lon,Rinner), [x1,y1]=P(lon,Rsign2);
      s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${lab==='Asc'||lab==='MC'?'rgba(244,213,141,.8)':'rgba(244,213,141,.32)'}" stroke-width="${lab==='Asc'||lab==='MC'?2:1}"/>`;
      const [lx,ly]=P(lon,Rinner-12);
      s += `<text x="${lx}" y="${ly+3}" text-anchor="middle" font-size="10" fill="#f4d58d">${lab}</text>`;
    }
  }

  // aspects
  if(S.showAspects){ s += aspectLines(r,P,Rasp); }

  // planet glyphs (with simple de-collision)
  const pts = r.bodies.map(b=>({lon:b.lon,glyph:b.glyph,color:b.color,retro:b.retro,name:b.key}));
  pts.push({lon:r.nodeN,glyph:'☊',color:'#b6a8ff',name:'North Node'});
  pts.push({lon:r.nodeS,glyph:'☋',color:'#8c82c4',name:'South Node'});
  pts.sort((a,b)=>a.lon-b.lon);
  let lastA=-99, tier=0;
  for(const p of pts){
    const a=norm(p.lon-ascLon);
    if(a-lastA < 8) tier=(tier+1)%3; else tier=0;
    lastA=a;
    const rad=Rplanet - tier*20;
    const [x,y]=P(p.lon,rad);
    const d=dms(p.lon);
    // tick from rim to glyph
    const [tx,ty]=P(p.lon,Rtick-2);
    s += `<line x1="${tx}" y1="${ty}" x2="${x}" y2="${y}" stroke="${p.color}" stroke-opacity=".4"/>`;
    s += `<g class="body-glyph" data-tip="${p.name} ${p.retro?'℞':''}|${d.sign[0]} ${d.label}">`+
         `<text x="${x}" y="${y+5}" text-anchor="middle" font-size="16" fill="${p.color}">${p.glyph}</text>`+
         (p.retro?`<text x="${x+11}" y="${y-6}" font-size="9" fill="#ff7a59">℞</text>`:``)+`</g>`;
  }
  // center label
  const sunSign=dms(r.bodies[0].lon).sign, moonSign=dms(r.bodies[1].lon).sign;
  s += `<text x="${C}" y="${C-6}" text-anchor="middle" font-size="11" fill="var(--dim)">☉ ${sunSign[1]} · ☽ ${moonSign[1]}</text>`;
  if(S.timeKnown){ const a=dms(r.asc).sign; s += `<text x="${C}" y="${C+12}" text-anchor="middle" font-size="11" fill="#f4d58d">Asc ${a[1]}</text>`; }
  s += `</svg>`;
  $('#wheelChart').innerHTML = s;
}

const ASPECTS = [[0,6,'#f4d58d'],[60,4,'#6cb6ff'],[90,5,'#ff7a59'],[120,5,'#7bd88f'],[180,6,'#ff6b53']];
function aspectLines(r,P,rad){
  const list = r.bodies.map(b=>({lon:b.lon,n:b.key})).concat([{lon:r.nodeN,n:'N.Node'}]);
  let out='';
  for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){
    let sep=Math.abs(list[i].lon-list[j].lon); if(sep>180) sep=360-sep;
    for(const [ang,orb,col] of ASPECTS){ if(Math.abs(sep-ang)<=orb){
      const [x0,y0]=P(list[i].lon,rad), [x1,y1]=P(list[j].lon,rad);
      out += `<line class="aspect-line" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${col}"/>`; break; }}
  }
  return out;
}

/* ---- table --------------------------------------------------------------- */
function renderTable(r){
  let rows='';
  const row=(glyph,color,name,b,extra)=>{
    const d=dms(b.lon);
    const altTxt = (b.alt==null)?'—':(b.alt<0?`<span class="bt-down">${b.alt.toFixed(0)}°</span>`:`<span class="bt-up">+${b.alt.toFixed(0)}°</span>`);
    const dir = (b.az==null||!S.timeKnown)?'—':`${compass(b.az)} <span class="tag">${b.az.toFixed(0)}°</span>`;
    const sky = S.timeKnown ? (extra||skyPhrase(b)||'—') : '<span class="bt-down">time unknown</span>';
    return `<tr><td><span class="bt-glyph" style="color:${color}">${glyph}</span><span class="bt-name">${name}</span>`+
      `${b.retro?'<span class="bt-retro">℞</span>':''}</td>`+
      `<td>${sky}</td><td><span class="bt-glyph" style="color:${ELEM[d.sign[2]]}">${d.sign[1]}</span> ${d.sign[0]} ${d.label}</td>`+
      `<td>${altTxt}</td><td>${dir}</td></tr>`;
  };
  for(const b of r.bodies) rows += row(b.glyph,b.color,b.key,b);
  // angles & nodes
  if(S.timeKnown){
    rows += row('Asc','#f4d58d','Ascendant',{lon:r.asc,az:r.ascH.az,alt:r.ascH.alt},'rising due east');
    rows += row('MC','#f4d58d','Midheaven',{lon:r.mc,az:r.mcH.az,alt:r.mcH.alt},'on the meridian (highest point)');
  }
  rows += row('☊','#b6a8ff','North Node (Rahu)',{lon:r.nodeN,az:r.nodeNh.az,alt:r.nodeNh.alt});
  rows += row('☋','#8c82c4','South Node (Ketu)',{lon:r.nodeS,az:r.nodeSh.az,alt:r.nodeSh.alt});
  $('#bodyRows').innerHTML = rows;
}

/* ---- helpers ------------------------------------------------------------- */
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }

/* ===========================================================================
   GLOBE
   =========================================================================== */
let globe;
function initGlobe(){
  const el = $('#globeViz');
  globe = Globe()(el)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#9ab4ff').atmosphereAltitude(0.18)
    .globeImageUrl('lib/earth-dark.jpg').bumpImageUrl('lib/earth-topology.png')
    .pointsData([]).pointLat('lat').pointLng('lng').pointColor(()=> '#f4d58d')
      .pointAltitude(0.012).pointRadius(0.9).pointsMerge(false)
    .ringsData([]).ringLat('lat').ringLng('lng').ringColor(()=>(t=>`rgba(244,213,141,${1-t})`))
      .ringMaxRadius(3.2).ringPropagationSpeed(1.6).ringRepeatPeriod(900)
    .onGlobeClick(({lat,lng})=> pickLatLng(lat,lng,true));
  sizeGlobe();
  const c = globe.controls(); c.autoRotate=true; c.autoRotateSpeed=0.55; c.enableZoom=true;
  el.addEventListener('pointerdown',()=>{ c.autoRotate=false; });
  window.addEventListener('resize', sizeGlobe);
}
function sizeGlobe(){ const el=$('#globeViz'); if(globe){ globe.width(el.clientWidth).height(el.clientHeight); } }
function markGlobe(fly){
  if(!globe) return;
  globe.pointsData([{lat:S.lat,lng:S.lng}]).ringsData([{lat:S.lat,lng:S.lng}]);
  if(fly) globe.pointOfView({lat:S.lat,lng:S.lng,altitude:1.7},800);
}

/* ===========================================================================
   PICKING PLACE / TIME
   =========================================================================== */
function pickCity(r){
  S.lat=r[2]; S.lng=r[3]; S.place=cityName(r); S.tz=TZ[r[5]]||'UTC';
  $('#search').value=''; $('#searchResults').classList.add('hidden');
  updatePlaceReadout(); markGlobe(true); render();
}
function pickLatLng(lat,lng,fromGlobe){
  S.lat=+lat.toFixed(4); S.lng=+lng.toFixed(4);
  const near = nearestCity(lat,lng);
  S.tz = (window.tzlookup && tzlookup(lat,lng)) || (near?TZ[near[5]]:null) || 'UTC';
  // distance to nearest city (deg) for naming
  let label;
  if(near){ const dx=(near[3]-lng)*Math.cos(lat*D2R), dy=near[2]-lat;
    const km = Math.sqrt(dx*dx+dy*dy)*111;
    label = km<40 ? cityName(near) : `near ${cityName(near)} (${Math.round(km)} km)`;
  } else label = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
  S.place=label;
  updatePlaceReadout(); markGlobe(fromGlobe?false:true); render();
}
function updatePlaceReadout(){
  $('#placeReadout').innerHTML =
    `📍 <b>${esc(S.place)}</b><br><span style="color:var(--faint)">`+
    `${Math.abs(S.lat).toFixed(2)}°${S.lat>=0?'N':'S'}, ${Math.abs(S.lng).toFixed(2)}°${S.lng>=0?'E':'W'} · ${S.tz}</span>`;
}

/* day slider <-> date */
function setDateFromParts(){ syncDaySlider(); syncInputs(); render(); }
function daysBackOf(y,mo,d){ return Math.round((todayMid - Date.UTC(y,mo-1,d))/dayMs); }
function syncDaySlider(){
  const db = Math.min(Math.max(daysBackOf(S.y,S.mo,S.d),0),maxDaysBack);
  $('#daySlider').value = db;
  const dt=new Date(Date.UTC(S.y,S.mo-1,S.d));
  $('#tmDate').textContent = `${S.d} ${MONTHS[S.mo-1].slice(0,3)} ${S.y}`;
  const yrs=(db/365.25);
  $('#tmAgo').textContent = db<1?'today':(yrs<1?`${db} days ago`:`${yrs.toFixed(1)} years ago`);
}
function syncInputs(){
  $('#dateInput').value = `${S.y}-${String(S.mo).padStart(2,'0')}-${String(S.d).padStart(2,'0')}`;
  $('#timeInput').value = `${String(S.h).padStart(2,'0')}:${String(S.mi).padStart(2,'0')}`;
  $('#minSlider').value = S.h*60+S.mi;
  $('#todReadout').textContent = S.timeKnown? fmtTime(S.h,S.mi) : 'unknown';
}

/* ===========================================================================
   WIRING
   =========================================================================== */
let rafPending=false;
function scheduleRender(){ if(rafPending) return; rafPending=true;
  requestAnimationFrame(()=>{ rafPending=false; render(); }); }

function wire(){
  // search
  const si=$('#search'), sr=$('#searchResults');
  let actIdx=-1, cur=[];
  si.addEventListener('input',()=>{
    cur=searchCities(si.value); actIdx=-1;
    if(!cur.length){ sr.classList.add('hidden'); return; }
    sr.innerHTML = cur.map((ix,n)=>{ const r=CITIES[ix];
      return `<div class="res" data-n="${n}"><span class="nm">${esc(r[0])}</span>`+
        `<span class="cc">${esc(COUNTRIES[r[1]]||r[1])} <span class="pop">${r[4]?'· '+fmtPop(r[4]):''}</span></span></div>`;
    }).join('');
    sr.classList.remove('hidden');
  });
  sr.addEventListener('click',e=>{ const el=e.target.closest('.res'); if(el) pickCity(CITIES[cur[+el.dataset.n]]); });
  si.addEventListener('keydown',e=>{
    if(sr.classList.contains('hidden')) return;
    const items=[...sr.querySelectorAll('.res')];
    if(e.key==='ArrowDown'){ actIdx=Math.min(actIdx+1,items.length-1); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ actIdx=Math.max(actIdx-1,0); e.preventDefault(); }
    else if(e.key==='Enter'){ if(actIdx>=0) pickCity(CITIES[cur[actIdx]]); return; }
    else if(e.key==='Escape'){ sr.classList.add('hidden'); return; }
    items.forEach((it,n)=>it.classList.toggle('act',n===actIdx));
    if(items[actIdx]) items[actIdx].scrollIntoView({block:'nearest'});
  });
  document.addEventListener('click',e=>{ if(!e.target.closest('#searchWrap')) sr.classList.add('hidden'); });

  // date / time inputs
  $('#dateInput').addEventListener('change',e=>{
    const [y,mo,d]=e.target.value.split('-').map(Number);
    if(y){ S.y=y; S.mo=mo; S.d=d; setDateFromParts(); }
  });
  $('#timeInput').addEventListener('change',e=>{
    const [h,mi]=e.target.value.split(':').map(Number);
    if(!isNaN(h)){ S.h=h; S.mi=mi; S.timeKnown=true; $('#unknownBtn').classList.remove('on'); syncInputs(); render(); }
  });
  // day slider (drag through time)
  $('#daySlider').addEventListener('input',e=>{
    const db=+e.target.value; const ms=todayMid - db*dayMs; const dt=new Date(ms);
    S.y=dt.getUTCFullYear(); S.mo=dt.getUTCMonth()+1; S.d=dt.getUTCDate();
    syncDaySlider(); $('#dateInput').value=`${S.y}-${String(S.mo).padStart(2,'0')}-${String(S.d).padStart(2,'0')}`;
    scheduleRender();
  });
  // time-of-day slider
  $('#minSlider').addEventListener('input',e=>{
    const m=+e.target.value; S.h=Math.floor(m/60); S.mi=m%60; S.timeKnown=true;
    $('#unknownBtn').classList.remove('on');
    $('#timeInput').value=`${String(S.h).padStart(2,'0')}:${String(S.mi).padStart(2,'0')}`;
    $('#todReadout').textContent=fmtTime(S.h,S.mi);
    scheduleRender();
  });
  // presets
  $('#presets').addEventListener('click',e=>{
    const p=e.target.closest('button'); if(!p) return; const k=p.dataset.preset;
    $('#unknownBtn').classList.remove('on');
    if(k==='now'){ const n=new Date(); S.y=n.getFullYear();S.mo=n.getMonth()+1;S.d=n.getDate();S.h=n.getHours();S.mi=n.getMinutes();S.timeKnown=true; setDateFromParts(); }
    else if(k==='noon'){ S.h=12;S.mi=0;S.timeKnown=true; syncInputs(); render(); }
    else if(k==='midnight'){ S.h=0;S.mi=0;S.timeKnown=true; syncInputs(); render(); }
    else if(k==='unknown'){ S.timeKnown=false; p.classList.add('on'); syncInputs(); render(); }
  });

  // aspects toggle
  $('#miAspects').addEventListener('click',()=>{ S.showAspects=!S.showAspects;
    $('#miAspects').classList.toggle('on',S.showAspects); $('#aspState').textContent=S.showAspects?'on':'off'; render(); });

  // overlays
  $('#welStart').addEventListener('click',()=>$('#welcomeOverlay').classList.add('hidden'));
  $('#miHelp').addEventListener('click',()=>$('#helpOverlay').classList.remove('hidden'));
  $('#miAbout').addEventListener('click',()=>$('#aboutOverlay').classList.remove('hidden'));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.add('hidden'); }));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('.overlay:not(.hidden)').forEach(o=>o.classList.add('hidden')); });

  // header home -> reset
  const home=()=>{ document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden'));
    $('#welcomeOverlay').classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'}); markGlobe(true); };
  $('#brandHome').addEventListener('click',home);
  $('#brandHome').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();home();} });

  // tooltip (delegated)
  const tip=$('#tooltip');
  document.addEventListener('pointermove',e=>{
    const t=e.target.closest('[data-tip]');
    if(!t){ tip.classList.add('hidden'); return; }
    const [h,sub]=t.getAttribute('data-tip').split('|');
    tip.innerHTML=`<div class="tt-h">${esc(h)}</div>${sub?`<div class="tt-r">${esc(sub)}</div>`:''}`;
    tip.classList.remove('hidden');
    let x=e.clientX+14, y=e.clientY+14;
    if(x+240>innerWidth) x=e.clientX-240; if(y+70>innerHeight) y=e.clientY-70;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  });
}

function fmtPop(p){ return p>=1e6?(p/1e6).toFixed(1)+'M':p>=1e3?Math.round(p/1e3)+'k':p; }

/* ===========================================================================
   INIT
   =========================================================================== */
function init(){
  if(!A){ $('#summary').innerHTML='Astronomy engine failed to load.'; $('#summary').classList.remove('hidden'); return; }
  // configure day slider range
  $('#daySlider').max = maxDaysBack;
  initGlobe();
  updatePlaceReadout(); markGlobe(true);
  syncDaySlider(); syncInputs();
  wire();
  render();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
