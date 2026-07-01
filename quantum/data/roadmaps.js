/* Roadmaps, obstacles and projections (fact-checked to 1 Jul 2026).
   Vendor roadmap dates are targets and historically slip — treat as aspirational. */
window.QDATA = window.QDATA || {};

/* points value = logical (error-corrected) qubits. projectedFrom = first target year. */
window.QDATA.roadmaps = [
  { vendor:"IBM", color:"#36e6ff", projectedFrom:2026, points:[
    {year:2024,value:1,label:"Heron / first logical demos"},
    {year:2026,value:10,label:"Kookaburra-class · quantum advantage"},
    {year:2029,value:200,label:"Starling — fault-tolerant (~10k physical, 100M gates)"},
    {year:2033,value:2000,label:"Blue Jay (~1B gates)"} ] },
  { vendor:"Google", color:"#b46bff", projectedFrom:2026, points:[
    {year:2024,value:1,label:"Willow — below threshold"},
    {year:2027,value:10,label:"Long-lived logical qubit"},
    {year:2029,value:1000,label:"~1,000 logical / ~1M physical"} ] },
  { vendor:"Quantinuum", color:"#51e6a0", projectedFrom:2026, points:[
    {year:2025,value:48,label:"Helios (98 physical)"},
    {year:2027,value:100,label:"Sol (192 physical)"},
    {year:2029,value:300,label:"Apollo — fully fault-tolerant"} ] },
  { vendor:"IonQ", color:"#ffc24d", projectedFrom:2026, points:[
    {year:2025,value:2,label:"#AQ 64 / early logical"},
    {year:2027,value:800,label:"~10k physical / 800 logical"},
    {year:2030,value:80000,label:"~2M physical / 80k logical (aggressive)"} ] },
  { vendor:"Pasqal", color:"#ff5fcf", projectedFrom:2026, points:[
    {year:2025,value:2,label:"2 logical"},
    {year:2027,value:20,label:"20 logical"},
    {year:2029,value:100,label:"100 logical"},
    {year:2030,value:200,label:"200 logical"} ] }
];

window.QDATA.obstacles = [
  { name:"Decoherence", icon:"⏳", severity:"high",
    desc:"Qubits forget their state in microseconds-to-seconds as the environment leaks in. Every computation is a race against the clock (the T₁/T₂ times)." },
  { name:"Gate errors", icon:"🎯", severity:"high",
    desc:"The best two-qubit gates still fail roughly 1 time in 100–1,000. Useful algorithms need billions of operations, so error rates must fall much further." },
  { name:"Error-correction overhead", icon:"🧮", severity:"high",
    desc:"For surface codes it can take ~100–1,000 physical qubits to make ONE reliable logical qubit. A cryptographically-useful machine may need a million or more physical qubits." },
  { name:"Scaling the wiring", icon:"🔌", severity:"medium",
    desc:"Each qubit needs control and readout lines. Cramming thousands of cables into a cold fridge — the 'wiring bottleneck' — likely needs control electronics moved on-chip." },
  { name:"Cryogenics", icon:"❄️", severity:"medium",
    desc:"Superconducting and spin qubits live near absolute zero (~15 mK). Bigger machines need vastly more cooling power than today's dilution fridges deliver." },
  { name:"Connectivity", icon:"🕸️", severity:"medium",
    desc:"Many chips only let neighbouring qubits talk. Algorithms then waste operations shuffling information across the chip (ion traps avoid this with all-to-all links)." },
  { name:"Manufacturing yield", icon:"🏭", severity:"medium",
    desc:"Every qubit must be near-identical. As chips grow, a few bad qubits can spoil the whole device — fabrication has to become reliable at scale." },
  { name:"Software & algorithms", icon:"💻", severity:"low",
    desc:"Beyond Shor and Grover, the list of problems with a proven quantum speedup is still short. We need more 'killer apps' to justify the machines." }
];

/* When could a quantum computer break today's public-key crypto (RSA-2048 / ECC)?
   Pooled expert estimates — Global Risk Institute Quantum Threat Timeline survey (2025). */
window.QDATA.crqc = {
  note:"Aggregated expert opinion (Global Risk Institute, 2025 survey). These are subjective probabilities, not a deadline — and experts disagree widely.",
  bands:[
    { label:"by 2029", year:2029, prob:"~14% chance" },
    { label:"by 2034", year:2034, prob:"~34% chance" },
    { label:"by 2039", year:2039, prob:"~55% — more likely than not" },
    { label:"by 2044", year:2044, prob:"~79% chance" }
  ]
};
