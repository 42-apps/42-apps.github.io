/* ============================================================================
   Blue Zones — the world's validated longevity hotspots, Dan Buettner's
   "engineered" sixth zone, a set of emerging candidates this atlas nominates
   (with honest framing), and two famous-but-disputed legends.

   kind:  classic    — one of the 5 demographically validated Blue Zones
          engineered — Singapore: high longevity built by policy, not tradition
          emerging   — real research support, not (yet) a validated Blue Zone
          legend     — famous longevity myth; claims largely unverified/debunked
   ========================================================================== */
window.BLUEZONES = [

/* ----------------------------- the classic five ------------------------- */
{ id:'okinawa', name:'Okinawa', country:'Japan', iso:'JPN', lat:26.5, lon:128.0,
  kind:'classic', since:2000, le:'≈ 84', hook:'Islands of the world-record grandmothers',
  metric:'~6.5 centenarians per 10,000 (historically world-leading female longevity)',
  power:['Plant slant','Ikigai (purpose)','Right tribe (moai)','80% rule (hara hachi bu)'],
  secrets:[
    'Hara hachi bu — a 2,500-year Confucian mantra to stop eating at 80% full.',
    'Ikigai — a clear "reason to wake up" that persists deep into old age.',
    'Moai — lifelong circles of friends who pool resources and support.',
    'A diet once built on purple sweet potato, tofu, bitter melon and turmeric.'],
  desc:"Okinawa's older generation — especially its women — long held the world record for life expectancy and centenarian density. Researchers credit a low-calorie, plant-heavy traditional diet eaten to the rhythm of hara hachi bu, lifelong friendship circles called moai, and a strong sense of ikigai. A cautionary note travels with the triumph: younger Okinawans who adopted Western fast food have seen longevity advantages erode, making the island a living experiment in what gives — and takes — years of life.",
  source:'Buettner / Willcox Okinawa Centenarian Study' },

{ id:'sardinia', name:'Sardinia (Ogliastra)', country:'Italy', iso:'ITA', lat:39.95, lon:9.45,
  kind:'classic', since:1999, le:'≈ 83', hook:'The first Blue Zone — land of male centenarians',
  metric:'Highest concentration of male centenarians on Earth (Villagrande/Ogliastra)',
  power:['Move naturally','Wine @ 5 (Cannonau)','Loved ones first','Plant slant'],
  secrets:[
    'A near 1:1 male-to-female centenarian ratio — unique in the world.',
    'Shepherds who walk steep mountains daily into their 90s.',
    "Cannonau (Grenache) red wine, rich in polyphenols, drunk in moderation.",
    'Elders kept at the heart of family life, never set aside.'],
  desc:"The mountainous Ogliastra and Nuoro provinces of inland Sardinia were the first region to be tagged with a literal blue marker on a map — hence \"Blue Zone.\" Demographers Gianni Pes and Michel Poulain verified that men here reach 100 at rates seen nowhere else, breaking the usual rule that women dominate the oldest ages. Lifelong shepherding (a built-in daily hike), a lean pastoral diet, deep family bonds and a famously sardonic, low-stress humour all feature in the explanation.",
  source:'Pes & Poulain; Buettner' },

{ id:'ikaria', name:'Ikaria', country:'Greece', iso:'GRC', lat:37.61, lon:26.17,
  kind:'classic', since:2009, le:'≈ 82', hook:'The island where people forget to die',
  metric:'~1 in 3 residents reaches their 90s; very low dementia',
  power:['Downshift','Plant slant','Belong','Right tribe'],
  secrets:[
    'No clocks, late mornings, and a daily afternoon nap.',
    'A Mediterranean diet heavy on wild greens, beans, herbs and olive oil.',
    'Herbal "mountain tea" with mild blood-pressure-lowering effects.',
    'Tight-knit village life where no one grows old alone.'],
  desc:"This Aegean island gave the world the phrase \"the island where people forget to die.\" Ikarians reach their 90s at roughly three times the rate of Americans, with strikingly low rates of dementia and late-life depression. The texture of daily life — unhurried, social, walkable, punctuated by naps and wild-foraged Mediterranean food — seems to matter as much as any single nutrient.",
  source:'Buettner / University of Athens studies' },

{ id:'nicoya', name:'Nicoya Peninsula', country:'Costa Rica', iso:'CRI', lat:10.15, lon:-85.45,
  kind:'classic', since:2007, le:'≈ 80', hook:'Plan de vida — a reason to live',
  metric:'Lowest middle-age mortality in the Americas; long telomeres',
  power:['Plan de vida (purpose)','Loved ones first','Plant slant','Hard water'],
  secrets:[
    'Plan de vida — a strong sense of purpose and being needed.',
    'A "three sisters" diet of corn, beans and squash, plus tropical fruit.',
    'Calcium- and magnesium-rich hard water tied to stronger bones.',
    'Sunlight, faith, and family woven through everyday life.'],
  desc:"On this dry Pacific peninsula, Costa Rican men in particular enjoy some of the lowest middle-age mortality on the planet and a high chance of reaching 90. Nicoyans speak of a plan de vida — a reason to live — and lean on family, faith and physically active rural work. Their mineral-rich hard water and a simple maize-and-bean diet round out one of the most affordable longevity recipes on Earth.",
  source:'Buettner / Rosero-Bixby, CRELES' },

{ id:'loma-linda', name:'Loma Linda', country:'United States', iso:'USA', lat:34.05, lon:-117.26,
  kind:'classic', since:2005, le:'≈ 85 (Adventists)',
  hook:'Adventists who outlive their neighbours by a decade',
  metric:'Adventists live ~7–10 yrs longer than the average American',
  power:['Belong (faith)','Plant slant','Move naturally','Sabbath downshift'],
  secrets:[
    'A largely vegetarian, nut-rich diet rooted in religious teaching.',
    'A weekly 24-hour Sabbath that guarantees rest and community.',
    'No smoking, little to no alcohol.',
    'A dense, supportive faith community that reinforces all of the above.'],
  desc:"The one Blue Zone in the United States isn't a remote island but a community of faith: the Seventh-day Adventists of Loma Linda, California. Studied for decades through the Adventist Health Studies, vegetarian Adventists outlive their fellow Americans by seven to ten years. Their edge is almost entirely behavioural — plant-based eating, no tobacco, a protected day of rest, and a tight community — proving a Blue Zone can be deliberately practised, not just inherited.",
  source:'Adventist Health Study-2, Loma Linda University' },

/* ----------------------------- the engineered sixth --------------------- */
{ id:'singapore', name:'Singapore', country:'Singapore', iso:'SGP', lat:1.35, lon:103.82,
  kind:'engineered', since:2023, le:'≈ 84', hook:'The world\'s first "Blue Zone 2.0"',
  metric:'Centenarians doubled in a decade; among the world\'s highest healthy-life expectancy',
  power:['Designed environment','Universal healthcare','Walkability','Multigenerational housing'],
  secrets:[
    'Policy, not tradition: stairs, parks and transit engineered into daily life.',
    'Subsidised housing that keeps generations living close together.',
    'High taxes on tobacco and sugar; some of the world\'s lowest smoking rates.',
    'Near-universal, efficient healthcare with strong preventive screening.'],
  desc:"In 2023 Dan Buettner named Singapore the world's first \"Blue Zone 2.0\" — a longevity hotspot built on purpose rather than inherited from an old peasant culture. Where the classic five emerged from tradition, Singapore engineered long life through deliberate design: walkable cities, aggressive anti-smoking and anti-sugar policy, subsidised multigenerational housing, and one of the most cost-effective healthcare systems on Earth. It is the proof-of-concept that the Blue Zone effect can be deliberately manufactured by a modern state.",
  source:'Buettner, "The Blue Zones: Secrets for Living Longer" (2023)' },

/* ----------------------------- emerging candidates ---------------------- */
{ id:'cilento', name:'Acciaroli & Cilento', country:'Italy', iso:'ITA', lat:40.17, lon:15.02,
  kind:'emerging', since:2016, le:'≈ 83', hook:'Where rosemary grows and arteries stay young',
  metric:'~1 in 10 residents over 100 in some villages; remarkable vascular health',
  power:['Plant slant','Move naturally','Wine @ 5','Rosemary & anchovies'],
  secrets:[
    'A coastal Mediterranean diet heavy on anchovies, rosemary and olive oil.',
    'Hilly walking and lifelong gardening or fishing.',
    'Unusually healthy small blood vessels (good microcirculation) in elders.',
    'Where Ancel Keys first defined the "Mediterranean diet" — and lived to 100.'],
  desc:"The Cilento coast south of Naples — and the village of Acciaroli especially — drew researchers from Rome and UC San Diego after locals noticed an extraordinary cluster of centenarians. Their study found elders with the circulation of much younger people, possibly linked to a rosemary-rich diet and constant hilly movement. Fittingly, this is where physiologist Ancel Keys spent decades defining the Mediterranean diet — and himself lived to 100. A strong emerging candidate, not yet formally validated.",
  source:'Di Somma et al., 2016 (Sapienza/UC San Diego)' },

{ id:'sicani', name:'Sicani Mountains', country:'Italy', iso:'ITA', lat:37.58, lon:13.30,
  kind:'emerging', since:2020, le:'≈ 83', hook:'Sicily\'s hidden cluster of 100-year-olds',
  metric:'Several inland villages with exceptional centenarian rates',
  power:['Plant slant','Move naturally','Belong','Downshift'],
  secrets:[
    'Remote inland Sicilian villages with traditional agropastoral life.',
    'A frugal, seasonal, plant-forward diet and local red wine.',
    'Strong religious and family community structures.',
    'Daily physical work on steep terrain into very old age.'],
  desc:"A 2020 study identified the villages of the Sicani Mountains in western Sicily — places like Sutera and Bivona — as a previously unrecognised cluster of extreme longevity, echoing nearby Sardinia. The recipe is familiar: an isolated, frugal, plant-forward mountain culture with constant low-grade exercise and dense social ties. The atlas lists it as an emerging candidate worth watching.",
  source:'Vasto et al., 2020' },

{ id:'rugao', name:'Rugao', country:'China', iso:'CHN', lat:32.39, lon:120.56,
  kind:'emerging', since:2014, le:'≈ 80', hook:'China\'s longevity county on the Yangtze plain',
  metric:'One of the highest centenarian densities in Asia (~1 per 1,400)',
  power:['Plant slant','Move naturally','Right tribe','Light eating'],
  secrets:[
    'A vegetable- and soy-rich diet with little red meat.',
    'Lifelong farming and an active, low-stress rural routine.',
    'Strong family care for the very old (filial tradition).',
    'A flat, fertile, mild-climate plain with stable communities.'],
  desc:"Unlike China's remote mountain longevity legends, Rugao in Jiangsu province has been studied with proper demographic rigour (the Rugao Longevity Cohort). It hosts one of Asia's densest concentrations of centenarians on an ordinary, accessible river plain — suggesting diet, family structure and active rural life, rather than mysterious isolation, drive its longevity. A credible emerging Blue Zone.",
  source:'Rugao Longevity & Ageing Study' },

{ id:'martinique', name:'Martinique', country:'France', iso:'FRA', lat:14.64, lon:-61.02,
  kind:'emerging', since:2021, le:'≈ 82', hook:'A Caribbean island of super-aged women',
  metric:'Among the world\'s highest rates of female centenarians',
  power:['Plant slant','Move naturally','Belong','Loved ones first'],
  secrets:[
    'A diet of root vegetables, tropical fruit, fish and legumes.',
    'Active outdoor life in a warm, walkable island setting.',
    'French universal healthcare layered onto a tight island community.',
    'Deep religious faith and matriarchal family networks.'],
  desc:"The French Caribbean island of Martinique posts some of the highest female-centenarian rates anywhere, blending a Creole diet of root vegetables, fish and tropical fruit with French universal healthcare and a strong, faith-centred community. Demographers increasingly cite it (with neighbouring Guadeloupe) as a candidate longevity hotspot — an island Blue Zone hiding in plain sight inside a wealthy nation.",
  source:'INED / French overseas mortality studies' },

{ id:'menorca', name:'Menorca', country:'Spain', iso:'ESP', lat:39.95, lon:4.11,
  kind:'emerging', since:2018, le:'≈ 84', hook:'The quiet Balearic in a country racing to the top',
  metric:'High elder longevity in a nation projected to lead world life expectancy',
  power:['Plant slant','Move naturally','Downshift','Wine @ 5'],
  secrets:[
    'A relaxed Balearic-Mediterranean diet and pace of life.',
    'Spain\'s strong primary-care system and walkable towns.',
    'Olive oil, vegetables, fish and a long midday break.',
    'Spain is projected to have the world\'s highest life expectancy by ~2040.'],
  desc:"Spain is quietly on track to overtake Japan for the world's highest life expectancy. Within it, the Balearic island of Menorca stands out for its unhurried Mediterranean rhythm, strong primary-care medicine and a diet of olive oil, fish and vegetables. It captures why Spain as a whole behaves like a national near-Blue-Zone — and is the atlas's nominee for a Mediterranean candidate to watch.",
  source:'IHME projections; Spanish regional health data' },

{ id:'hong-kong', name:'Hong Kong', country:'Hong Kong SAR', iso:'HKG', lat:22.32, lon:114.17,
  kind:'emerging', since:2012, le:'≈ 85', hook:'The longest-living city on Earth',
  metric:'World\'s highest life expectancy for much of the 21st century',
  power:['Move naturally','Walkability','Plant slant','Right tribe'],
  secrets:[
    'Dense, walkable urbanism and the world\'s most-used public transit.',
    'A Cantonese diet rich in steamed fish, vegetables, tofu and tea.',
    'Among the world\'s lowest cardiovascular and traffic-death rates.',
    'Active "tai chi in the park" elder culture and strong family ties.'],
  desc:"If a Blue Zone can be a megacity, Hong Kong is the candidate. Despite crowding and stress, it has posted the world's highest life expectancy for much of the 21st century, with women approaching 88 years. Researchers point to relentless everyday walking, the world's heaviest public-transit use, a steamed-fish-and-vegetable Cantonese diet, very low smoking among women and exceptionally low heart-disease mortality. The atlas nominates it as the definitive urban longevity hotspot.",
  source:'Lancet Public Health, 2021; Hong Kong C&SD' },

{ id:'andorra', name:'Andorra', country:'Andorra', iso:'AND', lat:42.51, lon:1.52,
  kind:'emerging', since:2015, le:'≈ 84', hook:'A Pyrenean micro-nation that keeps climbing',
  metric:'Consistently among the world\'s ten highest life expectancies',
  power:['Move naturally','Mountain air','Plant slant','Downshift'],
  secrets:[
    'Mountain living with constant walking and clean air.',
    'A Catalan-Mediterranean diet at altitude.',
    'Tiny, wealthy, low-crime society with good healthcare access.',
    'Very low smoking and obesity relative to neighbours.'],
  desc:"Tucked in the Pyrenees between France and Spain, the micro-state of Andorra quietly ranks among the ten longest-lived populations on Earth. It marries a Catalan-Mediterranean diet with mountain living — altitude, fresh air and a lot of walking — inside a small, prosperous, low-stress society. A microstate candidate that rarely makes the headlines but consistently makes the top ten.",
  source:'WHO / national statistics' },

/* ----------------------------- famous legends (disputed) ---------------- */
{ id:'hunza', name:'Hunza Valley', country:'Pakistan', iso:'PAK', lat:36.32, lon:74.65,
  kind:'legend', since:1960, le:'(unverified)', hook:'The legendary valley of 145-year-olds',
  metric:'Famous longevity claims — never demographically verified',
  power:['Apricots & glacier water','Terraced farming','Mountain life'],
  secrets:[
    'Mid-century travellers claimed Hunzakuts routinely lived past 120.',
    'A simple diet of apricots, grains and mineral-rich glacier meltwater.',
    'Terraced mountain farming and constant physical work.',
    'No birth records — the ages were almost certainly exaggerated.'],
  desc:"The Hunza of northern Pakistan became a mid-20th-century longevity sensation, with claims of people living to 120, 145, even older on a diet of apricots and glacier water. With honesty owed to the reader: there were no birth records, and demographers regard the extreme ages as folklore and age-exaggeration rather than fact. It is included here as a cautionary legend — a reminder that the validated Blue Zones earn their status precisely by surviving rigorous birth-certificate scrutiny.",
  source:'Disputed; no demographic validation' },

{ id:'vilcabamba', name:'Vilcabamba', country:'Ecuador', iso:'ECU', lat:-4.26, lon:-79.22,
  kind:'legend', since:1970, le:'(unverified)', hook:'The "Valley of Longevity" myth',
  metric:'Claimed extreme ages later shown to be exaggerated',
  power:['Andean valley climate','Active farming','Mineral water'],
  secrets:[
    '1970s reports claimed scores of residents over 100 in a tiny valley.',
    'A mild Andean climate, active farming and mineral-rich water.',
    'Follow-up studies found systematic age exaggeration.',
    'Now a tourism brand more than a verified longevity zone.'],
  desc:"Ecuador's Vilcabamba, the \"Valley of Longevity,\" drew 1970s headlines for an implausible density of centenarians. When demographers checked the records, the ages collapsed — residents had inflated their years (sometimes for status or tourism). Like Hunza, it is preserved here as an honest counter-example: the difference between a real Blue Zone and a beautiful story is the paperwork.",
  source:'Disputed; debunked by later demographic audits' },
];

/* The "Power 9" — lifestyle traits shared across the validated Blue Zones
   (Dan Buettner). Used by the Blue Zones overlay. */
window.POWER9 = [
  { icon:'🚶', name:'Move naturally',  desc:'Live in places that nudge you into constant low-intensity movement — gardens, hills, stairs — not gyms.' },
  { icon:'🎯', name:'Purpose',         desc:'A clear reason to wake up (Okinawan ikigai, Nicoyan plan de vida) adds years of life.' },
  { icon:'🧘', name:'Downshift',       desc:'Daily rituals that shed stress — naps, prayer, happy hour, ancestor time.' },
  { icon:'🍽️', name:'80% rule',        desc:'Stop eating when 80% full (hara hachi bu); eat the smallest meal in the evening.' },
  { icon:'🫘', name:'Plant slant',     desc:'Beans, greens and whole grains at the centre; meat rarely, in small portions.' },
  { icon:'🍷', name:'Wine @ 5',        desc:'Moderate, regular alcohol with friends and food (1–2 glasses) — optional, not for everyone.' },
  { icon:'⛪', name:'Belong',          desc:'Belonging to a faith or values community is worth up to ~4–14 extra years.' },
  { icon:'👪', name:'Loved ones first',desc:'Keep ageing parents and grandparents near; commit to a life partner; invest in children.' },
  { icon:'🤝', name:'Right tribe',     desc:'Build a social circle that reinforces healthy behaviours (the Okinawan moai).' },
];
