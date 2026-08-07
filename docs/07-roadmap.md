# 07 — Roadmap and test plan

## Phases

**Phase 0 — Missouri only (4 weeks).** One state, one adapter, ~20 clauses, 6 decision nodes,
static React/Vite front end. Goal: prove the Draft → Mirror loop is fun with real text.

**Phase 1 — Ingestion at scale (6 weeks).** Per-state adapters behind one `StateAdapter`
interface. Roughly 10 adapters cover most HTML format families; the tail is manual.
Diff-against-prior-version with human sign-off before publish.
**Re-crawl every December** — amendments ratify in November.

**Phase 2 — Gloss + review (parallel).** Batch generation, human review queue, reading-level gate
in CI.

**Phase 3 — 5 states → 50.** Missouri, California (initiative-heavy), Delaware (no popular
ratification), Texas (amendment-heavy), Vermont (short). Those five stress every edge in the model.

**Phase 4 — MCP server.** Expose the KB as `access-to-civics` MCP so the corpus is reusable across
other Access To skills instead of trapped in one app. *(Deferred out of v1.)*

## Ship date

**September 17.** Scope backward from Constitution Day. See `04-distribution-and-cut-list.md`.

## Test plan

| Area | Test | Gate |
|---|---|---|
| Citation accuracy | Golden set: every Mirror card verified against source | 100%, blocking |
| Quote integrity | No rendered legal text without a byte-match in L1 | blocking |
| Ingestion parity | Article/section counts vs. official ToC per state | blocking |
| Content refs | Every `clause_ref` in `data/seed/` resolves | blocking |
| Reading level | Flesch-Kincaid on all glosses within band | blocking |
| Gloss freeze | No unreviewed gloss in a published bundle | blocking |
| Sensitivity | No `historical_harm` clause reachable in the 8–10 band | blocking |
| Determinism | Sim snapshot tests (if the sim survives the cut) | blocking |
| Dominant strategy | 10,000 playthroughs, win distribution across archetypes | reviewed |
| Accessibility | Keyboard-only path, axe scan, WCAG 2.2 AA | blocking |
| Playtest | 8–10 and 11–14 cohorts before any state expansion | reviewed |

## Immediate next steps

1. Put September 17 on the calendar as a hard ship date; scope backward.
2. Paper-prototype the negotiation round with goal cards — no sim, no scoreboard, one class
   period. If it's flat without the sim, the sim is load-bearing and we plan for it honestly.
3. Email the Missouri Bar LRE committee and one Secretary of State civics office with a
   one-pager, **before writing more code**. Their answer sets the funding path and the first state.
4. Confirm whether Missouri publishes official ballot arguments in structured form; if not, pilot
   the "why" layer with California or Oregon.

## Phase 0 status note (2026-08)

Missouri ingest is live in scoped form: the clauses cited by the seed decision nodes are
harvested from revisor.mo.gov, extracted, verified, and published to `data/published/mo.json`
with per-section source URLs and sha256 provenance. The quote-integrity, clause-refs,
sensitivity, reading-level, and privacy gates are implemented and blocking. Scope widens by
adding entries to `data/seed/mo/ingest-targets.json` and re-running the harvest workflow.

**Texas ingested (2026-08).** The second state is in, which is the one that mattered: it proves
the pipeline is a pipeline and not a Missouri-shaped script. It also cost more than expected, and
the reasons are worth carrying into Phase 1:

- The obvious source was a dead end. Texas's public statutes site is now a single-page
  application that answers HTTP 200 with an identical shell for every document URL. **Status
  codes are not evidence.** The harvest manifest's marker check — does an expected phrase from
  this section actually appear in these bytes — is what caught it, and it should be treated as
  mandatory for every new adapter, not as a nicety.
- The fetched unit is not always the cited unit. Texas serves one document per article; the
  citation is a section. `source_url` (what the checksum covers) and `citation_url` (where a
  reader is sent) are separate fields for exactly this reason.
- Browser rendering works and is a last resort. It succeeded for Texas before the document host
  was found, but a rendered DOM is a weaker provenance claim than served bytes. Prefer finding
  the data the application loads.
- Two gates were silently single-state and are now state-agnostic: the reading-level gate scored
  only Missouri's glosses, and the privacy gate's host allowlist was hand-maintained. A third
  state should require no edit to either.

**Nebraska ingested, and Phase 0 closed (2026-08).** The third adapter took under an hour end to
end, which is the first evidence that the marginal cost of a state is falling. Its site is plain
HTML, one page per section — but it answers HTTP 200 with a 37-byte empty body for a bad section
id, so it independently confirmed the Texas lesson from the opposite direction: the failure mode
is not "the site is complicated", it is "the site says yes to everything".

Nebraska is scoped to a single clause on purpose. Art. III §1 puts the legislative authority in a
Legislature of one chamber, and no other state does. That clause is the whole reason to ingest
Nebraska, and it is the other side of **D06**, the sixth decision node — which closes the Phase-0
scope of six nodes with real, byte-verified text on **both** sides of the question.

**Delaware ingested; California probed and deferred (2026-08).** D01 is the first question a
player sees and was the only node with both sides pending. Delaware — the state that amends its
constitution with no popular vote at all — is now real text, so D01-A shows the state's own words.

Delaware sprang the quietest failure yet and the only one that would have shipped:
`constitution-17.html` is ARTICLE XVI, because the file numbers are offset by one. The page at
the number you would guess is a real, complete, correctly-served document — of the wrong article.
Only the marker check caught it. That is why a missing marker now **fails** the harvest instead of
warning, and why the Delaware adapter re-reads the document's own article heading before trusting a
word of it.

California is a genuine dead end for now and `docs/06-sources.md` records why: leginfo is a
JSF application that serves the section text only in response to a stateful postback, with no
JSON endpoint behind it. The two available routes — replaying a ViewState session, or the
Legislative Counsel's bulk archives — are respectively too fragile to trust and too large to
commit under the current L0 model. California stays a verified citation with its words pending
rather than being faked or scraped fragilely.

**Florida ingested; New Hampshire blocked (2026-08).** Five states, eighteen clauses, and four of
the six pending Mirror cards are now real text.

Florida is the widest gap yet between the fetched unit and the cited unit — the Senate publishes
the whole constitution as one 622KB document with fragment anchors, so one fetch and one checksum
cover every Florida clause we will ever cite. It also exposed a defect that affected every state:
`htmlToText` decoded decimal character references but not hex, so Florida's `&#x2003;` survived as
a literal string inside a clause.

New Hampshire is the one we most want and cannot reach. It is the only state cited on two
different questions. Its General Court site was rebuilt and now soft-404s every constitution path
(HTTP 200, site chrome, no law), pointing off-site to nh.gov — which returns 403 from Akamai to our
runner, in a plain fetch and a real browser alike. That is edge filtering of the egress, not
anything about how we ask.

We will not disguise the harvester as a browser to get past a WAF. The crawler identifies itself
honestly, and a rule we would break for one more clause is not a rule. New Hampshire stays a
verified citation with its words pending, and reaching the Secretary of State's office is now a
concrete item on the outreach list rather than a nicety.

Remaining: New Hampshire (blocked at the edge), California (blocked by architecture), Virginia
1830 (a historical document with no official online source, and likely to stay pending), and
Vermont (short, not yet attempted).
