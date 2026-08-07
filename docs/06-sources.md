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

## Nebraska — verified source notes, 2026-08

Nebraska is the third state and the simplest so far. It is in the corpus for one clause.

- **Canonical:** `https://nebraskalegislature.gov/laws/articles.php?article=<ROMAN>-<section>` —
  plain HTML, one page per section, no application shell, no browser. Note the section is part of
  the `article` parameter: `article=III-1`, not `article=III&section=1`.
- **The trap:** `article=III` with no section answers **HTTP 200 with a 37-byte empty body**
  rather than a 404, and `statutes.php?statute=III-1` does the same at 39 bytes. A harvester that
  checks status codes would record two successes and store nothing. The manifest's marker check is
  what separates a document from a polite blank.
- **Page structure (verified):** `<div class="statute">` holding `<h2>ARTICLE-SECTION.</h2>`, an
  `<h3>` section heading, and `<p>` body paragraphs, followed by `<div class="statute_source">`
  with the amendment history. Everything from `statute_source` on is editorial, not constitutional
  text, and is cut before the body is read. Parser: `src/ingest/adapters/nebraska.ts`.
- **No effective dates.** Nebraska prints amendment *years* ("Amended 1934, Initiative Measure
  No. 330"), not dates. Amendments are ratified at November general elections, but converting a
  year into a date is inference, so `effective_date` is null until a source states the day.
- **Scope:** Art. III §1 only. It vests the legislative authority in a Legislature "consisting of
  one chamber" — Nebraska is the only state that answers that question differently, which is the
  whole reason it is here. The same section also reserves initiative and referendum to the people.

## Delaware — verified source notes, 2026-08

Delaware sprang the quietest trap of the four, and the only one that would have shipped.

- **Canonical:** `https://delcode.delaware.gov/constitution/constitution-<n>.html` — plain HTML,
  one page per article, no shell, no browser.
- **The trap: the file numbers are offset from the article numbers.** `constitution-17.html` is
  ARTICLE XVI; `constitution-16.html` is ARTICLE XV. That page is a real, complete,
  correctly-served, well-formed document. Nothing about the response is wrong — it is simply a
  different article. No status code, byte count, or parse check catches that. Only the marker
  did, and only because the marker was a phrase from the clause rather than the state's name.
  Consequently the file is named **explicitly per target** in `data/seed/de/ingest-targets.json`
  rather than computed from the article number, and `extract()` re-reads the document's own
  `<h2>ARTICLE <ROMAN>.` heading and refuses it if it does not match the target.
- **Page structure (verified):** the article's content sits between two comment markers
  (`C O N T E N T   B E L O W / A B O V E   T H I S   L I N E`), which keeps the footer out of
  reach. Each section opens with `<p class="noStyle section-label">§ N. HEADING.</p>` followed by
  `<p>` body paragraphs. The session-law citations after each section ("84 Del. Laws, c. 281") are
  the amendment history; they sit outside any `<p>`, so collecting paragraphs excludes them.
  Parser: `src/ingest/adapters/delaware.ts`.
- **No effective dates.** Delaware prints session-law citations, not dates. A chapter number is
  not a date, so `effective_date` is null.
- **Scope:** Art. XVI §1 only — the clause that makes Delaware worth citing. Amendments pass by
  two-thirds of each house in two successive General Assemblies and never go to the voters at all.
  The proposal must be published before the intervening general election, so that election is the
  check; the gloss says so, because "no public vote" alone would be true and still misleading.

## Florida — verified source notes, 2026-08

The most semantic markup of the five, and the widest gap between the fetched unit and the cited
unit.

- **Canonical:** `https://www.flsenate.gov/Laws/Constitution` — the Senate publishes the **entire
  constitution as one 622KB document**. There are no per-article or per-section URLs; navigation
  is fragment anchors, `#A11S05` being Article XI Section 5. So one fetch and one sha256 cover
  every Florida clause the game will ever cite.
- **Citation (human-facing):** the same URL with the anchor, e.g.
  `https://www.flsenate.gov/Laws/Constitution#A11S05`. `source_url` is the document the checksum
  covers; `citation_url` carries the fragment so a reader lands on the section.
- **Page structure (verified):** `div.Section` containing `span.SectionNumber` (with the
  `<a name>` anchor), `span.Catchline > span.CatchlineText` for the heading, `span.SectionBody`
  holding `div.Subsection` / `div.Paragraph` blocks, and a sibling `div.History`. Nothing has to
  be inferred from position. The History block is the Senate's editorial note and is captured
  separately. Parser: `src/ingest/adapters/florida.ts`.
- **Hex character references.** Florida uses `&#x2003;` (em space) between a subsection letter and
  its text and `&#x2014;` after every catchline. `htmlToText` decoded decimal references only, so
  these survived as the literal string `&#x2003;` inside a clause. Fixed for every state.
- **No effective dates.** The History line gives adoption years ("adopted 2006"), not dates.
- **Scope:** Art. XI §5. Subsection (e) carries the sixty-percent ballot threshold that makes
  Florida worth citing, but the section is the citable unit — the same call as Texas Art. VII §3 —
  and the gloss names which part matters.

## New Hampshire — probed 2026-08, BLOCKED

New Hampshire is the state we most want and cannot currently reach. It is the only one cited on
two different questions: Part Second Art. 83, the education duty the *Claremont* cases read as
placing the funding obligation on the state (D03-B), and Part Second Art. 100, the two-thirds
ratification requirement (D05-B).

The obstacle is access, not architecture:

- The General Court site was rebuilt. `gencourt.state.nh.us` now redirects to `gc.nh.gov`, and
  every constitution path there is a **soft 404** — HTTP 200, 18KB of site chrome, no law. Its own
  navigation links the constitution off-site, to `www.nh.gov/glance/state-constitution`.
- That page returns **403 Access Denied from Akamai** to our harvest runner, in a plain fetch and
  in a real browser alike, so it is edge filtering of the datacenter egress rather than anything
  about how we ask. `sos.nh.gov` returned 503 to the same runner.

We are not going to disguise the harvester as a browser to get around a WAF. The crawler
identifies itself honestly, and a rule we would break to get one more clause is not a rule. The
routes that stay open: retry from an egress New Hampshire's edge does not filter, or ask the
Secretary of State's office directly — which is the sort of contact the collaboration request in
the README is for anyway.

Until then New Hampshire stays a **verified citation with its words pending**, and its two Mirror
cards say so.

## California — probed 2026-08, NOT ingested

Recorded because a negative result that took two probe rounds is worth writing down.

California is cited on D01-B (the initiative) and is the Phase-3 stress case for initiative-heavy
states. `leginfo.legislature.ca.gov` is a JavaServer Faces application, and unlike Texas there is
no separate document host behind it:

- Every candidate GET answers HTTP 200 with 128–163KB, of which **700–1200 bytes are prose** —
  the navigation chrome and a code dropdown. The rest is framework view state. `codes_displaySection`,
  `codes_displayText`, and `codes_displayexpandedbranch` all behave the same way.
- Rendering in a real browser does not help: `innerText` is 976 characters, still no statutory
  text, and the page issues **no XHR or JSON request** — only three static scripts. There is no
  hidden data endpoint to point at.
- The section text is served only in response to a JSF postback: a form submission carrying a
  session cookie and a `javax.faces.ViewState` token.

Two paths exist and neither has been taken:

1. **Drive the postback.** Fetch the page, extract the ViewState, POST the form. It would work,
   and it is the most fragile thing in the repo the day California redeploys. A provenance claim
   that depends on replaying a session is weaker than one that names a URL.
2. **Bulk download.** `downloads.leginfo.legislature.ca.gov` publishes the Legislative Counsel's
   database as archives, which is the officially sanctioned machine-readable route and contains
   the constitution as `CONS` sections. The obstacle is the L0 model: we commit the raw bytes we
   hashed, and these archives are far too large to commit. Using them means deciding what "the raw
   document" is when the source ships a database instead of a page — a real question, and not one
   to answer in passing.

Until then California stays a **verified citation with its words pending**, recorded in
`data/seed/citation-verification.json`. That is the honest state of it: we know what Art. II §8
says, we have not fetched it from a source we can hash, and so the app does not print it.

## Contrast-state citations (pre-ingest)

Decision options cite states other than the pilot so a Mirror card can show that real
places chose differently. Those states have no adapter yet, so their cards render as
"text pending" — the app never shows words it has not fetched. The citations themselves
are still verified before seeding, and the audit trail lives in
`data/seed/citation-verification.json` (what was checked, how, when, and any caveat such
as Florida's two-thirds carve-out for new taxes). Refs inherited from the original
scaffold are listed there as unverified and should be checked before a classroom pilot.
