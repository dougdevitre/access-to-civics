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

## Texas — verified source notes, 2026-08

Texas is the second state ingested, and it is instructive because the obvious source is a dead
end. Everything below was established empirically by `scripts/probe-tx.mjs`, not assumed.

- **The public site is not fetchable.** `statutes.capitol.texas.gov` is an Angular application:
  every document URL — including the `/Docs/CN/htm/CN.<art>.htm` paths that used to serve
  documents, and the old `GetStatute.aspx` entry point — returns the same 250874-byte shell with
  HTTP 200. A harvester that trusts the status code will happily store the shell for every
  section and report success. Ours caught it because the manifest records whether an expected
  marker phrase actually appears in the bytes.
- **Canonical (machine-readable):** `https://tcss.legis.texas.gov/resources/CN/htm/CN.<article-arabic>.htm`
  — the documents the application itself loads. Plain static HTML, one file per **article**, so
  the fetched unit is one level above the cited unit. The article number is arabic in the path
  even though the citation is roman.
- **Citation (human-facing):** `https://statutes.capitol.texas.gov/Docs/CN/htm/CN.<article-arabic>.htm`.
  This is the page a reader should be sent to; it is not the page we hash. The two are kept in
  separate fields (`source_url` vs `citation_url` in `src/schema/clause.ts`) so the checksum
  always covers exactly the bytes the text came from.
- **Page structure (verified):** each section opens with the anchor pair
  `<a name="<art>.<label>"></a><a name="<recordid>"></a>`, then a heading link back to that same
  anchor reading `Sec. N.  HEADING.`, then indented paragraphs for the subsections. The
  parenthetical adoption/amendment history is the one paragraph with no `text-indent` — it is the
  site's editorial note, not constitutional text, and is captured separately. The last date in it
  is the section's effective date. Parser: `src/ingest/adapters/texas.ts`.
- **Rendering is not needed and was not used.** An earlier attempt rendered the SPA in a browser;
  it worked, but a rendered DOM is a weaker provenance claim than served bytes. Once the document
  host was found, the browser path became unnecessary for Texas.
- **Harvest:** same two-stage split as Missouri — `scripts/harvest-tx.mjs` on a GitHub runner,
  raw bytes + sha256 manifest committed under `data/raw/tx/` (L0), extraction offline.

## Contrast-state citations (pre-ingest)

Decision options cite states other than the pilot so a Mirror card can show that real
places chose differently. Those states have no adapter yet, so their cards render as
"text pending" — the app never shows words it has not fetched. The citations themselves
are still verified before seeding, and the audit trail lives in
`data/seed/citation-verification.json` (what was checked, how, when, and any caveat such
as Florida's two-thirds carve-out for new taxes). Refs inherited from the original
scaffold are listed there as unverified and should be checked before a classroom pilot.
