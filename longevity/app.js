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
