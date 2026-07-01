# The Quantum Computer 🧊⬡

**Zoom to the qubit, then to Q-Day.** An interactive, fact-checked map of where
quantum computing actually stands — the machine, the history, the roadmap, the
cryptography cliff, and the quantum-vs-Bitcoin race.

Part of the [42-apps](https://42-apps.github.io/) collection, built with
[three.js](https://threejs.org). No build step.

🔗 **Live:** https://42-apps.github.io/quantum/

## What it does

- **🔭 The Lab (3D)** — fly a real (if stylised) dilution refrigerator, then pull
  the **DIVE** slider to fall nine orders of magnitude: the gold "chandelier" →
  the chip & package → the qubit lattice → a single transmon qubit → its
  Josephson junction (watch Cooper pairs tunnel) → the qubit's quantum state on a
  live **Bloch sphere** you can hit with H / X / Y / Z gates and **measure**.
- **⏱ History** — a filterable timeline from Feynman (1981) to below-threshold
  error correction and "verifiable quantum advantage" (2024–25), plus the qubit
  count over time.
- **▦ Machines** — every major quantum computer as of mid-2026: a qubits-vs-fidelity
  bubble chart, a sortable table, and the five hardware modalities explained.
- **📈 The Climb** — the published logical-qubit roadmaps (IBM, Google, Quantinuum,
  IonQ, Pasqal), the eight walls in the way, and expert Q-Day probabilities.
- **🔓 Q-Day** — how quantum-safe our encryption is: a readiness gauge (Cloudflare's
  ~52% PQC traffic), an adoption projection, the NIST standards, and a live status
  grid of which major systems have switched on post-quantum crypto.
- **₿ vs Bitcoin** — the crossover graph (quantum capability rising vs the falling
  bar to break a key), how much BTC is exposed, what Bitcoin must do, and the
  attack-vs-defence race.

## How it's built

Vanilla ES modules, no build step. `index.html` + `app.css` + `app.js`
(the 3D engine + hand-built SVG charts + section renderers) + `data/*.js`
(the corpus) + `lib/` (vendored three.js r160 + OrbitControls).

```
python3 -m http.server 8778 --directory .
```

Then open http://localhost:8778 .

## Honest caveats

Figures are fact-checked to **1 July 2026** against primary sources (NIST, vendor
roadmaps, peer-reviewed papers, Cloudflare Radar, the Global Risk Institute
survey). But: qubit counts are a weak proxy for power; no machine is
fault-tolerant yet and no cryptographically-relevant quantum computer is known to
exist (so all "Q-Day" dates are expert opinion, often hyped); the 52% readiness
figure is post-quantum *key exchange* on Cloudflare's network only; Bitcoin qubit
estimates swing by ~1,000× between papers; and Microsoft's topological-qubit
claims remain scientifically disputed. The 3D scene is an artistic rendering at
honest relative scale, not an engineering schematic. See the in-app **About**
panel for sources.
