/* Geroscope — evidence-based longevity explorer. Vanilla JS, no build step.
   Data: window.INTERVENTIONS (data/interventions.js). */
(function () {
"use strict";

/* ---------- metadata ---------- */
const CAT = {
  pharma:     {label:"Pharmaceutical",      icon:"💊", color:"var(--c-pharma)"},
  senolytic:  {label:"Senolytic",           icon:"🧹", color:"var(--c-senolytic)"},
  nad:        {label:"NAD+ pathway",        icon:"⚡", color:"var(--c-nad)"},
  supplement: {label:"Supplement / extract",icon:"🧴", color:"var(--c-supplement)"},
  botanical:  {label:"Botanical / herbal",  icon:"🌿", color:"var(--c-botanical)"},
  diet:       {label:"Diet & fasting",      icon:"🍽️", color:"var(--c-diet)"},
  exercise:   {label:"Exercise",            icon:"🏃", color:"var(--c-exercise)"},
  lifestyle:  {label:"Lifestyle",           icon:"🧘", color:"var(--c-lifestyle)"},
  thermal:    {label:"Thermal & light",     icon:"🌡️", color:"var(--c-thermal)"},
  therapy:    {label:"Medical & device",    icon:"🏥", color:"var(--c-therapy)"},
  frontier:   {label:"Frontier biotech",    icon:"🧬", color:"var(--c-frontier)"},
  hormone:    {label:"Hormone & peptide",   icon:"⚗️", color:"var(--c-hormone)"}
};
const CAT_ORDER = ["exercise","diet","lifestyle","pharma","supplement","senolytic","nad","botanical","thermal","therapy","hormone","frontier"];

const ETYPE = {
  "human-rct-hard":      {label:"Human RCT · hard outcomes", short:"RCT · hard", color:"var(--e-strong)", rank:7},
  "human-rct-surrogate": {label:"Human RCT · biomarkers",    short:"RCT · biomarker", color:"var(--e-good)", rank:6},
  "human-cohort":        {label:"Human cohort / epidemiology",short:"Cohort", color:"var(--e-cohort)", rank:5},
  "animal-itp":          {label:"Animal lifespan (NIA ITP)", short:"ITP lifespan", color:"var(--e-itp)", rank:4},
  "animal-other":        {label:"Animal / model organism",   short:"Animal", color:"var(--e-animal)", rank:3},
  "human-other":         {label:"Human · uncontrolled",      short:"Human · uncontrolled", color:"var(--e-animal)", rank:3},
  "in-vitro":            {label:"In vitro / cell",           short:"In vitro", color:"var(--e-vitro)", rank:2},
  "mechanistic":         {label:"Mechanistic / theoretical", short:"Mechanistic", color:"var(--e-mech)", rank:1}
};
const ETYPE_ORDER = ["human-rct-hard","human-rct-surrogate","human-cohort","animal-itp","animal-other","human-other","in-vitro","mechanistic"];

const ACC = {
  lifestyle:    {label:"Lifestyle / free", icon:"🆓"},
  otc:          {label:"OTC / supplement", icon:"🛒"},
  rx:           {label:"Prescription",     icon:"℞"},
  "clinic-only":{label:"Clinic-administered",icon:"🏥"},
  experimental: {label:"Experimental",     icon:"🧪"}
};
const ACC_ORDER = ["lifestyle","otc","rx","clinic-only","experimental"];

const TIER = {
  S:{label:"Foundational", color:"var(--t-s)", desc:"Proven & powerful"},
  A:{label:"Strong",       color:"var(--t-a)", desc:"Well-supported"},
  B:{label:"Promising",    color:"var(--t-b)", desc:"Encouraging, incomplete"},
  C:{label:"Early",        color:"var(--t-c)", desc:"Preliminary / speculative"},
  D:{label:"Weak",         color:"var(--t-d)", desc:"Unproven or hyped"}
};
const TIER_ORDER = ["S","A","B","C","D"];

/* ---------- printable checklist: access groups + practical how-to guidance ---------- */
const ACCESS_GROUPS = [
  {key:"lifestyle", match:["lifestyle"], icon:"🟢", label:"Lifestyle & free", desc:"Free things you do — the strongest, safest evidence in all of longevity. Start here."},
  {key:"otc", match:["otc"], icon:"🛒", label:"Supplements & over-the-counter", desc:"Buyable without a prescription. Quality varies; most are optional add-ons, not substitutes for the lifestyle basics."},
  {key:"rx", match:["rx"], icon:"℞", label:"Prescription — talk to your doctor", desc:"Prescription-only; do not self-source. Several are used off-label for longevity. Discuss risks and monitoring with a clinician."},
  {key:"adv", match:["clinic-only","experimental"], icon:"🏥", label:"Clinical & experimental (advanced)", desc:"Procedures and investigational options — mostly unproven in humans for longevity and some carry real risks. For information, not a to-do list."}
];
const GUIDE = {
  "cardiorespiratory-fitness-vo2max":"<b>How:</b> VO₂max is the single strongest fitness predictor of lifespan. Build it two ways — a <b>Zone 2</b> base (easy enough to hold a conversation) 3–4×/week for 45–60 min, plus <b>one</b> weekly session of short hard intervals near your max. <b>Try ~1 hr:</b> singles tennis, continuous rowing, a hilly bike ride, uphill hiking, lap swimming, or a spin class. Track it with a watch (Garmin/Apple/Whoop) or a gym test.",
  "aerobic-exercise":"<b>How:</b> 150–300 min/week of moderate cardio (you can talk but not sing), or 75–150 min vigorous — spread over most days. <b>Try:</b> brisk walking, cycling, swimming, doubles tennis, dancing, elliptical, hiking, steady jogging.",
  "resistance-training":"<b>How:</b> 2–3 sessions/week covering all major muscle groups, adding load over time (~2–3 sets, 6–15 reps). <b>Try:</b> free weights or machines, bodyweight (push-ups, squats, lunges, rows), resistance bands, kettlebells.",
  "hiit":"<b>How:</b> 1–2×/week once you have an aerobic base. Classic: <b>4×4 min</b> hard (~85–95% max HR — hard but you could manage one more) with 3 min easy between. <b>Try:</b> bike/rower/ski-erg intervals, hill sprints, incline-treadmill or stair repeats.",
  "daily-steps-walking":"<b>How:</b> aim ~7,000–8,000+ steps/day (benefit starts well below 10k). <b>Easy wins:</b> walking meetings, take the stairs, a 10-min post-meal walk, park farther away, get off a stop early.",
  "sleep-optimization":"<b>How:</b> 7–9 h on a consistent schedule. Keep the room dark and cool, cut screens & caffeine before bed, get morning daylight, and get snoring/sleep-apnea checked — it matters.",
  "mediterranean-diet":"<b>How:</b> base meals on vegetables, legumes, whole grains, fish, nuts and extra-virgin olive oil; minimise red/processed meat, refined carbs and sugar. Roughly 4 tbsp olive oil + a handful of nuts daily.",
  "time-restricted-eating":"<b>How:</b> eat within a consistent ~8–10 h window (e.g. 9am–6pm) and stop ~3 h before bed. Earlier windows beat late-night eating; benefits mostly come from eating a bit less.",
  "intermittent-fasting":"<b>How:</b> e.g. 5:2 (two ~500–600 kcal days/week) or alternate-day. Effects track with the calorie deficit; not for those with a history of disordered eating, and adjust diabetes meds with your doctor.",
  "caloric-restriction":"<b>How:</b> a sustained ~10–15% calorie reduction with adequate protein and micronutrients. Hard to maintain long-term; not for the underweight, frail or elderly.",
  "dietary-fiber":"<b>How:</b> aim 25–30 g+/day (most people get ~15–20). <b>Try:</b> whole grains and oats, beans/lentils, vegetables, fruit, nuts and seeds. Increase gradually with plenty of water.",
  "nut-consumption":"<b>How:</b> a small daily handful (~30 g) of unsalted nuts. <b>Try:</b> almonds, walnuts, pistachios, mixed nuts — swapped in for chips or sweets.",
  "coffee":"<b>How:</b> ~3–4 cups/day is the sweet spot (decaf works too — much of the benefit isn't caffeine). Prefer filtered; avoid late-day caffeine if it harms your sleep; ≤200 mg/day in pregnancy.",
  "green-tea-beverage":"<b>How:</b> ~1.5–3 cups/day of brewed green tea. Stick to the beverage rather than high-dose extract pills (those can stress the liver).",
  "sauna-finnish-dry-heat":"<b>How:</b> 4–7 sessions/week, ~15–20 min at ~80–100 °C; hydrate well. Start shorter/cooler and build up. Avoid with unstable heart disease or in pregnancy without medical advice.",
  "cold-water-immersion":"<b>How:</b> short and occasional — ~1–5 min at ~10–15 °C, a few times/week. Never alone, ease in slowly, and skip it if you have heart disease.",
  "contrast-therapy":"<b>How:</b> alternate hot and cold (e.g. ~1 min cold / 1–2 min warm) for ~10–15 min, mainly for post-exercise recovery rather than a proven aging effect.",
  "infrared-sauna":"<b>How:</b> ~15–30 min at ~50–60 °C, a few times/week; gentler heat than a traditional sauna. Hydrate and build tolerance gradually.",
  "red-light-therapy-pbm":"<b>How:</b> red/near-infrared panels (~630–850 nm), a few minutes per area several times/week, at the device's recommended distance. Wear eye protection; more is not better (the dose-response is biphasic).",
  "meditation-mindfulness":"<b>How:</b> ~10–20 min most days — breath focus or a body scan, an app (Headspace/Calm/Waking Up), or an 8-week MBSR course (the studied format).",
  "social-connection":"<b>How:</b> protect regular, meaningful contact — schedule time with friends/family, join a club, class or volunteer group, and invest in a few close relationships. Loneliness rivals smoking for mortality risk.",
  "smoking-cessation":"<b>How:</b> quitting at any age helps — the earlier, the bigger the gain. Combine behavioural support with NRT/varenicline, set a quit date, and use a quitline or app.",
  "alcohol-moderation":"<b>How:</b> less is better and no amount is 'protective.' Keep well below ~1 drink/day, have several alcohol-free days each week, or skip it entirely."
};

const W = {evi:0.30, hum:0.28, imp:0.22, safe:0.20};
const SUB = [
  {k:"evi", label:"Evidence"},
  {k:"hum", label:"Human proof"},
  {k:"imp", label:"Impact"},
  {k:"safe",label:"Safety"}
];

/* ---------- data prep ---------- */
const DATA = (window.INTERVENTIONS || []).map(function (x) {
  const o = Math.round(W.evi*x.evi + W.hum*x.hum + W.imp*x.imp + W.safe*x.safe);
  return Object.assign({}, x, {
    o: o,
    proof: Math.round(0.5*x.evi + 0.5*x.hum),
    tier: o>=78?"S":o>=68?"A":o>=56?"B":o>=44?"C":"D"
  });
});
DATA.sort(function (a,b){return b.o-a.o;});
DATA.forEach(function (x,i){x.rank=i+1;});
const BY_ID = {}; DATA.forEach(function (x){BY_ID[x.id]=x;});

/* ---------- state ---------- */
const S = {
  view:"landscape",
  cats:new Set(),
  etypes:new Set(),
  accs:new Set(),
  min:0,
  sort:"overall",
  q:"",
  sel:null
};

/* ---------- helpers ---------- */
const $ = function (id){return document.getElementById(id);};
const el = function (t,c,h){var e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e;};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
const catColor = function (c){return getComputedStyle(document.documentElement).getPropertyValue("--c-"+c).trim() || "#888";};
const tierColor = function (t){return getComputedStyle(document.documentElement).getPropertyValue("--t-"+t.toLowerCase()).trim() || "#888";};

function passes(x){
  if (S.cats.size && !S.cats.has(x.category)) return false;
  if (S.etypes.size && !S.etypes.has(x.evidenceType)) return false;
  if (S.accs.size && !S.accs.has(x.accessibility)) return false;
  if (x.o < S.min) return false;
  if (S.q){
    const q=S.q.toLowerCase();
    const hay=(x.name+" "+(x.aka||"")+" "+x.klass+" "+CAT[x.category].label+" "+(x.hallmarks||[]).join(" ")).toLowerCase();
    if (hay.indexOf(q)<0) return false;
  }
  return true;
}
function sortKey(x){
  switch(S.sort){
    case "evi": return x.evi; case "hum": return x.hum;
    case "imp": return x.imp; case "safe": return x.safe;
    case "name": return x.name; default: return x.o;
  }
}
function filtered(){
  let r=DATA.filter(passes);
  if (S.sort==="name") r.sort(function(a,b){return a.name.localeCompare(b.name);});
  else r.sort(function(a,b){return sortKey(b)-sortKey(a) || b.o-a.o;});
  return r;
}

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(function(){t.classList.remove("show");},1900);
}

/* ===================== RENDER ===================== */
function render(){
  const items=filtered();
  $("count").innerHTML="<b>"+items.length+"</b> / "+DATA.length;
  document.querySelectorAll(".vt").forEach(function(b){b.classList.toggle("on", b.dataset.view===S.view);});
  ["landscape","table","tiers"].forEach(function(v){ $("view-"+v).classList.toggle("hidden", v!==S.view); });
  $("resetBtn").classList.toggle("active", !!(S.cats.size||S.etypes.size||S.accs.size||S.min||S.q));
  $("filterBtn").classList.toggle("active", !!(S.etypes.size||S.accs.size||S.min));
  if (S.view==="landscape") renderLandscape(items);
  else if (S.view==="table") renderTable(items);
  else renderTiers(items);
}

/* ---- category chips ---- */
function renderChips(){
  const wrap=$("catChips"); wrap.innerHTML="";
  const all=el("button","chip all"+(S.cats.size?"":" on"),"All");
  all.onclick=function(){S.cats.clear(); render(); renderChips();};
  wrap.appendChild(all);
  CAT_ORDER.forEach(function(c){
    const m=CAT[c], n=DATA.filter(function(x){return x.category===c;}).length;
    const b=el("button","chip"+(S.cats.has(c)?" on":""));
    b.innerHTML='<span class="chip-dot" style="background:'+m.color+'"></span>'+m.icon+" "+esc(m.label)+" "+n;
    if (S.cats.has(c)) b.style.background=m.color;
    b.onclick=function(){ S.cats.has(c)?S.cats.delete(c):S.cats.add(c); render(); renderChips(); };
    wrap.appendChild(b);
  });
}

/* ---- Landscape (scatter) ---- */
function renderLandscape(items){
  const plot=$("scatterPlot");
  plot.querySelectorAll(".dot,.dot-lab,.grid-l,.grid-v").forEach(function(n){n.remove();});
  // gridlines
  [0,25,50,75,100].forEach(function(v){
    const gl=el("div","grid-l"); gl.style.bottom=v+"%"; gl.appendChild(el("span",null,v));
    const gv=el("div","grid-v"); gv.style.left=v+"%"; gv.appendChild(el("span",null,v));
    plot.appendChild(gl); plot.appendChild(gv);
  });
  items.forEach(function(x){
    const d=el("button","dot"+(x.id===S.sel?" active":"")+(x.tier==="S"?" flag":""));
    const size=12+x.o/6.5;
    d.style.width=size+"px"; d.style.height=size+"px";
    d.style.left=x.imp+"%"; d.style.top=(100-x.proof)+"%";
    d.style.background="radial-gradient(circle at 35% 30%, #ffffffcc, "+catColor(x.category)+" 62%)";
    d.dataset.id=x.id; d.title=x.name;
    d.onmouseenter=function(e){showTip(x,e);}; d.onmousemove=moveTip; d.onmouseleave=hideTip;
    d.onclick=function(){select(x.id);};
    plot.appendChild(d);
  });
  // de-collided labels for the top performers in the current filter
  const pw=plot.clientWidth||720, ph=plot.clientHeight||460;
  const labeled=items.slice().sort(function(a,b){return b.o-a.o;}).slice(0,8)
    .map(function(x){return {x:x, px:x.imp/100*pw, py:(100-x.proof)/100*ph};});
  const placed=[];
  labeled.forEach(function(o){
    let ly=o.py-10, guard=0, moved=true;
    while(moved && guard++<40){ moved=false;
      placed.forEach(function(p){ if(Math.abs(p.lx-o.px)<142 && Math.abs(p.ly-ly)<14){ ly=p.ly+14; moved=true; } });
    }
    placed.push({lx:o.px, ly:ly});
    const right=o.px>pw*0.6;
    const lab=el("div","dot-lab",esc(o.x.name.split(" (")[0]));
    lab.style.left=(right?o.px-7:o.px+7)+"px";
    lab.style.top=ly+"px";
    lab.style.transform=right?"translate(-100%,-50%)":"translate(0,-50%)";
    lab.style.color=catColor(o.x.category);
    plot.appendChild(lab);
  });
  $("scatterFoot").innerHTML="Each dot is an intervention · bubble size = promise score · colour = category · ⭐ gold ring = S-tier. Hover for detail, click to open. Showing <b style='color:var(--accent)'>"+items.length+"</b>.";
}
let tipEl;
function showTip(x,e){
  tipEl=$("tip");
  tipEl.innerHTML='<div class="tip-name"><span class="cdot" style="background:'+catColor(x.category)+'"></span>'+esc(x.name)+'</div>'+
    '<div class="tip-cat">'+CAT[x.category].icon+" "+esc(CAT[x.category].label)+" · "+esc(x.klass)+'</div>'+
    '<div class="tip-row"><span>Proof</span><b>'+x.proof+'</b></div>'+
    '<div class="tip-row"><span>Impact</span><b>'+x.imp+'</b></div>'+
    '<div class="tip-row"><span>Safety</span><b>'+x.safe+'</b></div>'+
    '<div class="tip-ov">Promise <b>'+x.o+'</b> · '+TIER[x.tier].label+' tier</div>';
  tipEl.classList.remove("hidden"); tipEl.classList.add("show"); moveTip(e);
}
function moveTip(e){
  if(!tipEl) return;
  const pad=14, w=tipEl.offsetWidth, h=tipEl.offsetHeight;
  let x=e.clientX+pad, y=e.clientY+pad;
  if (x+w>innerWidth-8) x=e.clientX-w-pad;
  if (y+h>innerHeight-8) y=e.clientY-h-pad;
  tipEl.style.left=x+"px"; tipEl.style.top=y+"px";
}
function hideTip(){ if(tipEl){tipEl.classList.add("hidden"); tipEl.classList.remove("show");} }

/* ---- Table ---- */
const COLS=[
  {k:"rank", label:"#", cls:"r", get:function(x){return x.rank;}},
  {k:"name", label:"Intervention", get:null},
  {k:"o", label:"Promise", cls:"r"},
  {k:"evi", label:"Evidence", cls:"r"},
  {k:"hum", label:"Human", cls:"r"},
  {k:"imp", label:"Impact", cls:"r"},
  {k:"safe", label:"Safety", cls:"r"},
  {k:"etype", label:"Best evidence", get:null},
  {k:"acc", label:"Access", get:null}
];
function renderTable(items){
  const hr=$("theadRow"); hr.innerHTML="";
  COLS.forEach(function(c){
    const th=el("th",c.cls||"");
    const sortable=["o","evi","hum","imp","safe","name"].indexOf(c.k)>=0;
    const sk=c.k==="o"?"overall":c.k;
    th.innerHTML=esc(c.label)+(sortable&&S.sort===sk?' <span class="ar">▼</span>':"");
    if (sortable){ th.classList.toggle("sorted",S.sort===sk); th.onclick=function(){S.sort=sk; $("sortSel").value=sk; render();}; }
    hr.appendChild(th);
  });
  const tb=$("tbody"); tb.innerHTML="";
  items.forEach(function(x){
    const tr=el("tr",(x.id===S.sel?"active ":"")+(x.rank<=3?("top"+x.rank):""));
    tr.onclick=function(){select(x.id);};
    const et=ETYPE[x.evidenceType];
    tr.innerHTML=
      '<td class="r tc-rank">'+x.rank+'</td>'+
      '<td><div class="tc-name"><span class="cdot" style="background:'+catColor(x.category)+'"></span><div>'+esc(x.name)+'<small>'+CAT[x.category].icon+" "+esc(CAT[x.category].label)+'</small></div></div></td>'+
      '<td class="r"><span class="tc-score" style="color:'+tierColor(x.tier)+'">'+x.o+'</span></td>'+
      bar(x.evi)+bar(x.hum)+bar(x.imp)+bar(x.safe)+
      '<td><span class="ev-badge" style="color:'+et.color+';background:'+et.color+'22">'+esc(et.short)+'</span></td>'+
      '<td><span class="status-tx">'+ACC[x.accessibility].icon+" "+esc(ACC[x.accessibility].label)+'</span></td>';
    tb.appendChild(tr);
  });
  if(!items.length) tb.innerHTML='<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--muted)">No interventions match these filters.</td></tr>';
}
function bar(v){
  const col = v>=70?"var(--e-strong)":v>=55?"var(--e-good)":v>=40?"var(--e-itp)":"var(--e-vitro)";
  return '<td class="r"><div class="bar-cell"><div class="bt"><i style="width:'+v+'%;background:'+col+'"></i></div><b>'+v+'</b></div></td>';
}

/* ---- Tiers ---- */
function renderTiers(items){
  const wrap=$("tiersWrap"); wrap.innerHTML="";
  TIER_ORDER.forEach(function(t){
    const m=TIER[t];
    const list=items.filter(function(x){return x.tier===t;}).sort(function(a,b){return b.o-a.o;});
    const band=el("div","tier-band");
    const key=el("div","tier-key");
    key.style.background=m.color+"22"; key.style.border="1px solid "+m.color+"55";
    key.innerHTML='<div class="tk-l" style="color:'+m.color+'">'+t+'</div><div class="tk-n">'+esc(m.label)+'</div><div class="tk-c">'+list.length+'</div>';
    const cards=el("div","tier-cards");
    if(!list.length) cards.appendChild(el("div","tier-empty","— none in current filter —"));
    list.forEach(function(x){
      const c=el("div","tcard"+(x.id===S.sel?" active":""));
      c.onclick=function(){select(x.id);};
      c.innerHTML='<div class="tci" style="background:'+catColor(x.category)+'22">'+CAT[x.category].icon+'</div>'+
        '<div class="tcm"><div class="tcn">'+esc(x.name)+'</div><div class="tcs">'+esc(CAT[x.category].label)+'</div></div>'+
        '<div class="tcv" style="color:'+m.color+'">'+x.o+'</div>';
      cards.appendChild(c);
    });
    band.appendChild(key); band.appendChild(cards); wrap.appendChild(band);
  });
}

/* ===================== DETAIL ===================== */
function select(id){
  S.sel=id;
  renderDetail(BY_ID[id]);
  $("detail").classList.add("open");
  // reflect active state without full re-render churn
  document.querySelectorAll(".dot").forEach(function(d){d.classList.toggle("active",d.dataset.id===id);});
  if (S.view!=="landscape") render();
  setHash();
}
function closeDetail(){ S.sel=null; $("detail").classList.remove("open"); document.querySelectorAll(".dot.active,tr.active,.tcard.active").forEach(function(n){n.classList.remove("active");}); setHash(); }

function renderDetail(x){
  if(!x) return;
  const et=ETYPE[x.evidenceType], ac=ACC[x.accessibility], cm=CAT[x.category];
  let h="";
  h+='<div class="d-cat" style="color:'+cm.color+'"><span class="cdot" style="background:'+cm.color+'"></span>'+cm.icon+" "+esc(cm.label)+'</div>';
  h+='<div class="d-name">'+esc(x.name)+'</div>';
  if (x.aka) h+='<div class="d-aka">'+esc(x.aka)+'</div>';
  h+='<div class="d-klass">'+esc(x.klass)+'</div>';
  // score box
  h+='<div class="d-scorebox">';
  h+='<div class="d-overall"><div class="o-num" style="color:'+tierColor(x.tier)+'">'+x.o+'</div><div class="o-of">/100 promise</div>'+
     '<div class="d-tier" style="color:'+tierColor(x.tier)+';background:'+tierColor(x.tier)+'22">'+x.tier+' · '+esc(TIER[x.tier].label)+'</div></div>';
  h+='<div class="d-bars">';
  SUB.forEach(function(s){
    const v=x[s.k];
    const col=v>=70?"var(--e-strong)":v>=55?"var(--e-good)":v>=40?"var(--e-itp)":"var(--e-vitro)";
    h+='<div class="d-bar"><span>'+s.label+'</span><div class="dt"><i style="width:'+v+'%;background:'+col+'"></i></div><b>'+v+'</b></div>';
  });
  h+='</div></div>';
  h+='<div class="d-evrow"><span class="d-evtype" style="color:'+et.color+';background:'+et.color+'22"><span class="ed" style="background:'+et.color+'"></span>'+esc(et.label)+'</span>'+
     '<span class="d-acc">'+ac.icon+" "+esc(ac.label)+'</span></div>';
  h+='<div class="d-sec"><div class="d-sec-h">How it works</div><div class="d-text">'+esc(x.mechanism)+'</div></div>';
  if (x.hallmarks && x.hallmarks.length){
    h+='<div class="d-sec"><div class="d-sec-h">Hallmarks of aging targeted</div><div class="d-hallmarks">'+
       x.hallmarks.map(function(hm){return '<span class="hm">'+esc(hm)+'</span>';}).join("")+'</div></div>';
  }
  h+='<div class="d-sec"><div class="d-sec-h">The evidence</div><div class="d-text">'+esc(x.evidence)+'</div></div>';
  if (x.keyStudies && x.keyStudies.length){
    h+='<div class="d-sec"><div class="d-sec-h">Key studies</div>';
    x.keyStudies.forEach(function(s){ var u=s.url||('https://scholar.google.com/scholar?q='+encodeURIComponent(s.ref)); h+='<div class="d-study"><a class="d-study-ref" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+(s.url?'Open the study':'Look up this study')+'">'+esc(s.ref)+' ↗</a>'+esc(s.finding)+'</div>'; });
    h+='</div>';
  }
  h+='<div class="d-sec"><div class="d-sec-h">At a glance</div><div class="d-rows">';
  h+=row("Effect", x.effect); h+=row("In humans", x.human); h+=row("Typical dose", x.dose);
  h+=row("Safety", x.safety); h+=row("Status", x.status);
  h+='</div></div>';
  h+='<div class="d-sec"><div class="d-sec-h">Biggest caveat</div><div class="d-caveat">'+esc(x.caveats)+'</div></div>';
  if (x.sources && x.sources.length){
    h+='<div class="d-sec"><div class="d-sec-h">Sources</div><div class="d-sources">'+
       x.sources.map(function(u){return '<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(prettyUrl(u))+' ↗</a>';}).join("")+'</div></div>';
  }
  h+='<div class="d-disc">Promise = 30% evidence + 28% human translation + 22% impact + 20% safety. Educational only — not medical advice.</div>';
  $("detailBody").innerHTML=h;
  $("detail").scrollTop=0;
}
function row(k,v){ return '<div class="d-r"><span class="k">'+k+'</span><span class="v">'+esc(v)+'</span></div>'; }
function prettyUrl(u){ try{ return u.replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0]; }catch(e){ return u; } }

/* ===================== SEARCH ===================== */
function renderSearch(){
  const box=$("searchResults");
  if(!S.q){ box.classList.add("hidden"); return; }
  const r=DATA.filter(passesSearchOnly).slice(0,12);
  if(!r.length){ box.innerHTML='<div class="sr-none">No matches</div>'; box.classList.remove("hidden"); return; }
  box.innerHTML=r.map(function(x){
    return '<div class="sr-item" data-id="'+x.id+'"><span class="sr-dot" style="background:'+catColor(x.category)+'"></span>'+
      '<div class="sr-main"><div class="sr-name">'+esc(x.name)+'</div><div class="sr-sub">'+CAT[x.category].icon+" "+esc(CAT[x.category].label)+'</div></div>'+
      '<span class="sr-score" style="color:'+tierColor(x.tier)+'">'+x.o+'</span></div>';
  }).join("");
  box.classList.remove("hidden");
  box.querySelectorAll(".sr-item").forEach(function(it){ it.onclick=function(){ select(it.dataset.id); $("search").value=""; S.q=""; box.classList.add("hidden"); render(); }; });
}
function passesSearchOnly(x){
  const q=S.q.toLowerCase();
  const hay=(x.name+" "+(x.aka||"")+" "+x.klass+" "+CAT[x.category].label+" "+(x.hallmarks||[]).join(" ")).toLowerCase();
  return hay.indexOf(q)>=0;
}

/* ===================== FILTER POPOVER ===================== */
function buildFilterPop(){
  const ee=$("fpEtypes"); ee.innerHTML="";
  ETYPE_ORDER.forEach(function(k){
    const m=ETYPE[k], n=DATA.filter(function(x){return x.evidenceType===k;}).length;
    if(!n) return;
    const o=el("button","fp-opt"+(S.etypes.has(k)?" on":""));
    o.innerHTML='<span class="fp-dot" style="background:'+m.color+'"></span>'+esc(m.short)+" "+n;
    if(S.etypes.has(k)) o.style.background=m.color, o.style.color="#04111e";
    o.onclick=function(){ S.etypes.has(k)?S.etypes.delete(k):S.etypes.add(k); buildFilterPop(); render(); };
    ee.appendChild(o);
  });
  const aa=$("fpAccs"); aa.innerHTML="";
  ACC_ORDER.forEach(function(k){
    const m=ACC[k], n=DATA.filter(function(x){return x.accessibility===k;}).length;
    if(!n) return;
    const o=el("button","fp-opt"+(S.accs.has(k)?" on":""));
    o.innerHTML=m.icon+" "+esc(m.label)+" "+n;
    if(S.accs.has(k)) o.style.background="var(--accent)", o.style.color="#04201c";
    o.onclick=function(){ S.accs.has(k)?S.accs.delete(k):S.accs.add(k); buildFilterPop(); render(); };
    aa.appendChild(o);
  });
  $("fpMin").value=S.min; $("fpMinVal").textContent=S.min;
}

/* ===================== OVERLAYS ===================== */
function printChecklist(){
  const items=filtered();
  const groups=ACCESS_GROUPS.map(function(g){
    return {g:g, list:items.filter(function(x){return g.match.indexOf(x.accessibility)>=0;}).sort(function(a,b){return b.o-a.o;})};
  }).filter(function(z){return z.list.length;});
  const filt=(S.cats.size||S.etypes.size||S.accs.size||S.min||S.q)?" (current filter)":"";
  let dt=""; try{dt=new Date().toLocaleDateString();}catch(e){}
  let h="";
  h+='<h1>Geroscope — Longevity Checklist</h1>';
  h+='<p class="pc-sub">What actually works to slow aging · ranked by evidence · '+esc(dt)+'</p>';
  h+='<div class="pc-meta">Tick what you already do or plan to try. Grouped by how you access each, ranked within each group by a 0–100 <b>promise score</b> (30% evidence + 28% human proof + 22% impact + 20% safety; tiers S&ge;78 · A · B · C · D). <b>Educational only — not medical advice.</b> Talk to a clinician before starting anything new — especially prescription and advanced items. '+items.length+' interventions'+filt+'.</div>';
  groups.forEach(function(z){
    h+='<div class="pc-grp"><h2>'+z.g.icon+' '+esc(z.g.label)+' ('+z.list.length+')</h2><div class="pc-gd">'+esc(z.g.desc)+'</div>';
    z.list.forEach(function(x){
      const why=(x.effect||"").split(" — ")[0];
      h+='<div class="pc-item"><div class="pc-box"></div><div class="pc-main">';
      h+='<div class="pc-h">'+esc(x.name)+' <span class="pc-tier" style="background:'+tierColor(x.tier)+'22">'+x.tier+'</span> <span class="pc-sc">'+x.o+' · '+esc(CAT[x.category].label)+'</span></div>';
      if (GUIDE[x.id]) h+='<div class="pc-guide">'+GUIDE[x.id]+'</div>';
      else h+='<div class="pc-do"><b>Do:</b> '+esc(x.dose)+'</div>';
      if (why) h+='<div class="pc-why">'+esc(why)+'</div>';
      if (z.g.key==="rx"||z.g.key==="adv") h+='<div class="pc-note">&#9888; '+esc(x.caveats)+'</div>';
      h+='</div></div>';
    });
    h+='</div>';
  });
  h+='<div class="pc-foot">Source: Geroscope · 42-apps.github.io/longevity — full evidence, key studies and citations for every item are on the site. Promise scores are a curated synthesis, not measured values. Not medical advice; consult a clinician.</div>';
  $("printDoc").innerHTML=h;
  toast("Opening print dialog — pick “Save as PDF”");
  setTimeout(function(){ try{ window.print(); }catch(e){} }, 150);
}

function printCheatSheet(){
  let pool=filtered().filter(function(x){return x.o>=68;});   // S + A tiers only
  if(!pool.length) pool=filtered().slice(0,15);
  const groups=ACCESS_GROUPS.map(function(g){
    return {g:g, list:pool.filter(function(x){return g.match.indexOf(x.accessibility)>=0;}).sort(function(a,b){return b.o-a.o;})};
  }).filter(function(z){return z.list.length;});
  let dt=""; try{dt=new Date().toLocaleDateString();}catch(e){}
  let h="";
  h+='<h1>Geroscope — 1-Page Longevity Cheat Sheet</h1>';
  h+='<p class="pc-sub">The highest-evidence essentials (S &amp; A tier) · '+esc(dt)+'</p>';
  h+='<div class="pc-meta">The best-supported interventions, grouped by how you get them, ranked by promise score. <b>Educational only — not medical advice.</b> Full list, scores, guidance &amp; sources at 42-apps.github.io/longevity.</div>';
  groups.forEach(function(z){
    h+='<div class="pc-grp"><h2>'+z.g.icon+' '+esc(z.g.label)+'</h2>';
    z.list.forEach(function(x){
      h+='<div class="pc-item"><div class="pc-box"></div><div class="pc-main"><span class="pc-h">'+esc(x.name)+'</span> <span class="pc-tier" style="background:'+tierColor(x.tier)+'22">'+x.tier+'·'+x.o+'</span> <span style="color:#555">— '+esc(x.dose)+'</span></div></div>';
    });
    h+='</div>';
  });
  h+='<div class="pc-foot">Geroscope · 42-apps.github.io/longevity — not medical advice; consult a clinician. For the full 135-item checklist with how-to guidance, use “Full checklist” in the menu.</div>';
  $("printDoc").innerHTML=h;
  toast("Opening print dialog — pick “Save as PDF”");
  setTimeout(function(){ try{ window.print(); }catch(e){} }, 150);
}

function openOv(id){ $(id).classList.remove("hidden"); }
function closeOv(id){ $(id).classList.add("hidden"); }

function buildMethodology(){
  const lad=$("evLadder"); lad.innerHTML="";
  ETYPE_ORDER.forEach(function(k){
    const m=ETYPE[k];
    lad.appendChild(el("div","el-row",'<span class="eld" style="background:'+m.color+'"></span><span class="eln">'+esc(m.label)+'</span><span class="elx">strength '+m.rank+'/7</span>'));
  });
  const tl=$("tierLegend"); tl.innerHTML="";
  TIER_ORDER.forEach(function(t){
    const m=TIER[t], n=DATA.filter(function(x){return x.tier===t;}).length;
    tl.appendChild(el("div","tl-item",'<b style="color:'+m.color+'">'+t+'</b> '+esc(m.label)+' · '+esc(m.desc)+' ('+n+')'));
  });
}
function buildStats(){
  const body=$("statsBody"); $("statsN").textContent=DATA.length;
  const sTier={}, sCat={}, sEt={};
  DATA.forEach(function(x){ sTier[x.tier]=(sTier[x.tier]||0)+1; sCat[x.category]=(sCat[x.category]||0)+1; sEt[x.evidenceType]=(sEt[x.evidenceType]||0)+1; });
  const human=DATA.filter(function(x){return x.evidenceType.indexOf("human")===0;}).length;
  const sTop=DATA.filter(function(x){return x.tier==="S"||x.tier==="A";}).length;
  let h='<div class="st-grid">'+
    statCard(DATA.length,"interventions")+
    statCard(human,"with human evidence")+
    statCard(sTop,"in S or A tier")+
    statCard(DATA.filter(function(x){return x.accessibility==="lifestyle"||x.accessibility==="otc";}).length,"OTC / lifestyle")+
    '</div>';
  h+='<div class="fp-h" style="margin:6px 0 8px">By tier</div><div class="st-bars">';
  const maxT=Math.max.apply(null,TIER_ORDER.map(function(t){return sTier[t]||0;}));
  TIER_ORDER.forEach(function(t){ const n=sTier[t]||0; h+=statBar(TIER[t].label+" ("+t+")", n, maxT, tierColorJS(t)); });
  h+='</div>';
  h+='<div class="fp-h" style="margin:16px 0 8px">By category</div><div class="st-bars">';
  const maxC=Math.max.apply(null,CAT_ORDER.map(function(c){return sCat[c]||0;}));
  CAT_ORDER.forEach(function(c){ const n=sCat[c]||0; if(!n)return; h+=statBar(CAT[c].icon+" "+CAT[c].label, n, maxC, catColorJS(c)); });
  h+='</div>';
  h+='<div class="fp-h" style="margin:16px 0 8px">By strength of evidence</div><div class="st-bars">';
  const maxE=Math.max.apply(null,ETYPE_ORDER.map(function(e){return sEt[e]||0;}));
  ETYPE_ORDER.forEach(function(e){ const n=sEt[e]||0; if(!n)return; h+=statBar(ETYPE[e].short, n, maxE, etColorJS(e)); });
  h+='</div>';
  body.innerHTML=h;
}
function statCard(n,l){ return '<div class="st-card"><div class="st-num">'+n+'</div><div class="st-lab">'+esc(l)+'</div></div>'; }
function statBar(label,n,max,col){
  const pct=max?Math.round(n/max*100):0;
  return '<div class="st-bar"><div class="nm"><i style="background:'+col+'"></i>'+esc(label)+'</div><div class="tk"><i style="width:'+pct+'%;background:'+col+'"></i></div><div class="ct">'+n+'</div></div>';
}
const _cs=getComputedStyle(document.documentElement);
function catColorJS(c){return _cs.getPropertyValue("--c-"+c).trim()||"#888";}
function tierColorJS(t){return _cs.getPropertyValue("--t-"+t.toLowerCase()).trim()||"#888";}
function etColorJS(e){return (ETYPE[e].color.indexOf("var(")===0)? _cs.getPropertyValue(ETYPE[e].color.slice(4,-1)).trim() : ETYPE[e].color;}

/* ===================== HASH / DEEPLINK ===================== */
function setHash(){
  const p=[];
  if (S.view!=="landscape") p.push("view="+S.view);
  if (S.cats.size) p.push("cat="+Array.from(S.cats).join(","));
  if (S.sel) p.push("i="+S.sel);
  history.replaceState(null,"", p.length?("#"+p.join("&")):location.pathname);
}
function readHash(){
  const hash=location.hash.replace(/^#/,""); if(!hash) return;
  hash.split("&").forEach(function(kv){
    const i=kv.indexOf("="); if(i<0) return;
    const k=kv.slice(0,i), v=decodeURIComponent(kv.slice(i+1));
    if (k==="view" && ["landscape","table","tiers"].indexOf(v)>=0) S.view=v;
    else if (k==="cat") v.split(",").forEach(function(c){ if(CAT[c]) S.cats.add(c); });
    else if (k==="i" && BY_ID[v]) S.sel=v;
  });
}

/* ===================== EVENTS ===================== */
function wire(){
  document.querySelectorAll(".vt").forEach(function(b){ b.onclick=function(){ S.view=b.dataset.view; render(); setHash(); }; });
  $("sortSel").onchange=function(){ S.sort=this.value; render(); };
  $("resetBtn").onclick=function(){ S.cats.clear(); S.etypes.clear(); S.accs.clear(); S.min=0; S.q=""; $("search").value=""; renderSearch(); buildFilterPop(); renderChips(); render(); toast("Filters reset"); };
  $("brandHome").onclick=function(){ S.view="landscape"; S.cats.clear(); S.etypes.clear(); S.accs.clear(); S.min=0; closeDetail(); renderChips(); buildFilterPop(); render(); };

  // search
  const sb=$("search");
  sb.oninput=function(){ S.q=this.value.trim(); renderSearch(); render(); };
  sb.onfocus=function(){ if(S.q) renderSearch(); };
  document.addEventListener("click",function(e){ if(!$("searchWrap").contains(e.target)) $("searchResults").classList.add("hidden"); });

  // menu
  const menu=$("menu");
  $("menuBtn").onclick=function(e){ e.stopPropagation(); menu.classList.toggle("hidden"); };
  document.addEventListener("click",function(e){ if(!menu.classList.contains("hidden") && !menu.contains(e.target) && e.target!==$("menuBtn")) menu.classList.add("hidden"); });
  const mclose=function(){ menu.classList.add("hidden"); };
  $("miMethod").onclick=function(){ mclose(); openOv("methodology"); };
  $("miStats").onclick=function(){ mclose(); buildStats(); openOv("stats"); };
  $("miChecklist").onclick=function(){ mclose(); printChecklist(); };
  $("miProvenance").onclick=function(){ mclose(); openOv("provenance"); };
  var _apl=$("aboutProvLink"); if(_apl) _apl.onclick=function(e){ e.preventDefault(); closeOv("about"); openOv("provenance"); };
  $("checklistBtn").onclick=printCheatSheet;
  $("miTop").onclick=function(){ mclose(); select(DATA[0].id); toast("#1: "+DATA[0].name); };
  $("miShare").onclick=function(){ mclose(); navigator.clipboard && navigator.clipboard.writeText(location.href); toast("Link copied"); };
  $("miReset").onclick=function(){ mclose(); $("resetBtn").onclick(); };
  $("miHelp").onclick=function(){ mclose(); openOv("welcome"); };
  $("miAbout").onclick=function(){ mclose(); openOv("about"); };

  // filter popover
  const fp=$("filterPop");
  $("filterBtn").onclick=function(e){ e.stopPropagation(); buildFilterPop(); fp.classList.toggle("hidden"); };
  document.addEventListener("click",function(e){ if(!fp.classList.contains("hidden") && !fp.contains(e.target) && e.target!==$("filterBtn")) fp.classList.add("hidden"); });
  $("fpMin").oninput=function(){ S.min=+this.value; $("fpMinVal").textContent=this.value; render(); };
  $("fpReset").onclick=function(){ S.etypes.clear(); S.accs.clear(); S.min=0; buildFilterPop(); render(); };
  $("fpApply").onclick=function(){ fp.classList.add("hidden"); };

  // detail
  $("detailClose").onclick=closeDetail;

  // overlays
  $("welStart").onclick=function(){ closeOv("welcome"); try{localStorage.setItem("geroscope_seen","1");}catch(e){} };
  document.querySelectorAll("[data-close]").forEach(function(b){ b.onclick=function(){ closeOv(b.dataset.close); }; });
  document.querySelectorAll(".overlay").forEach(function(o){ o.onclick=function(e){ if(e.target===o) o.classList.add("hidden"); }; });

  // keyboard
  document.addEventListener("keydown",function(e){
    if (e.key==="Escape"){ document.querySelectorAll(".overlay:not(.hidden)").forEach(function(o){o.classList.add("hidden");}); if($("detail").classList.contains("open")) closeDetail(); $("menu").classList.add("hidden"); $("filterPop").classList.add("hidden"); }
    if (e.key==="/" && document.activeElement!==sb){ e.preventDefault(); sb.focus(); }
  });
  window.addEventListener("resize",function(){ if(S.view==="landscape") renderLandscape(filtered()); });
}

/* ===================== INIT ===================== */
function init(){
  if(!DATA.length){ document.body.innerHTML="<p style='padding:40px;color:#fff'>No data loaded.</p>"; return; }
  $("welCount").textContent=DATA.length; $("aboutCount").textContent=DATA.length; $("statsN").textContent=DATA.length;
  buildMethodology();
  readHash();
  $("sortSel").value="overall";
  renderChips(); buildFilterPop(); wire(); render();
  if (S.sel) select(S.sel);
  let seen=false; try{ seen=!!localStorage.getItem("geroscope_seen"); }catch(e){}
  if (!seen && !location.hash) openOv("welcome");
}
if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
