/* Quantum vs Bitcoin (fact-checked to 1 Jul 2026).
   All qubit figures are theoretical resource estimates, not demonstrated attacks. */
window.QDATA = window.QDATA || {};
window.QDATA.btc = {

  threat:{
    logical:"1,200 – 2,500",
    physicalNow:"< 500,000",
    physicalNowYear:"2026 estimate · Google Quantum AI / Gidney",
    physicalThen:"~317 million",
    physicalThenYear:"2022 estimate · Webber et al.",
    largestToday:"~1,200",
    note:"The bar to clear has fallen roughly 600× in four years as the algorithms improved — yet today's largest usable machines are still hundreds of times too small. Both lines are moving."
  },

  /* The crossover chart: rising capability vs the falling threshold to break a key.
     value = physical qubits (log scale). dashFrom = first projected year. */
  crossover:{
    crossoverYear:2030,
    zone:[2029,2035],
    series:[
      { name:"Quantum capability", sub:"largest usable machine", color:"#36e6ff", dashFrom:2026, points:[
        {year:2019,value:53},{year:2021,value:127},{year:2022,value:433},
        {year:2023,value:1121},{year:2024,value:1180},{year:2026,value:1200},
        {year:2027,value:6000},{year:2029,value:100000},{year:2030,value:1000000},{year:2033,value:10000000} ] },
      { name:"Threshold to break a Bitcoin key", sub:"physical qubits needed (secp256k1)", color:"#ff5d6c", dashFrom:2026, points:[
        {year:2022,value:317000000},{year:2023,value:9000000},{year:2026,value:500000},
        {year:2030,value:400000},{year:2035,value:300000} ] }
    ]
  },

  exposure:{
    supply:"~19.9M BTC in existence",
    headline:"≈ 6.9M BTC — about a third of all bitcoin — sits behind public keys a quantum computer could attack at leisure.",
    rows:[
      { label:"Satoshi-era P2PK", sub:"public key permanently visible on-chain (incl. ~1.1M Satoshi BTC)", btc:"1.7M", pct:8.5, tone:"bad" },
      { label:"Reused / exposed keys", sub:"address whose key was revealed by a past spend", btc:"5.2M", pct:26, tone:"bad" },
      { label:"Hidden until spent", sub:"modern addresses — key only briefly exposed when you transact", btc:"~13M", pct:65, tone:"ok" }
    ]
  },

  defense:[
    { n:"1", title:"Adopt post-quantum signatures", status:"Merged to BIP repo Feb 2026 · not activated",
      mechanism:"A soft fork (BIP-360 / P2QRH) adds opt-in 'bc1z' addresses signed with Dilithium or SPHINCS+.",
      note:"Gives new and migrated coins quantum-safe signatures — the foundation everything else needs." },
    { n:"2", title:"Move coins to safety in time", status:"Voluntary migration race",
      mechanism:"Holders must spend from exposed addresses into new quantum-safe ones before Q-Day.",
      note:"Hundreds of billions of dollars would have to move while the window is still open." },
    { n:"3", title:"Decide the fate of lost coins", status:"Highly contested",
      mechanism:"Proposals like QRAMP would freeze un-migrated coins after a deadline.",
      note:"Satoshi's ~1.1M BTC and other lost coins can never move — a permanent honeypot unless the network freezes them." }
  ],

  /* Head-to-head race on a shared 2026→2040 axis. */
  race:{
    axis:[2026,2040],
    attack:[
      { year:2026, label:"~1,200 qubits — hundreds of × too small" },
      { year:2030, label:"Earliest break (optimistic)" },
      { year:2033, label:">50% likely (Project Eleven)" },
      { year:2039, label:"~55% chance (GRI survey)" }
    ],
    defense:[
      { year:2026, label:"BIP-360 merged — not activated" },
      { year:2028, label:"Activation debate · testnet" },
      { year:2032, label:"Migration window must close" }
    ],
    footnote:"Whichever line crosses first decides the outcome. The catch: even a perfect upgrade can't rescue lost-key and Satoshi coins, so a pool of attackable bitcoin will always remain."
  }
};
