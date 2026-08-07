# Seed data

Three content tables. All of it is authored, reviewed, and version-controlled — none of it is
generated at runtime.

| File | Layer | Notes |
|---|---|---|
| `decisions.csv` | L3 | Decision nodes and options. Every `clause_refs` entry is validated against L1 in CI. |
| `letters.csv` | L3 | Citizen letters. Consequences are a person, not a stat. |
| `goal-cards.csv` | L3 | Asymmetric private goals — the negotiation. |
| `mo/clauses.sample.json` | L1 | Shape reference only. **`text` is `null` on purpose.** |

## Why every clause `text` is null

Constitutional text enters this repo only through the ingest pipeline, from a cited source, with
a checksum. Nothing is hand-typed, paraphrased, or recalled from memory. A seed file with plausible
clause text in it is exactly the failure mode this project exists to avoid.

Run `npm run ingest -- --state MO` to populate.
