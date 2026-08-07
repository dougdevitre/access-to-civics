# 03 — Design upgrades

Ordered by impact.

## 1. Negotiation over optimization

See `01-concept.md`. Asymmetric private goal cards + a ratification vote + (deferred) Act II
where you're bound by your own charter.

This also fixes the neutrality problem: outcomes become contested between players rather than
pronounced by our weighting function.

Prior art worth noting — iCivics teachers report this dynamic already working in *Branches of
Power*: students had to add clauses they didn't support in order to get their laws passed, and
that's what made compromise land.

## 2. The "why" layer in the KB

Voter pamphlets and convention records. See `02-knowledge-base.md`.

## 3. Offline-first, zero runtime LLM calls

Precompute everything; deliver the KB as a per-state static bundle in a PWA. This collapses four
problems at once:

- Kills the COPPA surface — no network call means no data leaves the Chromebook.
- Kills marginal cost — free forever, the only price that survives a district budget cycle.
- Kills the school-wifi failure mode that ends most classroom pilots on day one.
- Kills latency inside a 45-minute period.

Claude does the heavy lifting at build time, in batch, under human review. None at runtime.

## 4. Positioning: the incumbent is a partner, not a target

iCivics is the category — 260+ curricular resources and a game library, founded by Justice
Sandra Day O'Connor, with district partnerships in every state since 2009. Their closest analog
is *Race to Ratify*, which is **federal and historical**. Their state-government material is an
overview lesson on structure and function.

**The gap is the thesis: nobody has made state constitutions playable.** Say that in every deck.
Pitch as a complement into the Civics Renewal Network and state bar law-related education
channels — the South Carolina Bar, for example, distributes iCivics through its LRE program,
which tells you the rails already exist and are additive, not zero-sum.

## 5. Ingestion: don't hand-write 50 scrapers

Use LLM-assisted structure extraction with a **deterministic verifier** — article and section
counts against the official table of contents, checksum on concatenated text, no unmapped
orphans. Humans review diffs only. Roughly halves Phase 1.

See `src/ingest/pipeline/verify.ts`.

## 6. Release the corpus as an open dataset

Law librarians and state-constitution scholars will file our bug reports for free, it seeds the
MCP server, and it fits the Access To open-source posture. The dataset may outlive the game.
*(Deferred out of v1 — see the cut list.)*

## 7. Smaller, still worth doing

- **Moderation by constraint, not by filter.** Kids will try to make the "name your state" field
  say something vile. Constrained composition (pick from curated word lists) removes the attack
  surface entirely and costs nothing to run.
- **Cohort persistence.** This year's class ratifies; next year's inherits and must amend. Teaches
  that you're always governed by rules you didn't write.
- **Spanish at launch, not v2.** Equity requirement and adoption unlock; the gloss layer is
  already a translation pipeline.
- **The printed charter.** Signed by every delegate, sent home. Parent sees it, tells another
  parent. Physical objects are still the cheapest marketing in K-12.
- **Lineage/diff view.** Original text vs. today with strikethrough. *(Deferred.)*
- **Local charters.** Home-rule city charters and school board authority. An eleven-year-old
  cares about a one-mile radius. *(Deferred.)*
- **Tribal constitutions.** Genuinely part of American constitutionalism and almost entirely
  absent from civics products. Do it consultatively with the nations involved or not at all.
  *(Deferred.)*
