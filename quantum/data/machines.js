/* Current & landmark quantum computers (fact-checked to 1 Jul 2026).
   modality: superconducting | trapped-ion | neutral-atom | photonic | spin-silicon | annealing | topological
   qubits = physical qubits · logical = error-corrected qubits (null = none/NA)
   fidelity = best reported two-qubit gate fidelity (%) */
window.QDATA = window.QDATA || {};
window.QDATA.machines = [
  { vendor:"Google", name:"Willow", year:2024, modality:"superconducting", qubits:105, logical:1, fidelity:99.7, metric:"First below-threshold error correction", access:"research", notes:"Adding qubits LOWERED the logical error rate (Λ≈2.14). The milestone result; also ran 'Quantum Echoes' verifiable advantage in 2025." },
  { vendor:"IBM", name:"Condor", year:2023, modality:"superconducting", qubits:1121, logical:null, fidelity:null, metric:"Largest single superconducting chip", access:"research", notes:"Proof you can fabricate 1,000+ qubits; quality on par with the 433-qubit Osprey. IBM then pivoted to quality." },
  { vendor:"IBM", name:"Heron r2", year:2024, modality:"superconducting", qubits:156, logical:null, fidelity:99.7, metric:"Workhorse high-fidelity chip", access:"cloud", notes:"Tunable couplers; runs ~5,000-gate circuits. The basis of IBM's near-term cloud systems." },
  { vendor:"IBM", name:"Nighthawk", year:2025, modality:"superconducting", qubits:120, logical:null, fidelity:99.7, metric:"Square lattice, 218 couplers", access:"cloud", notes:"Built for deeper circuits; paired with the 'Loon' qLDPC error-correction test chip." },
  { vendor:"Quantinuum", name:"Helios", year:2025, modality:"trapped-ion", qubits:98, logical:48, fidelity:99.92, metric:"48 logical qubits, all-to-all", access:"cloud", notes:"Among the most capable machines: 98 fully-connected ions, 48 error-corrected logical qubits at ~2:1 overhead." },
  { vendor:"Quantinuum", name:"H2", year:2023, modality:"trapped-ion", qubits:56, logical:12, fidelity:99.87, metric:"Quantum Volume 2²⁵ (~33M)", access:"cloud", notes:"Trapped ions: fewer qubits, but exceptional quality and full connectivity." },
  { vendor:"IonQ", name:"Tempo", year:2025, modality:"trapped-ion", qubits:100, logical:null, fidelity:99.9, metric:"#AQ 64 algorithmic qubits", access:"cloud", notes:"Measures 'algorithmic qubits' rather than raw count; R&D prototypes hit a 99.99% 2-qubit record." },
  { vendor:"IonQ", name:"Forte", year:2023, modality:"trapped-ion", qubits:36, logical:null, fidelity:99.6, metric:"#AQ 36 algorithmic qubits", access:"cloud", notes:"All-to-all connectivity; ~99.6% across all 465 qubit pairs." },
  { vendor:"Atom Computing", name:"Phoenix", year:2023, modality:"neutral-atom", qubits:1180, logical:28, fidelity:99.5, metric:"First >1,000-qubit system", access:"research", notes:"Neutral atoms in optical tweezers; demonstrated 24–28 logical qubits with Microsoft." },
  { vendor:"QuEra", name:"Aquila", year:2022, modality:"neutral-atom", qubits:256, logical:null, fidelity:99.5, metric:"Analog/Rydberg programmable", access:"cloud", notes:"Reconfigurable atom arrays; strong error-correction demos. Much of its use is analog, not gate-model." },
  { vendor:"Pasqal", name:"Orion", year:2024, modality:"neutral-atom", qubits:140, logical:2, fidelity:99.0, metric:"European neutral-atom platform", access:"cloud", notes:"Scaling toward 1,000+ atoms; roadmap to 200 logical qubits by 2030." },
  { vendor:"Rigetti", name:"Ankaa-3", year:2024, modality:"superconducting", qubits:84, logical:null, fidelity:99.5, metric:"99.5% median fSim 2-qubit", access:"cloud", notes:"Square-lattice superconducting design with improved fidelity." },
  { vendor:"D-Wave", name:"Advantage2", year:2025, modality:"annealing", qubits:4400, logical:null, fidelity:null, metric:"~4,400 annealing qubits", access:"cloud", notes:"Quantum annealer for optimisation — NOT a universal gate machine, so this count isn't comparable to the others." },
  { vendor:"Xanadu", name:"Aurora", year:2025, modality:"photonic", qubits:35, logical:12, fidelity:null, metric:"Networked photonic modules", access:"research", notes:"Room-temperature photonic approach aiming at modular, networked scaling." },
  { vendor:"Alice & Bob", name:"Helium 1", year:2026, modality:"superconducting", qubits:18, logical:1, fidelity:null, metric:"One logical 'cat' qubit", access:"cloud", notes:"Bosonic 'cat' qubits that self-correct bit-flips, so fewer qubits are needed per logical qubit." },
  { vendor:"Microsoft", name:"Majorana 1", year:2025, modality:"topological", qubits:8, logical:null, fidelity:null, metric:"Topological 'topoconductor'", access:"research", notes:"Bets on intrinsically stable qubits; the topological-qubit claim is scientifically disputed." },
  { vendor:"Intel", name:"Tunnel Falls", year:2023, modality:"spin-silicon", qubits:12, logical:null, fidelity:99.5, metric:"Silicon spin qubits", access:"research", notes:"Leans on existing chip fabs; tiny now but extremely dense potential." }
];
window.QDATA.modalities = [
  { key:"superconducting", label:"Superconducting", color:"#36e6ff", icon:"❄️",
    blurb:"Tiny circuits cooled near absolute zero. Fastest gates and the most qubits today (Google, IBM, Rigetti), but they need giant dilution fridges and are sensitive to noise." },
  { key:"trapped-ion", label:"Trapped ion", color:"#b46bff", icon:"⚛️",
    blurb:"Individual charged atoms held by electromagnetic fields and zapped with lasers. Fewer qubits, but the best fidelity and full any-to-any connectivity (Quantinuum, IonQ)." },
  { key:"neutral-atom", label:"Neutral atom", color:"#51e6a0", icon:"🔬",
    blurb:"Neutral atoms held in grids of 'optical tweezers'. Scales fast to 1,000+ qubits and can rearrange itself (Atom Computing, QuEra, Pasqal)." },
  { key:"photonic", label:"Photonic", color:"#ffc24d", icon:"💡",
    blurb:"Information carried by particles of light. Can run at room temperature and network naturally, but making photons interact is hard (PsiQuantum, Xanadu)." },
  { key:"spin-silicon", label:"Silicon spin", color:"#ff5fcf", icon:"🧊",
    blurb:"Single-electron spins in silicon — manufacturable in existing chip fabs and extremely small, but still at low qubit counts (Intel, SQC)." },
  { key:"annealing", label:"Annealing", color:"#e8923a", icon:"🌡️",
    blurb:"A special-purpose machine that finds low-energy solutions to optimisation problems. Many qubits, but cannot run general algorithms like Shor's (D-Wave)." },
  { key:"topological", label:"Topological", color:"#9aa6cf", icon:"🪢",
    blurb:"Stores information in the 'braiding' of exotic quasiparticles, so it should resist errors by physics. The highest-risk, highest-reward bet (Microsoft)." }
];
