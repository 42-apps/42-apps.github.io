// ============================================================================
// Living on the Moon — data: landmarks, building types, mission timeline
// Longitudes are EAST-positive (selenographic), latitudes North-positive.
// ============================================================================

// ---- Points of interest on the Moon -----------------------------------------
// kind: mare | crater | landing | base
export const POI = [
  // --- Maria & big regions ---
  { kind:'mare', name:'Mare Tranquillitatis', lat:8.5,  lon:31.4,  ico:'🌑',
    tag:'Sea of Tranquility', desc:'The basaltic plain where Apollo 11 set down in 1969 — humanity’s first steps on another world.' },
  { kind:'mare', name:'Mare Imbrium', lat:32.8, lon:-15.6, ico:'🌑',
    tag:'Sea of Showers', desc:'One of the largest impact basins in the Solar System, flooded by ancient lava ~3.9 billion years ago.' },
  { kind:'mare', name:'Mare Serenitatis', lat:28, lon:17.5, ico:'🌑',
    tag:'Sea of Serenity', desc:'A circular mare ringed by mountains; Apollo 17 explored its south-eastern edge at Taurus-Littrow.' },
  { kind:'mare', name:'Mare Crisium', lat:17, lon:59.1, ico:'🌑',
    tag:'Sea of Crises', desc:'An isolated, near-circular sea easily seen from Earth near the Moon’s eastern limb.' },
  { kind:'mare', name:'Oceanus Procellarum', lat:18.4, lon:-57.4, ico:'🌑',
    tag:'Ocean of Storms', desc:'The vast “ocean” covering much of the western near side — host to lava tubes eyed as future shelters.' },
  { kind:'mare', name:'Mare Nubium', lat:-21.3, lon:-16.6, ico:'🌑',
    tag:'Sea of Clouds', desc:'A southern near-side mare studded with ghost craters drowned by ancient basalt.' },
  { kind:'mare', name:'Mare Frigoris', lat:56, lon:1.4, ico:'🌑',
    tag:'Sea of Cold', desc:'A long, narrow sea stretching across the far north of the near side.' },

  // --- Major craters ---
  { kind:'crater', name:'Tycho', lat:-43.3, lon:-11.4, ico:'🕳️',
    tag:'Rayed crater', desc:'An 85 km young crater whose bright rays splash a quarter of the way across the Moon — the Moon’s most famous bullseye.' },
  { kind:'crater', name:'Copernicus', lat:9.6, lon:-20.1, ico:'🕳️',
    tag:'Terraced crater', desc:'A 93 km crater with dramatic terraced walls and central peaks, “the Monarch of the Moon”.' },
  { kind:'crater', name:'Kepler', lat:8.1, lon:-38.0, ico:'🕳️',
    tag:'Bright rays', desc:'A small but brilliant rayed crater in the Ocean of Storms.' },
  { kind:'crater', name:'Aristarchus', lat:23.7, lon:-47.4, ico:'🕳️',
    tag:'Brightest spot', desc:'The most reflective large feature on the Moon, near the mysterious Vallis Schröteri rille.' },
  { kind:'crater', name:'Plato', lat:51.6, lon:-9.4, ico:'🕳️',
    tag:'Dark-floored', desc:'A lava-flooded crater with a strikingly smooth, dark floor on the shore of Mare Imbrium.' },
  { kind:'crater', name:'Clavius', lat:-58.4, lon:-14.4, ico:'🕳️',
    tag:'Ancient giant', desc:'A 225 km ancient walled plain in the southern highlands, famous from 2001: A Space Odyssey.' },
  { kind:'crater', name:'Tsiolkovskiy', lat:-20.4, lon:129.1, ico:'🕳️',
    tag:'Far-side jewel', desc:'A dark-floored far-side crater with a bright central peak — invisible from Earth.' },

  // --- Landing sites (crewed) ---
  { kind:'landing', name:'Apollo 11', lat:0.67, lon:23.47, ico:'🇺🇸', year:1969,
    tag:'First crewed landing', desc:'Armstrong & Aldrin: “That’s one small step for man, one giant leap for mankind.”',
    crew:'Armstrong · Aldrin', site:'Mare Tranquillitatis' },
  { kind:'landing', name:'Apollo 12', lat:-3.0, lon:-23.4, ico:'🇺🇸', year:1969,
    tag:'Pinpoint landing', desc:'Touched down beside the Surveyor 3 probe, proving precision landing was possible.',
    crew:'Conrad · Bean', site:'Oceanus Procellarum' },
  { kind:'landing', name:'Apollo 14', lat:-3.6, lon:-17.5, ico:'🇺🇸', year:1971,
    tag:'Fra Mauro', desc:'Alan Shepard hit two golf balls; the crew explored the Fra Mauro highlands.',
    crew:'Shepard · Mitchell', site:'Fra Mauro' },
  { kind:'landing', name:'Apollo 15', lat:26.1, lon:3.6, ico:'🇺🇸', year:1971,
    tag:'First rover', desc:'Debuted the Lunar Roving Vehicle at the foot of the Apennine Mountains and Hadley Rille.',
    crew:'Scott · Irwin', site:'Hadley–Apennine' },
  { kind:'landing', name:'Apollo 16', lat:-8.9, lon:15.5, ico:'🇺🇸', year:1972,
    tag:'Lunar highlands', desc:'First landing in the central highlands at Descartes, sampling ancient crustal rock.',
    crew:'Young · Duke', site:'Descartes' },
  { kind:'landing', name:'Apollo 17', lat:20.2, lon:30.8, ico:'🇺🇸', year:1972,
    tag:'Last crewed landing', desc:'Geologist Harrison Schmitt found orange volcanic glass; the last humans to walk the Moon — so far.',
    crew:'Cernan · Schmitt', site:'Taurus–Littrow' },

  // --- Landing sites (robotic) ---
  { kind:'landing', name:'Luna 9', lat:7.1, lon:-64.4, ico:'🇷🇺', year:1966,
    tag:'First soft landing', desc:'The Soviet Luna 9 returned the first photographs from the surface of the Moon.', site:'Oceanus Procellarum' },
  { kind:'landing', name:'Surveyor 1', lat:-2.5, lon:-43.3, ico:'🇺🇸', year:1966,
    tag:'US soft landing', desc:'NASA’s first soft lander, scouting sites for the coming Apollo missions.', site:'Flamsteed' },
  { kind:'landing', name:'Lunokhod 1', lat:38.2, lon:-35.0, ico:'🇷🇺', year:1970,
    tag:'First rover', desc:'The first wheeled robot to roam another world, driving 10 km across Mare Imbrium.', site:'Mare Imbrium' },
  { kind:'landing', name:'Chang’e 4 · Yutu-2', lat:-45.4, lon:177.6, ico:'🇨🇳', year:2019,
    tag:'First far-side landing', desc:'China’s Chang’e 4 made the first-ever soft landing on the far side of the Moon.', site:'Von Kármán crater' },
  { kind:'landing', name:'Chang’e 5', lat:43.1, lon:-51.8, ico:'🇨🇳', year:2020,
    tag:'Sample return', desc:'Returned the first fresh lunar samples to Earth in 44 years from young volcanic plains.', site:'Mons Rümker' },
  { kind:'landing', name:'Chang’e 6', lat:-41.6, lon:-153.9, ico:'🇨🇳', year:2024,
    tag:'Far-side samples', desc:'The first mission ever to bring samples back from the Moon’s far side.', site:'Apollo basin' },
  { kind:'landing', name:'Chandrayaan-3 · Vikram', lat:-69.4, lon:32.3, ico:'🇮🇳', year:2023,
    tag:'Near the south pole', desc:'India’s soft landing nearest the lunar south pole, at the newly named Shiv Shakti Point.', site:'Near south pole' },
  { kind:'landing', name:'SLIM', lat:-13.3, lon:25.2, ico:'🇯🇵', year:2024,
    tag:'Pinpoint lander', desc:'Japan’s “Moon Sniper” demonstrated landing within 100 m of its target.', site:'Shioli crater' },
  { kind:'landing', name:'IM-1 · Odysseus', lat:-80.1, lon:-1.4, ico:'🛰️', year:2024,
    tag:'First commercial landing', desc:'Intuitive Machines’ Odysseus — the first private spacecraft to land on the Moon.', site:'Malapert A' },

  // --- Future base sites ---
  { kind:'base', name:'Shackleton Crater', lat:-89.9, lon:0, ico:'🏔️',
    tag:'Artemis south pole', desc:'The rim catches near-constant sunlight while the floor hides billions of tonnes of water-ice — the prime real estate for the first Moon base.',
    why:'Eternal light + ice' },
  { kind:'base', name:'Shackleton–de Gerlache Ridge', lat:-89.4, lon:-127, ico:'🌅',
    tag:'Peak of eternal light', desc:'A connecting ridge bathed in sunlight ~90% of the year — ideal for uninterrupted solar power.',
    why:'~90% sunlight' },
  { kind:'base', name:'Malapert Massif', lat:-86, lon:0, ico:'📡',
    tag:'Comms relay', desc:'A tall massif with a near-permanent line of sight to Earth — a natural site for an antenna farm.',
    why:'Earth line-of-sight' },
  { kind:'base', name:'Marius Hills Skylight', lat:14.2, lon:-56.5, ico:'🕳️',
    tag:'Lava-tube shelter', desc:'A collapsed pit opening into a buried lava tube that could shield a colony from radiation and micrometeorites.',
    why:'Natural radiation shield' },
  { kind:'base', name:'Peary Crater', lat:88.6, lon:33, ico:'🌅',
    tag:'North-pole light', desc:'A north-polar crater whose rim also enjoys long stretches of sunlight — a northern counterpart to Shackleton.',
    why:'Polar sunlight' },
  { kind:'base', name:'Daedalus Crater', lat:-5.9, lon:179.4, ico:'🔭',
    tag:'Radio-quiet far side', desc:'Deep on the far side, shielded from Earth’s radio noise — the dream location for a giant radio telescope.',
    why:'Radio silence' },
];

// ---- Building types for Build mode ------------------------------------------
export const BUILDINGS = [
  { id:'dome',   name:'Dome City',  ico:'🏙️', cat:'Habitat',  color:0x7fb4ff,
    pop:500, power:-40, water:-20, food:-15, science:0, build:'A pressurised glass dome housing hundreds of residents.' },
  { id:'hotel',  name:'Moon Hotel', ico:'🏨', cat:'Tourism',  color:0xffd28a,
    pop:120, power:-25, water:-12, food:-10, science:0, build:'Low-gravity suites with an Earthrise view — lunar tourism’s flagship.' },
  { id:'solar',  name:'Solar Farm', ico:'☀️', cat:'Power',    color:0xffe066,
    pop:0, power:60, water:0, food:0, science:0, build:'Acres of panels; best on sunlit polar ridges.' },
  { id:'reactor',name:'Fusion Plant',ico:'⚛️', cat:'Power',    color:0x9ad1ff,
    pop:10, power:120, water:0, food:0, science:5, build:'A compact reactor for round-the-clock power through the 14-day lunar night.' },
  { id:'ice',    name:'Ice Mine',   ico:'❄️', cat:'Water',    color:0xbfe9ff,
    pop:20, power:-30, water:80, food:0, science:0, build:'Extracts water-ice from permanently shadowed craters — only pays off near the poles.' },
  { id:'green',  name:'Greenhouse', ico:'🌱', cat:'Food',     color:0x7fe0a0,
    pop:15, power:-20, water:-25, food:70, science:0, build:'Hydroponic farms feeding the colony under LED suns.' },
  { id:'lab',    name:'Research Lab',ico:'🔬', cat:'Science',  color:0xc79dff,
    pop:40, power:-25, water:-8, food:-6, science:40, build:'Laboratories studying geology, low-gravity biology and the cosmos.' },
  { id:'pad',    name:'Launch Pad', ico:'🚀', cat:'Transport', color:0xff9d6e,
    pop:30, power:-20, water:-5, food:-4, science:5, build:'A spaceport linking the colony to Earth and lunar orbit.' },
];

// ---- Launch mission timeline ------------------------------------------------
// dur = nominal duration in SECONDS of real mission time.
export const PHASES = [
  { id:'liftoff', name:'Liftoff', ico:'🔥', dur:165,
    blurb:'Super Heavy’s 33 Raptor engines light and the stack climbs off the pad.' },
  { id:'staging', name:'Stage separation', ico:'✂️', dur:30,
    blurb:'Booster cuts off and separates; Starship lights its own engines (hot-staging).' },
  { id:'ascent', name:'Ascent to orbit', ico:'🛰️', dur:315,
    blurb:'Starship accelerates to ~7.8 km/s and reaches low-Earth orbit.' },
  { id:'park', name:'Parking orbit', ico:'🌍', dur:2700,
    blurb:'Coasting in LEO, lined up for the trans-lunar injection (and, in reality, refuelling).' },
  { id:'tli', name:'Trans-lunar injection', ico:'💥', dur:360,
    blurb:'A long burn raises the orbit until it stretches all the way to the Moon.' },
  { id:'coast', name:'Coast to the Moon', ico:'🌌', dur:259200, /* ~3 days */
    blurb:'The long cruise across 384,400 km — fast-forward through three days of free-fall.' },
  { id:'loi', name:'Lunar-orbit insertion', ico:'🌙', dur:600,
    blurb:'Braking into orbit around the Moon as gravity takes hold.' },
  { id:'descent', name:'Powered descent', ico:'🛬', dur:720,
    blurb:'The landing burn slows Starship to a gentle touchdown on the surface.' },
  { id:'landed', name:'Touchdown', ico:'🌕', dur:0,
    blurb:'The Eagle has landed — again. Welcome to the Moon.' },
];

// Real reference numbers used for telemetry display.
export const FACTS = {
  moonDistKm: 384400,
  earthRadiusKm: 6371,
  moonRadiusKm: 1737.4,
  leoSpeed: 7.8,      // km/s
  escapeSpeed: 11.2,  // km/s
};
