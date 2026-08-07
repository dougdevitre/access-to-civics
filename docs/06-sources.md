# 06 — Primary sources

**Rule:** canonical text comes from the state legislature or Secretary of State site. Everything
below is for discovery, cross-checking, and the "why" layer.

## Constitutional text

| Source | Coverage | URL |
|---|---|---|
| 50 Constitutions (Univ. of Wisconsin Law School, State Democracy Research Initiative) | Searchable full text of all 50 state constitutions; full constitutional histories for a subset | https://50constitutions.org/ |
| NBER / Maryland State Constitutions Project | Current and historical texts, free | (via Georgetown Law guide) |
| Cornell LII, Law by Source: State | Per-state links to official constitution sources | https://www.law.cornell.edu/states/listing |
| Rutgers Law Library | Constitutions **plus constitutional convention records**, scanned full text | (via Cornell state legislation guide) |
| HeinOnline, State Constitutions Illustrated | Every constitution ever in force per state, plus pre-statehood documents | subscription |

## Structure and analysis

| Source | Use |
|---|---|
| Clouse (2019), ICPSR openicpsr-109444 — 203 historical and current state constitutions coded into 32 topical categories | Starting point for the topic taxonomy |
| Constitute Project — linked-data dumps including `topics.xml` | Schema precedent for topic tagging |
| Akoma Ntoso (OASIS LegalDocML) | XML schema + URI labelling convention for legal resources |

## Text vs. practice

| Source | Use |
|---|---|
| Brennan Center, State Court Report — State Case Database of significant state supreme court decisions developing state constitutional law | Enforcement / litigation companion cards |

## Distribution channels

| Source | Use |
|---|---|
| U.S. Dept. of Education, Constitution Day and Citizenship Day page | Listing target |
| constitutiondayhub.org | Listing target |
| Civics Renewal Network | Partner channel |
| State bar law-related education committees | Sponsor + distribution channel |

## Open questions

- Which states publish official voter pamphlets with pro/con arguments in machine-readable form?
- Which states publish constitutional text with stable section anchors vs. session-generated URLs?

## Missouri (pilot) — verified source notes, 2026-08

- **Canonical:** Revisor of Statutes constitution pages — `https://revisor.mo.gov/main/Home.aspx?constit=y`.
  Per-section pages resolve via the lenient form `OneSection.aspx?constit=y&section=<ROMAN>++<label>`
  (lettered sections keep parens: `V  25(a)`). The `bid` query parameter is an opaque,
  version-scoped row id — never construct or rely on it. The `hl` parameter adds search
  highlighting and must be stripped before hashing.
- **Page structure (verified):** one `div.norm > p.norm` per section with a
  `span.bold` header (`ROMAN Section LABEL. HEADING —`) followed by the clause text;
  effective date in `span#effdt`; footnotes/annotations in `div.foot` (excluded from
  clause text). Parser: `src/ingest/adapters/missouri.ts`.
- **Cross-check:** Secretary of State PDFs at `https://www.sos.mo.gov/pubs/constitution`;
  the dated snapshots (e.g. `MissouriConstitution_12.2024.pdf`) are immutable and make a
  better provenance anchor than the evergreen `CurrentMissouriConstitution.pdf`, which is
  republished in place.
- **Harvest:** network fetch runs on a GitHub Actions runner
  (`.github/workflows/ingest-harvest.yml`) because dev sandboxes may lack *.mo.gov egress;
  raw bytes + sha256 manifest are committed under `data/raw/mo/` (L0), and extraction runs
  offline against those bytes.
