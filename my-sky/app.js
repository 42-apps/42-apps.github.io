/* ===========================================================================
   My Sky  ·  brand: "My Birth Sky"
   Pick a place + moment -> real positions of Sun/Moon/planets, then see them as:
   the sky dome + zodiac wheel (SVG), a first-person 3D planetarium you stand
   under, and the heliocentric solar system from space (three.js). Plus the lunar
   nodes, Ascendant/Midheaven, and saved skies (localStorage, per person).
   Positions via Astronomy Engine (tropical, ecliptic of date). Vanilla JS.
   =========================================================================== */
'use strict';
const A = window.Astronomy;
const T3 = window.THREE;
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
function eclPointHorizon(date, obs, lonDeg, latDeg){                     // any ecliptic-of-date point -> az/alt
  const t = A.MakeTime(date), e = obliquity(t)*D2R, l = lonDeg*D2R, b = (latDeg||0)*D2R;
  const dec = Math.asin(Math.sin(b)*Math.cos(e) + Math.cos(b)*Math.sin(e)*Math.sin(l));
  const ra  = norm(Math.atan2(Math.sin(l)*Math.cos(e) - Math.tan(b)*Math.sin(e), Math.cos(l)) * R2D)/15;
  const h = A.Horizon(date, obs, ra, dec*R2D, 'normal');
  return {az:h.azimuth, alt:h.altitude};
}
function eclToHorizon(date, obs, lonDeg){ return eclPointHorizon(date, obs, lonDeg, 0); }

/* ---- ayanamsa (tropical <-> sidereal) ------------------------------------ */
// Lahiri computed rigorously: the bright star Spica (Chitra) sits at sidereal 180° (True Chitra Paksha).
// sidereal longitude = tropical-of-date longitude − ayanamsa.  Other ayanamsas ~ constant offsets from Lahiri.
const SPICA = {ra:(13+25/60+11.58/3600)*15, dec:-(11+9/60+40.8/3600)};   // J2000 deg
const AYAN_OFFSET = {lahiri:0, fagan:0.90, raman:-1.38, kp:-0.08};       // approx degrees relative to True-Chitra Lahiri
const ZODIAC_NAMES = {tropical:'Tropical', lahiri:'Sidereal · Lahiri', fagan:'Sidereal · Fagan/Bradley',
  raman:'Sidereal · Raman', kp:'Sidereal · Krishnamurti', custom:'Sidereal · custom'};
function spicaTropLon(date, rot){
  const ra=SPICA.ra*D2R, dec=SPICA.dec*D2R;
  const v={x:Math.cos(dec)*Math.cos(ra), y:Math.cos(dec)*Math.sin(ra), z:Math.sin(dec)};
  return norm(A.SphereFromVector(A.RotateVector(rot||A.Rotation_EQJ_ECT(date), v)).lon);
}
function ayanamsaFor(date, rot){
  if(S.zodiac==='tropical') return 0;
  if(S.zodiac==='custom')   return +S.ayanCustom||0;
  return norm(spicaTropLon(date, rot) - 180) + (AYAN_OFFSET[S.zodiac]||0);
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
  zodiac:'lahiri', ayanCustom:24,        // sidereal (Lahiri) by default — aligns the signs with the real stars
};
let activeView = 'charts';     // charts | sky3d | solar3d
let lastR = null;              // last compute() result, reused by every view

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
  const ayan = ayanamsaFor(date, rot);                 // tropical -> sidereal offset (0 for tropical)
  const out  = {date, obs, bodies:[], ayan};
  const sid  = lon => norm(lon - ayan);                // tropical-of-date longitude -> displayed (sidereal) longitude

  for(const b of BODIES){
    const eq  = A.Equator(A.Body[b.key], date, obs, true, true);
    const hor = A.Horizon(date, obs, eq.ra, eq.dec, 'normal');
    const sph = eclSph(b.key, date, rot);
    out.bodies.push({...b, az:hor.azimuth, alt:hor.altitude,
      lon:norm(sph.lon), zlon:sid(sph.lon), eclLat:sph.lat, dist:sph.dist, retro:isRetro(b.key,date)});
  }
  const nodeLon = trueNode(date, rot);
  out.nodeN = nodeLon; out.nodeS = norm(nodeLon+180);
  out.znodeN = sid(nodeLon); out.znodeS = sid(nodeLon+180);
  out.nodeNh = eclToHorizon(date, obs, out.nodeN);
  out.nodeSh = eclToHorizon(date, obs, out.nodeS);
  const am = ascMC(date, S.lat, S.lng);
  out.asc = am.asc; out.mc = am.mc; out.zasc = sid(am.asc); out.zmc = sid(am.mc);
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
const VIEW_CAPS = {
  charts:'Your sky as a dome (left) and the zodiac wheel (right) · directions, altitudes & signs',
  sky3d:'Standing at your birthplace, looking out — day or night, every planet where it truly stood',
  solar3d:'The whole solar system that day, seen from above — Earth in gold (distances compressed)',
  vedic:'Vedic / Jyotish — sidereal charts, daśās, pañchāṅga, ashtakavarga, yogas, KP & Jaimini',
};
function render(){
  const r = compute();
  lastR = r;
  renderSummary(r);
  renderSky(r);
  renderWheel(r);
  renderTable(r);
  // feed the active 3D view (build-once, update-only)
  if(activeView==='sky3d'  && sky3d)  updateSky3D(r);
  if(activeView==='solar3d'&& solar3d) updateSolar(r);
  if(activeView==='vedic'  && window.renderVedic) renderVedic(r);
  const cap = $('#viewCaption'); if(cap) cap.textContent = VIEW_CAPS[activeView] || '';
}

/* ---- summary ------------------------------------------------------------- */
function renderSummary(r){
  const sun = r.bodies[0], moon = r.bodies[1];
  const dt = new Date(Date.UTC(S.y, S.mo-1, S.d));
  const wd = WD[dt.getUTCDay()];
  const timeStr = S.timeKnown ? fmtTime(S.h,S.mi) : 'an unknown time';
  const sunSign = dms(sun.zlon).sign, moonSign = dms(moon.zlon).sign;
  const ph = PHASE_NAMES[r.phaseIx], em = PHASE_EMOJI[r.phaseIx];
  const zbadge = ZODIAC_NAMES[S.zodiac] + (S.zodiac!=='tropical' ? ` · ayanāṃśa ${r.ayan.toFixed(2)}°` : '');
  let html = `<div class="lead">As above, so below · <span class="zbadge">${zbadge}</span></div>`;
  html += `On <b>${wd} ${S.d} ${MONTHS[S.mo-1]} ${S.y}</b> at <b>${timeStr}</b> in <b>${esc(S.place)}</b>, `;
  html += `the Sun ${sky2(sun,'was')} in <b>${sunSign[0]}</b>, and the <span class="moon-emoji">${em}</span> Moon `;
  html += `(<b>${ph}</b>, ${Math.round(r.illum*100)}% lit) ${sky2(moon,'was')} in <b>${moonSign[0]}</b>. `;
  if(S.timeKnown){
    const a = dms(r.zasc).sign;
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
    s += `<g class="body-glyph ${below?'below':''}" data-tip="${b.key} ${b.retro?'℞':''}|${dms(b.zlon).sign[0]} ${dms(b.zlon).label} · ${skyPhrase(b)||'sign only'}">`;
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
  const ascLon = S.timeKnown ? r.zasc : 0;
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
    const angles=[[r.zasc,'Asc'],[norm(r.zasc+180),'Dsc'],[r.zmc,'MC'],[norm(r.zmc+180),'IC']];
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
  const pts = r.bodies.map(b=>({lon:b.zlon,glyph:b.glyph,color:b.color,retro:b.retro,name:b.key}));
  pts.push({lon:r.znodeN,glyph:'☊',color:'#b6a8ff',name:'North Node'});
  pts.push({lon:r.znodeS,glyph:'☋',color:'#8c82c4',name:'South Node'});
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
  const sunSign=dms(r.bodies[0].zlon).sign, moonSign=dms(r.bodies[1].zlon).sign;
  s += `<text x="${C}" y="${C-6}" text-anchor="middle" font-size="11" fill="var(--dim)">☉ ${sunSign[1]} · ☽ ${moonSign[1]}</text>`;
  if(S.timeKnown){ const a=dms(r.zasc).sign; s += `<text x="${C}" y="${C+12}" text-anchor="middle" font-size="11" fill="#f4d58d">Asc ${a[1]}</text>`; }
  s += `</svg>`;
  $('#wheelChart').innerHTML = s;
}

const ASPECTS = [[0,6,'#f4d58d'],[60,4,'#6cb6ff'],[90,5,'#ff7a59'],[120,5,'#7bd88f'],[180,6,'#ff6b53']];
function aspectLines(r,P,rad){
  const list = r.bodies.map(b=>({lon:b.zlon,n:b.key})).concat([{lon:r.znodeN,n:'N.Node'}]);
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
    const d=dms(b.zlon!=null?b.zlon:b.lon);
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
    rows += row('Asc','#f4d58d','Ascendant',{zlon:r.zasc,az:r.ascH.az,alt:r.ascH.alt},'rising due east');
    rows += row('MC','#f4d58d','Midheaven',{zlon:r.zmc,az:r.mcH.az,alt:r.mcH.alt},'on the meridian (highest point)');
  }
  rows += row('☊','#b6a8ff','North Node (Rahu)',{zlon:r.znodeN,az:r.nodeNh.az,alt:r.nodeNh.alt});
  rows += row('☋','#8c82c4','South Node (Ketu)',{zlon:r.znodeS,az:r.nodeSh.az,alt:r.nodeSh.alt});
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
    $('#miAspects').classList.toggle('on',S.showAspects); $('#aspState').textContent=S.showAspects?'on':'off';
    prefs.showAspects=S.showAspects; savePrefs(); render(); });

  // zodiac system / ayanāṃśa
  const zsel=$('#zodiacSel'), zcustom=$('#ayanCustom');
  zsel.value=S.zodiac; zcustom.value=S.ayanCustom; zcustom.classList.toggle('hidden', S.zodiac!=='custom');
  zsel.addEventListener('change',()=>{ S.zodiac=zsel.value; zcustom.classList.toggle('hidden', S.zodiac!=='custom');
    prefs.zodiac=S.zodiac; savePrefs(); render(); });
  zcustom.addEventListener('input',()=>{ S.ayanCustom=+zcustom.value||0; prefs.ayanCustom=S.ayanCustom; savePrefs();
    if(S.zodiac==='custom') render(); });

  // overlays
  $('#welStart').addEventListener('click',()=>$('#welcomeOverlay').classList.add('hidden'));
  $('#miHelp').addEventListener('click',()=>$('#helpOverlay').classList.remove('hidden'));
  $('#miAbout').addEventListener('click',()=>$('#aboutOverlay').classList.remove('hidden'));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
  document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.add('hidden'); }));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('.overlay:not(.hidden)').forEach(o=>o.classList.add('hidden')); });

  // header home -> reset
  const home=()=>{ document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden'));
    setView('charts');                                   // house rule: logo fully resets to the home view
    if(window.resetVedicUI) resetVedicUI();
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

  // view tabs (click + arrow-key roving)
  $('#viewTabs').addEventListener('click',e=>{ const b=e.target.closest('[data-view]'); if(b) setView(b.dataset.view); });
  $('#viewTabs').addEventListener('keydown',e=>{ const tabs=[...document.querySelectorAll('#viewTabs [role=tab]')];
    let i=tabs.indexOf(document.activeElement); if(i<0) return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown') i=(i+1)%tabs.length;
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp') i=(i-1+tabs.length)%tabs.length;
    else if(e.key==='Home') i=0; else if(e.key==='End') i=tabs.length-1; else return;
    e.preventDefault(); tabs[i].focus(); setView(tabs[i].dataset.view); });

  // 3D planetarium controls
  $('#sky3d').addEventListener('click',e=>{
    const b=e.target.closest('[data-sky3d]'); if(!b) return; const k=b.dataset.sky3d;
    const setTog=(key)=>{ sky3dOpts[key]=!sky3dOpts[key]; b.classList.toggle('on',sky3dOpts[key]);
      b.setAttribute('aria-pressed', String(sky3dOpts[key])); if(lastR) updateSky3D(lastR); };
    if(k==='east'){ if(sky3d){ sky3d.ctl.yaw=90; sky3d.ctl.pitch=12; sky3d.ctl.fov=72; applySkyCam(sky3d,sky3d.ctl);} }
    else if(k==='labels'){ setTog('labels'); }
    else if(k==='ecliptic'){ setTog('ecliptic'); }
    else if(k==='signs'){ setTog('signs'); }
    else if(k==='stars'){ setTog('stars'); }
  });

  // saved skies — avatar picker
  const aGrid=$('#avatarGrid');
  aGrid.innerHTML=AVATARS.map(a=>`<button type="button">${a}</button>`).join('');
  $('#avatarPick').addEventListener('click',()=>aGrid.classList.toggle('hidden'));
  aGrid.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return;
    curAvatar=b.textContent; $('#avatarPick').textContent=curAvatar; aGrid.classList.add('hidden'); });
  // save
  const doSave=()=>{ const label=$('#skyLabel').value.trim()||S.place;
    const rec=captureSky(label,curAvatar); SKIES.unshift(rec); if(SKIES.length>200) SKIES.length=200;
    const ok=lsSet(LS.skies,SKIES);
    prefs.lastSkyId=rec.id; savePrefs(); $('#skyLabel').value=''; renderSkyList();
    toast(ok ? `Saved ${rec.emoji} ${rec.label}` : "Couldn't save on this device — it may not survive a reload"); };
  $('#saveSky').addEventListener('click',doSave);
  $('#skyLabel').addEventListener('keydown',e=>{ if(e.key==='Enter') doSave(); });
  // list actions (recall / share / rename / delete)
  $('#skyList').addEventListener('click',e=>{
    const item=e.target.closest('.sky-item'); if(!item) return; const id=item.dataset.id;
    const idx=SKIES.findIndex(s=>s.id===id); if(idx<0) return; const rec=SKIES[idx];
    const act=e.target.closest('[data-act]')?.dataset.act;
    if(act==='del'){ const del=e.target.closest('.del');
      if(del.classList.contains('armed')){ SKIES.splice(idx,1); lsSet(LS.skies,SKIES);
        if(prefs.lastSkyId===id){ prefs.lastSkyId=null; savePrefs(); } renderSkyList(); toast('Deleted'); }
      else { del.classList.add('armed'); del.textContent='✓'; setTimeout(()=>{del.classList.remove('armed');del.textContent='×';},2500); }
      return; }
    if(act==='ren'){ const nn=prompt('Rename this sky',rec.label); if(nn!=null){ rec.label=nn.trim().slice(0,40)||rec.label; lsSet(LS.skies,SKIES); renderSkyList(); } return; }
    if(act==='share'){ const link=shareLink(rec);
      (navigator.clipboard?.writeText(link)||Promise.reject()).then(()=>toast('Share link copied')).catch(()=>prompt('Copy this link',link)); return; }
    applySkyRecord(rec);  // recall
  });
}

function fmtPop(p){ return p>=1e6?(p/1e6).toFixed(1)+'M':p>=1e3?Math.round(p/1e3)+'k':p; }

/* ===========================================================================
   VIEW SWITCHER
   =========================================================================== */
function setView(name){
  activeView = name;
  $('#charts').classList.toggle('hidden', name!=='charts');
  $('#sky3d').classList.toggle('hidden',  name!=='sky3d');
  $('#solar3d').classList.toggle('hidden',name!=='solar3d');
  $('#vedic').classList.toggle('hidden',  name!=='vedic');
  document.querySelectorAll('#viewTabs .toolbtn').forEach(b=>{ const on=b.dataset.view===name;
    b.classList.toggle('on',on); b.setAttribute('aria-selected',on?'true':'false'); b.tabIndex=on?0:-1; });
  $('#miAspects').disabled = (name!=='charts');   // aspect lines only exist in the Charts wheel
  prefs.lastView = name; savePrefs();
  $('#viewCaption').textContent = VIEW_CAPS[name] || '';
  if(name==='sky3d'){ if(!sky3d) initSky3D(); sizeSpace(sky3d); if(lastR) updateSky3D(lastR); renderSpace(sky3d); }
  else if(name==='solar3d'){ if(!solar3d) initSolar(); sizeSpace(solar3d); if(lastR) updateSolar(lastR); renderSpace(solar3d); }
  else if(name==='vedic' && window.renderVedic && lastR){ renderVedic(lastR); }
}
// Render-on-demand: every camera move / state change renders once (no idle rAF loop;
// also works when the tab is backgrounded, where requestAnimationFrame is paused).
function renderSpace(v){ if(v) v.renderer.render(v.scene, v.camera); }
function sizeSpace(v){
  if(!v) return;
  const el = v.host, w = el.clientWidth, h = el.clientHeight;
  if(!w||!h || (v._w===w && v._h===h)) return;
  v._w=w; v._h=h;
  v.renderer.setSize(w,h,false);
  v.camera.aspect = w/h; v.camera.updateProjectionMatrix();
  renderSpace(v);
}

/* ===========================================================================
   3D — shared helpers
   =========================================================================== */
const dirFromAzAlt = (az,alt) => { const a=az*D2R,h=alt*D2R,ca=Math.cos(h);   // +X East, +Y up, -Z North
  return new T3.Vector3(ca*Math.sin(a), Math.sin(h), -ca*Math.cos(a)); };
const toThree = v => new T3.Vector3(v.x, v.z, -v.y);                           // J2000 z-up -> three y-up

let _glowTex=null;
function glowTexture(){
  if(_glowTex) return _glowTex;
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.35,'rgba(255,255,255,.65)');
  rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=rg; g.fillRect(0,0,64,64);
  _glowTex=new T3.CanvasTexture(c); return _glowTex;
}
function labelSprite(text,color,h){
  h=h||16;
  const c=document.createElement('canvas'), pad=8, f=34;
  const g=c.getContext('2d'); g.font=`600 ${f}px Inter,system-ui,sans-serif`;
  const w=Math.ceil(g.measureText(text).width)+pad*2;
  c.width=w; c.height=f+pad*2;
  g.font=`600 ${f}px Inter,system-ui,sans-serif`; g.textBaseline='middle';
  g.fillStyle='rgba(8,6,24,.55)'; g.fillRect(0,0,c.width,c.height);
  g.fillStyle=color||'#fff'; g.fillText(text,pad,c.height/2);
  const tex=new T3.CanvasTexture(c);
  const sp=new T3.Sprite(new T3.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sp.scale.set(c.width/c.height*h, h, 1);
  return sp;
}
// hand-rolled look/orbit control. mode 'look' = camera at origin rotates; 'orbit' = around target.
function attachControl(host, opts){
  const st={yaw:opts.yaw||0, pitch:opts.pitch||0, fov:opts.fov||72, dist:opts.dist||60, dragging:false, lx:0, ly:0, onChange:opts.onChange};
  const sens=0.2;
  const pts=new Map(); let pinchD=0, moved=0;     // multi-pointer for pinch-zoom; moved = drag distance for tap detection
  const zoomBy=f=>{ if(opts.zoom==='fov') st.fov=Math.max(25,Math.min(96, st.fov*f));
    else st.dist=Math.max(opts.minDist||18,Math.min(opts.maxDist||320, st.dist*f)); st.onChange(st); };
  const reAnchor=()=>{ if(pts.size===1){ const p=[...pts.values()][0]; st.dragging=true; st.lx=p.x; st.ly=p.y; } };
  host.addEventListener('pointerdown',e=>{ host.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===1){ st.dragging=true; st.lx=e.clientX; st.ly=e.clientY; moved=0; }
    else if(pts.size===2){ st.dragging=false; const a=[...pts.values()]; pinchD=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y); }
  });
  const endPt=e=>{ const tap = opts.onTap && pts.size===1 && moved<8;
    pts.delete(e.pointerId); if(pts.size<2) pinchD=0; if(pts.size===0) st.dragging=false; reAnchor();
    if(tap) opts.onTap(e); };
  host.addEventListener('pointerup',endPt);
  host.addEventListener('pointercancel',endPt);
  host.addEventListener('pointerleave',e=>{ if(pts.has(e.pointerId)) endPt(e); });
  host.addEventListener('pointermove',e=>{
    if(pts.has(e.pointerId)) pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size>=2){ const a=[...pts.values()]; const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      if(pinchD>0 && d>0) zoomBy(pinchD/d); pinchD=d; return; }
    if(!st.dragging) return;
    const dx=e.clientX-st.lx, dy=e.clientY-st.ly; st.lx=e.clientX; st.ly=e.clientY;
    moved += Math.abs(dx)+Math.abs(dy);
    st.yaw += dx*sens; st.pitch -= dy*sens;
    st.pitch = Math.max(opts.minPitch??-88, Math.min(opts.maxPitch??88, st.pitch));
    st.onChange(st);
  });
  host.addEventListener('wheel',e=>{ e.preventDefault(); zoomBy(1+e.deltaY*0.0012); },{passive:false});
  return st;
}
// shared 3D picking / tooltip helpers (desktop hover + touch tap)
let _ndc=null;
function placeTip(html,x,y){ const tip=$('#tooltip'); if(!html){ tip.classList.add('hidden'); return; }
  tip.innerHTML=html; tip.classList.remove('hidden');
  let nx=x+14, ny=y+14; if(nx+240>innerWidth) nx=x-240; if(ny+70>innerHeight) ny=y-70;
  tip.style.left=nx+'px'; tip.style.top=ny+'px'; }
function pickSprite(v, sprites, cx, cy){ if(!_ndc) _ndc=new T3.Vector2();
  const rect=v.host.getBoundingClientRect();
  _ndc.set(((cx-rect.left)/rect.width)*2-1, -((cy-rect.top)/rect.height)*2+1);
  v.raycaster.setFromCamera(_ndc, v.camera);
  const hit=v.raycaster.intersectObjects(sprites)[0];
  return hit ? hit.object.userData.key : null; }

/* ===========================================================================
   3D VIEW — "Stand under your sky" (first-person planetarium, topocentric)
   =========================================================================== */
let sky3d=null;
const SKY_R=460, STAR_R=485, SKY_DOME_R=500;
const sky3dOpts={labels:true, ecliptic:false, stars:true, signs:false};

function initSky3D(){
  const host=$('#sky3dHost');
  const scene=new T3.Scene();
  const camera=new T3.PerspectiveCamera(72,1,0.1,4000);
  const renderer=new T3.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x05030f,1);
  host.appendChild(renderer.domElement);

  // sky dome (shader: day/twilight/night by sun altitude + sun-glow)
  const skyMat=new T3.ShaderMaterial({
    side:T3.BackSide, depthWrite:false,
    uniforms:{uSunDir:{value:new T3.Vector3(0,1,0)}, uSunAlt:{value:30}},
    vertexShader:`varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      varying vec3 vDir; uniform vec3 uSunDir; uniform float uSunAlt;
      void main(){
        float up=clamp(vDir.y,-1.0,1.0);
        float day=smoothstep(-10.0,6.0,uSunAlt);
        vec3 zN=vec3(0.015,0.02,0.06), hN=vec3(0.05,0.06,0.14);
        vec3 zD=vec3(0.13,0.30,0.62),  hD=vec3(0.52,0.68,0.90);
        float t=clamp(up,0.0,1.0);
        vec3 night=mix(hN,zN,t), dayc=mix(hD,zD,t);
        vec3 col=mix(night,dayc,day);
        // below horizon -> "under the earth", keep dark
        col*= mix(0.35,1.0, smoothstep(-0.25,0.05,up));
        // sun glow near the sun, strongest at horizon/twilight
        float band=pow(1.0-abs(up),2.0);
        vec3 sh=normalize(vec3(uSunDir.x,0.0,uSunDir.z)+1e-5);
        vec3 vh=normalize(vec3(vDir.x,0.0,vDir.z)+1e-5);
        float azc=max(dot(sh,vh),0.0);
        float tw=smoothstep(-12.0,10.0,uSunAlt)*(1.0-smoothstep(10.0,24.0,uSunAlt));
        col += vec3(1.0,0.46,0.16)*band*pow(azc,3.0)*(0.7*tw+0.12*day);
        gl_FragColor=vec4(col,1.0);
      }`,
  });
  const dome=new T3.Mesh(new T3.SphereGeometry(SKY_DOME_R,40,24),skyMat);
  scene.add(dome);

  // stars
  const N=1600, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ const u=Math.random()*2-1, th=Math.random()*Math.PI*2, r=Math.sqrt(1-u*u);
    pos[i*3]=STAR_R*r*Math.cos(th); pos[i*3+1]=STAR_R*u; pos[i*3+2]=STAR_R*r*Math.sin(th); }
  const sg=new T3.BufferGeometry(); sg.setAttribute('position',new T3.BufferAttribute(pos,3));
  const stars=new T3.Points(sg,new T3.PointsMaterial({color:0xdfe6ff,size:2.4,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false}));
  scene.add(stars);

  // ground disc (fades when you tilt below the horizon)
  const gc=document.createElement('canvas'); gc.width=gc.height=256; const gg=gc.getContext('2d');
  const grad=gg.createRadialGradient(128,128,4,128,128,128);
  grad.addColorStop(0,'#15131f'); grad.addColorStop(.7,'#0b0a16'); grad.addColorStop(1,'#0a0a18');
  gg.fillStyle=grad; gg.fillRect(0,0,256,256);
  const ground=new T3.Mesh(new T3.CircleGeometry(SKY_DOME_R-2,64),
    new T3.MeshBasicMaterial({map:new T3.CanvasTexture(gc),transparent:true,opacity:.95,side:T3.DoubleSide,depthWrite:false}));
  ground.rotation.x=-Math.PI/2; scene.add(ground);

  // horizon ring + cardinal labels
  const ringG=new T3.BufferGeometry(); const rp=[];
  for(let a=0;a<=360;a+=2){ const d=dirFromAzAlt(a,0).multiplyScalar(SKY_R); rp.push(d.x,1,d.z); }
  ringG.setAttribute('position',new T3.BufferAttribute(new Float32Array(rp),3));
  scene.add(new T3.Line(ringG,new T3.LineBasicMaterial({color:0xf4d58d,transparent:true,opacity:.35})));
  for(const [lab,az] of [['N',0],['E',90],['S',180],['W',270]]){
    const sp=labelSprite(lab,'#f4d58d'); const d=dirFromAzAlt(az,2).multiplyScalar(SKY_R*0.985);
    sp.position.copy(d); sp.scale.multiplyScalar(1.5); scene.add(sp);
  }

  // ecliptic path + node markers (toggle)
  const eclG=new T3.BufferGeometry(); eclG.setAttribute('position',new T3.BufferAttribute(new Float32Array(181*3),3));
  const ecliptic=new T3.Line(eclG,new T3.LineBasicMaterial({color:0xffcf48,transparent:true,opacity:.5}));
  ecliptic.visible=false; scene.add(ecliptic);
  const nodeN=labelSprite('☊','#b6a8ff'), nodeS=labelSprite('☋','#8c82c4');
  nodeN.visible=nodeS.visible=false; scene.add(nodeN); scene.add(nodeS);

  // 12 zodiac sign boundaries (lines across the ecliptic) + sign glyphs (toggle)
  const signGroup=new T3.Group(); signGroup.visible=false; scene.add(signGroup);
  const signBounds=[], signGlyphs=[];
  for(let k=0;k<12;k++){
    const bg=new T3.BufferGeometry(); bg.setAttribute('position',new T3.BufferAttribute(new Float32Array(13*3),3));
    const line=new T3.Line(bg,new T3.LineBasicMaterial({color:0x9a86ff,transparent:true,opacity:.55}));
    signGroup.add(line); signBounds.push(line);
    const g=labelSprite(SIGNS[k][1], ELEM[SIGNS[k][2]]); g.scale.multiplyScalar(1.25); signGroup.add(g); signGlyphs.push(g);
  }

  // body sprites + labels
  const bodies={};
  for(const b of BODIES){
    const sp=new T3.Sprite(new T3.SpriteMaterial({map:glowTexture(),color:new T3.Color(b.color),transparent:true,depthWrite:false,depthTest:false}));
    const sz=b.key==='Sun'?42:b.key==='Moon'?30:22; sp.scale.set(sz,sz,1);
    sp.userData={key:b.key}; scene.add(sp);
    const lab=labelSprite(b.key,b.color); scene.add(lab);
    bodies[b.key]={sprite:sp,label:lab};
  }

  camera.position.set(0,0,0);
  const ctl=attachControl(host,{yaw:90,pitch:12,fov:72,minPitch:-89,maxPitch:89,zoom:'fov',
    onChange:st=>applySkyCam(sky3d,st),
    onTap:e=>placeTip(skyTip(sky3d,e.clientX,e.clientY), e.clientX, e.clientY)});

  // compass HUD
  const comp=document.createElement('div'); comp.className='v3d-compass'; comp.id='sky3dCompass';
  host.parentElement.appendChild(comp);

  sky3d={scene,camera,renderer,host,skyMat,stars,ground,ecliptic,nodeN,nodeS,signGroup,signBounds,signGlyphs,bodies,ctl,comp,raycaster:new T3.Raycaster()};
  applySkyCam(sky3d,ctl);
  attachHover(sky3d);
  new ResizeObserver(()=>sizeSpace(sky3d)).observe(host);
}
function applySkyCam(v,st){
  const look=dirFromAzAlt(st.yaw,st.pitch);
  v.camera.position.set(0,0,0); v.camera.up.set(0,1,0);
  v.camera.lookAt(look.x,look.y,look.z);
  v.camera.fov=st.fov; v.camera.updateProjectionMatrix();
  // ground turns glassy as you tilt below the horizon
  v.ground.material.opacity = 0.12 + 0.82*smooth(st.pitch,-32,2);
  // compass readout
  const dir=compass(((st.yaw%360)+360)%360);
  v.comp.textContent = `facing ${dir} · ${st.pitch>=0?'+':''}${Math.round(st.pitch)}°`;
  renderSpace(v);
}
const smooth=(x,a,b)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

function updateSky3D(r){
  if(!sky3d) return;
  const v=sky3d, sun=r.bodies[0];
  v.skyMat.uniforms.uSunDir.value.copy(dirFromAzAlt(sun.az,sun.alt));
  v.skyMat.uniforms.uSunAlt.value=sun.alt;
  const night=1-smooth(sun.alt,-12,2);
  v.stars.material.opacity = sky3dOpts.stars ? night : 0;
  v.stars.visible=sky3dOpts.stars;
  for(const b of r.bodies){
    const o=v.bodies[b.key]; if(!o) continue;
    o.sprite.position.copy(dirFromAzAlt(b.az,b.alt).multiplyScalar(SKY_R));
    o.sprite.material.opacity = b.alt<0 ? .45 : 1;
  }
  // labels: de-collide clustered bodies (stelliums / Sun-Mercury-Venus) by fanning altitude offset
  const placed=r.bodies.filter(b=>v.bodies[b.key]).slice().sort((a,b)=>(a.az-b.az)||(b.alt-a.alt));
  let lastAz=-999,lastAlt=-999,tier=0;
  for(const b of placed){ const o=v.bodies[b.key];
    const near = Math.abs(b.az-lastAz)<6 && Math.abs(b.alt-lastAlt)<6;
    tier = near ? tier+1 : 0; lastAz=b.az; lastAlt=b.alt;
    const base = b.key==='Sun'?4:3;
    o.label.position.copy(dirFromAzAlt(b.az, b.alt+base+tier*3).multiplyScalar(SKY_R*0.99));
    o.label.visible = sky3dOpts.labels;
    o.label.material.opacity = b.alt<0 ? .4 : .95;
  }
  // ecliptic path (rebuild only when shown — 181 horizon transforms otherwise wasted on time-scrub)
  if(sky3dOpts.ecliptic){
    const arr=v.ecliptic.geometry.attributes.position.array;
    for(let i=0;i<=180;i++){ const h=eclToHorizon(r.date,r.obs,i*2); const d=dirFromAzAlt(h.az,h.alt).multiplyScalar(SKY_R*0.998);
      arr[i*3]=d.x; arr[i*3+1]=d.y; arr[i*3+2]=d.z; }
    v.ecliptic.geometry.attributes.position.needsUpdate=true;
  }
  v.ecliptic.visible=sky3dOpts.ecliptic;
  const nN=dirFromAzAlt(r.nodeNh.az,r.nodeNh.alt).multiplyScalar(SKY_R*0.985);
  const nS=dirFromAzAlt(r.nodeSh.az,r.nodeSh.alt).multiplyScalar(SKY_R*0.985);
  v.nodeN.position.copy(nN); v.nodeS.position.copy(nS);
  v.nodeN.visible=v.nodeS.visible=sky3dOpts.ecliptic;
  // 12 zodiac sign boundaries + glyphs (sidereal boundary k*30 sits at tropical-of-date k*30 + ayanāṃśa)
  if(sky3dOpts.signs){
    for(let k=0;k<12;k++){
      const bLon=k*30+r.ayan, arr2=v.signBounds[k].geometry.attributes.position.array;
      for(let i=0;i<13;i++){ const h=eclPointHorizon(r.date,r.obs,bLon,-18+i*3); const d=dirFromAzAlt(h.az,h.alt).multiplyScalar(SKY_R*0.997);
        arr2[i*3]=d.x; arr2[i*3+1]=d.y; arr2[i*3+2]=d.z; }
      v.signBounds[k].geometry.attributes.position.needsUpdate=true;
      const hm=eclPointHorizon(r.date,r.obs,k*30+15+r.ayan,0);
      v.signGlyphs[k].position.copy(dirFromAzAlt(hm.az,hm.alt).multiplyScalar(SKY_R*0.95));
    }
  }
  v.signGroup.visible=sky3dOpts.signs;
  $('#sky3dHud').innerHTML = S.timeKnown
    ? `facing <b>East</b> · drag to look · scroll to zoom · tilt down to see <b>through the Earth</b>`
    : `birth time unknown — shown at local noon · drag to look around`;
  renderSpace(v);
}
function skyTip(v, cx, cy){
  if(!lastR) return null;
  const key=pickSprite(v, Object.values(v.bodies).map(o=>o.sprite), cx, cy); if(!key) return null;
  const b=lastR.bodies.find(x=>x.key===key); if(!b) return null;
  const d=dms(b.zlon);
  return `<div class="tt-h">${key} ${b.retro?'℞':''}</div><div class="tt-r">${d.sign[0]} ${d.label} · ${skyPhrase(b)||'sign only'}</div>`;
}
function attachHover(v){
  v.host.addEventListener('pointermove',e=>{ if(v.ctl.dragging){ placeTip(null); return; }
    placeTip(skyTip(v,e.clientX,e.clientY), e.clientX, e.clientY); });
  v.host.addEventListener('pointerleave',()=>placeTip(null));
}

/* ===========================================================================
   3D VIEW — heliocentric Solar System (from space)
   =========================================================================== */
let solar3d=null;
const PERIODS={Mercury:88,Venus:224.7,Earth:365.25,Mars:687,Jupiter:4333,Saturn:10759,Uranus:30687,Neptune:60190,Pluto:90560};
const PLANETS=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const PCOL={Mercury:'#cda96b',Venus:'#ffe7a8',Earth:'#6cb6ff',Mars:'#ff6b53',Jupiter:'#f3c98b',Saturn:'#e2c074',Uranus:'#8fe0e8',Neptune:'#6aa0ff',Pluto:'#c08bd9'};
const scaleAU = r => r<=2 ? r*7 : 14 + Math.log10(r/2)*9;   // continuous at r=2 (both branches = 14)
const ECL0 = () => A.Rotation_EQJ_ECL();             // frame-fixed ecliptic
function helioFlat(body,date){ const v=A.RotateVector(ECL0(),A.HelioVector(A.Body[body],date)); return toThree(v); }

function initSolar(){
  const host=$('#solar3dHost');
  const scene=new T3.Scene();
  const camera=new T3.PerspectiveCamera(55,1,0.1,4000);
  const renderer=new T3.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setClearColor(0x05030f,1);
  host.appendChild(renderer.domElement);
  // faint stars backdrop
  const N=900,pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){ const u=Math.random()*2-1,th=Math.random()*Math.PI*2,r=Math.sqrt(1-u*u);
    pos[i*3]=800*r*Math.cos(th);pos[i*3+1]=800*u;pos[i*3+2]=800*r*Math.sin(th); }
  const sg=new T3.BufferGeometry(); sg.setAttribute('position',new T3.BufferAttribute(pos,3));
  scene.add(new T3.Points(sg,new T3.PointsMaterial({color:0x8a86b8,size:1.6,sizeAttenuation:false})));
  // Sun
  const sun=new T3.Sprite(new T3.SpriteMaterial({map:glowTexture(),color:0xffd34d,transparent:true,depthWrite:false}));
  sun.scale.set(7,7,1); scene.add(sun);
  const sunLab=labelSprite('Sun','#ffd34d',2.4); sunLab.position.set(0,2.6,0); scene.add(sunLab);
  // orbit rings (built ONCE — static at this scale) + planet sprites + labels
  const planets={};
  const t0=A.MakeTime(new Date(Date.UTC(2000,0,1)));
  for(const p of PLANETS){
    const per=PERIODS[p], rp=[];
    for(let i=0;i<=160;i++){ const d=helioFlat(p, t0.AddDays(per*i/160)); const s=scaleAU(Math.hypot(d.x,d.y,d.z))/Math.max(Math.hypot(d.x,d.y,d.z),1e-6);
      rp.push(d.x*s,d.y*s,d.z*s); }
    const og=new T3.BufferGeometry(); og.setAttribute('position',new T3.BufferAttribute(new Float32Array(rp),3));
    scene.add(new T3.LineLoop(og,new T3.LineBasicMaterial({color:new T3.Color(PCOL[p]),transparent:true,opacity:p==='Earth'?.5:.22})));
    const isE=p==='Earth';
    const sp=new T3.Sprite(new T3.SpriteMaterial({map:glowTexture(),color:new T3.Color(PCOL[p]),transparent:true,depthWrite:false}));
    sp.scale.setScalar(isE?5:3.4); sp.userData={key:p}; scene.add(sp);
    const lab=labelSprite(isE?'Earth ◂ you':p, PCOL[p], isE?2.8:2.3); scene.add(lab);
    planets[p]={sprite:sp,label:lab,isE};
  }
  // Sun->Earth line
  const elG=new T3.BufferGeometry(); elG.setAttribute('position',new T3.BufferAttribute(new Float32Array(6),3));
  const earthLine=new T3.Line(elG,new T3.LineBasicMaterial({color:0xf4d58d,transparent:true,opacity:.5}));
  scene.add(earthLine);

  const ctl=attachControl(host,{yaw:0,pitch:58,dist:64,minPitch:6,maxPitch:89,minDist:22,maxDist:240,zoom:'dist',
    onChange:st=>applySolarCam(solar3d,st),
    onTap:e=>placeTip(solarTip(e.clientX,e.clientY), e.clientX, e.clientY)});
  solar3d={scene,camera,renderer,host,sun,planets,earthLine,ctl,raycaster:new T3.Raycaster()};
  applySolarCam(solar3d,ctl);
  new ResizeObserver(()=>sizeSpace(solar3d)).observe(host);
  host.addEventListener('pointermove',e=>{ if(ctl.dragging){ placeTip(null); return; }
    placeTip(solarTip(e.clientX,e.clientY), e.clientX, e.clientY); });
  host.addEventListener('pointerleave',()=>placeTip(null));
}
function solarTip(cx,cy){
  if(!solar3d||!lastR) return null;
  const key=pickSprite(solar3d, Object.values(solar3d.planets).map(o=>o.sprite), cx, cy); if(!key) return null;
  const hv=A.HelioVector(A.Body[key], lastR.date), dist=Math.hypot(hv.x,hv.y,hv.z);
  const ang=dms(norm(tropLon(key, lastR.date, A.Rotation_EQJ_ECT(lastR.date)) - lastR.ayan));
  return `<div class="tt-h">${key}</div><div class="tt-r">${dist.toFixed(2)} AU from the Sun · ${ang.sign[0]}</div>`;
}
function applySolarCam(v,st){
  const d=dirFromAzAlt(st.yaw,st.pitch).multiplyScalar(st.dist);
  v.camera.position.set(d.x,d.y,d.z); v.camera.up.set(0,1,0); v.camera.lookAt(0,0,0);
  renderSpace(v);
}
function updateSolar(r){
  if(!solar3d) return; const v=solar3d;
  for(const p of PLANETS){ const o=v.planets[p]; const d=helioFlat(p,r.date);
    const mag=Math.hypot(d.x,d.y,d.z), s=scaleAU(mag)/Math.max(mag,1e-6);
    o.sprite.position.set(d.x*s,d.y*s,d.z*s);
    o.label.position.set(d.x*s, d.y*s+ (o.isE?3.2:2.4), d.z*s);
  }
  const e=v.planets.Earth.sprite.position;
  const a=v.earthLine.geometry.attributes.position.array; a[0]=0;a[1]=0;a[2]=0;a[3]=e.x;a[4]=e.y;a[5]=e.z;
  v.earthLine.geometry.attributes.position.needsUpdate=true;
  renderSpace(v);
}

/* ===========================================================================
   SAVED SKIES  (localStorage, per person) + #sky= share links
   =========================================================================== */
const LS={skies:'mysky.skies.v1', prefs:'mysky.prefs.v1'};
const AVATARS=['👤','👩','👨','🧑','👵','👴','👶','❤️','⭐','🌙','☀️','🪷','🕉️','🐉'];
let SKIES=[], prefs={lastView:'charts',showAspects:false,lastSkyId:null,zodiac:'lahiri',ayanCustom:24}, curAvatar='👤';

const lsGet=k=>{ try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;} };
const lsSet=(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;} };
const uid=()=> (crypto.randomUUID? crypto.randomUUID() : 'id'+Date.now()+Math.floor(Math.random()*1e6));
const nowMs=()=>Date.now();
function savePrefs(){ lsSet(LS.prefs,prefs); }

function migrateLegacy(){            // people who used the old /birthsky/ build
  if(!lsGet(LS.skies)){ const old=lsGet('birthsky.skies.v1'); if(old) lsSet(LS.skies,old); }
}
function loadSaved(){
  migrateLegacy();
  SKIES = lsGet(LS.skies) || [];
  const p = lsGet(LS.prefs); if(p) prefs=Object.assign(prefs,p);
}
function captureSky(label,emoji){
  const r=lastR||compute();
  const summ=`☉ ${dms(r.bodies[0].zlon).sign[0]} · ☽ ${dms(r.bodies[1].zlon).sign[0]}`+(S.timeKnown?` · Asc ${dms(r.zasc).sign[0]}`:'');
  return {id:uid(),schema:1,label:(label||S.place).slice(0,40),emoji:emoji||'👤',
    lat:S.lat,lng:S.lng,place:S.place,tz:S.tz,y:S.y,mo:S.mo,d:S.d,h:S.h,mi:S.mi,timeKnown:S.timeKnown,
    summary:summ,createdAt:nowMs()};
}
function applySkyRecord(rec,announce){
  Object.assign(S,{lat:rec.lat,lng:rec.lng,place:rec.place,tz:rec.tz,y:rec.y,mo:rec.mo,d:rec.d,h:rec.h,mi:rec.mi,timeKnown:rec.timeKnown!==false});
  $('#unknownBtn').classList.toggle('on', !S.timeKnown);
  if(rec.id){ prefs.lastSkyId=rec.id; savePrefs(); }
  updatePlaceReadout(); markGlobe(true); syncDaySlider(); syncInputs(); renderSkyList(); render();
  if(announce!==false) toast(`${rec.emoji||'✨'} ${rec.label||'sky'}`);
}
function renderSkyList(){
  const el=$('#skyList'); if(!el) return;
  if(!SKIES.length){ el.innerHTML=`<div class="sky-empty">Save skies for the people you love — they stay on this device. Tap “Save”.</div>`; return; }
  el.innerHTML=SKIES.map(s=>{
    const dstr=`${s.d} ${MONTHS[s.mo-1].slice(0,3)} ${s.y}`;
    const active=s.id===prefs.lastSkyId;
    return `<div class="sky-item ${active?'active':''}" data-id="${s.id}">
      <div class="si-av">${esc(s.emoji||'👤')}</div>
      <div class="si-body"><div class="si-name">${esc(s.label)}${active?'<span class="now-showing">now</span>':''}</div>
        <div class="si-sub">${esc(s.summary||'')} · ${esc(String(s.place).split(',')[0])} · ${dstr}</div></div>
      <div class="si-act"><button class="share" data-act="share" title="Copy a share link">🔗</button>
        <button class="ren" data-act="ren" title="Rename">✎</button>
        <button class="del" data-act="del" title="Delete">×</button></div></div>`;
  }).join('');
}

// base64url share links: #sky=<enc>
function encSky(rec){ const m={l:rec.label,e:rec.emoji,la:rec.lat,ln:rec.lng,pl:rec.place,tz:rec.tz,y:rec.y,mo:rec.mo,d:rec.d,h:rec.h,mi:rec.mi,tk:rec.timeKnown?1:0};
  return btoa(unescape(encodeURIComponent(JSON.stringify(m)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function decSky(str){ try{
  const j=JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g,'+').replace(/_/g,'/')))));
  const num=v=>typeof v==='number'&&isFinite(v);
  if(![j.la,j.ln,j.y,j.mo,j.d,j.h,j.mi].every(num)) return null;        // reject truncated / hand-edited links
  if(j.la<-90||j.la>90||j.ln<-180||j.ln>180||j.mo<1||j.mo>12||j.d<1||j.d>31||j.h<0||j.h>23||j.mi<0||j.mi>59) return null;
  return {label:j.l,emoji:j.e,lat:j.la,lng:j.ln,place:j.pl,tz:j.tz,y:j.y,mo:j.mo,d:j.d,h:j.h,mi:j.mi,timeKnown:j.tk!==0};
} catch(e){ return null; } }
function shareLink(rec){ return location.origin+location.pathname+'#sky='+encSky(rec); }

/* ===========================================================================
   INIT
   =========================================================================== */
function init(){
  if(!A){ $('#summary').innerHTML='Astronomy engine failed to load.'; $('#summary').classList.remove('hidden'); return; }
  $('#daySlider').max = maxDaysBack;
  loadSaved();
  // restore aspects + zodiac prefs
  if(prefs.showAspects){ S.showAspects=true; $('#miAspects').classList.add('on'); $('#aspState').textContent='on'; }
  if(prefs.zodiac) S.zodiac=prefs.zodiac;
  if(prefs.ayanCustom!=null) S.ayanCustom=prefs.ayanCustom;
  // a shared #sky= link wins; else restore the last-viewed saved sky
  const hash=location.hash;
  let restored=false;
  if(hash.startsWith('#sky=')){ const rec=decSky(hash.slice(5)); if(rec){ Object.assign(S,{lat:rec.lat,lng:rec.lng,place:rec.place,tz:rec.tz||'UTC',y:rec.y,mo:rec.mo,d:rec.d,h:rec.h,mi:rec.mi,timeKnown:rec.timeKnown!==false}); $('#unknownBtn').classList.toggle('on',!S.timeKnown); restored=true;
      try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} } }   // drop #sky= so a reload restores the user's own state
  else if(prefs.lastSkyId){ const r=SKIES.find(s=>s.id===prefs.lastSkyId); if(r){ Object.assign(S,{lat:r.lat,lng:r.lng,place:r.place,tz:r.tz,y:r.y,mo:r.mo,d:r.d,h:r.h,mi:r.mi,timeKnown:r.timeKnown!==false}); $('#unknownBtn').classList.toggle('on',!S.timeKnown); restored=true; } }

  initGlobe();
  updatePlaceReadout(); markGlobe(true);
  syncDaySlider(); syncInputs();
  renderSkyList();
  if(window.initVedicUI) initVedicUI();
  wire();
  try { render(); }
  catch(e){                                  // a malformed/edited share link slipped through -> never blank the page
    Object.assign(S,{lat:51.5074,lng:-0.1278,place:'London, United Kingdom',tz:'Europe/London',
      y:today.getFullYear(),mo:today.getMonth()+1,d:today.getDate(),h:12,mi:0,timeKnown:true});
    updatePlaceReadout(); markGlobe(true); syncDaySlider(); syncInputs(); render();
    toast('That sky link looked broken — showing the default sky.');
  }

  // if we restored a shared / last sky, reveal it instead of the welcome overlay
  if(restored) $('#welcomeOverlay').classList.add('hidden');
  // restore last view (after first render so lastR exists)
  if(['sky3d','solar3d','vedic'].includes(prefs.lastView)) setView(prefs.lastView);

  // keep the active 3D view sized on window resize (sizeSpace re-renders)
  window.addEventListener('resize',()=>{ if(activeView==='sky3d')sizeSpace(sky3d); else if(activeView==='solar3d')sizeSpace(solar3d); });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
