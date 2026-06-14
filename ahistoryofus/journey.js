/* ============================================================================
   A History of Us — the curated dataset.
   The journey of Homo sapiens, from one African cradle to every corner of Earth.

   All times are in YEARS AGO (ya). Calendar conversion uses 2026 as "now".
   Everything here is an APPROXIMATION of a fast-moving science — dates and ranges
   are rounded and, the deeper the past, the fuzzier. Genetics are summarised
   (characteristic mtDNA / Y-DNA haplogroups + key ancient-DNA samples + living
   descendants), not exhaustive. Sources are credited in the About box.
   ========================================================================== */
'use strict';

/* ---- The deep-time scrubber: stops in years-ago, OLDEST → NEWEST ----------
   Coarse in the African dawn, finer through the great expansion and recent past.
   Playing forward (left→right) = time moving toward today = watch humanity spread. */
const STOPS_YA = [
  300000, 260000, 230000, 200000, 177000, 160000, 130000, 120000, 100000, 90000,
  80000, 74000, 70000, 65000, 60000, 55000, 50000, 46000, 42000, 40000,
  36000, 33000, 30000, 26000, 23000, 20000, 18000, 16000, 15000, 14000,
  13000, 12000, 11700, 11000, 10000, 9000, 8000, 7000, 6000, 5000,
  4200, 3500, 3000, 2500, 2000, 1500, 1000, 800, 750, 500, 200, 0
];

/* ---- Genetic lineages → colour. The globe is coloured by the deep lineage of
   whoever lived in each region at the chosen time, so you can SEE the family of
   humankind branch and spread. ---------------------------------------------- */
const LINEAGES = {
  cradle:       { c: '#ecb24a', label: 'Ancestral Africans · the cradle (mtDNA L0 · Y-A)' },
  african:      { c: '#79bf63', label: 'African lineages (mtDNA L1–L3 · Y-B, E)' },
  ooa:          { c: '#54c7cb', label: 'First out of Africa · the pioneers (mtDNA L3 → M, N)' },
  australasian: { c: '#ef893a', label: 'Australasians & first mariners (Y-C, D · mtDNA M, N→P,S,Q)' },
  southasian:   { c: '#d2a14e', label: 'South Asians (mtDNA M, R · Y-H, L)' },
  eastasian:    { c: '#3fae84', label: 'East Asians (mtDNA D, M · Y-O)' },
  weurasian:    { c: '#5b91da', label: 'West Eurasian foragers & farmers (mtDNA U · Y-I, G)' },
  ane:          { c: '#9079db', label: 'North Eurasians & steppe (mtDNA U · Y-Q, R)' },
  american:     { c: '#dc5f4c', label: 'First Americans (mtDNA A–D · Y-Q)' },
  austronesian: { c: '#df6fb0', label: 'Austronesians & Polynesians (mtDNA B4a1a1 · Y-O, C)' },
  arctic:       { c: '#a6d8ea', label: 'Arctic peoples · Inuit–Yupik (mtDNA A2 · Y-Q)' }
};

/* ---- Regions: WHERE humans lived, and WHO they were over time. -------------
   `poly` is a coarse [lng,lat] ring (winding auto-fixed by the engine).
   `peoples` is sorted OLDEST→NEWEST; at any chosen time the region shows the
   most recent people whose `from` has already arrived, coloured by `lin`.
   A region only lights up once humans had reached it (peoples[0].from). ------ */
const REGIONS = [
  {
    id: 'safrica', name: 'Southern Africa', label: [24, -29],
    poly: [[12,-17],[18,-18],[26,-18],[33,-22],[33,-29],[28,-34],[20,-35],[15,-30],[12,-22]],
    peoples: [
      { from: 300000, lin: 'cradle', name: 'Ancestral Africans — the cradle',
        mt: 'L0 (the deepest human maternal lineage)', y: 'A (basal Y-chromosome)',
        adna: 'Ballito Bay boy (~2,000 ya) — almost pure deep San ancestry',
        mod: 'San (Khoe-San) & Khoekhoe of the Kalahari',
        note: 'The oldest branch of the human family tree lives on here. Along this coast our species first kept symbolic culture — engraved ochre and shell beads at Blombos, heat-treated tools at Pinnacle Point, bedding & bows at Sibudu.' },
      { from: 1800, lin: 'african', name: 'Bantu farmers meet the Khoe-San',
        mt: 'L0 (San) + L2/L3 (Bantu)', y: 'A, B (San) + E1b1a (Bantu)',
        adna: 'Iron-Age Bantu genomes show admixture with resident foragers',
        mod: 'Zulu, Xhosa, Sotho, Tswana — alongside the San & Khoekhoe',
        note: 'Iron-Age Bantu-speaking farmers reached the south, mixing with the foragers whose ancestors had lived here for 300,000 years.' }
    ]
  },
  {
    id: 'eafrica', name: 'East Africa & the Horn', label: [40, 6],
    poly: [[33,-3],[36,-6],[41,-5],[51,5],[48,12],[43,12],[40,15],[36,15],[33,8],[31,2]],
    peoples: [
      { from: 280000, lin: 'cradle', name: 'Early Homo sapiens',
        mt: 'L (root of all human mtDNA)', y: 'A, B',
        adna: 'Mota (~4,500 ya, Ethiopia) — first ancient African genome',
        mod: 'Hadza & Sandawe (deep lineages); Cushitic & Omotic peoples',
        note: 'Omo Kibish (~233,000 ya) and Herto (~160,000 ya) are among the oldest H. sapiens fossils anywhere. This was the launch-pad for the journey out of Africa.' },
      { from: 3000, lin: 'african', name: 'Afroasiatic farmers & herders',
        mt: 'L + some Eurasian M1/U (back-migration)', y: 'E1b1b, J',
        adna: 'Mota vs later samples reveal a Eurasian "back-to-Africa" influx',
        mod: 'Amhara, Oromo, Somali and other Cushitic/Semitic peoples',
        note: 'A back-migration from the Near East (~3,000+ ya) brought Eurasian ancestry and crops into the Horn — the only major reflux into the homeland.' }
    ]
  },
  {
    id: 'nafrica', name: 'North Africa & the Sahara', label: [8, 27],
    poly: [[-12,21],[-5,30],[5,34],[12,33],[22,32],[31,31],[33,23],[25,18],[12,16],[0,18]],
    peoples: [
      { from: 315000, lin: 'cradle', name: 'Early sapiens — Jebel Irhoud',
        mt: 'pre-L3 African', y: 'A, E',
        adna: '—', mod: '(no direct line — superseded by later peoples)',
        note: 'Jebel Irhoud, Morocco (~315,000 ya) holds the OLDEST known H. sapiens fossils — proof our species was already spread across Africa, not born in one spot.' },
      { from: 15000, lin: 'african', name: 'Iberomaurusians (green Sahara)',
        mt: 'U6, M1 + L', y: 'E-M78, E-M81',
        adna: 'Taforalt, Morocco (~15,000 ya) — half Natufian-related, half sub-Saharan',
        mod: 'Berbers (Amazigh) — Y-E-M81',
        note: 'When the Sahara was green, foragers thrived from Morocco to the Nile. Their descendants, the Berbers, still carry the E-M81 lineage across North Africa.' },
      { from: 1400, lin: 'african', name: 'Arab–Berber North Africa',
        mt: 'U6, H, M1, L', y: 'E-M81, J1',
        adna: '—', mod: 'Maghrebi Arabs & Amazigh peoples',
        note: 'The Arab expansions from the 7th century CE layered Near-Eastern ancestry and Arabic over the ancient Berber population.' }
    ]
  },
  {
    id: 'wafrica', name: 'West & Central Africa', label: [12, 4],
    poly: [[-17,5],[-10,12],[0,15],[10,14],[20,10],[27,5],[28,-6],[18,-8],[10,-6],[8,3],[-5,4]],
    peoples: [
      { from: 150000, lin: 'african', name: 'West & Central African foragers',
        mt: 'L1, L2', y: 'A00 (the DEEPEST known human Y-lineage), B',
        adna: 'Shum Laka, Cameroon (~3,000–8,000 ya) — basal lineages, NOT Bantu-like',
        mod: 'Mbenga & Mbuti "Pygmy" foragers; Yoruba, Mandé and others',
        note: 'Home to the deepest twig of the male family tree — Y-haplogroup A00, found among the Mbo of Cameroon. The Bantu expansion would later begin right here, near the Nigeria–Cameroon border.' },
      { from: 4000, lin: 'african', name: 'The Bantu expansion begins',
        mt: 'L2, L3', y: 'E1b1a (E-M2)',
        adna: 'modern clines trace a wave from Cameroon south & east',
        mod: 'Bantu-speaking peoples across half of Africa',
        note: 'From around the Nigeria–Cameroon border, farming, iron and the Bantu languages began a 4,000-year spread that reshaped sub-Saharan Africa.' }
    ]
  },
  {
    id: 'levant', name: 'The Levant', label: [37, 33],
    poly: [[34,30],[37,31],[39,34],[42,37],[38,37],[35,36],[34,33]],
    peoples: [
      { from: 180000, lin: 'ooa', name: 'Early excursion — Misliya, Skhul, Qafzeh',
        mt: 'early modern (pre-surviving lineages)', y: '—',
        adna: '—', mod: '(no surviving descendants — faded or absorbed)',
        note: 'Modern humans reached the Levant again and again in warm phases (~180,000–90,000 ya) — Misliya, Skhul, Qafzeh — but didn’t persist. These were "false starts" out of Africa.' },
      { from: 55000, lin: 'ooa', name: 'Out-of-Africa pioneers',
        mt: 'L3 → M, N (roots of all non-African lineages)', y: 'CT → F',
        adna: 'inferred from the genomes of all living non-Africans',
        mod: 'ancestral to EVERY person outside Africa',
        note: 'The wave that stuck. Around ~47,000 ya their ancestors met and interbred with Neanderthals — which is why every non-African still carries ~2% Neanderthal DNA.' },
      { from: 14500, lin: 'weurasian', name: 'Natufians',
        mt: 'N1b, R0', y: 'E1b1b, CT',
        adna: 'Natufian (~13,000 ya) — a base layer of the first farmers',
        mod: 'contributed to all later Near-Eastern populations',
        note: 'Sedentary hunter-gatherers who built the first villages and set the stage for farming — the threshold of the Neolithic.' },
      { from: 11500, lin: 'weurasian', name: 'First farmers (Pre-Pottery Neolithic)',
        mt: 'K, H, T, J', y: 'G2a, E1b1b, T',
        adna: 'Levant & Anatolia Neolithic farmers',
        mod: 'spread farming — and their genes — into Europe & Arabia',
        note: 'Wheat, barley, sheep and goats were domesticated here. Jericho is among the oldest walled towns on Earth.' }
    ]
  },
  {
    id: 'arabia', name: 'Arabia', label: [46, 23],
    poly: [[35,30],[42,30],[50,29],[57,25],[59,21],[52,14],[44,12],[39,16],[36,23]],
    peoples: [
      { from: 100000, lin: 'ooa', name: 'Green-Arabia foragers',
        mt: 'L3', y: 'CT',
        adna: '—', mod: '(early dispersers — largely replaced by later waves)',
        note: 'In wet "Green Arabia" phases, humans pushed deep inland — a finger bone at Al Wusta (~85,000 ya) is the earliest known H. sapiens beyond the Levant.' },
      { from: 60000, lin: 'ooa', name: 'The coastal dispersal',
        mt: 'M, N', y: 'F, C',
        adna: '—', mod: 'ancestral to South & Southeast Asians, Australasians',
        note: 'The southern route hugged the shore — across the Bab-el-Mandeb strait from the Horn of Africa and along Arabia’s coast toward India.' },
      { from: 1400, lin: 'weurasian', name: 'Arab peoples',
        mt: 'J, H, R0', y: 'J1',
        adna: '—', mod: 'Arabs of the peninsula',
        note: 'The peninsula became the heartland from which the Arabic language and Y-haplogroup J1 spread across the Near East and North Africa.' }
    ]
  },
  {
    id: 'sasia', name: 'South Asia', label: [78, 22],
    poly: [[61,25],[67,24],[70,30],[77,33],[88,28],[92,24],[90,20],[80,8],[77,7],[72,18],[66,22]],
    peoples: [
      { from: 70000, lin: 'ooa', name: 'Coastal pioneers',
        mt: 'M, R, N', y: 'C, F',
        adna: '—', mod: 'deepest line preserved by the Andaman Islanders',
        note: 'Beachcombers following the southern route reached India early. The subcontinent became a vast reservoir of ancient mtDNA M and R lineages.' },
      { from: 60000, lin: 'southasian', name: 'South Asian foragers',
        mt: 'M2, R, U2 (deeply rooted in India)', y: 'C, H, F',
        adna: 'Ancestral South Indian (ASI), reconstructed from modern genomes',
        mod: 'Adivasi/tribal peoples; the Andamanese (a relict branch)',
        note: 'These hunter-gatherers form the indigenous "ASI" layer beneath nearly all modern South Asians.' },
      { from: 4500, lin: 'southasian', name: 'Farmers & steppe arrivals',
        mt: 'M, R, U, W', y: 'R1a (steppe), L, H, J2 (Iranian)',
        adna: 'Iranian-related farmers + Steppe (Yamnaya-related) pastoralists',
        mod: 'all modern South Asians (an ANI–ASI blend)',
        note: 'Iranian-related farmers and, later, Steppe pastoralists (who brought Indo-European languages and Y-R1a) mixed with indigenous South Asians to form today’s populations.' }
    ]
  },
  {
    id: 'seasia', name: 'Mainland Southeast Asia', label: [101, 17],
    poly: [[92,28],[98,27],[103,22],[109,18],[110,10],[105,8],[100,6],[98,12],[94,18],[92,22]],
    peoples: [
      { from: 65000, lin: 'australasian', name: 'First forest foragers',
        mt: 'M, N', y: 'C, D, F',
        adna: 'Hòabìnhian foragers (~8,000 ya) — a deep East-Eurasian branch',
        mod: 'Negrito peoples (Semang, Maniq) preserve the oldest layer',
        note: 'Among the first lands beyond Africa to be settled. Its "Negrito" foragers carry one of the deepest non-African lineages.' },
      { from: 4000, lin: 'eastasian', name: 'Rice farmers arrive',
        mt: 'B, F, M', y: 'O1b, O2',
        adna: 'a southward farming expansion from the Yangtze',
        mod: 'Vietnamese, Thai, Khmer, Burmese',
        note: 'Austroasiatic and later Tai rice farmers spread south from China, layering over the ancient foragers.' }
    ]
  },
  {
    id: 'sunda', name: 'Island SE Asia (Sundaland)', label: [109, -2],
    poly: [[95,6],[104,2],[112,3],[119,5],[120,-2],[115,-8],[106,-9],[100,-5],[96,0]],
    peoples: [
      { from: 73000, lin: 'australasian', name: 'Sundaland foragers',
        mt: 'M, N, R', y: 'C, D, K',
        adna: 'Niah Cave "Deep Skull", Borneo (~45,000 ya)',
        mod: 'relict groups; Lida Ajer teeth (Sumatra) ~63–73,000 ya',
        note: 'During the Ice Age, Sumatra, Java and Borneo joined into one continent — Sundaland — a green highway toward Australia.' },
      { from: 4000, lin: 'austronesian', name: 'Austronesian farmers',
        mt: 'B4, B5, F', y: 'O1a, O1b',
        adna: 'an expansion of farmers ultimately from Taiwan',
        mod: 'Malay, Indonesian, Filipino peoples',
        note: 'Seafaring farmers out of Taiwan absorbed and replaced earlier groups across the islands, carrying the Austronesian languages.' }
    ]
  },
  {
    id: 'australia', name: 'Australia (Sahul)', label: [134, -26],
    poly: [[113,-22],[114,-32],[120,-34],[129,-32],[138,-35],[146,-39],[150,-37],[153,-28],[145,-15],[135,-12],[126,-14],[122,-18]],
    peoples: [
      { from: 65000, lin: 'australasian', name: 'The First Australians',
        mt: 'M, N → P, S, Q (unique to the region)', y: 'C1b2b (C4), S, M1',
        adna: 'modern Aboriginal genomes show ~50,000 yrs of isolation + Denisovan DNA',
        mod: 'Aboriginal Australians — among the oldest continuous cultures on Earth',
        note: 'Crossing open sea from Sunda to Sahul ~65,000 ya was humanity’s first great ocean voyage. Lake Mungo (~42,000 ya) records the world’s oldest known cremation and ochre burial.' }
    ]
  },
  {
    id: 'newguinea', name: 'New Guinea (Sahul)', label: [141, -6],
    poly: [[130,-2],[137,-2],[143,-3],[150,-6],[151,-9],[146,-9],[140,-9],[133,-8],[130,-5]],
    peoples: [
      { from: 65000, lin: 'australasian', name: 'The First Papuans',
        mt: 'P, Q', y: 'M, S, C',
        adna: 'among the highest Denisovan ancestry of any living people (~4%)',
        mod: 'Papuans & Melanesians',
        note: 'New Guineans carry some of the most Denisovan DNA of any people (~4%) — rivalled only by the Ayta of the Philippines — from interbreeding with a Denisovan-like group in SE Asia. In the Highlands they invented farming (taro, banana) independently ~10,000 ya.' }
    ]
  },
  {
    id: 'easia', name: 'East Asia', label: [112, 34],
    poly: [[100,22],[105,21],[113,22],[122,30],[122,40],[126,43],[123,49],[115,50],[105,45],[100,38],[100,30]],
    peoples: [
      { from: 50000, lin: 'eastasian', name: 'East Asian pioneers',
        mt: 'M, D, N', y: 'C, D, NO',
        adna: 'Tianyuan Man, near Beijing (~40,000 ya) — a basal East Asian',
        mod: 'broadly ancestral to East Asians',
        note: 'Tianyuan Man’s genome shows the East Asian branch was already distinct 40,000 ya — and oddly shared a little ancestry with some early Americans.' },
      { from: 9000, lin: 'eastasian', name: 'Millet & rice farmers',
        mt: 'D, B, F, A', y: 'O2 (O-M122), O1',
        adna: 'Yellow-River millet farmers & Yangtze rice farmers',
        mod: 'Han Chinese, Koreans — and, via the Yayoi, the Japanese',
        note: 'Farming arose twice — millet on the Yellow River, rice on the Yangtze — and the farmers’ Y-haplogroup O came to dominate East Asia.' }
    ]
  },
  {
    id: 'japan', name: 'Japan', label: [138, 38],
    poly: [[129,31],[132,33],[136,35],[141,40],[145,44],[142,45],[138,37],[133,34],[130,32]],
    peoples: [
      { from: 38000, lin: 'eastasian', name: 'Paleolithic settlers',
        mt: 'M, N', y: 'C, D',
        adna: '—', mod: '—',
        note: 'People reached the Japanese islands ~38,000 ya, partly across land bridges when seas were low.' },
      { from: 16000, lin: 'eastasian', name: 'The Jōmon',
        mt: 'M7a, N9b', y: 'D1a2 (D-M55)',
        adna: 'Jōmon genomes — a deeply diverged East Eurasian branch',
        mod: 'Ainu & Ryukyuans retain the most Jōmon ancestry',
        note: 'The Jōmon made some of the world’s oldest pottery (~16,000 ya). Modern Japanese blend Jōmon with Yayoi rice-farmers who arrived ~2,800 ya.' }
    ]
  },
  {
    id: 'casia', name: 'Central Asia & the Steppe', label: [70, 47],
    poly: [[52,38],[60,38],[72,40],[85,43],[92,46],[88,52],[78,54],[66,53],[56,50],[50,45]],
    peoples: [
      { from: 45000, lin: 'ane', name: 'Steppe foragers',
        mt: 'U, R', y: 'P, R, Q',
        adna: 'Ust’-Ishim (~45,000 ya) — the OLDEST modern-human genome ever sequenced',
        mod: '—',
        note: 'Ust’-Ishim man lived so early that his Neanderthal DNA still came in long, unbroken chunks — letting scientists date the Neanderthal mixing to ~50–60,000 ya.' },
      { from: 24000, lin: 'ane', name: 'Ancient North Eurasians (Mal’ta)',
        mt: 'U', y: 'R*',
        adna: 'Mal’ta boy MA-1, near Lake Baikal (~24,000 ya)',
        mod: 'a "ghost" ancestry in BOTH Europeans and Native Americans',
        note: 'The Mal’ta boy revealed the Ancient North Eurasians — a lost people whose blood runs in both Europe and the Americas.' },
      { from: 5000, lin: 'ane', name: 'Yamnaya pastoralists',
        mt: 'U, W, H', y: 'R1b, R1a',
        adna: 'Yamnaya — horse-riding herders of the Pontic-Caspian steppe',
        mod: 'spread across Europe and into South Asia',
        note: 'With the horse, wheel and wagon, the Yamnaya exploded outward ~5,000 ya, carrying Indo-European languages and Y-haplogroups R1a/R1b in every direction.' }
    ]
  },
  {
    id: 'siberia', name: 'Siberia & the North', label: [110, 64],
    poly: [[60,55],[80,54],[100,55],[120,57],[150,60],[160,66],[140,72],[110,73],[85,72],[68,68],[60,62]],
    peoples: [
      { from: 32000, lin: 'ane', name: 'Ancient North Siberians',
        mt: 'U, R', y: 'P, Q',
        adna: 'Yana Rhinoceros Horn Site (~31,600 ya) — far ABOVE the Arctic Circle',
        mod: 'partly ancestral to later Siberians & Native Americans',
        note: 'Astonishingly, people hunted mammoth and rhino above the Arctic Circle at the height of the Ice Age.' },
      { from: 20000, lin: 'american', name: 'Ancestors of the First Americans',
        mt: 'A, C, D', y: 'Q',
        adna: 'a blend of Ancient North Eurasian + Northeast Asian ancestry',
        mod: 'ancestral to all Native Americans',
        note: 'In eastern Siberia, ANE and East-Asian peoples merged into the population that would, alone, go on to people two whole continents.' }
    ]
  },
  {
    id: 'europe', name: 'Europe', label: [14, 49],
    poly: [[-9,37],[-2,43],[3,48],[12,46],[20,45],[30,46],[40,48],[38,55],[28,59],[12,58],[2,52],[-6,50],[-9,43]],
    peoples: [
      { from: 45000, lin: 'weurasian', name: 'First Europeans (Aurignacian)',
        mt: 'N, R, U', y: 'C1, F',
        adna: 'Oase 1, Romania (~40,000 ya) — a Neanderthal great-great-grandparent; Kostenki 14',
        mod: '(early pioneers, mostly replaced later)',
        note: 'The first modern Europeans shared the land with Neanderthals until ~40,000 ya — and made the first cave art at Chauvet and El Castillo.' },
      { from: 33000, lin: 'weurasian', name: 'Gravettian mammoth hunters',
        mt: 'U2, U5', y: 'I, C1',
        adna: 'Sungir (~34,000 ya) — spectacular bead-covered burials; Dolní Věstonice',
        mod: '—',
        note: 'Ice-Age hunters who carved the first "Venus" figurines and fired the first ceramics — millennia before pottery for cooking.' },
      { from: 14000, lin: 'weurasian', name: 'Western Hunter-Gatherers (WHG)',
        mt: 'U5', y: 'I2, C1',
        adna: 'Cheddar Man (UK), La Braña (Spain), Loschbour (Luxembourg)',
        mod: 'a minority ancestry across modern Europe',
        note: 'After the ice retreated, the WHG spread north — and DNA shows they had dark skin and blue eyes.' },
      { from: 8500, lin: 'weurasian', name: 'Anatolian farmers (EEF)',
        mt: 'K, H, T, J', y: 'G2a',
        adna: 'Early European Farmers from Anatolia',
        mod: 'Sardinians retain the most farmer ancestry',
        note: 'Farming arrived not just as an idea but as people — Anatolian farmers who spread across Europe, bringing lighter skin and new crops.' },
      { from: 5000, lin: 'ane', name: 'Steppe (Yamnaya) ancestry arrives',
        mt: 'H, U, W', y: 'R1b, R1a',
        adna: 'Corded Ware & Bell Beaker — a huge steppe influx',
        mod: 'modern Europeans = WHG + Anatolian farmer + Steppe',
        note: 'A massive migration from the steppe ~5,000 ya completed the three-way mix that makes up Europeans today — and brought the Indo-European languages.' }
    ]
  },
  {
    id: 'namerica', name: 'North America', label: [-100, 46],
    poly: [[-168,62],[-150,68],[-120,70],[-90,68],[-70,62],[-55,52],[-65,45],[-80,30],[-97,26],[-110,30],[-124,40],[-130,52],[-150,60]],
    peoples: [
      { from: 16000, lin: 'american', name: 'The First Americans',
        mt: 'A2, B2, C1, D1', y: 'Q-M3',
        adna: 'Anzick-1, Montana (~12,700 ya) — Clovis-associated; ancestral to most Native Americans',
        mod: 'Native American peoples',
        note: 'After a long pause in Beringia, people swept south — likely first along a Pacific "kelp highway" coast — then inland with the Clovis toolkit ~13,000 ya.' },
      { from: 5000, lin: 'american', name: 'Diversification & new arrivals',
        mt: 'A, B, C, D', y: 'Q, C3',
        adna: 'later Na-Dené and Paleo-Eskimo gene flow from Siberia',
        mod: 'the vast diversity of Native North American nations',
        note: 'Further pulses from Siberia brought the Na-Dené and, later, the Arctic peoples — adding to the founding population.' }
    ]
  },
  {
    id: 'mesoamerica', name: 'Mesoamerica', label: [-93, 17],
    poly: [[-106,24],[-99,22],[-94,18],[-88,18],[-83,11],[-86,8],[-92,14],[-100,16],[-106,20]],
    peoples: [
      { from: 15000, lin: 'american', name: 'First Mesoamericans',
        mt: 'A2, C1, D1', y: 'Q-M3',
        adna: 'shares the founding First American ancestry',
        mod: 'Maya, Nahua (Aztec), Zapotec, Mixtec…',
        note: 'Within a couple of thousand years of entering the Americas, people had reached the tropics of Central America.' },
      { from: 9000, lin: 'american', name: 'Maize farmers',
        mt: 'A2, B2', y: 'Q-M3',
        adna: '—', mod: 'the great Mesoamerican civilisations',
        note: 'Maize was domesticated from wild teosinte in the Balsas valley ~9,000 ya — the staple that would feed the Olmec, Maya and Aztec worlds.' }
    ]
  },
  {
    id: 'samerica', name: 'South America', label: [-60, -12],
    poly: [[-80,8],[-70,10],[-60,5],[-50,0],[-35,-7],[-40,-22],[-50,-35],[-65,-45],[-73,-50],[-74,-40],[-71,-25],[-78,-10],[-81,0]],
    peoples: [
      { from: 14500, lin: 'american', name: 'First South Americans',
        mt: 'A2, B2, C1, D1', y: 'Q-M3',
        adna: 'Monte Verde, Chile (~14,500 ya) — a famous PRE-Clovis site',
        mod: 'Quechua, Aymara, Mapuche, Amazonian peoples',
        note: 'Monte Verde in southern Chile shows people had raced the entire length of the Americas to its far south remarkably fast — solid evidence humans were here before Clovis.' },
      { from: 5000, lin: 'american', name: 'Andean & Amazonian farmers',
        mt: 'A, B, C, D', y: 'Q',
        adna: '—', mod: 'Andean and Amazonian nations',
        note: 'The potato, quinoa and more were domesticated in the Andes; Caral–Norte Chico (~5,000 ya) is the oldest city in the Americas.' }
    ]
  },
  {
    id: 'caribbean', name: 'The Caribbean', label: [-73, 18],
    poly: [[-85,18],[-78,23],[-70,21],[-62,18],[-60,12],[-67,11],[-77,15]],
    peoples: [
      { from: 6000, lin: 'american', name: 'Archaic seafarers',
        mt: 'A, C, D', y: 'Q',
        adna: 'an early "Archaic" lineage from Central/South America',
        mod: '(largely replaced by later Arawak arrivals)',
        note: 'The first islanders paddled out from the mainland ~6,000 ya — among the earliest seafaring in the Americas.' },
      { from: 2500, lin: 'american', name: 'Arawak / Taíno (Saladoid)',
        mt: 'A2, C1, D1', y: 'Q',
        adna: 'Ceramic-Age genomes show an Arawak expansion from the Orinoco',
        mod: 'Taíno-descended Caribbean peoples',
        note: 'Arawak-speaking farmers canoed up the island chain from South America’s Orinoco, becoming the Taíno whom Columbus would meet.' }
    ]
  },
  {
    id: 'nearoceania', name: 'Near Oceania (Bismarcks & Solomons)', label: [157, -7],
    poly: [[148,-2],[153,-3],[160,-7],[167,-11],[162,-12],[155,-9],[150,-5]],
    peoples: [
      { from: 40000, lin: 'australasian', name: 'First ocean voyagers',
        mt: 'P, Q', y: 'M, S, C',
        adna: 'deep Papuan-related ancestry',
        mod: 'Melanesians of the Bismarck Archipelago & Solomons',
        note: 'By ~40,000 ya, people had island-hopped east of New Guinea — the edge of the inhabited world. The open Pacific beyond stayed empty for another 37,000 years.' },
      { from: 3300, lin: 'austronesian', name: 'The Lapita culture',
        mt: 'B4a1a1 (the "Polynesian motif")', y: 'O, C',
        adna: 'first Remote-Oceanians had almost pure East-Asian ancestry, then mixed with Papuans',
        mod: 'ancestral to all Polynesians',
        note: 'Austronesian voyagers with distinctive Lapita pottery arrived ~3,300 ya — the springboard for the conquest of the Pacific.' }
    ]
  },
  {
    id: 'nz', name: 'New Zealand', label: [172, -42],
    poly: [[166,-46],[168,-47],[174,-42],[178,-38],[177,-35],[173,-39],[170,-44]],
    peoples: [
      { from: 750, lin: 'austronesian', name: 'Māori',
        mt: 'B4a1a1a (Polynesian motif)', y: 'C2, O',
        adna: 'East Polynesian ancestry; Wairau Bar founders (~1300 CE)',
        mod: 'Māori',
        note: 'The LAST large landmass on Earth settled by people — reached only ~1300 CE, after East Polynesians sailed thousands of km of open ocean by the stars.' }
    ]
  },
  {
    id: 'madagascar', name: 'Madagascar', label: [47, -19],
    poly: [[43,-13],[48,-13],[50,-16],[50,-22],[47,-25],[44,-22],[43,-18]],
    peoples: [
      { from: 1300, lin: 'austronesian', name: 'Austronesian & Bantu settlers',
        mt: 'B4a1a1 (Polynesian motif) + African L', y: 'O1a2 + E1b1a',
        adna: 'roughly half Southeast-Asian, half East-African',
        mod: 'the Malagasy',
        note: 'Madagascar’s first farmers came not from nearby Africa but from BORNEO — ~7,000 km away — Austronesian voyagers, later joined by Bantu Africans. Malagasy is an Austronesian language.' }
    ]
  },
  {
    id: 'arctic', name: 'Greenland & the High Arctic', label: [-45, 75],
    poly: [[-73,67],[-60,68],[-45,70],[-30,72],[-20,76],[-35,82],[-55,82],[-70,76],[-75,70]],
    peoples: [
      { from: 4500, lin: 'arctic', name: 'Paleo-Inuit (Saqqaq)',
        mt: 'D2a1', y: 'Q1a',
        adna: 'the Saqqaq genome (2010) — the FIRST ancient human genome ever sequenced',
        mod: '(left no living descendants)',
        note: 'A wave of Paleo-Inuit from Siberia reached Greenland ~4,500 ya. Their DNA — the first ever recovered from an ancient human — shows they died out, leaving no descendants.' },
      { from: 800, lin: 'arctic', name: 'Thule (the Inuit)',
        mt: 'A2a, A2b', y: 'Q1a',
        adna: 'the Thule replaced the earlier Dorset across the Arctic',
        mod: 'Inuit & Kalaallit',
        note: 'The Thule — ancestors of today’s Inuit — swept across the American Arctic from Alaska ~800 ya, reaching Greenland just as the Norse arrived from the other side.' }
    ]
  }
];

/* ---- Migration routes → animated arcs. Each route is a polyline of [lng,lat]
   waypoints; an optional 3rd value is the YEAR-AGO the route reached that point,
   so long journeys light up leg-by-leg as you scrub forward. ----------------- */
const MIGRATIONS = [
  { id: 'ooa', name: 'The Great Journey — out of Africa', lin: 'ooa', ya: 60000,
    note: 'The southern "beachcombing" route: from the Horn of Africa across the Bab-el-Mandeb strait, along the coast of Arabia and India, to Southeast Asia. Every person outside Africa descends from this wave.',
    pts: [[40,9,62000],[43.3,12.6,61000],[52,15,60000],[58,22,58000],[66,24,56000],[73,18,54000],[78,9,52000],[88,16,50000],[96,12,48000],[103,6,47000]] },
  { id: 'sahul', name: 'First mariners — into Sahul', lin: 'australasian', ya: 65000,
    note: 'From Sundaland across the open straits of Wallacea — sea crossings out of sight of land — to the great southern continent of Sahul (Australia + New Guinea). The first deliberate ocean voyaging.',
    pts: [[110,-2,60000],[120,-5,63000],[126,-8,64000],[131,-8,65000],[138,-7,65000],[143,-9,64000]] },
  { id: 'neareast-europe', name: 'Into the Near East & Europe', lin: 'weurasian', ya: 48000,
    note: 'From the Levant up through Anatolia and the Balkans into Ice-Age Europe, where the newcomers met — and replaced — the Neanderthals.',
    pts: [[44,31,55000],[36,38,50000],[27,42,46000],[18,45,45000],[6,47,44000],[-2,43,42000]] },
  { id: 'siberia', name: 'Into Central Asia & Siberia', lin: 'ane', ya: 45000,
    note: 'North and east across the steppe to the bitter Arctic — people were hunting mammoth above the Arctic Circle by ~32,000 ya.',
    pts: [[45,40,48000],[62,46,46000],[80,52,44000],[105,58,38000],[135,71,32000]] },
  { id: 'eastasia', name: 'Into East Asia', lin: 'eastasian', ya: 50000,
    note: 'Along the coasts and rivers of the east — reaching China by ~45,000 ya and the Japanese islands by ~38,000 ya.',
    pts: [[95,18,52000],[103,26,50000],[112,33,46000],[122,38,42000],[138,38,38000]] },
  { id: 'americas', name: 'The peopling of the Americas', lin: 'american', ya: 16000,
    note: 'After a long "standstill" in Beringia, people crossed into Alaska and swept south — likely first along the Pacific coast — reaching southern Chile by ~14,500 ya.',
    pts: [[150,64,18000],[-168,65,16500],[-150,62,16000],[-135,57,15500],[-125,45,15000],[-110,30,14800],[-95,18,14600],[-78,2,14500],[-72,-20,14500],[-73,-41,14400]] },
  { id: 'bantu', name: 'The Bantu expansion', lin: 'african', ya: 4000,
    note: 'Farming, iron and the Bantu languages spread from the Nigeria–Cameroon border across central, eastern and southern Africa over ~4,000 years.',
    pts: [[12,6,4000],[20,2,3500],[27,-3,3000],[30,-6,2500],[28,-18,2000],[28,-26,1600]] },
  { id: 'neolithic-europe', name: 'Farming spreads into Europe', lin: 'weurasian', ya: 8500,
    note: 'Anatolian farmers carried wheat, cattle and a new way of life across Europe — as people, not just ideas — reaching Britain and Iberia by ~6,000 ya.',
    pts: [[33,38,9000],[24,40,8500],[19,45,7800],[12,48,7400],[2,48,7000],[-3,40,6500],[-1,52,6000]] },
  { id: 'steppe-europe', name: 'The steppe migration into Europe', lin: 'ane', ya: 4800,
    note: 'Yamnaya-descended herders poured off the steppe into Europe ~4,800 ya — the Corded Ware and Bell Beaker peoples — bringing Indo-European languages and Y-haplogroup R.',
    pts: [[42,48,4900],[30,50,4800],[18,50,4700],[8,52,4600],[-2,52,4500]] },
  { id: 'austronesian', name: 'The Austronesian expansion', lin: 'austronesian', ya: 4200,
    note: 'The greatest maritime expansion in prehistory: from Taiwan through the Philippines and Indonesia — west all the way to Madagascar, and east into the open Pacific.',
    pts: [[121,23.5,4200],[122,14,4000],[120,-2,3700],[112,-4,3400],[100,-2,2500],[70,-8,1600],[47,-19,1300]] },
  { id: 'lapita', name: 'Lapita — into the open Pacific', lin: 'austronesian', ya: 3300,
    note: 'Out of the Bismarck Archipelago, the Lapita voyagers crossed into Remote Oceania — Vanuatu, Fiji and then Tonga & Samoa — the first humans EVER in the deep Pacific.',
    pts: [[150,-5,3300],[167,-16,3100],[178,-18,3000],[-175,-21,2900],[-172,-14,2800]] },
  { id: 'polynesia', name: 'The Polynesian triangle', lin: 'austronesian', ya: 1000,
    note: 'After a long pause, master navigators burst across the eastern Pacific — to Tahiti, Hawaii, Rapa Nui and finally New Zealand — using stars, swells and birds to find specks of land thousands of km apart.',
    pts: [[-172,-14,1000],[-149,-17,1000],[-140,-9,950],[-156,20,1000],[-109,-27,800],[176,-41,750]] },
  { id: 'norse', name: 'The Norse North Atlantic', lin: 'weurasian', ya: 1100,
    note: 'From Scandinavia the Norse reached Iceland (~874 CE), Greenland (~985 CE), and briefly Vinland in Newfoundland (~1000 CE) — the first Europeans in the Americas.',
    pts: [[8,60,1150],[-7,62,1100],[-19,64,1150],[-42,61,1040],[-56,51,1000]] },
  { id: 'thule', name: 'Across the Arctic — Paleo-Inuit & Thule', lin: 'arctic', ya: 4500,
    note: 'Paleo-Inuit (~4,500 ya) and later the Thule (~800 ya) crossed the entire American Arctic from Alaska to Greenland — the last great migration of the Americas.',
    pts: [[-160,66,4500],[-120,68,4200],[-95,68,4000],[-60,67,3800],[-40,76,3600]] }
];

/* ---- Key sites: fossils, art, burials, breakthroughs, voyages.
   A site appears once you scrub to its time (curYa ≤ ya). ------------------- */
const SITES = [
  { name: 'Jebel Irhoud', lat: 31.85, lng: -8.87, ya: 315000, kind: 'fossil',
    find: 'Oldest known Homo sapiens fossils', note: 'Morocco. At ~315,000 ya, the earliest fossils of our species — showing sapiens was already pan-African.' },
  { name: 'Florisbad', lat: -28.76, lng: 26.07, ya: 259000, kind: 'fossil',
    find: 'Early H. sapiens skull (~259,000 ya)', note: 'South Africa. An early sapiens cranium bridging archaic and modern forms.' },
  { name: 'Omo Kibish', lat: 5.38, lng: 35.95, ya: 233000, kind: 'fossil',
    find: 'Among the oldest H. sapiens (Omo I)', note: 'Ethiopia. Redated in 2022 to at least 233,000 ya.' },
  { name: 'Herto', lat: 10.27, lng: 40.55, ya: 160000, kind: 'fossil',
    find: 'Homo sapiens idaltu (~160,000 ya)', note: 'Ethiopia. Well-dated early modern human fossils with signs of mortuary ritual.' },
  { name: 'Makgadikgadi–Okavango', lat: -20.5, lng: 24.0, ya: 200000, kind: 'cradle',
    find: 'Proposed homeland wetland', note: 'Botswana. One leading study (2019) places the deepest mtDNA L0 homeland in this once-vast wetland ~200,000 ya — a contested but evocative "cradle".' },
  { name: 'Pinnacle Point', lat: -34.21, lng: 22.09, ya: 164000, kind: 'tech',
    find: 'Earliest shellfish eating & heat-treated tools', note: 'South Africa. By ~164,000 ya people gathered seafood and heat-treated stone to make better blades.' },
  { name: 'Misliya Cave', lat: 32.75, lng: 34.97, ya: 185000, kind: 'fossil',
    find: 'Earliest H. sapiens outside Africa', note: 'Israel. A jaw dated ~177,000–194,000 ya — the first known excursion beyond Africa.' },
  { name: 'Blombos Cave', lat: -34.41, lng: 21.22, ya: 77000, kind: 'art',
    find: 'Engraved ochre & shell beads', note: 'South Africa. Cross-hatched ochre (~73–77,000 ya) and shell-bead jewellery (~100,000 ya) — among the first symbolic art.' },
  { name: 'Sibudu Cave', lat: -29.52, lng: 31.08, ya: 64000, kind: 'tech',
    find: 'Early bows, glue & bedding', note: 'South Africa. Evidence of bow-and-arrow hunting, compound adhesives and insect-repellent bedding ~64,000 ya.' },
  { name: 'Qafzeh & Skhul', lat: 32.69, lng: 35.30, ya: 100000, kind: 'fossil',
    find: 'Early modern humans & burials', note: 'Israel. Deliberate burials with ochre and grave goods ~90–120,000 ya — an early Levant excursion that later faded.' },
  { name: 'Al Wusta', lat: 28.0, lng: 41.0, ya: 85000, kind: 'fossil',
    find: 'Earliest H. sapiens in inner Arabia', note: 'Saudi Arabia. A finger bone (~85,000 ya) shows humans crossed into "Green Arabia".' },
  { name: 'Bab-el-Mandeb', lat: 12.6, lng: 43.3, ya: 60000, kind: 'voyage',
    find: 'The gate out of Africa', note: 'At low sea level this strait between the Horn of Africa and Arabia narrowed to a few km — the likely doorway of the great dispersal.' },
  { name: 'Madjedbebe', lat: -12.34, lng: 132.91, ya: 65000, kind: 'voyage',
    find: 'Earliest humans in Australia', note: 'Australia. Occupation from ~65,000 ya — and proof people crossed open sea to get there.' },
  { name: 'Lake Mungo', lat: -33.72, lng: 143.06, ya: 42000, kind: 'burial',
    find: 'Oldest known cremation & ochre burial', note: 'Australia. Mungo Lady and Mungo Man (~42,000 ya) — among the earliest ritual burials anywhere.' },
  { name: 'Niah Cave', lat: 4.13, lng: 113.78, ya: 45000, kind: 'fossil',
    find: 'The "Deep Skull" of Borneo', note: 'Borneo. A modern human skull ~45,000 ya, on the Ice-Age continent of Sundaland.' },
  { name: 'Tam Pà Ling', lat: 20.2, lng: 103.4, ya: 50000, kind: 'fossil',
    find: 'Early H. sapiens in mainland Asia', note: 'Laos. Fossils showing people were well into Southeast Asia by ~46–70,000 ya.' },
  { name: 'Bacho Kiro', lat: 43.0, lng: 25.4, ya: 45000, kind: 'fossil',
    find: 'Earliest H. sapiens in Europe', note: 'Bulgaria. Modern humans ~45,000 ya, overlapping with Europe’s Neanderthals.' },
  { name: "Ust'-Ishim", lat: 57.7, lng: 71.2, ya: 45000, kind: 'dna',
    find: 'Oldest modern-human genome', note: 'Siberia. A ~45,000-year-old femur gave the oldest sequenced H. sapiens genome — and dated the Neanderthal mixing.' },
  { name: 'Denisova Cave', lat: 51.4, lng: 84.68, ya: 50000, kind: 'dna',
    find: 'Home of the Denisovans', note: 'Altai, Siberia. A whole human cousin known almost entirely from DNA — who live on in Papuan and Aboriginal genomes.' },
  { name: 'Chauvet Cave', lat: 44.39, lng: 4.41, ya: 36000, kind: 'art',
    find: 'Masterpiece cave paintings', note: 'France. Lions, rhinos and horses painted ~36,000 ya — some of the oldest and finest art on Earth.' },
  { name: 'Hohle Fels', lat: 48.38, lng: 9.76, ya: 40000, kind: 'art',
    find: 'Oldest figurative art & flute', note: 'Germany. The "Venus of Hohle Fels" and a bird-bone flute ~40,000 ya — sculpture and music.' },
  { name: 'Sungir', lat: 56.18, lng: 40.50, ya: 34000, kind: 'burial',
    find: 'Astonishing bead-covered burials', note: 'Russia. Graves adorned with tens of thousands of mammoth-ivory beads ~34,000 ya.' },
  { name: 'Yana RHS', lat: 70.7, lng: 135.6, ya: 31600, kind: 'fossil',
    find: 'Humans above the Arctic Circle', note: 'Arctic Siberia. People hunted mammoth and rhino here ~31,600 ya, at the edge of the habitable world.' },
  { name: "Mal'ta", lat: 52.8, lng: 103.5, ya: 24000, kind: 'dna',
    find: 'The Ancient North Eurasians', note: 'Near Lake Baikal. The "Mal’ta boy" (MA-1) revealed a ghost people ancestral to both Europeans and Native Americans.' },
  { name: 'Upward Sun River', lat: 64.4, lng: -146.0, ya: 11500, kind: 'dna',
    find: 'The "Ancient Beringians"', note: 'Alaska. Infant genomes (~11,500 ya) from a founding branch of Native Americans that stayed in the north.' },
  { name: 'White Sands', lat: 32.78, lng: -106.17, ya: 22000, kind: 'voyage',
    find: 'Contested footprints — humans far earlier?', note: 'New Mexico. Fossil footprints controversially dated to ~22,000 ya. If correct, people were in the Americas millennia before the main peopling — hotly debated.' },
  { name: 'Paisley Caves', lat: 42.8, lng: -120.9, ya: 14200, kind: 'voyage',
    find: 'Pre-Clovis evidence', note: 'Oregon. Human coprolites ~14,200 ya — among the earliest solid traces of people in North America.' },
  { name: 'Monte Verde', lat: -41.5, lng: -73.2, ya: 14500, kind: 'voyage',
    find: 'Pre-Clovis site at the far south', note: 'Chile. People reached the bottom of the Americas by ~14,500 ya — overturning the "Clovis-first" idea.' },
  { name: 'Clovis', lat: 34.4, lng: -103.2, ya: 13000, kind: 'tech',
    find: 'The Clovis toolkit', note: 'New Mexico. The famous fluted spear points (~13,000 ya) once thought to mark the first Americans.' },
  { name: 'Göbekli Tepe', lat: 37.22, lng: 38.92, ya: 11500, kind: 'tech',
    find: 'The first monuments', note: 'Turkey. Giant carved stone pillars raised ~11,500 ya — by hunter-gatherers, BEFORE farming. It rewrote the story of civilisation.' },
  { name: 'Jericho', lat: 31.87, lng: 35.44, ya: 11000, kind: 'tech',
    find: 'One of the oldest towns', note: 'A walled settlement continuously occupied for ~11,000 years — a cradle of the Neolithic.' },
  { name: 'Çatalhöyük', lat: 37.67, lng: 32.83, ya: 9000, kind: 'tech',
    find: 'A great Neolithic town', note: 'Turkey. A dense ~9,000-year-old town of thousands — houses entered through the roof.' },
  { name: 'Caral', lat: -10.9, lng: -77.5, ya: 5000, kind: 'tech',
    find: 'Oldest city in the Americas', note: 'Peru. The pyramids of Caral–Norte Chico (~5,000 ya) — the New World’s earliest urban civilisation.' },
  { name: 'Teouma (Lapita)', lat: -17.75, lng: 168.27, ya: 3000, kind: 'voyage',
    find: 'First people of Remote Oceania', note: 'Vanuatu. A Lapita cemetery (~3,000 ya) whose DNA showed the first deep-Pacific settlers came almost straight from East Asia.' },
  { name: 'Rapa Nui (Easter Island)', lat: -27.12, lng: -109.37, ya: 800, kind: 'voyage',
    find: 'A speck found in the vast Pacific', note: 'Settled ~1200 CE by Polynesians — one of the most isolated inhabited places on Earth, later home to the moai.' },
  { name: 'Wairau Bar', lat: -41.51, lng: 174.07, ya: 720, kind: 'voyage',
    find: 'Among the first Māori sites', note: 'New Zealand. A founding settlement (~1300 CE) of the last large landmass humans reached.' },
  { name: "L'Anse aux Meadows", lat: 51.6, lng: -55.53, ya: 1005, kind: 'voyage',
    find: 'Norse in the Americas', note: 'Newfoundland. A Viking camp pinned by a solar-storm tree-ring signal to exactly 1021 CE — Europeans reached the New World ~500 years before Columbus.' },
  { name: 'Reykjavík (Iceland)', lat: 64.13, lng: -21.9, ya: 1150, kind: 'voyage',
    find: 'Norse settle Iceland', note: 'Settled ~874 CE — one of the last large empty lands of the North Atlantic to be peopled.' }
];

/* ---- Story chapters — jump the timeline to a great moment. ----------------- */
const CHAPTERS = [
  { ya: 300000, emoji: '🌍', label: 'African dawn' },
  { ya: 200000, emoji: '🏞️', label: 'Southern cradle' },
  { ya: 77000,  emoji: '🎨', label: 'First art' },
  { ya: 60000,  emoji: '🌅', label: 'Out of Africa' },
  { ya: 65000,  emoji: '⛵', label: 'First mariners' },
  { ya: 45000,  emoji: '🦬', label: 'Into Europe' },
  { ya: 20000,  emoji: '❄️', label: 'Ice-Age peak' },
  { ya: 15000,  emoji: '🦣', label: 'First Americans' },
  { ya: 11000,  emoji: '🌾', label: 'First farmers' },
  { ya: 5000,   emoji: '🐎', label: 'Steppe & sails' },
  { ya: 750,    emoji: '🌴', label: 'Last frontiers' },
  { ya: 0,      emoji: '🏙️', label: 'Today' }
];

/* ---- Rough world-population estimates (heavily approximate; for a sense of
   scale only). Pairs of [ya, people]. ------------------------------------- */
const POP = [
  [300000, 20000], [200000, 50000], [100000, 200000], [70000, 100000],
  [50000, 500000], [30000, 1500000], [20000, 2500000], [12000, 4000000],
  [10000, 5000000], [7000, 10000000], [5000, 20000000], [3000, 45000000],
  [2000, 230000000], [1000, 300000000], [750, 400000000], [500, 500000000],
  [200, 1000000000], [0, 8100000000]
];

/* ---- Rough GLOBAL mean-temperature anomaly vs today (°C). Drives the climate
   gauge, the ice-sheet opacity and the atmosphere tint. Pairs of [ya, °C].
   Heavily simplified from ice-core / ocean-sediment proxies — for feel, not figures.
   Negative = colder. The Last Glacial Maximum (~20 ka) was ~5 °C colder globally;
   the Eemian (~125 ka) a touch warmer than today. ---------------------------- */
const TEMP = [
  [300000, -2.5], [260000, -0.5], [230000, -1.5], [200000, -2.0], [177000, -3.5],
  [160000, -5.0], [130000, -3.5], [125000, 1.5], [120000, 0.0], [100000, -1.5],
  [90000, -2.0], [80000, -2.5], [74000, -3.0], [70000, -3.2], [60000, -2.8],
  [50000, -3.4], [40000, -3.6], [30000, -4.0], [26000, -4.5], [20000, -5.0],
  [18000, -4.5], [15000, -3.0], [14000, -2.0], [13000, -1.2], [12000, -2.2],
  [11700, -1.2], [10000, -0.3], [8000, 0.5], [6000, 0.3], [3000, 0.0],
  [2000, -0.1], [1000, -0.2], [500, -0.5], [200, -0.4], [0, 0.0]
];

/* ---- The great ice sheets — WHERE it was too cold to live. Pale ice polygons
   that appear through the last glacial and fade in the warm times (opacity
   tracks how cold it is). They show why the north stayed empty, why people
   sheltered in southern refugia, and why locking up ocean water dropped the
   seas and opened the land bridges. ----------------------------------------- */
const ICE = [
  { id: 'laurentide', name: 'Laurentide ice sheet', label: [-93, 60], ya0: 110000, ya1: 11700,
    poly: [[-130,55],[-125,66],[-100,68],[-80,66],[-62,60],[-56,52],[-66,46],[-80,43],[-95,44],[-112,47],[-125,49]],
    note: 'Kilometres of ice buried most of Canada and the northern US, peaking ~20,000 ya. It made the north uninhabitable — and locked up so much ocean water that seas fell ~120 m, opening the Bering land bridge into the Americas.' },
  { id: 'eurasian', name: 'Eurasian (Fennoscandian) ice sheet', label: [22, 67], ya0: 110000, ya1: 11700,
    poly: [[-8,52],[0,58],[12,56],[28,56],[45,60],[65,68],[75,74],[55,78],[30,76],[8,72],[-6,62],[-10,55]],
    note: 'Ice smothered Scandinavia, the British Isles and northern Europe. People sheltered in southern refugia — Iberia, Italy, the Balkans — and only spread north as it melted after ~18,000 ya.' },
  { id: 'greenland', name: 'Greenland ice sheet', label: [-41, 73], ya0: 300000, ya1: 0,
    poly: [[-55,60],[-35,60],[-20,68],[-22,78],[-38,82],[-55,80],[-60,70],[-58,62]],
    note: 'The Greenland ice sheet has endured through every glacial cycle — the last great relic of the Ice Age in the Northern Hemisphere, still kilometres thick today.' },
  { id: 'patagonian', name: 'Patagonian ice cap', label: [-73, -48], ya0: 110000, ya1: 11700,
    poly: [[-74,-42],[-70,-44],[-71,-50],[-74,-54],[-76,-50],[-75,-45]],
    note: 'An ice cap spread over the southern Andes during glacials. People reached its edge by ~14,500 ya — Monte Verde lies just beyond it.' }
];

/* ---- Rough GLOBAL sea level vs today (metres). Locking water into ice sheets
   dropped the seas ~125 m at the glacial maximum — baring the land bridges.
   Pairs of [ya, metres]; negative = lower than today. ----------------------- */
const SEALEVEL = [
  [300000, -20], [260000, -5], [230000, -15], [200000, -20], [177000, -40],
  [160000, -90], [130000, -30], [125000, 6], [120000, 0], [100000, -22],
  [90000, -30], [80000, -38], [74000, -55], [70000, -70], [60000, -65],
  [50000, -72], [40000, -78], [30000, -95], [26000, -110], [20000, -125],
  [18000, -115], [15000, -100], [14000, -90], [13000, -75], [12000, -62],
  [11700, -55], [10000, -38], [8000, -12], [6000, -3], [3000, -1],
  [2000, 0], [1000, 0], [500, 0], [200, 0], [0, 0]
];

/* ---- THE OTHER HUMANS — the cousins we lived alongside, and replaced.
   Coarse ranges that wink out at each species' end date as Homo sapiens spreads.
   Two of them live on in us: Neanderthal & Denisovan DNA. --------------------- */
const ARCHAIC = [
  { id: 'neander', name: 'Neanderthals', c: '#b196bb', label: [33, 48], ya0: 300000, ya1: 40000,
    poly: [[-9,37],[2,43],[18,45],[40,43],[62,45],[88,52],[70,56],[42,55],[16,52],[-2,45]],
    note: 'Our closest cousins — stocky, big-brained masters of Ice-Age Europe and the Near East for over 350,000 years. They faded ~40,000 ya, soon after modern humans arrived. But they live on in us: every person outside Africa carries ~2% Neanderthal DNA.' },
  { id: 'deniso', name: 'Denisovans', c: '#6fa7a3', label: [108, 33], ya0: 300000, ya1: 40000,
    poly: [[78,30],[92,40],[110,44],[126,42],[132,30],[120,18],[104,16],[90,22],[80,26]],
    note: 'A whole human species known almost entirely from DNA — a finger bone and a few teeth from Denisova Cave. They ranged across Asia and live on in the living: up to ~5% of the DNA of Papuans, Aboriginal Australians and the Ayta of the Philippines.' },
  { id: 'erectus', name: 'Homo erectus (late)', c: '#b3977a', label: [110, -7], ya0: 300000, ya1: 108000,
    poly: [[104,-5],[116,-5],[116,-9],[105,-9]],
    note: 'The great pioneer — the first human to leave Africa, nearly 2 million years ago, and the longest-lived of all human species. The last known erectus held on in Java until perhaps ~108,000 ya.' },
  { id: 'flores', name: "Homo floresiensis (the “Hobbit”)", c: '#9faa67', label: [121, -8.7], ya0: 300000, ya1: 50000,
    poly: [[118,-8.1],[123.6,-8.1],[123.6,-9.3],[118,-9.3]],
    note: 'The “Hobbit” — a metre-tall human species on the island of Flores, with a brain a third the size of ours, yet making tools and hunting. It survived until ~50,000 ya, around when modern humans reached the region.' },
  { id: 'luzon', name: 'Homo luzonensis', c: '#9faa67', label: [121.5, 16], ya0: 300000, ya1: 50000,
    poly: [[119.5,15.3],[122.6,18.4],[124,16],[121,13.4]],
    note: 'A small, recently discovered human species on Luzon in the Philippines, known from teeth and bones — another island cousin that lasted until ~50,000 ya.' },
  { id: 'naledi', name: 'Homo naledi', c: '#9a9a9a', label: [27, -26], ya0: 335000, ya1: 236000,
    poly: [[25.5,-25.4],[28.6,-25.4],[28.6,-27.1],[25.5,-27.1]],
    note: 'A small-brained human whose bones lie deep in a South African cave system — possibly placed there deliberately. Astonishingly recent (~335–236,000 ya) for so archaic a form, it may have overlapped the very first Homo sapiens.' }
];

/* ---- The narrated era for the big readout. ya → {era, head}. -------------- */
function eraInfo(ya) {
  if (ya <= 0)       return { era: 'The world today', head: '8.1 billion people, one species, one origin' };
  if (ya <= 300)     return { era: 'The modern world', head: 'The globe is full; the journey’s descendants are everywhere' };
  if (ya <= 800)     return { era: 'The last frontiers', head: 'Polynesians reach New Zealand — the last great land settled' };
  if (ya <= 3500)    return { era: 'Sails & saddles', head: 'Austronesians cross the Pacific; the steppe reshapes Eurasia' };
  if (ya <= 6000)    return { era: 'The first farmers', head: 'Farming and the first towns spread across the world' };
  if (ya <= 11700)   return { era: 'After the Ice', head: 'The ice melts, seas rise, and humanity settles down' };
  if (ya <= 19000)   return { era: 'Peopling the Americas', head: 'The last continents are reached — humans on every habitable land but the remote isles' };
  if (ya <= 27000)   return { era: 'The Ice-Age peak', head: 'Seas at their lowest; land bridges open; people shelter in refugia' };
  if (ya <= 40000)   return { era: 'The Great Expansion', head: 'Europe, Asia and Australia peopled; cave art and the last Neanderthals' };
  if (ya <= 66000)   return { era: 'Out of Africa', head: 'The wave that peopled the world leaves the homeland — and reaches Australia' };
  if (ya <= 90000)   return { era: 'On the threshold', head: 'Symbolic art flowers; early excursions probe Arabia and the Levant' };
  if (ya <= 200000)  return { era: 'The African cradle', head: 'All of humanity lives in Africa — the deepest roots in the south' };
  return { era: 'The African dawn', head: 'Homo sapiens emerges, already spread across Africa' };
}
