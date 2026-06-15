/* ============================================================================
   build_sanctions.mjs — emits data/sanctions.js for the Russian Sanctions Map.

   Model
   -----
   Every country carries a STATUS TIMELINE toward Moscow:
     seg: [[year, code], …]   code ∈ {g, y, r, self}
       g    = green  — friendly / open relations, no sanctions
       y    = yellow — partial / neutral / mixed
       r    = red    — sanctioning / isolating Russia
       self = Russia (and, before 1991, the USSR's republics)
   The status at any year = the last segment whose start ≤ year (null before the
   first segment = "no data / did not yet feature").

   Most segments are GENERATED from a compact per-country spec (Cold-War cohort +
   modern stance); the great powers carry an explicit hand-authored arc so the
   Empire / WWII / Cold-War nuances are right. A 2014 + 2022 "modern overlay"
   re-colours the sanctioning world on top of the cohort baseline.

   Data: see README. Events, current stances, Cold-War blocs and impact stats
   were compiled from OFAC/EU/UK/G7 releases, Castellum.AI, the UN ES-11 votes,
   SIPRI, Bruegel, CEPR, Yale CELI and press reporting (June 2026 snapshot).
   ========================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = JSON.parse(readFileSync(join(__dir, 'data', '_country_base.json'), 'utf8'));
const baseByIso = {}; BASE.forEach(c => { baseByIso[c.iso] = c; });

const START = 1900, END = 2026, AS_OF = 'June 2026';

/* ---------------------------------------------------------------- eras ---- */
const ERAS = [
  { from: 1900, to: 1917, name: 'Russian Empire', blurb: 'The Tsarist empire — allied with France & Britain in the Triple Entente, at war with the Central Powers from 1914.' },
  { from: 1917, to: 1933, name: 'Revolution & isolation', blurb: 'Bolshevik revolution, Allied intervention and blockade, and a decade of Western non-recognition of Soviet Russia.' },
  { from: 1933, to: 1941, name: 'Recognition & the pact', blurb: 'The USSR is recognised, expelled from the League of Nations over Finland, then signs the Molotov–Ribbentrop Pact.' },
  { from: 1941, to: 1947, name: 'The Grand Alliance', blurb: 'After Barbarossa the USSR joins the Allies; Lend-Lease makes it a partner of the West — the high-water mark of cooperation.' },
  { from: 1947, to: 1985, name: 'The Cold War', blurb: 'Four decades of containment: the CoCom tech embargo, the Iron Curtain, and the Warsaw Pact facing NATO.' },
  { from: 1985, to: 1991, name: 'Thaw & dissolution', blurb: 'Gorbachev’s glasnost and perestroika, the fall of the Berlin Wall, and the dissolution of the Soviet Union.' },
  { from: 1991, to: 2014, name: 'Partnership era', blurb: 'Cold-War sanctions wind down; Russia joins the G8 and the NATO–Russia Council. The most open the world has been to Moscow.' },
  { from: 2014, to: 2022, name: 'Crimea & first sanctions', blurb: 'The annexation of Crimea and the downing of MH17 trigger the first modern Western sanctions and Russia’s expulsion from the G8.' },
  { from: 2022, to: 2026, name: 'Full-scale war', blurb: 'The invasion of Ukraine sets off the largest sanctions programme in history — and a hard pivot by Russia toward China, India and the Global South.' },
];

/* -------------------------------------------------------------- events ---- */
/* y year · d date · t title · who actors · what · imp impact · cat category · sev 1-5 */
const EVENTS = [
  { y:1911, d:'1911', t:'US abrogates the 1832 Russo-American trade treaty', who:'United States ↔ Imperial Russia', what:'Congress terminated the Treaty of Navigation & Commerce after Russia refused to honour the passports of American Jews.', imp:'An early use of a trade treaty as a human-rights lever — a template echoed by Jackson–Vanik six decades later.', cat:'restriction', sev:2 },
  { y:1917, d:'1917', t:'Bolshevik Revolution & Western non-recognition', who:'Soviet Russia ↔ the West', what:'After the October Revolution the Western powers refused to recognise the new Soviet government; the US held out until 1933.', imp:'Opened a long diplomatic and economic freeze that defined the 1920s.', cat:'diplomatic', sev:4 },
  { y:1918, d:'1918–20', t:'Allied intervention & blockade of Soviet Russia', who:'Britain, France, US, Japan ↔ Soviet Russia', what:'Allied troops intervened in the Russian Civil War and blockaded Soviet-held ports until early 1920.', imp:'The first concerted Western economic-military isolation of a Soviet government.', cat:'conflict', sev:4 },
  { y:1933, d:'1933-11-16', t:'United States recognises the USSR', who:'United States (FDR) & USSR', what:'Roosevelt ended 16 years of non-recognition through the Roosevelt–Litvinov agreements, opening embassies and trade.', imp:'A major thaw that normalised US–Soviet relations.', cat:'easing', sev:4 },
  { y:1939, d:'1939-08-23', t:'Molotov–Ribbentrop Pact', who:'USSR & Nazi Germany', what:'A non-aggression treaty with a secret protocol partitioning Eastern Europe; it enabled the joint invasion of Poland.', imp:'Made the USSR a de-facto partner of Germany (1939–41) and a pariah to the West.', cat:'alliance', sev:4 },
  { y:1939, d:'1939-12-14', t:'USSR expelled from the League of Nations', who:'League of Nations ↔ USSR', what:'After the Soviet invasion of Finland, the League expelled the USSR — the only state it ever expelled.', imp:'Formal multilateral condemnation of Soviet aggression.', cat:'diplomatic', sev:3 },
  { y:1941, d:'1941–45', t:'Lend-Lease & the Grand Alliance', who:'US, UK & USSR', what:'After Germany invaded, the US and UK extended ~$11bn in Lend-Lease aid and the USSR became a full Allied power.', imp:'The high-water mark of Western–Russian cooperation; together they won the war in Europe.', cat:'alliance', sev:5 },
  { y:1947, d:'1947', t:'Cold War begins; USSR rejects the Marshall Plan', who:'United States ↔ USSR', what:'The Truman Doctrine and Marshall Plan; Molotov walked out, taking the Eastern bloc into the rival Molotov Plan / Comecon.', imp:'Formal economic and political division of Europe for four decades.', cat:'diplomatic', sev:5 },
  { y:1948, d:'1948–49', t:'Berlin Blockade & Airlift', who:'USSR ↔ US, UK, France', what:'The USSR cut land access to West Berlin; the West sustained the city by air for nearly a year.', imp:'First great Cold-War confrontation; catalysed the founding of NATO.', cat:'conflict', sev:4 },
  { y:1949, d:'1949', t:'CoCom tech embargo; NATO founded', who:'US + NATO allies + Japan ↔ Eastern bloc', what:'The Coordinating Committee for Multilateral Export Controls barred arms, nuclear and dual-use technology to the Soviet bloc.', imp:'The defining structural Western embargo of the Cold War — it ran until 1994.', cat:'restriction', sev:4 },
  { y:1962, d:'1962-10', t:'Cuban Missile Crisis & US naval quarantine', who:'US (Kennedy) ↔ USSR (Khrushchev)', what:'The US blockaded Cuba over Soviet missile deployments; resolved by a negotiated Soviet withdrawal.', imp:'The closest the Cold War came to nuclear war.', cat:'conflict', sev:4 },
  { y:1974, d:'1975-01', t:'Jackson–Vanik Amendment', who:'US Congress ↔ USSR', what:'Denied normal trade relations to non-market economies that restricted emigration — aimed at Soviet exit taxes on Jewish émigrés.', imp:'Tied US–Soviet trade to human rights for nearly four decades.', cat:'restriction', sev:3 },
  { y:1980, d:'1980', t:'Grain embargo & Olympic boycott (Afghanistan)', who:'US-led coalition ↔ USSR', what:'After the 1979 invasion of Afghanistan, Carter embargoed grain and ~65 nations boycotted the Moscow Olympics.', imp:'High-profile but largely ineffective — the USSR sourced grain elsewhere.', cat:'escalation', sev:3 },
  { y:1981, d:'1981–82', t:'Poland martial-law & Siberian-pipeline sanctions', who:'US (Reagan) ↔ USSR; friction with Europe', what:'Reagan embargoed oil-and-gas equipment for the Urengoy export pipeline and extended it to foreign subsidiaries.', imp:'Caused a major transatlantic rift; a defining episode in energy-sanctions politics.', cat:'escalation', sev:3 },
  { y:1983, d:'1983-09-01', t:'KAL 007 shootdown', who:'USSR → US response', what:'Soviet fighters downed a Korean airliner (269 dead); the US suspended Aeroflot service and pending agreements.', imp:'Intensified the early-1980s "Second Cold War".', cat:'conflict', sev:3 },
  { y:1985, d:'1985', t:'Gorbachev: glasnost, perestroika & the thaw', who:'USSR (Gorbachev) & the US (Reagan)', what:'Reform at home and arms-control diplomacy abroad — Geneva, Reykjavik, the INF Treaty.', imp:'Reframed the relationship from confrontation toward partnership.', cat:'easing', sev:4 },
  { y:1989, d:'1989-11-09', t:'Fall of the Berlin Wall', who:'USSR, Eastern Europe & the West', what:'The Wall fell and communist governments collapsed across the Eastern bloc.', imp:'Ended the bloc division of Europe and the rationale for the Cold-War embargo.', cat:'easing', sev:5 },
  { y:1991, d:'1991-12-26', t:'Dissolution of the Soviet Union', who:'The 15 Soviet republics', what:'The USSR ceased to exist; Russia emerged as its legal continuator and 14 other states became independent.', imp:'The end of the Cold War; sanctions wound down and a partnership era opened.', cat:'easing', sev:5 },
  { y:1997, d:'1997-05-27', t:'NATO–Russia Founding Act', who:'NATO & Russia (Yeltsin)', what:'Created a Permanent Joint Council for consultation alongside NATO’s first post-Cold-War enlargement.', imp:'Cornerstone of post-Cold-War NATO–Russia cooperation.', cat:'alliance', sev:3 },
  { y:1998, d:'1998', t:'Russia joins the G7 → G8', who:'G7 + Russia', what:'Russia became a full member of the political G8 at the Birmingham summit.', imp:'The symbol of Russia’s integration into the Western-led order — reversed in 2014.', cat:'alliance', sev:3 },
  { y:2002, d:'2002-05-28', t:'NATO–Russia Council established', who:'NATO members + Russia (Putin)', what:'The Rome Declaration upgraded cooperation, with members and Russia working "as equal partners".', imp:'The deepest institutional NATO–Russia cooperation ever reached.', cat:'alliance', sev:2 },
  { y:2008, d:'2008-08', t:'Russo-Georgian War', who:'Russia ↔ Georgia', what:'A five-day war after which Russia recognised South Ossetia and Abkhazia; the Western response was largely rhetorical.', imp:'The first post-Soviet use of force to redraw borders — a precedent critics later cited.', cat:'conflict', sev:3 },
  { y:2012, d:'2012-12-14', t:'US Magnitsky Act; Jackson–Vanik repealed', who:'US (Obama) ↔ Russia', what:'Granted Russia normal trade relations but replaced Jackson–Vanik with targeted asset-freeze and visa sanctions on rights abusers.', imp:'Pivoted US policy toward targeted "smart" sanctions, later globalised.', cat:'restriction', sev:3 },
  { y:2014, d:'2014-03', t:'Annexation of Crimea → first sanctions; G8 → G7', who:'US, EU & allies ↔ Russia', what:'US Executive Orders 13660/13661/13662 and EU measures launched the modern regime; Russia was suspended from the G8.', imp:'The foundational architecture of every Russia sanction since — and the end of 16 years in the elite club.', cat:'escalation', sev:5 },
  { y:2014, d:'2014-07-17', t:'MH17 shootdown → sectoral sanctions', who:'US & EU ↔ Russia', what:'After MH17 was downed over eastern Ukraine (298 dead), the US and EU imposed "Tier 3" sanctions on banking, energy and defence.', imp:'Hardened sanctions from symbolic to economically biting.', cat:'escalation', sev:4 },
  { y:2016, d:'2016-12-29', t:'US election-interference sanctions', who:'US (Obama) ↔ Russia', what:'EO 13757 sanctioned the GRU and FSB and expelled 35 diplomats over interference in the 2016 election.', imp:'Opened a new cyber/election front, later codified by CAATSA.', cat:'escalation', sev:3 },
  { y:2017, d:'2017-08-02', t:'CAATSA codifies sanctions into law', who:'US Congress ↔ Russia', what:'The Act locked existing sanctions into law and added secondary-sanctions authority over third countries.', imp:'Made Russia sanctions hard to lift without Congress.', cat:'restriction', sev:4 },
  { y:2018, d:'2018-03', t:'Skripal poisoning → mass expulsions', who:'UK + ~28 allies ↔ Russia', what:'After a Novichok attack in Salisbury, Western states expelled 150+ Russian diplomats and the US added chemical-weapons sanctions.', imp:'The largest coordinated diplomatic expulsion in modern history.', cat:'escalation', sev:3 },
  { y:2021, d:'2021', t:'Nord Stream 2 standoff', who:'US, Germany & Russia', what:'Germany suspended certification of the completed pipeline amid a pre-invasion energy-geopolitics standoff.', imp:'The pipeline never entered commercial service.', cat:'escalation', sev:2 },
  { y:2022, d:'2022-02-24', t:'Full-scale invasion of Ukraine', who:'Russia → Ukraine', what:'Russia launched the largest interstate war in Europe since 1945.', imp:'The era-defining turning point that triggered the most extensive sanctions ever assembled against a major economy.', cat:'conflict', sev:5 },
  { y:2022, d:'2022-02-26', t:'SWIFT cut-off & ~$300bn in reserves frozen', who:'EU, US, UK, Canada, Japan ↔ Russia', what:'Major Russian banks were removed from SWIFT and ~$300bn of central-bank reserves immobilised (≈€210bn in the EU).', imp:'Froze a G20 central bank out of the global financial system overnight.', cat:'escalation', sev:5 },
  { y:2022, d:'2022', t:'EU packages 1–9; oligarch freezes; corporate exodus', who:'EU, G7 & allies ↔ Russia', what:'Nine EU packages plus parallel measures: sweeping export controls, asset freezes, airspace/port closures, and 1,000+ firms exiting.', imp:'Comprehensive isolation across finance, trade, transport and technology.', cat:'restriction', sev:5 },
  { y:2022, d:'2022-03', t:'Expelled from the Council of Europe; suspended at the UN', who:'Council of Europe; UN General Assembly', what:'Russia was expelled from the Council of Europe and suspended from the UN Human Rights Council over atrocities in Ukraine.', imp:'Deep institutional exclusion of a permanent Security-Council member.', cat:'diplomatic', sev:3 },
  { y:2022, d:'2022-09', t:'Nord Stream pipelines sabotaged', who:'Unattributed', what:'Underwater explosions destroyed three of the four Nord Stream lines in the Baltic Sea.', imp:'Ended any prospect of restoring Russian pipeline gas to Germany.', cat:'conflict', sev:3 },
  { y:2022, d:'2022-12-05', t:'EU oil embargo + $60 G7 price cap', who:'EU + G7 + Australia ↔ Russia', what:'A ban on seaborne Russian crude plus a $60/barrel price cap enforced through Western shipping and insurance.', imp:'A novel mechanism to cut Kremlin revenue while keeping oil flowing — and the birth of Russia’s "shadow fleet".', cat:'escalation', sev:4 },
  { y:2023, d:'2023', t:'Wagner mutiny; Black Sea grain deal collapses', who:'Russia (internal); Russia ↔ UN/Türkiye', what:'Prigozhin’s 24-hour mutiny exposed cracks in the war effort; Russia then quit the Black Sea Grain Initiative, spiking food prices.', imp:'Tightened pressure on Russia’s mercenary apparatus and stoked a global food-security scare.', cat:'conflict', sev:3 },
  { y:2024, d:'2024-06', t:'G7 $50bn ERA loan on frozen-asset profits', who:'G7 + EU ↔ Russia (for Ukraine)', what:'~$50bn in loans to Ukraine serviced by the windfall profits earned on immobilised Russian sovereign assets.', imp:'First operational use of frozen-asset proceeds — a major precedent short of confiscation.', cat:'escalation', sev:4 },
  { y:2024, d:'2024', t:'EU 13th–15th packages target evasion & LNG', who:'EU ↔ Russia & third-country enablers', what:'Packages pivoted to Russia’s military-industrial supply chain, LNG transshipment, the shadow fleet, and Chinese suppliers.', imp:'Shifted sanctions from rule-making toward an enforcement war over evasion.', cat:'restriction', sev:3 },
  { y:2025, d:'2025-01-01', t:'Ukraine ends Russian gas transit to Europe', who:'Ukraine ↔ Russia / EU', what:'Kyiv let the transit contract lapse, cutting the last major pipeline route into the EU; only residual TurkStream flows remain.', imp:'All but ended a half-century of Russian pipeline gas to Europe.', cat:'escalation', sev:4 },
  { y:2025, d:'2025-02-24', t:'US breaks with allies; sides with Russia at the UN', who:'US (Trump administration)', what:'On the third anniversary the US voted with Russia against a UN resolution condemning the invasion, while keeping its sanctions in force.', imp:'Opened a transatlantic rift — a transactional US track beside a maximal-pressure EU/UK one.', cat:'diplomatic', sev:4 },
  { y:2025, d:'2025-07-18', t:'EU 18th package: oil cap cut to $47.60; Nord Stream banned', who:'EU ↔ Russia', what:'Replaced the static $60 cap with an adaptive one ~15% below market, banned Nord Stream transactions, and hit two Chinese banks.', imp:'A major escalation — and the first sanctions on Chinese financial institutions.', cat:'escalation', sev:4 },
  { y:2025, d:'2025-10-22', t:'US sanctions Rosneft & Lukoil', who:'US Treasury ↔ Russia', what:'Full blocking sanctions on Russia’s two oil giants — together ~55% of output — after a planned Trump–Putin summit collapsed.', imp:'The Trump administration’s first major Russia designations — a reversal after months of restraint.', cat:'escalation', sev:4 },
  { y:2025, d:'2025-10-23', t:'EU 19th package bans Russian LNG', who:'EU ↔ Russia', what:'The first outright EU ban on Russian LNG imports (phased to 2026–27), plus more banks and the shadow fleet.', imp:'A structural energy-decoupling step.', cat:'escalation', sev:4 },
  { y:2025, d:'2025-12-19', t:'EU rejects €140bn asset-backed loan; €90bn aid instead', who:'EU (Belgium objecting)', what:'Leaders balked at converting frozen-asset principal into a "reparations loan" and chose ~€90bn of market-borrowed support.', imp:'A pivotal retreat — the confiscation debate stays unresolved into 2026.', cat:'diplomatic', sev:3 },
  { y:2026, d:'2026-02', t:'US–Russia–Ukraine peace talks stall', who:'US, Russia & Ukraine', what:'Trilateral talks produced no breakthrough: Ukraine wants a front-line freeze, Russia demands Donbas and sanctions relief.', imp:'The stalled backdrop against which sanctions neither eased nor produced peace.', cat:'diplomatic', sev:3 },
  { y:2026, d:'2026-04-23', t:'EU 20th package; Hungary & Slovakia drop their veto', who:'EU ↔ Russia', what:'The biggest listing wave in two years — energy, the shadow fleet, crypto and a first ban on cybersecurity services to Russia.', imp:'After Orbán’s election defeat, the EU’s two hold-outs stopped blocking, freeing the €90bn for Ukraine.', cat:'restriction', sev:3 },
  { y:2026, d:'2026-04 / 05', t:'Easter & Victory Day truces — but no ceasefire', who:'Russia & Ukraine', what:'Two short humanitarian truces came and went; both sides alleged violations and fighting resumed.', imp:'Underlined that no comprehensive ceasefire had been reached and sanctions stayed in force.', cat:'diplomatic', sev:2 },
  { y:2026, d:'2026-06', t:'EU 21st package (banks & crypto); ~$285bn still frozen', who:'EU ↔ Russia & enablers', what:'A near-comprehensive assault on Russian banking and crypto-evasion, with trade controls on firms in China, Türkiye, the UAE and India.', imp:'The most recent package — Russia remains the most-sanctioned country on Earth, its reserves still immobilised.', cat:'escalation', sev:4 },
];

/* --------------------------------------------------------- impact stats --- */
const STATS = [
  { big:'26,600+', label:'Sanctions on Russia', ctx:'The most-sanctioned country on Earth — more than Iran, Venezuela, Cuba and Myanmar combined (Castellum.AI).' },
  { big:'~$300bn', label:'Reserves frozen abroad', ctx:'Russian central-bank assets immobilised since 2022 — ≈€210bn of it in the EU, mostly at Belgium’s Euroclear.' },
  { big:'21', label:'EU sanctions packages', ctx:'From the first days of the war to the 20th (April 2026) and a 21st launching in June 2026.' },
  { big:'~45', label:'Countries sanctioning Russia', ctx:'The EU-27 plus the US, UK, Canada, Australia, Japan, South Korea, Switzerland and more.' },
  { big:'141', label:'States condemned the invasion', ctx:'UN General Assembly resolution ES-11/1 (March 2022). Only five sided with Russia.' },
  { big:'$47.60', label:'Oil price cap (per barrel)', ctx:'The G7/EU crude cap, cut from $60 in 2025 to a dynamic level ~15% below the market price.' },
  { big:'1,000+', label:'"Shadow fleet" tankers', ctx:'Ageing, opaquely-owned ships carrying ~75% of Russia’s oil to dodge the price cap.' },
  { big:'~80%', label:'Russian crude to China & India', ctx:'The two now buy the bulk of Russia’s oil exports; over 95% of Russia–China trade is settled in yuan and rubles.' },
  { big:'+4% → +0.4%', label:'GDP: boom to stall', ctx:'A milder-than-feared 2.1% drop in 2022, military-Keynesian growth of ~4% in 2023–24, now stalling toward 0.4% in 2026.' },
  { big:'21% → 14.5%', label:'Central-bank key rate', ctx:'Hiked to a punishing 21% to fight wartime inflation, since eased as the economy slows.' },
  { big:'~6.3%', label:'of GDP spent on defence', ctx:'About 38–40% of all federal spending — the most militarised budget since the Soviet era.' },
  { big:'1,000+', label:'Foreign firms that left', ctx:'Companies that exited or curtailed Russia since 2022, triggering tens of billions in write-downs (Yale CELI).' },
  { big:'~45% → ~0', label:'Russia’s share of EU gas', ctx:'Pipeline gas fell from ~40–45% of EU supply toward zero after Ukraine cut transit in January 2025.' },
  { big:'~0.65–1M', label:'Russians who fled', ctx:'The wartime brain drain since 2022 — hitting tech and science hardest; only a fraction have returned.' },
];

/* ----------------------------------------------------------------- notes -- */
const NOTES = [
  { title:'Energy', body:'Russia’s gas grip on Europe has effectively ended: Ukraine halted transit on 1 January 2025 and the EU’s 19th package bans Russian LNG from 2026. The crude price cap was cut from $60 to $47.60, while the sabotaged Nord Stream pipelines lie dead on the Baltic floor.' },
  { title:'Frozen assets', body:'Roughly €210bn of Russian reserves sit frozen at Euroclear, their profits already funding Ukraine and backing the G7’s $50bn loan. But the EU stopped short of confiscation — in December 2025 it chose €90bn of market borrowing after Belgium balked at the legal risk.' },
  { title:'The Russian economy', body:'A milder-than-predicted 2.1% contraction in 2022 gave way to a military-Keynesian surge of ~4% in 2023–24 — but the bill is now due. Growth is forecast at just 0.4% for 2026, oil-and-gas revenue is falling, and the deficit is widening.' },
  { title:'The pivot east', body:'Russia has reoriented hard toward Asia: China and India now take ~80% of its crude and over 95% of Russia–China trade is settled in yuan and rubles. But the pivot has limits — bilateral trade dipped in 2025 and US sanctions on Rosneft and Lukoil have made Indian refiners cautious.' },
  { title:'Did sanctions work?', body:'The consensus is "weakened, not broken." Studies estimate Russian GDP runs ~10–12% below its pre-invasion trend and export controls force Moscow to pay steep mark-ups for key inputs — yet the economy has avoided collapse by rerouting oil through the shadow fleet.' },
  { title:'Global spillovers', body:'The shock hit the whole world: European governments spent ~€650–800bn shielding households from an energy crisis, and Russia’s 2023 exit from the Black Sea grain deal spiked wheat and cooking-oil prices across import-dependent nations.' },
];

const SOP = 'More than four years on, sanctions have squeezed but not broken Russia. The West has piled on 26,600+ designations — the EU alone reached its 20th package in April 2026 — and Russia’s energy lifeline is fraying: pipeline gas to Europe is near zero, the oil price cap is down to $47.60, and an EU ban on Russian LNG is phasing in. The wartime boom of ~4% growth has given way to stagnation, with 2026 growth forecast near zero. Yet Moscow keeps fighting through a 1,000-strong shadow fleet, ~80% of its crude sold to China and India, and trade settled in yuan. Politically the picture is fluid: the Trump administration treats sanctions as leverage in stalled peace talks, no ceasefire has held, and ~€210bn of frozen reserves remain a live bargaining chip.';

/* ============================================================ countries === */
/* cohort cw: self | west | westNN | neutral | satellite | ussr | sovally | na
   modifiers: ny(alignment/NATO year) · born · balt · p91(post-1991, ussr)
              post(post-1991, sovally) · s14(2014 stance) · now(2022+ stance)
   seg: explicit override (great powers).                                     */
const SPEC = {
  /* —— Russia —— */
  RUS:{ cw:'self', now:'self', blurb:'The subject of the map. Russia (and, before 1991, the USSR) — now the most-sanctioned country on Earth.' },

  /* —— great powers: explicit arcs —— */
  USA:{ now:'r', seg:[[1900,'y'],[1911,'r'],[1933,'y'],[1941,'g'],[1947,'r'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'Architect of the modern sanctions regime — full export controls and financial measures, though its rhetoric softened under the Trump administration.' },
  GBR:{ now:'r', seg:[[1900,'y'],[1907,'g'],[1918,'r'],[1924,'y'],[1941,'g'],[1947,'r'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'Among the most hawkish sanctioners and a leading arms supplier to Ukraine; sanctioned the entire GRU after the Skripal inquiry.' },
  FRA:{ now:'r', seg:[[1900,'g'],[1918,'r'],[1924,'y'],[1941,'g'],[1947,'r'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'Allied with Tsarist Russia before 1917; today bound by all EU sanctions and a major backer of Ukraine.' },
  DEU:{ now:'r', seg:[[1900,'y'],[1914,'r'],[1922,'g'],[1933,'r'],[1939,'g'],[1941,'r'],[1955,'r'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'From the Rapallo treaty and the Nazi–Soviet pact to today: the EU’s economic anchor and Ukraine’s #2 arms supplier, despite deep past energy ties.' },
  ITA:{ now:'r', seg:[[1900,'y'],[1924,'y'],[1941,'r'],[1944,'y'],[1949,'r'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'A NATO founder; bound by all EU sanctions packages.' },
  JPN:{ now:'r', seg:[[1900,'r'],[1905,'r'],[1925,'y'],[1945,'r'],[1956,'y'],[1991,'y'],[2022,'r']],
        blurb:'Asia’s only G7 sanctioner — asset freezes and export bans. The two countries never signed a WWII peace treaty over the Kuril Islands.' },
  CHN:{ now:'g', seg:[[1900,'y'],[1949,'g'],[1960,'r'],[1969,'r'],[1989,'y'],[2001,'g'],[2022,'g']],
        blurb:'A "no-limits" partner and Russia’s top economic lifeline — yet enemies during the 1960–89 Sino-Soviet split. Abstains at the UN but firmly pro-Moscow.' },
  FIN:{ now:'r', seg:[[1900,'self'],[1917,'y'],[1939,'r'],[1944,'y'],[1948,'y'],[1991,'y'],[2022,'r']],
        blurb:'A Grand Duchy of the Empire until 1917, then a neutral neighbour through "Finlandization" — it joined NATO and the sanctions in 2023 over the war.' },
  POL:{ now:'r', seg:[[1900,'self'],[1918,'y'],[1939,'r'],[1945,'g'],[1989,'y'],[1991,'g'],[2014,'y'],[2022,'r']],
        blurb:'Partitioned under the Empire, a Warsaw Pact member after 1945, now a frontline hub for Ukraine aid and one of the most hawkish EU states.' },
  IRN:{ now:'g', seg:[[1900,'y'],[1955,'r'],[1979,'y'],[2015,'g'],[2022,'g']],
        blurb:'A pro-Western CENTO member under the Shah; since 2022 a close military partner supplying drones and missiles to Russia.' },
  UKR:{ cw:'ussr', p91:'y', s14:'r', now:'r', blurb:'The invaded country — at war with Russia and imposing maximal sanctions. Part of the Russian Empire and the USSR until 1991.' },

  /* —— Western Europe / NATO (founders 1949 unless noted) —— */
  BEL:{ cw:'west', now:'r' }, NLD:{ cw:'west', now:'r' }, LUX:{ cw:'west', now:'r' },
  DNK:{ cw:'west', now:'r' }, NOR:{ cw:'west', now:'r' }, ISL:{ cw:'west', now:'r' }, PRT:{ cw:'west', now:'r' },
  CAN:{ cw:'west', now:'r' }, GRC:{ cw:'west', ny:1952, now:'r' }, ESP:{ cw:'west', ny:1982, now:'r' },
  TUR:{ cw:'west', ny:1952, now:'y', blurb:'A NATO member that refuses to sanction Russia — it mediates, trades heavily and supplies drones to Ukraine. The classic balancer.' },

  /* —— European neutrals —— */
  SWE:{ cw:'neutral', now:'r', blurb:'Neutral throughout the Cold War; adopted EU sanctions and joined NATO in 2024 over the war.' },
  CHE:{ cw:'neutral', now:'r', blurb:'Set aside its famed neutrality to adopt the EU sanctions packages in full.' },
  AUT:{ cw:'neutral', now:'r' }, IRL:{ cw:'neutral', now:'r' }, LIE:{ cw:'neutral', now:'r' },

  /* —— EU members that were neutral / non-aligned —— */
  MLT:{ cw:'neutral', born:1964, now:'r' }, CYP:{ cw:'na', born:1960, now:'r', blurb:'EU member bound by all sanctions, despite long-standing Russian financial ties.' },

  /* —— microstates aligning with the EU —— */
  MCO:{ cw:'neutral', now:'r' }, AND:{ cw:'na', born:1993, now:'r' }, SMR:{ cw:'neutral', now:'r' },

  /* —— Warsaw Pact / Soviet-bloc Europe —— */
  CZE:{ cw:'satellite', now:'r', blurb:'A Warsaw Pact member until 1989; now an EU sanctioner that led the international drive to buy ammunition for Ukraine.' },
  SVK:{ cw:'satellite', now:'r', blurb:'EU-bound and red, but reluctant — PM Fico’s pro-Kremlin rhetoric eased only when the sanctions veto was dropped in 2026.' },
  HUN:{ cw:'satellite', now:'r', blurb:'EU-bound but the most Russia-friendly member — it blocked packages for years, then dropped its veto in 2026 after Orbán’s election defeat.' },
  ROU:{ cw:'satellite', now:'r' }, BGR:{ cw:'satellite', now:'r' },
  ALB:{ now:'r', seg:[[1912,'y'],[1945,'g'],[1961,'y'],[1991,'y'],[2009,'y'],[2022,'r']],
       blurb:'A Warsaw Pact founder that broke with Moscow in 1961; a NATO member since 2009 that now aligns with EU sanctions.' },

  /* —— former Yugoslavia (non-aligned, then split) —— */
  SVN:{ cw:'na', born:1991, now:'r' }, HRV:{ cw:'na', born:1991, now:'r' },
  BIH:{ cw:'na', born:1992, now:'r', blurb:'An EU candidate aligned with the sanctions packages — though its Republika Srpska entity dissents.' },
  MKD:{ cw:'na', born:1991, now:'r' }, MNE:{ cw:'na', born:2006, now:'r' },
  XKX:{ cw:'na', born:2008, now:'r', blurb:'Aligns itself with EU sanctions; not a UN member and only partially recognised.' },
  SRB:{ cw:'na', now:'y', blurb:'An EU candidate that pointedly refuses to sanction Russia, citing neutrality and deep cultural ties — even as it condemned the invasion.' },

  /* —— USSR successor states —— */
  EST:{ cw:'ussr', balt:1, p91:'y', now:'r', blurb:'Independent between the wars, annexed in 1940, free again in 1991 — now a hawkish, frontline EU/NATO state.' },
  LVA:{ cw:'ussr', balt:1, p91:'y', now:'r' }, LTU:{ cw:'ussr', balt:1, p91:'y', now:'r' },
  BLR:{ cw:'ussr', p91:'g', now:'g', blurb:'Russia’s closest ally and a co-belligerent — it hosts Russian troops and nuclear weapons and voted with Russia at the UN.' },
  MDA:{ cw:'ussr', p91:'y', now:'r', blurb:'A pro-EU candidate that has aligned with sanctions, though its energy dependence and the Transnistria enclave leave it exposed.' },
  GEO:{ cw:'ussr', p91:'y', now:'y', blurb:'Its governing party is drifting back toward Moscow and refuses sanctions, even as the population leans firmly pro-Western.' },
  ARM:{ cw:'ussr', p91:'g', now:'y', blurb:'A CSTO member whose membership is frozen as it drifts West toward the EU and US — distancing itself from Russia.' },
  AZE:{ cw:'ussr', p91:'y', now:'y' },
  KAZ:{ cw:'ussr', p91:'g', now:'y', blurb:'An EAEU/CSTO member that is pointedly cautious — it won’t recognise the annexations and watches for sanctions-evasion via its territory.' },
  KGZ:{ cw:'ussr', p91:'g', now:'y' }, TJK:{ cw:'ussr', p91:'g', now:'y' },
  TKM:{ cw:'ussr', p91:'y', now:'y', blurb:'Constitutionally neutral — it stays carefully out of the dispute.' },
  UZB:{ cw:'ussr', p91:'y', now:'y' },

  /* —— Cold-War Soviet allies (sovally) —— */
  CUB:{ cw:'sovally', ny:1960, post:'g', now:'g', blurb:'A Cold-War ally that remains close to Moscow, relying on Russian energy and military support.' },
  MNG:{ cw:'sovally', ny:1924, post:'y', now:'y', blurb:'A former Soviet satellite, now a neutral democracy squeezed between Russia and China — it hosted Putin despite an ICC warrant.' },
  VNM:{ cw:'sovally', ny:1950, post:'y', now:'y', blurb:'"Bamboo diplomacy" — deep defence ties to Russia but a careful neutrality; abstains at the UN.' },
  PRK:{ cw:'sovally', ny:1948, post:'g', now:'g', blurb:'Bound by a 2024 mutual-defence treaty — it supplies troops and munitions to Russia’s war and voted with Moscow.' },
  LAO:{ cw:'sovally', ny:1975, post:'y', now:'y' },
  AGO:{ cw:'sovally', ny:1975, post:'y', now:'y' }, MOZ:{ cw:'sovally', ny:1975, post:'y', now:'y' },
  ETH:{ cw:'sovally', ny:1974, post:'y', now:'y', blurb:'Marxist and Soviet-backed under the Derg; now neutral but deepening ties with Moscow again.' },
  COG:{ cw:'sovally', ny:1969, post:'y', now:'y' }, BEN:{ cw:'sovally', ny:1975, post:'y', now:'y' },
  SOM:{ cw:'sovally', ny:1969, post:'y', now:'y' },
  SYR:{ cw:'sovally', ny:1971, post:'g', now:'g', blurb:'Moscow’s key Arab partner. After Assad’s fall in 2024 the new government is rebalancing but mending ties — and Russia keeps its Tartus and Hmeimim bases.' },
  IRQ:{ cw:'sovally', ny:1972, post:'y', now:'y', blurb:'A Soviet arms client during the Cold War; today a neutral OPEC+ producer.' },
  LBY:{ cw:'sovally', ny:1974, post:'y', now:'y', blurb:'A fractured state — its eastern faction hosts Russian forces while no unified government takes a side.' },
  NIC:{ cw:'sovally', ny:1979, post:'y', now:'g', blurb:'The Sandinista government recognises Russia’s annexations and voted with Moscow at the UN.' },

  /* —— non-NATO Western allies —— */
  AUS:{ cw:'westNN', ny:1951, now:'r' }, NZL:{ cw:'westNN', ny:1951, now:'r' },
  KOR:{ cw:'westNN', ny:1953, now:'r', blurb:'Imposed export controls and financial sanctions — a notable Asian member of the coalition.' },
  TWN:{ cw:'westNN', ny:1954, now:'r', blurb:'Joined the coalition with chip export controls and financial sanctions; not a UN member.' },
  JPN_:{},  /* JPN handled above */
  ISR:{ cw:'westNN', ny:1967, now:'y', blurb:'Refuses lethal aid and sanctions and even voted against a UN condemnation — it balances over Russian-controlled Syrian airspace.' },
  PHL:{ cw:'westNN', ny:1951, now:'y', blurb:'US-leaning and it condemned the invasion, but has imposed no sanctions.' },
  THA:{ cw:'westNN', ny:1954, now:'y', blurb:'A US treaty ally during the Cold War; today measured and neutral, with growing Russia trade.' },
  PAK:{ cw:'westNN', ny:1955, now:'y', blurb:'A CENTO/SEATO ally of the West in the Cold War; now neutral, eyeing discounted Russian oil.' },

  /* —— the only ASEAN sanctioner —— */
  SGP:{ cw:'na', born:1965, now:'r', blurb:'The only South-East Asian country to sanction Russia — banking and export bans on the back of a rules-based-order stance.' },

  /* —— Russia-aligned today (green) —— */
  VEN:{ cw:'na', now:'g', blurb:'A strategic partner of Moscow — OPEC+ coordination, arms purchases and recognition of the annexations.' },
  ERI:{ cw:'na', now:'g', blurb:'Russia’s most consistent African backer at the UN.' },
  MLI:{ cw:'na', s14:'y', now:'g', blurb:'A junta in Russia’s Sahel orbit, with Africa Corps (ex-Wagner) forces deployed; voted with Moscow.' },
  BFA:{ cw:'na', s14:'y', now:'g', blurb:'A junta in the Russian-backed Sahel alliance, with an Africa Corps presence.' },
  NER:{ cw:'na', s14:'y', now:'g', blurb:'Its 2023 junta expelled Western forces and invited in Russian troops.' },
  CAF:{ cw:'na', s14:'g', now:'g', blurb:'A government propped up by Wagner / Africa Corps since 2018 — one of Russia’s deepest African footholds.' },

  /* —— green-leaning yellows kept neutral —— */
  MMR:{ cw:'na', now:'y', blurb:'The junta has a military pact with Russia — but the relationship is arms-led, so it stays neutral on the map.' },
  SDN:{ cw:'na', now:'y', blurb:'Neutral at the UN, but Russia is pursuing a Red Sea naval base — a green-leaning balancer.' },
  AFG:{ now:'y', seg:[[1919,'y'],[1978,'g'],[1989,'y'],[2022,'y']], blurb:'Soviet-aligned and then occupied in the 1980s; today the Taliban government is cautiously engaging Moscow, which recognised it in 2025.' },

  /* —— big neutral powers (hard cases) —— */
  IND:{ cw:'na', now:'y', blurb:'A massive buyer of Russian oil and arms that stays strictly neutral and abstains at the UN — neutral-friendly, not aligned.' },
  ZAF:{ cw:'na', now:'y', blurb:'A BRICS partner that has held joint naval drills with Russia and abstains at the UN — neutral but Russia-friendly.' },
  BRA:{ cw:'na', now:'y', blurb:'Neutral and a BRICS partner — it refuses sanctions and pushes mediation.' },
  EGY:{ cw:'na', now:'y', blurb:'Balances Russian grain and arms against Western aid; a new BRICS member.' },
  DZA:{ cw:'na', now:'y', blurb:'A top buyer of Russian arms; neutral-friendly and abstains at the UN.' },
  SAU:{ cw:'na', now:'y', blurb:'Coordinates oil output with Russia in OPEC+ and hosts peace talks, while keeping strong US ties — a balancer.' },
  ARE:{ cw:'na', now:'y', blurb:'A trade-and-finance hub flagged for sanctions-evasion risk, balancing OPEC+ ties with deep Western links.' },
  QAT:{ cw:'na', now:'y', blurb:'A neutral energy power that hosts diplomacy and a major US base.' },
  IDN:{ cw:'na', now:'y', blurb:'Neutral — surging trade with Russia and a host of shuttle diplomacy.' },
};

/* sovereigns that are simply "neutral middle" — default yellow, no special arc */
const PLAIN_YELLOW = ['ATG','ARG','BRB','BLZ','BOL','CHL','COL','CRI','DMA','DOM','ECU','SLV','GRD','GTM','GUY','HTI','HND','JAM','MEX','PAN','PRY','PER','KNA','LCA','VCT','SUR','TTO','URY',
  'BHR','DJI','JOR','KWT','LBN','MAR','OMN','TUN','YEM','PSE',
  'BGD','BTN','LKA','MDV','NPL',
  'BWA','BDI','CPV','CMR','TCD','COM','COD','CIV','GNQ','SWZ','GAB','GMB','GHA','GIN','GNB','KEN','LSO','LBR','MDG','MWI','MRT','MUS','NAM','NGA','RWA','STP','SEN','SYC','SLE','SSD','TZA','TGO','UGA','ZMB','ZWE',
  'BRN','FJI','KIR','MYS','MHL','FSM','NRU','PLW','PNG','WSM','SLB','TLS','TON','TUV','VUT','KHM'];

/* states that sanctioned (red) but need no special arc */
const PLAIN_RED = ['BHS'];

/* non-sovereign territories inherit the controlling power's timeline */
const TERR = {
  GRL:'DNK', FRO:'DNK', CHI:'GBR', IMN:'GBR', GIB:'GBR', BMU:'GBR', VGB:'GBR', CYM:'GBR', TCA:'GBR',
  PRI:'USA', GUM:'USA', ASM:'USA', VIR:'USA', MNP:'USA',
  HKG:'CHN', MAC:'CHN', PYF:'FRA', NCL:'FRA', MAF:'FRA', ABW:'NLD', CUW:'NLD', SXM:'NLD',
};

/* ----------------------------------------------------------- generator ---- */
const dedupe = seg => seg.filter((s, i) => i === 0 || s[1] !== seg[i - 1][1]);
function genSeg(sp) {
  if (sp.seg) return dedupe(sp.seg);
  const now = sp.now || 'y';
  const s14 = sp.s14 || (now === 'r' ? 'y' : now);
  const cw = sp.cw || 'na';
  const born = sp.born || 1900;
  const seg = [];
  const add = (y, c) => { if (c == null || y == null) return; if (seg.length && seg[seg.length - 1][0] > y) return; if (!seg.length || seg[seg.length - 1][1] !== c) seg.push([y, c]); };
  switch (cw) {
    case 'self': return [[1900, 'self']];
    case 'west':     add(born, 'y'); add(sp.ny || 1949, 'r'); add(1991, 'g'); break;
    case 'westNN':   add(born, 'y'); add(sp.ny || 1949, 'r'); add(1991, 'g'); break;
    case 'neutral':  add(born, 'y'); break;
    case 'satellite':add(born, 'y'); add(1945, 'g'); add(1989, 'y'); add(1991, 'g'); break;
    case 'ussr':
      if (sp.balt) { add(1900, 'self'); add(1918, 'y'); add(1940, 'self'); add(1991, sp.p91 || 'y'); }
      else { add(1900, 'self'); add(1991, sp.p91 || 'y'); }
      break;
    case 'sovally':  add(born, 'y'); add(sp.ny || 1945, 'g'); add(1991, sp.post || 'y'); break;
    case 'na': default: add(born, 'y'); break;
  }
  add(2014, s14); add(2022, now);
  return seg;
}

const DEFAULT_BLURB = {
  r: 'Aligned with the Western coalition sanctioning Russia.',
  y: 'Neutral — has imposed no sanctions on Russia and keeps normal relations and trade.',
  g: 'Maintains friendly, open relations with Russia; no sanctions.',
  self: 'Russia — the subject of the map.',
};

/* assemble the full spec table */
const fullSpec = { ...SPEC };
delete fullSpec.JPN_;
PLAIN_YELLOW.forEach(iso => { if (!fullSpec[iso]) fullSpec[iso] = { cw:'na', now:'y' }; });
PLAIN_RED.forEach(iso => { if (!fullSpec[iso]) fullSpec[iso] = { cw:'na', now:'r' }; });

/* build sovereign countries */
const out = [];
const segByIso = {};
for (const iso of Object.keys(fullSpec)) {
  const b = baseByIso[iso];
  if (!b) { console.warn('no base for', iso); continue; }
  const sp = fullSpec[iso];
  const seg = genSeg(sp);
  segByIso[iso] = seg;
  out.push({ iso, name: b.name, region: b.region, lat: b.lat, lon: b.lon,
    now: sp.now || 'y', seg, blurb: sp.blurb || DEFAULT_BLURB[sp.now || 'y'] });
}

/* territories inherit their controlling power */
const parentName = { DNK:'Denmark', GBR:'the United Kingdom', USA:'the United States', CHN:'China', FRA:'France', NLD:'the Netherlands' };
for (const [iso, parent] of Object.entries(TERR)) {
  const b = baseByIso[iso]; if (!b) { console.warn('no base for terr', iso); continue; }
  const pseg = segByIso[parent] || genSeg(fullSpec[parent]);
  const pnow = (fullSpec[parent] || {}).now || 'y';
  out.push({ iso, name: b.name, region: b.region, lat: b.lat, lon: b.lon,
    now: pnow, seg: pseg, terr: 1,
    blurb: `A territory of ${parentName[parent] || parent} — it follows ${parentName[parent] || parent}'s stance toward Russia.` });
}

/* sort: Russia first, then by name */
out.sort((a, b) => (a.iso === 'RUS' ? -1 : b.iso === 'RUS' ? 1 : a.name.localeCompare(b.name)));

/* coverage check */
const covered = new Set(out.map(c => c.iso));
const missing = BASE.filter(c => !covered.has(c.iso)).map(c => `${c.iso} ${c.name}`);

/* ------------------------------------------------------------------ emit -- */
const J = o => JSON.stringify(o);
let js = '';
js += '/* Russian Sanctions Map — data. Generated by build_sanctions.mjs. Do not edit by hand.\n';
js += `   ${out.length} countries · ${EVENTS.length} milestones · ${START}–${END} · snapshot ${AS_OF}.\n`;
js += '   status codes: g green (open) · y yellow (partial/neutral) · r red (sanctioning) · self Russia/USSR. */\n';
js += `window.RSM = {\n`;
js += `  start:${START}, end:${END}, asOf:${J(AS_OF)},\n`;
js += `  eras:${J(ERAS)},\n`;
js += `  events:[\n`;
EVENTS.sort((a, b) => a.y - b.y).forEach(e => { js += '    ' + J(e) + ',\n'; });
js += `  ],\n`;
js += `  stats:${J(STATS)},\n`;
js += `  notes:${J(NOTES)},\n`;
js += `  sop:${J(SOP)},\n`;
js += `  countries:[\n`;
out.forEach(c => { js += '    ' + J(c) + ',\n'; });
js += `  ]\n};\n`;

writeFileSync(join(__dir, 'data', 'sanctions.js'), js, 'utf8');

/* summary */
const tally = { r:0, y:0, g:0, self:0 };
out.forEach(c => { tally[c.now] = (tally[c.now] || 0) + 1; });
console.log(`\nEMITTED ${out.length} countries, ${EVENTS.length} events → data/sanctions.js`);
console.log(`current stance: ${tally.r} red · ${tally.y} yellow · ${tally.g} green · ${tally.self} self`);
console.log(`eras: ${ERAS.length} · stats: ${STATS.length} · notes: ${NOTES.length}`);
if (missing.length) console.log(`\n${missing.length} roster entries not classified:\n  ` + missing.join('\n  '));
