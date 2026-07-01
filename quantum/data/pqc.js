/* Q-Day / post-quantum readiness (fact-checked to 1 Jul 2026).
   Headline metric source: Cloudflare Radar — share of HUMAN HTTPS request traffic
   negotiating hybrid post-quantum KEY EXCHANGE. Important: this is TLS key exchange
   on Cloudflare's network only — NOT authentication, NOT all internet, NOT data-at-rest. */
window.QDATA = window.QDATA || {};

window.QDATA.qday = {
  readyPct: 52,
  readyAsOf:"Dec 2025",
  readyNote:"Share of human HTTPS requests using post-quantum key exchange (hybrid X25519+ML-KEM), per Cloudflare Radar. The majority crossed 50% in Oct 2025 — up from ~3% in early 2024.",
  caveat:"This measures confidentiality (key exchange) on Cloudflare's network only. Post-quantum authentication (signatures, certificates) is barely deployed, and data-at-rest, code-signing, email and legacy systems lag far behind.",
  kpis:[
    { big:"Aug 2024", lbl:"PQC standards finalised", sub:"NIST FIPS 203 / 204 / 205" },
    { big:"2030", lbl:"RSA & ECC deprecated", sub:"NIST draft timeline · disallowed 2035" },
    { big:"~3% → 52%", lbl:"PQC web traffic, 2024→2025", sub:"Cloudflare Radar, key exchange" },
    { big:"HNDL", lbl:"Harvest now, decrypt later", sub:"data stolen today, cracked post-Q-Day" }
  ]
};

/* Share of secured key-exchange traffic that is post-quantum (Cloudflare Radar + projection). */
window.QDATA.pqcAdoption = {
  projectedFrom:2026,
  points:[
    {year:2023,value:1},
    {year:2024,value:3},
    {year:2025,value:52},
    {year:2026,value:63},
    {year:2028,value:82},
    {year:2030,value:93},
    {year:2035,value:99}
  ]
};

window.QDATA.pqcSystems = [
  { system:"Signal", icon:"💬", status:"deployed", detail:"PQXDH post-quantum key agreement live since Sept 2023 — one of the first messengers to ship PQC.", asOf:"2023" },
  { system:"Apple iMessage", icon:"", status:"deployed", detail:"PQ3 protocol (ML-KEM, with ongoing rekeying) shipped Mar 2024; iOS 26 added PQ key exchange to TLS.", asOf:"2024" },
  { system:"Chrome / Cloudflare", icon:"🌐", status:"deployed", detail:"Hybrid X25519+ML-KEM in TLS 1.3 on by default — the engine behind the 52% figure.", asOf:"2024" },
  { system:"OpenSSH", icon:"🔑", status:"deployed", detail:"mlkem768x25519 became the default key agreement in OpenSSH 10.0 (Apr 2025).", asOf:"2025" },
  { system:"Microsoft Windows", icon:"🪟", status:"deployed", detail:"ML-KEM and ML-DSA shipped in Windows 11 / Server 2025 (Nov 2025).", asOf:"2025" },
  { system:"AWS", icon:"☁️", status:"deployed", detail:"ML-KEM hybrid PQ-TLS on by default across KMS, ACM, Secrets Manager and S3 (Apr 2026).", asOf:"2026" },
  { system:"Google", icon:"🔎", status:"partial", detail:"PQC in Chrome and internal traffic (ALTS migrated to ML-KEM); expanding to more services.", asOf:"2025" },
  { system:"WhatsApp / Zoom", icon:"📱", status:"partial", detail:"Following Signal-style PQC; Zoom's is opt-in (requires E2EE enabled).", asOf:"2025" },
  { system:"Banking / SWIFT core", icon:"🏦", status:"partial", detail:"Pilots and mandates under way; legacy core systems and data-at-rest lag.", asOf:"2026" },
  { system:"IoT & embedded", icon:"📟", status:"none", detail:"Huge installed base, long lifetimes, little PQC — the laggard.", asOf:"2026" },
  { system:"Bitcoin / ECDSA", icon:"₿", status:"none", detail:"No post-quantum signatures yet; migration (BIP-360) is only at the proposal/testnet stage.", asOf:"2026" }
];

window.QDATA.pqcStandards = [
  { name:"FIPS 203", algo:"ML-KEM (Kyber)", icon:"🔐", purpose:"Key exchange / encryption", status:"Final · Aug 2024",
    desc:"The main standard for establishing shared secrets safely against quantum attack. The one most traffic uses today." },
  { name:"FIPS 204", algo:"ML-DSA (Dilithium)", icon:"✍️", purpose:"Digital signatures", status:"Final · Aug 2024",
    desc:"The primary post-quantum signature scheme — for verifying software, certificates and identities." },
  { name:"FIPS 205", algo:"SLH-DSA (SPHINCS+)", icon:"🌲", purpose:"Hash-based signatures", status:"Final · Aug 2024",
    desc:"A conservative, hash-based backup signature scheme — slower, but resting on very well-understood security." },
  { name:"FIPS 206", algo:"FN-DSA (Falcon)", icon:"🦅", purpose:"Compact signatures", status:"Draft · ~2027",
    desc:"A lattice signature with small sizes, useful where bandwidth is tight. Still being finalised." },
  { name:"HQC", algo:"Backup KEM", icon:"🛡️", purpose:"Key exchange (diversity)", status:"Selected Mar 2025",
    desc:"A code-based key-exchange chosen as a mathematically different backup to ML-KEM, in case lattice schemes are ever broken. Draft ~2026, final ~2027." }
];
