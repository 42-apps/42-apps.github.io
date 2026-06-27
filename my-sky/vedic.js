/* ===========================================================================
   vedic.js — Jyotish (Vedic astrology) engine for My Sky
   Pure functions over SIDEREAL ecliptic longitudes (degrees, 0=Aries 0°).
   Works in the browser (window.Vedic) and Node (module.exports) for testing.
   Classical (Parāśarī) conventions; whole-sign houses.
   =========================================================================== */
(function(root){
'use strict';
const NL = 360/27;                       // nakshatra length 13°20'
const PADA = NL/4;                        // 3°20'
const norm = x => ((x % 360) + 360) % 360;
const fix = (n,d=2) => +(+n).toFixed(d);

/* ---- signs ---------------------------------------------------------------- */
const SIGN_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_SA = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
const SIGN_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_ELEM = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
const SIGN_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
// movable(0)/fixed(1)/dual(2)
const SIGN_MODE = [0,1,2,0,1,2,0,1,2,0,1,2];

/* ---- nakshatras (27) ------------------------------------------------------ */
const NAK = [
 ['Ashwini','Ketu','Ashwini Kumaras'],['Bharani','Venus','Yama'],['Krittika','Sun','Agni'],
 ['Rohini','Moon','Brahma'],['Mrigashira','Mars','Soma'],['Ardra','Rahu','Rudra'],
 ['Punarvasu','Jupiter','Aditi'],['Pushya','Saturn','Brihaspati'],['Ashlesha','Mercury','Nagas'],
 ['Magha','Ketu','Pitris'],['Purva Phalguni','Venus','Bhaga'],['Uttara Phalguni','Sun','Aryaman'],
 ['Hasta','Moon','Savitar'],['Chitra','Mars','Tvashtar'],['Swati','Rahu','Vayu'],
 ['Vishakha','Jupiter','Indra-Agni'],['Anuradha','Saturn','Mitra'],['Jyeshtha','Mercury','Indra'],
 ['Mula','Ketu','Nirriti'],['Purva Ashadha','Venus','Apas'],['Uttara Ashadha','Sun','Vishvedevas'],
 ['Shravana','Moon','Vishnu'],['Dhanishta','Mars','Vasus'],['Shatabhisha','Rahu','Varuna'],
 ['Purva Bhadrapada','Jupiter','Aja Ekapada'],['Uttara Bhadrapada','Saturn','Ahir Budhnya'],['Revati','Mercury','Pushan'],
];

/* ---- Vimshottari ---------------------------------------------------------- */
// cyclic order starting at Ashwini's lord (Ketu); years sum to 120
const VIM = [['Ketu',7],['Venus',20],['Sun',6],['Moon',10],['Mars',7],['Rahu',18],['Jupiter',16],['Saturn',19],['Mercury',17]];
const VIM_TOTAL = 120;
const YEAR_MS = 365.25*86400000;

/* ---- dignities ------------------------------------------------------------ */
const GRAHAS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const GLYPH = {Sun:'☉',Moon:'☽',Mars:'♂',Mercury:'☿',Jupiter:'♃',Venus:'♀',Saturn:'♄',Rahu:'☊',Ketu:'☋'};
// exaltation: sign index + degree of deep exaltation; debilitation = +6 signs
const EXALT = {Sun:[0,10],Moon:[1,3],Mars:[9,28],Mercury:[5,15],Jupiter:[3,5],Venus:[11,27],Saturn:[6,20],Rahu:[1,20],Ketu:[7,20]};
// moolatrikona: [sign, fromDeg, toDeg]
const MOOLA = {Sun:[4,0,20],Moon:[1,3,30],Mars:[0,0,12],Mercury:[5,15,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]};
const OWN = {Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
// naisargika (natural) relationships: friends / enemies (rest neutral)
const FRIEND = {Sun:['Moon','Mars','Jupiter'],Moon:['Sun','Mercury'],Mars:['Sun','Moon','Jupiter'],
 Mercury:['Sun','Venus'],Jupiter:['Sun','Moon','Mars'],Venus:['Mercury','Saturn'],Saturn:['Mercury','Venus']};
const ENEMY = {Sun:['Venus','Saturn'],Moon:[],Mars:['Mercury'],Mercury:['Moon'],
 Jupiter:['Mercury','Venus'],Venus:['Sun','Moon'],Saturn:['Sun','Moon','Mars']};
// combustion orb (deg from Sun)
const COMBUST = {Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15};
// natural benefic/malefic (Mercury & Moon are conditional; simplified)
const NAT_BENEFIC = {Jupiter:1,Venus:1,Mercury:1,Moon:1};

/* ===========================================================================
   core position helpers
   =========================================================================== */
function rasi(lon){ return Math.floor(norm(lon)/30); }                 // 0..11
function degInSign(lon){ return norm(lon)%30; }
function nakshatra(lon){
  lon = norm(lon);
  const i = Math.floor(lon/NL);
  const within = lon - i*NL;
  const pada = Math.floor(within/PADA)+1;
  return {index:i, name:NAK[i][0], lord:NAK[i][1], deity:NAK[i][2], pada, within};
}
function dms(lon){ const d=degInSign(lon), deg=Math.floor(d), m=Math.round((d-deg)*60);
  return {sign:rasi(lon), deg, min:m%60, label:`${deg}°${String(m%60).padStart(2,'0')}'`}; }

/* ===========================================================================
   divisional charts (vargas) — return destination sign 0..11
   =========================================================================== */
const ELEM_START27 = {fire:0, earth:3, air:6, water:9};
function varga(lon, N){
  lon = norm(lon); const s = rasi(lon), d = degInSign(lon);
  const odd = (s%2===0);                       // Aries(idx0)=1st=odd sign
  const mode = SIGN_MODE[s], elem = SIGN_ELEM[s];
  const seg = w => Math.floor(d/w);
  switch(N){
    case 1:  return s;
    case 2:  { const p=d<15?0:1; return odd ? (p===0?4:3) : (p===0?3:4); }       // Hora (Parāśarī)
    case 3:  return (s + [0,4,8][seg(10)])%12;                                    // Drekkana 1/5/9
    case 4:  return (s + [0,3,6,9][seg(7.5)])%12;                                 // Chaturthamsa (kendras)
    case 7:  return ((odd? s : (s+6)) + seg(30/7))%12;                            // Saptamsa
    case 9:  return Math.floor(lon/PADA)%12;                                      // Navamsa (element-continuous)
    case 10: return ((odd? s : (s+8)) + seg(3))%12;                              // Dasamsa
    case 12: return (s + seg(2.5))%12;                                            // Dwadasamsa
    case 16: return ([0,4,8][mode] + seg(1.875))%12;                              // Shodasamsa (mov Ari/fix Leo/dual Sag)
    case 20: return ([0,8,4][mode] + seg(1.5))%12;                                // Vimsamsa (mov Ari/fix Sag/dual Leo)
    case 24: return ((odd?4:3) + seg(1.25))%12;                                   // Siddhamsa (odd Leo/even Cancer)
    case 27: return (ELEM_START27[elem] + seg(30/27))%12;                         // Bhamsa (by element)
    case 30: return trimsamsa(s,d);                                               // Trimsamsa (unequal)
    case 40: return ((odd?0:6) + seg(0.75))%12;                                   // Khavedamsa (odd Ari/even Lib)
    case 45: return ([0,4,8][mode] + seg(30/45))%12;                              // Akshavedamsa (mov Ari/fix Leo/dual Sag)
    case 60: return (s + Math.floor(d*2))%12;                                     // Shashtiamsa
    default: return (s + seg(30/N))%12;
  }
}
function trimsamsa(s,d){
  const odd=(s%2===0);
  if(odd){ if(d<5)return 0; if(d<10)return 10; if(d<18)return 8; if(d<25)return 2; return 6; }      // Mars,Sat,Jup,Mer,Ven
  else   { if(d<5)return 1; if(d<12)return 5; if(d<20)return 11; if(d<25)return 9; return 7; }       // Ven,Mer,Jup,Sat,Mars
}
function navamsa(lon){ return varga(lon,9); }

/* ===========================================================================
   panchanga
   =========================================================================== */
const TITHI_NAMES = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami',
 'Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'];
const YOGA_NAMES = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula',
 'Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva',
 'Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
const KARANA_MOV = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti']; // 7 movable repeat
const KARANA_FIX = ['Shakuni','Chatushpada','Naga','Kimstughna'];                  // 4 fixed
const VARA = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function panchanga(sunLon, moonLon, weekday){
  const diff = norm(moonLon - sunLon);
  const ti = Math.floor(diff/12);                       // 0..29
  const paksha = ti<15 ? 'Shukla' : 'Krishna';
  const tithiName = TITHI_NAMES[ti%15] + (ti===29?' (Amavasya)':ti===14?' (Purnima)':'');
  const yi = Math.floor(norm(sunLon+moonLon)/NL)%27;
  // karana: 60 half-tithis per lunar month; indices 1..57 movable cycle, 0 & 58-60 fixed
  const k = Math.floor(diff/6);                          // 0..59 half-tithi index
  let karana;
  if(k===0) karana=KARANA_FIX[3];                        // Kimstughna (first)
  else if(k>=57) karana=KARANA_FIX[k-57];                // Shakuni,Chatushpada,Naga (last three)
  else karana=KARANA_MOV[(k-1)%7];
  return {
    tithi:{num:ti+1, name:tithiName, paksha, deg:diff},
    nakshatra:nakshatra(moonLon),
    yoga:{num:yi+1, name:YOGA_NAMES[yi]},
    karana:{num:k+1, name:karana},
    vara: weekday!=null ? VARA[weekday] : null,
  };
}

/* ===========================================================================
   Vimshottari dasha (Maha -> Antar -> Pratyantar)
   =========================================================================== */
function subPeriods(lordIdx, totalYears, startMs, depth){
  const out=[]; let t=startMs;
  for(let i=0;i<9;i++){ const li=(lordIdx+i)%9, [lord,ly]=VIM[li];
    const yrs=totalYears*ly/VIM_TOTAL, dur=yrs*YEAR_MS, node={lord, years:yrs, start:t, end:t+dur};
    if(depth>0) node.children=subPeriods(li, yrs, t, depth-1);
    out.push(node); t+=dur;
  }
  return out;
}
function vimshottari(moonLon, birthMs, depth){
  depth = depth==null?2:depth;
  const lon=norm(moonLon), nIdx=Math.floor(lon/NL), lordIdx=nIdx%9;
  const frac=(lon - nIdx*NL)/NL;                          // elapsed fraction of nakshatra
  const firstYears=VIM[lordIdx][1];
  let t = birthMs - frac*firstYears*YEAR_MS;              // true start of the running mahadasha
  const mds=[];
  for(let i=0;i<9;i++){ const li=(lordIdx+i)%9, [lord,ly]=VIM[li], dur=ly*YEAR_MS;
    mds.push({lord, years:ly, start:t, end:t+dur, children:subPeriods(li,ly,t,depth-1)}); t+=dur;
  }
  return {startLord:VIM[lordIdx][0], balanceYears:firstYears*(1-frac), mds};
}
function activePeriod(mds, atMs){                          // walk to the running node at each level
  const path=[]; let level=mds;
  while(level){ const n=level.find(x=>atMs>=x.start && atMs<x.end); if(!n) break; path.push(n); level=n.children; }
  return path;
}

/* ===========================================================================
   dignity, combustion, relationships
   =========================================================================== */
function dignity(planet, lon, sunLon){
  const s=rasi(lon), d=degInSign(lon), out={sign:s, status:'', combust:false};
  const ex=EXALT[planet];
  if(ex){ if(ex[0]===s) out.status='Exalted'; else if((ex[0]+6)%12===s) out.status='Debilitated'; }
  if(!out.status && MOOLA[planet]){ const [ms,a,b]=MOOLA[planet]; if(ms===s && d>=a && d<b) out.status='Moolatrikona'; }
  if(!out.status && OWN[planet] && OWN[planet].includes(s)) out.status='Own sign';
  if(!out.status){                                         // friend/enemy of dispositor
    const lord=SIGN_LORD[s];
    if(lord===planet) out.status='Own sign';
    else if((FRIEND[planet]||[]).includes(lord)) out.status='Friend';
    else if((ENEMY[planet]||[]).includes(lord)) out.status='Enemy';
    else out.status='Neutral';
  }
  if(sunLon!=null && COMBUST[planet]){ let sep=Math.abs(norm(lon-sunLon)); if(sep>180)sep=360-sep;
    out.combust = sep <= COMBUST[planet]; }
  return out;
}

/* ===========================================================================
   Vedic aspects (graha drishti) — returns set of aspected SIGN indices
   =========================================================================== */
const SPECIAL = {Mars:[4,7,8],Jupiter:[5,7,9],Saturn:[3,7,10]};   // nodes default to 7th only
function aspectsFromSign(planet, sign, nodes5_9){
  let houses = SPECIAL[planet] || [7];
  if(nodes5_9 && (planet==='Rahu'||planet==='Ketu')) houses=[5,7,9];
  return houses.map(h => (sign + (h-1))%12);
}

/* ===========================================================================
   KP star-lord / sub-lord of a longitude
   =========================================================================== */
function kp(lon){
  lon=norm(lon); const nIdx=Math.floor(lon/NL), lordIdx=nIdx%9, pos=lon-nIdx*NL;
  let acc=0, subLord=VIM[lordIdx][0];
  for(let i=0;i<9;i++){ const li=(lordIdx+i)%9, span=NL*VIM[li][1]/VIM_TOTAL;
    if(pos < acc+span){ subLord=VIM[li][0]; break; } acc+=span; }
  return {nak:nIdx, starLord:NAK[nIdx][1], subLord};
}

/* ===========================================================================
   Ashtakavarga (Parāśarī) — benefic-place tables (houses from contributor, 1=same sign)
   Per-planet totals: Sun48 Moon49 Mars39 Mercury54 Jupiter56 Venus52 Saturn39 -> SAV 337
   =========================================================================== */
const AV = {
 Sun:{Sun:[1,2,4,7,8,9,10,11],Moon:[3,6,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[3,5,6,9,10,11,12],Jupiter:[5,6,9,11],Venus:[6,7,12],Saturn:[1,2,4,7,8,9,10,11],Lagna:[3,4,6,10,11,12]},
 Moon:{Sun:[3,6,7,8,10,11],Moon:[1,3,6,7,10,11],Mars:[2,3,5,6,9,10,11],Mercury:[1,3,4,5,7,8,10,11],Jupiter:[1,4,7,8,10,11,12],Venus:[3,4,5,7,9,10,11],Saturn:[3,5,6,11],Lagna:[3,6,10,11]},
 Mars:{Sun:[3,5,6,10,11],Moon:[3,6,11],Mars:[1,2,4,7,8,10,11],Mercury:[3,5,6,11],Jupiter:[6,10,11,12],Venus:[6,8,11,12],Saturn:[1,4,7,8,9,10,11],Lagna:[1,3,6,10,11]},
 Mercury:{Sun:[5,6,9,11,12],Moon:[2,4,6,8,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[1,3,5,6,9,10,11,12],Jupiter:[6,8,11,12],Venus:[1,2,3,4,5,8,9,11],Saturn:[1,2,4,7,8,9,10,11],Lagna:[1,2,4,6,8,10,11]},
 Jupiter:{Sun:[1,2,3,4,7,8,9,10,11],Moon:[2,5,7,9,11],Mars:[1,2,4,7,8,10,11],Mercury:[1,2,4,5,6,9,10,11],Jupiter:[1,2,3,4,7,8,10,11],Venus:[2,5,6,9,10,11],Saturn:[3,5,6,12],Lagna:[1,2,4,5,6,7,9,10,11]},
 Venus:{Sun:[8,11,12],Moon:[1,2,3,4,5,8,9,11,12],Mars:[3,5,6,9,11,12],Mercury:[3,5,6,9,11],Jupiter:[5,8,9,10,11],Venus:[1,2,3,4,5,8,9,10,11],Saturn:[3,4,5,8,9,10,11],Lagna:[1,2,3,4,5,8,9,11]},
 Saturn:{Sun:[1,2,4,7,8,10,11],Moon:[3,6,11],Mars:[3,5,6,10,11,12],Mercury:[6,8,9,10,11,12],Jupiter:[5,6,11,12],Venus:[6,11,12],Saturn:[3,5,6,11],Lagna:[1,3,4,6,10,11]},
};
const AV_CONTRIB = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Lagna'];
function ashtakavarga(signs){                              // signs: {Sun..Saturn, Lagna} as 0..11
  const bav={}, sav=new Array(12).fill(0);
  for(const P of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']){
    const row=new Array(12).fill(0);
    for(const C of AV_CONTRIB){ const cs=signs[C]; if(cs==null) continue;
      for(const h of AV[P][C]) row[(cs+h-1)%12]++; }
    bav[P]=row; for(let i=0;i<12;i++) sav[i]+=row[i];
  }
  return {bav, sav, total:sav.reduce((a,b)=>a+b,0)};
}

/* ===========================================================================
   Jaimini — Chara Karakas + Arudha Lagna
   =========================================================================== */
const KARAKA = ['Atmakaraka','Amatyakaraka','Bhratrikaraka','Matrikaraka','Putrakaraka','Gnatikaraka','Darakaraka'];
function charaKarakas(lons){                               // {Sun..Saturn} sidereal lons
  const arr = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(p=>({p, d:degInSign(lons[p])}));
  arr.sort((a,b)=>b.d-a.d);                                // highest degree = Atmakaraka
  const out={}; arr.forEach((x,i)=>{ if(i<KARAKA.length) out[KARAKA[i]]=x.p; });
  return out;
}
function arudhaLagna(lagnaSign, lons){
  const lord = SIGN_LORD[lagnaSign];
  const lordSign = rasi(lons[lord]);
  let al = norm2(2*lordSign - lagnaSign);
  const from = (al - lagnaSign + 12)%12;                   // 0 = 1st, 6 = 7th
  if(from===0) al = norm2(al + 9);                         // in 1st -> take the 10th
  else if(from===6) al = norm2(al + 3);                    // in 7th -> take the 4th (BPHS)
  return al;
}
function norm2(s){ return ((s%12)+12)%12; }

/* ===========================================================================
   Yogas (curated, classical conditions)
   =========================================================================== */
function houseFrom(fromSign, sign){ return ((sign - fromSign + 12)%12)+1; }   // 1..12
const KENDRA=[1,4,7,10];
function yogas(ctx){
  // ctx: {signs:{planet->0..11}, lagna, dignities:{planet->status}}
  const S=ctx.signs, lag=ctx.lagna, dig=ctx.dignities||{}, found=[];
  const inKendraFrom=(p,from)=>KENDRA.includes(houseFrom(from, S[p]));
  // Pancha Mahapurusha
  const PMP={Mars:'Ruchaka',Mercury:'Bhadra',Jupiter:'Hamsa',Venus:'Malavya',Saturn:'Sasa'};
  for(const p in PMP){ if((dig[p]==='Own sign'||dig[p]==='Exalted'||dig[p]==='Moolatrikona') && inKendraFrom(p,lag))
    found.push({name:PMP[p]+' Yoga', planet:p, note:'Pancha Mahapurusha — '+p+' strong in a kendra'}); }
  // Gajakesari: Jupiter in kendra from Moon
  if(KENDRA.includes(houseFrom(S.Moon, S.Jupiter))) found.push({name:'Gajakesari Yoga', note:'Jupiter in a kendra from the Moon'});
  // Budha-Aditya: Sun & Mercury same sign
  if(S.Sun===S.Mercury) found.push({name:'Budha-Aditya Yoga', note:'Sun & Mercury together — intellect'});
  // Chandra-Mangala: Moon & Mars same sign
  if(S.Moon===S.Mars) found.push({name:'Chandra-Mangala Yoga', note:'Moon & Mars together — wealth/drive'});
  // Kemadruma: nothing in 2nd or 12th from Moon (Sun..Saturn)
  const around=['Sun','Mars','Mercury','Jupiter','Venus','Saturn'].some(p=>{const h=houseFrom(S.Moon,S[p]);return h===2||h===12;});
  const withMoon=['Sun','Mars','Mercury','Jupiter','Venus','Saturn'].some(p=>S[p]===S.Moon);
  if(!around && !withMoon) found.push({name:'Kemadruma Yoga', note:'Moon isolated (no planets in 2nd/12th) — a difficult yoga'});
  return found;
}

/* ===========================================================================
   exports
   =========================================================================== */
const Vedic = {
  NL, PADA, norm, fix, SIGN_EN, SIGN_SA, SIGN_GLYPH, SIGN_ELEM, SIGN_LORD, SIGN_MODE,
  NAK, VIM, GRAHAS, GLYPH, EXALT, MOOLA, OWN, COMBUST, NAT_BENEFIC,
  rasi, degInSign, nakshatra, dms, varga, navamsa, trimsamsa,
  panchanga, vimshottari, subPeriods, activePeriod, dignity, aspectsFromSign, kp,
  AV, ashtakavarga, KARAKA, charaKarakas, arudhaLagna, yogas, houseFrom,
};
if(typeof module!=='undefined' && module.exports) module.exports = Vedic;
root.Vedic = Vedic;
})(typeof window!=='undefined'?window:globalThis);
