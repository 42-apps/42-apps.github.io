/* ============================================================================
   GlobalEntheogen — world psychedelic & entheogen LAW dataset
   ----------------------------------------------------------------------------
   Status of clinically-relevant psychedelics / entheogens (and cocaine) by
   country, with a focus on ACCESS FOR MEDICAL RESEARCH & TREATMENT.

   ⚠️  This is an APPROXIMATE, hand-compiled orientation tool — NOT legal advice.
   Drug law is nuanced (national vs state/provincial, possession vs supply vs
   cultivation, religious/indigenous exemptions, "decriminalized" ≠ "legal"),
   it changes constantly, and enforcement diverges from the statute books.
   ALWAYS verify with a qualified local source before acting on anything here.

   Reviewed ≈ June 2026 against public references — see window.SOURCES.

   Per-country record:
     n    country name
     def  DEFAULT status applied to any substance not listed in `st`
     st   per-substance status overrides  { <subKey>: <statusKey> }
     nt   optional notes  { _:"general country note", <subKey>:"substance note" }
   Keyed by ISO 3166-1 alpha-2 (matches geojson ISO_A2).
   ========================================================================== */

/* ----------------------------------------------------------------------------
   STATUS SCALE — ordinal, from most to least accessible. `score` (5→0) drives
   the "Overview" openness aggregate; `color` paints the globe.
---------------------------------------------------------------------------- */
window.STATUSES = {
  legal:  { label:"Legal / regulated",          short:"Legal",      color:"#2fd07a", score:5,
            blurb:"Legally available — regulated adult use, or no prohibition." },
  med:    { label:"Medical / clinical access",   short:"Medical",    color:"#19b3a6", score:4,
            blurb:"Legal for medical, prescribed, clinical or approved-therapy use." },
  decrim: { label:"Decriminalized / conditional",short:"Decrim.",    color:"#f4c145", score:3,
            blurb:"Not a crime to possess, or allowed under specific conditions (personal-use, religious, pilot)." },
  tol:    { label:"Illegal — tolerated",         short:"Tolerated",  color:"#ef8b3c", score:2,
            blurb:"Prohibited on paper, but largely unenforced or de-facto tolerated." },
  ill:    { label:"Illegal",                     short:"Illegal",    color:"#ef4d52", score:1,
            blurb:"Prohibited and enforced — possession is a criminal offence." },
  cap:    { label:"Severe — incl. death penalty",short:"Severe",     color:"#181722", score:0,
            blurb:"Extreme penalties — long mandatory prison or capital punishment may apply to drug offences." },
};
/* Overview aggregate: avg score (0–5) bucketed into the same palette. */
window.OVERVIEW_GRADE = [
  [3.2, 'legal'], [2.4, 'med'], [1.7, 'decrim'], [1.2, 'tol'], [0.6, 'ill'], [-1, 'cap'],
];

/* ----------------------------------------------------------------------------
   SUBSTANCES — order here = order in the selector, tooltip grid & detail card.
   "overview" is the aggregate openness lens (not a real substance).
   `clinical` = the medical-research angle (the whole point of this map).
---------------------------------------------------------------------------- */
window.SUBSTANCES = {
  overview: { name:"Overview", emoji:"🌍", aggregate:true,
              desc:"Combined openness across all substances below — a single 'how permissive is this country' read.",
              clinical:"Greener = broader legal access for patients & researchers; black = capital-punishment regimes." },
  can:  { name:"Cannabis", emoji:"🌿",
          desc:"THC/cannabis. The most widely reformed — from adult-use legal to death-penalty.",
          clinical:"Medical cannabis is now prescribable in 50+ countries (pain, epilepsy, MS, chemo nausea, PTSD)." },
  cbd:  { name:"CBD", emoji:"💧",
          desc:"Cannabidiol — non-intoxicating cannabis extract. Far more permissive than THC.",
          clinical:"Epidiolex (CBD) is an approved anti-epileptic in the US/EU; OTC wellness CBD is legal across much of the West." },
  psi:  { name:"Psilocybin", emoji:"🍄",
          desc:"'Magic mushrooms'. The fastest-moving psychedelic in clinical reform.",
          clinical:"Australia (2023) & Czechia (2026) allow prescribing for treatment-resistant depression; Oregon & Colorado run regulated services." },
  lsd:  { name:"LSD", emoji:"🌀",
          desc:"Lysergic acid diethylamide. Schedule-I almost everywhere; an active research substance.",
          clinical:"Phase-II/III trials for anxiety & depression; Switzerland grants limited compassionate-use permits." },
  mdma: { name:"MDMA", emoji:"💊",
          desc:"'Ecstasy'. The lead candidate for trauma therapy.",
          clinical:"Australia prescribes it for PTSD (2023); the US FDA declined Lykos' application in 2024 — trials continue." },
  dmt:  { name:"DMT / Ayahuasca", emoji:"🫖",
          desc:"DMT and the Amazonian ayahuasca brew. Often legal for religious/indigenous use.",
          clinical:"Religious exemptions exist (Brazil, US, Peru); early trials for depression (e.g. extended-release DMT)." },
  mes:  { name:"Mescaline", emoji:"🌵",
          desc:"Peyote & San Pedro cacti. Tied to indigenous ceremony in the Americas.",
          clinical:"Protected for Native American Church use in the US; little modern clinical infrastructure." },
  ket:  { name:"Ketamine", emoji:"💉",
          desc:"A dissociative anaesthetic — the ONE psychedelic-adjacent drug that is medically available almost everywhere.",
          clinical:"A WHO Essential Medicine; esketamine (Spravato) is approved for treatment-resistant depression in the US & EU." },
  ibo:  { name:"Ibogaine", emoji:"🪵",
          desc:"From the iboga shrub (Gabon). Unscheduled in many countries — a legal grey zone.",
          clinical:"Used in clinics (Mexico, NZ, South Africa, Brazil) for opioid/addiction interruption; Schedule-I in the US." },
  coc:  { name:"Cocaine", emoji:"❄️",
          desc:"Refined cocaine hydrochloride. Included for context — overwhelmingly prohibited.",
          clinical:"A registered topical anaesthetic (ENT/eye surgery) in some countries; otherwise no medical use." },
  coca: { name:"Coca leaf", emoji:"🍃",
          desc:"The raw Andean coca leaf — a mild traditional stimulant, NOT refined cocaine. Legal in its homelands, prohibited almost everywhere else.",
          clinical:"Traditional Andean medicine & nutrition (tea, chewing); UN reviewing its 1961 Schedule-I listing." },
};

/* ============================================================================
   LAW_DATA — keyed by ISO-2. Most countries default-prohibit everything except
   ketamine (a medicine) and CBD (often permitted); overrides capture the rest.
   ========================================================================== */
window.LAW_DATA = {

  /* ---------------- North & Central America ---------------- */
  US: { n:"United States", def:'ill',
        st:{ can:'med', cbd:'legal', psi:'decrim', mdma:'ill', dmt:'decrim', mes:'decrim', ket:'med', ibo:'ill', coc:'ill' },
        nt:{ _:"Federal vs state patchwork — federally most are Schedule I.",
             can:"Federally illegal, but adult-use is legal in 24 states & medical in ~39.",
             psi:"Oregon & Colorado run regulated psilocybin services; many cities decriminalized — federally Schedule I.",
             mdma:"FDA declined Lykos' PTSD application (Aug 2024); Schedule I, trials & expanded-access continue.",
             mes:"Peyote is legal for members of the Native American Church.",
             dmt:"Ayahuasca churches (UDV, Santo Daime) hold religious-use exemptions.",
             ket:"Approved (esketamine/Spravato); widely used off-label in IV-ketamine clinics." } },
  CA: { n:"Canada", def:'ill',
        st:{ can:'legal', cbd:'med', psi:'med', lsd:'ill', mdma:'med', dmt:'decrim', ket:'med', ibo:'tol', coc:'ill' },
        nt:{ can:"Legal nationwide for adults since 2018 (Cannabis Act).",
             psi:"Accessible via the Special Access Program & individual s.56 exemptions.",
             mdma:"Available to some patients through the Special Access Program.",
             ibo:"Not a controlled substance — a legal grey zone." } },
  MX: { n:"Mexico", def:'ill',
        st:{ can:'decrim', cbd:'med', psi:'tol', mdma:'ill', dmt:'tol', mes:'tol', ket:'med', ibo:'legal', coc:'ill' },
        nt:{ can:"Supreme Court struck down the recreational ban; personal use is permitted, retail unregulated.",
             ibo:"Never scheduled — ibogaine treatment clinics operate openly.",
             mes:"Peyote ceremonial use is tolerated for the Huichol (Wixárika).",
             psi:"Indigenous (Mazatec) mushroom ceremony is tolerated." } },
  GT: { n:"Guatemala", def:'ill', st:{ ket:'med' } },
  BZ: { n:"Belize", def:'ill', st:{ can:'decrim', cbd:'legal', ket:'med' }, nt:{ can:"Possession of up to 10g decriminalized (2017)." } },
  HN: { n:"Honduras", def:'ill', st:{ ket:'med' } },
  SV: { n:"El Salvador", def:'ill', st:{ ket:'med' } },
  NI: { n:"Nicaragua", def:'ill', st:{ ket:'med' } },
  CR: { n:"Costa Rica", def:'ill',
        st:{ can:'med', cbd:'legal', ket:'med', ibo:'tol' },
        nt:{ can:"Medical cannabis & hemp legalized (2022).", ibo:"Ibogaine/iboga retreats operate in a legal grey zone." } },
  PA: { n:"Panama", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Medical cannabis program (2021)." } },
  CU: { n:"Cuba", def:'ill', st:{ ket:'med' }, nt:{ _:"Strict prohibition." } },
  DO: { n:"Dominican Rep.", def:'ill', st:{ ket:'med' } },
  JM: { n:"Jamaica", def:'ill',
        st:{ can:'decrim', cbd:'legal', psi:'legal', mes:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Decriminalized to 2oz; sacramental use for Rastafari; medical industry.",
             psi:"Psilocybin was never prohibited — Jamaica is a legal mushroom-retreat hub." } },
  HT: { n:"Haiti", def:'ill', st:{ ket:'med' } },
  BS: { n:"Bahamas", def:'ill', st:{ can:'decrim', ket:'med' }, nt:{ can:"Decriminalization of small amounts advancing." } },
  TT: { n:"Trinidad & Tobago", def:'ill', st:{ can:'decrim', cbd:'legal', ket:'med' }, nt:{ can:"Possession ≤30g decriminalized (2019)." } },

  /* ---------------- South America ---------------- */
  BR: { n:"Brazil", def:'ill',
        st:{ can:'med', cbd:'med', psi:'tol', mdma:'ill', dmt:'decrim', mes:'tol', ket:'med', ibo:'med', coc:'ill' },
        nt:{ dmt:"Ayahuasca is legal for religious use (regulated since 1987).",
             ibo:"Permitted for supervised therapeutic use (clinics in São Paulo & Rio).",
             can:"Medical cannabis via ANVISA import/prescription; CBD products approved." } },
  AR: { n:"Argentina", def:'ill',
        st:{ can:'med', cbd:'med', coca:'decrim', coc:'decrim', dmt:'tol', ket:'med' },
        nt:{ coca:"Coca-leaf chewing (coqueo) is legal in the northern provinces (Salta, Jujuy).",
             coc:"Personal-use possession of any drug is decriminalized (Arriola ruling).",
             can:"Medical cannabis & registered self-cultivation (REPROCANN)." } },
  CL: { n:"Chile", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Medical use & private personal cultivation tolerated by courts." } },
  CO: { n:"Colombia", def:'ill',
        st:{ can:'med', cbd:'legal', coca:'decrim', coc:'decrim', dmt:'tol', ket:'med' },
        nt:{ coca:"Traditional coca use is protected for indigenous communities.",
             coc:"Personal-dose possession is decriminalized (≈1g).",
             can:"Medical cannabis legal since 2016; personal cultivation permitted.",
             dmt:"Yagé (ayahuasca) used by indigenous communities." } },
  PE: { n:"Peru", def:'ill',
        st:{ can:'med', cbd:'med', dmt:'legal', mes:'tol', coca:'legal', coc:'decrim', ket:'med' },
        nt:{ dmt:"Ayahuasca is protected national cultural heritage.",
             coca:"Coca leaf is legal, state-regulated via ENACO.",
             coc:"Personal-use cocaine possession is not penalized.",
             mes:"San Pedro (huachuma) used traditionally." } },
  VE: { n:"Venezuela", def:'ill', st:{ ket:'med' } },
  UY: { n:"Uruguay", def:'ill',
        st:{ can:'legal', cbd:'legal', coc:'decrim', ket:'med' },
        nt:{ can:"World's first country to fully legalize & regulate cannabis (2013).",
             coc:"Personal-use possession is not a criminal offence." } },
  PY: { n:"Paraguay", def:'ill', st:{ can:'med', cbd:'med', ket:'med' } },
  BO: { n:"Bolivia", def:'ill',
        st:{ coca:'legal', coc:'ill', mes:'tol', ket:'med' },
        nt:{ coca:"Coca leaf is constitutionally protected national heritage — chewing & tea are everyday legal.",
             coc:"Refined cocaine remains illegal." } },
  EC: { n:"Ecuador", def:'ill',
        st:{ can:'med', cbd:'med', coca:'tol', coc:'decrim', ket:'med' },
        nt:{ coca:"Ancestral coca use is recognized; small-scale traditional use tolerated.",
             coc:"Possession below set thresholds is decriminalized.", can:"Medical cannabis/CBD permitted (2019)." } },
  GY: { n:"Guyana", def:'ill', st:{ ket:'med' } },
  SR: { n:"Suriname", def:'ill', st:{ ket:'med' } },

  /* ---------------- Western & Northern Europe ---------------- */
  GB: { n:"United Kingdom", def:'ill',
        st:{ can:'med', cbd:'legal', psi:'ill', mdma:'ill', ket:'med', ibo:'tol', coc:'ill' },
        nt:{ can:"Medical cannabis legal since 2018 (mostly private prescriptions); recreational is Class B.",
             psi:"Schedule 1; an active research substance (Compass, Beckley).",
             ibo:"Not scheduled — a legal grey zone." } },
  IE: { n:"Ireland", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Limited Medical Cannabis Access Programme." } },
  FR: { n:"France", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis moving from trial to general access; CBD legal.", _:"Among the stricter Western-European regimes." } },
  DE: { n:"Germany", def:'ill',
        st:{ can:'legal', cbd:'legal', psi:'ill', mdma:'ill', lsd:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Adult use legalized Apr 2024 (CanG): 25g in public, 50g & 3 plants at home, non-profit social clubs.",
             _:"Large medical-cannabis market; classic psychedelics remain research-only." } },
  ES: { n:"Spain", def:'ill',
        st:{ can:'decrim', cbd:'legal', coc:'tol', ket:'med' },
        nt:{ can:"Private use & cultivation decriminalized; members-only cannabis social clubs operate.",
             _:"Personal use/possession in private is an administrative, not criminal, matter." } },
  PT: { n:"Portugal", def:'decrim',
        st:{ can:'med', cbd:'legal', ket:'med' },
        nt:{ _:"Landmark 2001 reform — personal possession of ALL drugs is decriminalized (treated as health, not crime).",
             can:"Medical cannabis products approved by INFARMED." } },
  IT: { n:"Italy", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis legal; low-THC 'cannabis light' sold." } },
  NL: { n:"Netherlands", def:'ill',
        st:{ can:'decrim', cbd:'legal', psi:'decrim', dmt:'tol', mdma:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Tolerated for personal use via licensed coffeeshops (gedoogbeleid).",
             psi:"Psilocybin truffles are legal & sold; dried mushrooms were banned in 2008.",
             dmt:"Ayahuasca religious use contested in the courts." } },
  BE: { n:"Belgium", def:'ill', st:{ can:'decrim', cbd:'legal', ket:'med' }, nt:{ can:"Possession ≤3g for personal use is lowest enforcement priority." } },
  LU: { n:"Luxembourg", def:'ill', st:{ can:'legal', cbd:'legal', ket:'med' }, nt:{ can:"Home cultivation (4 plants) & personal use legalized (2023)." } },
  CH: { n:"Switzerland", def:'ill',
        st:{ can:'decrim', cbd:'legal', psi:'med', lsd:'med', mdma:'med', ket:'med', coc:'ill' },
        nt:{ psi:"Limited compassionate-use: doctors can apply to the federal health office to treat patients with psilocybin, LSD or MDMA.",
             lsd:"Available under the same federal compassionate-use permits.",
             mdma:"Available under the same federal compassionate-use permits.",
             can:"Low-THC legal; adult-use pilot trials running; small-amount possession a minor fine." } },
  AT: { n:"Austria", def:'ill', st:{ can:'decrim', cbd:'legal', ket:'med' }, nt:{ can:"Possession diverted to treatment ('therapy before punishment')." } },
  DK: { n:"Denmark", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis pilot programme; Christiania trade tolerated then cleared." } },
  SE: { n:"Sweden", def:'ill', st:{ cbd:'ill', ket:'med' }, nt:{ _:"Strict zero-tolerance — a goal of a 'drug-free society'." } },
  NO: { n:"Norway", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ _:"Decriminalization reform debated but not enacted; possession still illegal." } },
  FI: { n:"Finland", def:'ill', st:{ can:'med', cbd:'med', ket:'med' } },
  IS: { n:"Iceland", def:'ill', st:{ can:'med', ket:'med' } },

  /* ---------------- Central, Eastern & Southern Europe ---------------- */
  PL: { n:"Poland", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis available by prescription since 2017." } },
  CZ: { n:"Czechia", def:'ill',
        st:{ can:'legal', cbd:'legal', psi:'med', lsd:'decrim', mdma:'decrim', mes:'decrim', ket:'med' },
        nt:{ can:"Personal use & home growing effectively legal from 2026.",
             psi:"Approved for medical use (2026) — psychiatrists may treat depression with psilocybin.",
             _:"Personal possession of small amounts of most drugs is decriminalized." } },
  SK: { n:"Slovakia", def:'ill', st:{ cbd:'legal', ket:'med' }, nt:{ _:"Among the EU's stricter cannabis regimes; reform debated." } },
  HU: { n:"Hungary", def:'ill', st:{ cbd:'legal', ket:'med' }, nt:{ _:"Strict enforcement." } },
  RO: { n:"Romania", def:'ill', st:{ cbd:'legal', ket:'med' } },
  BG: { n:"Bulgaria", def:'ill', st:{ ket:'med' }, nt:{ _:"Among the EU's strictest — no medical-cannabis programme." } },
  GR: { n:"Greece", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis legalized (2017)." } },
  HR: { n:"Croatia", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' } },
  SI: { n:"Slovenia", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' } },
  RS: { n:"Serbia", def:'ill', st:{ ket:'med' } },
  UA: { n:"Ukraine", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Medical cannabis legalized (2024) for PTSD, cancer & chronic pain." } },
  RU: { n:"Russia", def:'ill', st:{ cbd:'ill', ket:'med' }, nt:{ _:"Very strict — even small-quantity possession is criminal; no medical cannabis." } },
  BY: { n:"Belarus", def:'ill', st:{ ket:'med' }, nt:{ _:"Extremely harsh sentencing for drug offences." } },
  MD: { n:"Moldova", def:'ill', st:{ ket:'med' } },
  EE: { n:"Estonia", def:'ill', st:{ can:'decrim', cbd:'legal', ket:'med' }, nt:{ can:"Small-quantity possession is a misdemeanour." } },
  LV: { n:"Latvia", def:'ill', st:{ cbd:'legal', ket:'med' } },
  LT: { n:"Lithuania", def:'ill', st:{ cbd:'legal', ket:'med' } },
  AL: { n:"Albania", def:'ill', st:{ can:'med', ket:'med' }, nt:{ can:"Medical/industrial cannabis cultivation legalized (2023)." } },
  MK: { n:"North Macedonia", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' } },
  BA: { n:"Bosnia & Herz.", def:'ill', st:{ ket:'med' } },
  ME: { n:"Montenegro", def:'ill', st:{ ket:'med' } },
  XK: { n:"Kosovo", def:'ill', st:{ ket:'med' } },
  CY: { n:"Cyprus", def:'ill', st:{ can:'med', cbd:'legal', ket:'med' }, nt:{ can:"Medical cannabis legal." } },
  MT: { n:"Malta", def:'ill', st:{ can:'legal', cbd:'legal', ket:'med' }, nt:{ can:"First EU country to legalize personal use & home growing (2021); non-profit associations." } },
  TR: { n:"Turkey", def:'ill', st:{ cbd:'med', ket:'med' }, nt:{ _:"Strict; heavy penalties for supply." } },

  /* ---------------- Middle East ---------------- */
  SA: { n:"Saudi Arabia", def:'cap', st:{ ket:'med', cbd:'ill' }, nt:{ _:"Zero-tolerance — drug trafficking can carry the death penalty." } },
  AE: { n:"United Arab Emirates", def:'cap', st:{ ket:'med', cbd:'ill' }, nt:{ _:"Very strict; trafficking is death-penalty eligible (rarely applied). Even trace amounts prosecuted." } },
  QA: { n:"Qatar", def:'cap', st:{ ket:'med' }, nt:{ _:"Severe penalties; death penalty on the books for trafficking." } },
  KW: { n:"Kuwait", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty retained for drug trafficking." } },
  BH: { n:"Bahrain", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty retained for trafficking." } },
  OM: { n:"Oman", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty on the books for trafficking." } },
  IL: { n:"Israel", def:'ill',
        st:{ can:'med', cbd:'legal', mdma:'ill', psi:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Large medical-cannabis program; recreational possession decriminalized (fines).",
             mdma:"A leader in MDMA-for-PTSD research; compassionate-access has been granted.",
             psi:"Active psychedelic-research sector." } },
  JO: { n:"Jordan", def:'ill', st:{ ket:'med' }, nt:{ _:"Death penalty exists for trafficking but is rarely applied." } },
  LB: { n:"Lebanon", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Legalized cannabis cultivation for medical & industrial use (2020)." } },
  IQ: { n:"Iraq", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty for trafficking (2017 law)." } },
  IR: { n:"Iran", def:'cap', st:{ ket:'med' }, nt:{ _:"Among the world's highest numbers of drug executions each year." } },
  YE: { n:"Yemen", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty for trafficking; limited data amid conflict." } },
  SY: { n:"Syria", def:'ill', st:{ ket:'med' } },

  /* ---------------- Africa ---------------- */
  EG: { n:"Egypt", def:'cap', st:{ ket:'med', cbd:'ill' }, nt:{ _:"Death penalty for trafficking; cannabis widely used but heavily policed." } },
  MA: { n:"Morocco", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Legalized cannabis cultivation for medical/export (2021); traditional kif tolerated in the Rif." } },
  DZ: { n:"Algeria", def:'ill', st:{ ket:'med' }, nt:{ _:"Strict; heavy penalties for trafficking." } },
  TN: { n:"Tunisia", def:'ill', st:{ ket:'med' }, nt:{ _:"Historically harsh cannabis law (Law 52), now being softened." } },
  LY: { n:"Libya", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty on the books; limited reliable data." } },
  NG: { n:"Nigeria", def:'ill', st:{ ket:'med' }, nt:{ _:"NDLEA enforces strictly; long sentences for supply." } },
  GH: { n:"Ghana", def:'ill', st:{ can:'decrim', cbd:'med', ket:'med' }, nt:{ can:"Small-amount possession reclassified (2020); medical/industrial hemp licensing." } },
  ZA: { n:"South Africa", def:'ill',
        st:{ can:'legal', cbd:'med', ibo:'med', psi:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Private adult use & cultivation legal (ConCourt 2018; Cannabis for Private Purposes Act 2024).",
             ibo:"A Schedule-6 medicine — available with strict prescription oversight." } },
  KE: { n:"Kenya", def:'ill', st:{ ket:'med' } },
  ET: { n:"Ethiopia", def:'ill', st:{ ket:'med' } },
  TZ: { n:"Tanzania", def:'ill', st:{ ket:'med' } },
  UG: { n:"Uganda", def:'ill', st:{ ket:'med' }, nt:{ _:"Strict enforcement." } },
  SN: { n:"Senegal", def:'ill', st:{ ket:'med' } },
  CI: { n:"Côte d'Ivoire", def:'ill', st:{ ket:'med' } },
  CM: { n:"Cameroon", def:'ill', st:{ ket:'med' } },
  CD: { n:"Dem. Rep. Congo", def:'ill', st:{ ket:'med' } },
  AO: { n:"Angola", def:'ill', st:{ ket:'med' } },
  MZ: { n:"Mozambique", def:'ill', st:{ ket:'med' } },
  ZM: { n:"Zambia", def:'ill', st:{ can:'med', ket:'med' }, nt:{ can:"Licensed cannabis cultivation for export (2021)." } },
  ZW: { n:"Zimbabwe", def:'ill', st:{ can:'med', ket:'med' }, nt:{ can:"Medical/industrial cannabis licensing (2018)." } },
  GA: { n:"Gabon", def:'ill', st:{ ibo:'legal', dmt:'tol', ket:'med' }, nt:{ ibo:"Home of iboga — a protected cultural & spiritual heritage (Bwiti tradition)." } },
  SD: { n:"Sudan", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty retained for trafficking." } },
  MG: { n:"Madagascar", def:'ill', st:{ ket:'med' } },

  /* ---------------- Asia ---------------- */
  IN: { n:"India", def:'ill',
        st:{ can:'decrim', cbd:'med', dmt:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Bhang (cannabis leaves) is exempt from the NDPS Act & used traditionally; charas/ganja are illegal.",
             _:"Death penalty possible for large repeat trafficking but applied symbolically." } },
  PK: { n:"Pakistan", def:'cap', st:{ can:'tol', ket:'med' }, nt:{ _:"Death penalty retained for trafficking.", can:"Charas culturally widespread despite prohibition." } },
  BD: { n:"Bangladesh", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty for trafficking; harsh enforcement." } },
  LK: { n:"Sri Lanka", def:'cap', st:{ can:'med', ket:'med' }, nt:{ can:"Cannabis permitted within traditional Ayurvedic medicine.", _:"Death penalty on the books for trafficking." } },
  NP: { n:"Nepal", def:'ill', st:{ can:'tol', dmt:'tol', ket:'med' }, nt:{ can:"Banned in 1973 but culturally/religiously widespread (Shiva, Holi); re-legalization debated." } },
  CN: { n:"China", def:'cap', st:{ ket:'med', cbd:'ill', can:'cap' }, nt:{ _:"Death penalty for trafficking; among the world's most active executioners.", cbd:"Cosmetic & food CBD banned (2021)." } },
  JP: { n:"Japan", def:'ill', st:{ cbd:'legal', can:'ill', ket:'med' }, nt:{ _:"Very strict cultural & legal stance; cannabis-use offence created 2023.", cbd:"THC-free CBD is legal." } },
  KR: { n:"South Korea", def:'ill', st:{ can:'med', cbd:'med', ket:'med' }, nt:{ can:"Cannabis-derived medicines (e.g. Epidiolex) allowed since 2018; recreational strictly punished, even abroad." } },
  KP: { n:"North Korea", def:'cap', st:{ ket:'med' }, nt:{ _:"No reliable data; assume severe state control." } },
  TW: { n:"Taiwan", def:'ill', st:{ cbd:'med', ket:'med' }, nt:{ _:"Strict; cannabis is a Category-2 narcotic." } },
  TH: { n:"Thailand", def:'ill',
        st:{ can:'med', cbd:'med', ket:'med' },
        nt:{ can:"Decriminalized in 2022, then reverted to MEDICAL/PRESCRIPTION-ONLY in June 2025.",
             _:"Death penalty exists for trafficking but is rarely applied." } },
  VN: { n:"Vietnam", def:'ill', st:{ ket:'med' }, nt:{ _:"Repealed the death penalty for drug trafficking (2025); penalties remain severe." } },
  MY: { n:"Malaysia", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty retained (mandatory death abolished 2023); medical-cannabis access debated." } },
  SG: { n:"Singapore", def:'cap', st:{ ket:'med' }, nt:{ _:"Among the world's strictest — regularly executes for drug trafficking." } },
  ID: { n:"Indonesia", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty for trafficking; foreign nationals have been executed." } },
  PH: { n:"Philippines", def:'ill', st:{ can:'med', ket:'med' }, nt:{ _:"No judicial death penalty, but the 2016–22 'drug war' saw thousands of extrajudicial killings.", can:"Compassionate medical-cannabis access is narrow." } },
  MM: { n:"Myanmar", def:'cap', st:{ ket:'med' }, nt:{ _:"Death penalty retained; major production region." } },
  KH: { n:"Cambodia", def:'ill', st:{ can:'tol', ket:'med' }, nt:{ can:"Officially illegal; 'happy' cannabis in food is widely tolerated." } },
  LA: { n:"Laos", def:'cap', st:{ can:'tol', ket:'med' }, nt:{ _:"Death penalty on the books for trafficking." } },
  MN: { n:"Mongolia", def:'ill', st:{ ket:'med' } },
  KZ: { n:"Kazakhstan", def:'ill', st:{ can:'decrim', ket:'med' }, nt:{ can:"Small-quantity possession is an administrative offence." } },
  UZ: { n:"Uzbekistan", def:'ill', st:{ ket:'med' }, nt:{ _:"Strict enforcement." } },
  AF: { n:"Afghanistan", def:'cap', st:{ ket:'med' }, nt:{ _:"Taliban banned cultivation (2022); harsh punishment." } },

  /* ---------------- Oceania ---------------- */
  AU: { n:"Australia", def:'ill',
        st:{ can:'med', cbd:'med', psi:'med', mdma:'med', lsd:'ill', ket:'med', ibo:'ill', coc:'ill' },
        nt:{ psi:"World-first: prescribable for treatment-resistant depression by authorised psychiatrists since Jul 2023.",
             mdma:"World-first: prescribable for PTSD by authorised psychiatrists since Jul 2023.",
             can:"Medical cannabis nationwide (2016); the ACT legalized personal possession (2020).",
             _:"Drug law varies by state/territory." } },
  NZ: { n:"New Zealand", def:'ill',
        st:{ can:'med', cbd:'med', psi:'med', ibo:'med', mdma:'ill', ket:'med', coc:'ill' },
        nt:{ can:"Medical cannabis scheme (2020); a 2020 recreational referendum narrowly failed.",
             ibo:"A prescription medicine (Class C) — usable under medical supervision.",
             psi:"Approved for one psychiatrist to prescribe for treatment-resistant depression (2025)." } },
  PG: { n:"Papua New Guinea", def:'ill', st:{ ket:'med' } },
  FJ: { n:"Fiji", def:'ill', st:{ ket:'med' } },
};

/* Lat/lng for small jurisdictions rendered as labelled dots (no 1:110m polygon). */
window.MARKERS = {
  SG: [1.35, 103.82],     // death penalty — important to show
  HK: [22.32, 114.17],
  MT: [35.92, 14.42],
  BH: [26.07, 50.55],
  MU: [-20.28, 57.55],
  MV: [3.2028, 73.2207],
  LI: [47.14, 9.52],
  MC: [43.74, 7.42],
  AD: [42.51, 1.52],
  SM: [43.94, 12.46],
  BB: [13.19, -59.54],
};

/* Countries whose law varies a lot internally — shown as a "↕ varies by region" note. */
window.SUBNATIONAL = {
  US: "Federal law (Schedule I for most) vs 50 states — cannabis & psilocybin access is a patchwork.",
  AU: "Rescheduling is federal, but possession & medical access differ by state/territory.",
  CA: "Federal legalization, but provinces set their own retail & age rules.",
};

/* ----------------------------------------------------------------------------
   Notable organizations advancing clinical / medical psychedelic research &
   drug-policy reform — shown as glowing pins via the "Research orgs" toggle.
---------------------------------------------------------------------------- */
window.ORGS = [
  { name:"Beckley Foundation", city:"Oxford, UK", lat:51.752, lng:-1.258, type:"Research + policy",
    focus:"Pioneered LSD & psilocybin brain-imaging and global drug-policy reform (Amanda Feilding)." },
  { name:"MAPS / Lykos", city:"San Jose, USA", lat:37.34, lng:-121.89, type:"Research",
    focus:"Drove MDMA-assisted therapy for PTSD through Phase 3 trials." },
  { name:"Johns Hopkins Center for Psychedelic Research", city:"Baltimore, USA", lat:39.297, lng:-76.592, type:"Academic",
    focus:"Leading psilocybin trials for depression, addiction & end-of-life distress." },
  { name:"Imperial College Centre for Psychedelic Research", city:"London, UK", lat:51.498, lng:-0.175, type:"Academic",
    focus:"First centre dedicated to psychedelics; psilocybin-vs-antidepressant trials." },
  { name:"Heffter Research Institute", city:"Santa Fe, USA", lat:35.687, lng:-105.938, type:"Research",
    focus:"Has funded rigorous psilocybin science since 1993." },
  { name:"Usona Institute", city:"Madison, USA", lat:43.073, lng:-89.401, type:"Research (non-profit)",
    focus:"Psilocybin for major depression — FDA Breakthrough Therapy." },
  { name:"Compass Pathways", city:"London, UK", lat:51.514, lng:-0.13, type:"Biotech",
    focus:"COMP360 synthetic psilocybin in late-stage depression trials." },
  { name:"MIND Foundation", city:"Berlin, Germany", lat:52.52, lng:13.405, type:"Research + education",
    focus:"European psychedelic research, therapist training & the ICPR conference." },
  { name:"Mind Medicine Australia", city:"Melbourne, Australia", lat:-37.814, lng:144.963, type:"Advocacy",
    focus:"Drove Australia's world-first rescheduling of psilocybin & MDMA." },
  { name:"Drug Policy Alliance", city:"New York, USA", lat:40.713, lng:-74.006, type:"Policy",
    focus:"Leading US drug-decriminalization & harm-reduction advocacy." },
  { name:"Transform Drug Policy Foundation", city:"Bristol, UK", lat:51.454, lng:-2.587, type:"Policy",
    focus:"Builds the evidence-based case for legal regulation of drugs." },
  { name:"Chacruna Institute", city:"San Francisco, USA", lat:37.775, lng:-122.419, type:"Education",
    focus:"Plant-medicine education, indigenous reciprocity & sacred-use rights." },
  { name:"OPEN Foundation", city:"Amsterdam, Netherlands", lat:52.37, lng:4.895, type:"Research + education",
    focus:"Dutch psychedelic-science network behind the ICPR conference." },
  { name:"Numinus", city:"Vancouver, Canada", lat:49.282, lng:-123.12, type:"Clinical",
    focus:"Psychedelic-assisted-therapy clinics & training across North America." },
];

/* ----------------------------- Sources & versioning ----------------------------- */
window.DATA_REVISION = "2026-06";
window.SOURCES = [
  "Psychedelic Alpha — Worldwide Psychedelic Laws tracker",
  "Wikipedia — 'Legal status of …' by-country pages (cannabis, psilocybin, ayahuasca, ibogaine, MDMA)",
  "Transform Drug Policy Foundation & TalkingDrugs",
  "MAPS / Lykos (MDMA) and the US FDA / DEA",
  "Therapeutic Goods Administration (Australia)",
  "Death Penalty Information Center & Amnesty International (capital-punishment data)",
  "National health/drug authorities (INFARMED, ANVISA, TGA, BfArM, etc.)",
];
/* Notable, sourced changes (newest first) — shown in the About panel. */
window.CHANGES = [
  { date:"2026-01", c:"Czechia",   ch:"Approved psilocybin for medical use; personal-use cannabis effectively legal", src:"Czech govt / MoH" },
  { date:"2025-06", c:"Thailand",  ch:"Reverted cannabis to MEDICAL / prescription-only (recreational re-restricted)", src:"Royal Gazette, 27 Jun 2025" },
  { date:"2025-06", c:"Vietnam",   ch:"Repealed the death penalty for drug trafficking",                              src:"National Assembly" },
  { date:"2025-01", c:"New Zealand",ch:"Psilocybin allowed for prescribing (treatment-resistant depression)",         src:"Medsafe" },
  { date:"2024-08", c:"United States", ch:"FDA declined Lykos' MDMA-assisted therapy for PTSD",                       src:"FDA Complete Response Letter" },
  { date:"2024-04", c:"Germany",   ch:"Adult-use cannabis legalized (CanG) — possession, home grow & social clubs",   src:"Bundestag / CanG" },
  { date:"2024-03", c:"South Africa", ch:"Cannabis for Private Purposes Act signed (private adult use & cultivation)", src:"Gov. Gazette" },
  { date:"2023-07", c:"Australia", ch:"Psilocybin & MDMA rescheduled to Schedule 8 — prescribable by psychiatrists",   src:"TGA" },
];

/* Name fallback for geojson features whose ISO_A2 is "-99". */
window.NAME_TO_ISO = { "France":"FR", "Norway":"NO", "Kosovo":"XK", "Somaliland":null, "Northern Cyprus":null };
