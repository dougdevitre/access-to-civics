# 02 — Knowledge base model

Four layers, each with a different mutability and trust profile. Text only ever moves *up* the
stack, never sideways, and never in from a keyboard.

```
L0  Source          immutable raw fetch + sha256 + provenance          (S3)
L1  Clause graph    normalized, versioned, citable                     (DynamoDB)
L2  Gloss           plain language, human-approved, FROZEN             (DynamoDB)
L3  Game content    decision nodes, options, letters → clause refs     (git)
```

## L0 — Source (immutable)

Raw fetch plus `sha256`, `retrieved_at`, source URL, and a license note. Never edited, only
superseded. Stored in S3 with versioning on and a deny-delete bucket policy.

Anchor canonical text to the **state legislature or Secretary of State site**. Use aggregators
for cross-checking, not as the source of truth. See `06-sources.md`.

## L1 — Canonical clause graph

Normalize to an Akoma Ntoso-shaped hierarchy (the OASIS legal-document XML standard, which
contributed both a schema and a URI labelling convention for legal resources).

Stable URNs are non-negotiable — game content will reference them for years.

```
urn:const:us:mo:art-09:sec-01a@2024-11-05
             │   │      │        └ effective date (amendments ratified Nov 2024)
             │   │      └ section
             │   └ article
             └ jurisdiction
```

See `src/schema/urn.ts` for parse/format/compare.

## L2 — Teaching gloss (generated offline, human-approved, frozen)

Plain-language rewrites at two reading levels, topic tags, difficulty, sensitivity flags.
Generated in batch with Claude, reviewed by a human, then **frozen**. Nothing in this layer is
produced live in front of a child. See `adr/0001-no-runtime-llm.md`.

## L3 — Game content graph

`DecisionNode → Option → clause_refs[] → citizen letter`. Authored by curriculum staff,
validated in CI against L1 — a broken clause ref fails the build.

## Topic taxonomy

Start from an existing scheme rather than inventing one. Clouse's ICPSR text-analytics project
categorized every word of 203 historical and current U.S. state constitutions into 32 topical
categories, which is close to the granularity a game needs. Constitute's practice of publishing
a separate `topics.xml` for tagging content with labelled topics is the right shape to copy.

Controlled vocabulary lives in `data/taxonomy/topics.json`. It is append-only; retiring a topic
requires a migration because clause records reference it.

## The "why" layer

Clause text tells kids **what**. It never tells them **why**, and "why" is where the learning is.

- **Official voter pamphlets / ballot arguments.** California, Oregon, and Washington (among
  others) publish state-issued guides where proponents and opponents each write their case for
  every measure. Primary sources, already written for lay readers, and **pre-balanced with both
  sides**. Cheaper and more defensible than any gloss we'd generate.
  *TODO: confirm which states publish these in machine-readable form before scoping.*
- **Constitutional convention records.** Rutgers Law Library maintains a full-text archive of
  convention records alongside the constitutions. Delegate arguments are the original "here's
  why we wrote it this way."

## Amendment events are first-class

Promote amendments to their own entity: date, subject, vote margin, pass/fail. This turns the
corpus into a timeline dataset and enables comparative claims kids actually find interesting
("your state has amended 500 times; Vermont has done it 50"). Trivial query on GSI1.

## Text vs. practice

Constitutions contain promises that went unenforced for decades. If the game says "your state
guarantees adequate schools" and the kid's school has no library, we either teach cynicism or we
teach how rights actually get enforced.

A subset of clauses gets a companion card showing the litigation that made the words real.
Brennan Center's State Court Report runs a State Case Database of significant state supreme court
decisions developing state constitutional law — the natural feed.

This is the single biggest intellectual upgrade available and it's what turns the product from
civics into constitutional literacy.

## Schemas

Authoritative definitions live in `src/schema/`. Illustrative shapes:

```json
// clause
{
  "urn": "urn:const:us:mo:art-09:sec-01a@2024-11-05",
  "state": "MO",
  "article": { "num": "IX", "heading": "Education" },
  "section": "1(a)",
  "text": null,
  "text_status": "unfetched",
  "topics": ["EDUCATION_ESTABLISHMENT", "PUBLIC_FINANCE"],
  "status": "operative",
  "effective_date": "1945-03-30",
  "supersedes": null,
  "source_url": "https://revisor.mo.gov/main/OneSection.aspx?...",
  "source_sha256": null,
  "sensitivity": "none"
}
```

```json
// gloss (1:1 with clause urn)
{
  "clause_urn": "urn:const:us:mo:art-09:sec-01a@2024-11-05",
  "grade_5": null,
  "grade_8": null,
  "flesch_kincaid": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "frozen": false
}
```

`data/seed/decisions.csv` and `data/seed/letters.csv` carry the L3 content tables.

## DynamoDB single-table access patterns

| Access pattern | PK | SK | Index |
|---|---|---|---|
| Get a state's clause | `STATE#MO` | `CLAUSE#ART09#SEC01A` | base |
| **Compare a topic across 50 states** | `TOPIC#EDUCATION_ESTABLISHMENT` | `STATE#MO#ART09#SEC01A` | GSI1 |
| Clause version history | `URN#<base-urn>` | `VERSION#2024-11-05` | GSI2 |
| Decision node → options | `NODE#D07` | `OPTION#D07-B` | base |
| Amendment timeline for a state | `STATE#MO` | `AMEND#2024-11-05#03` | base |

**GSI1 is the whole game.** "Show me how all 50 states handled this" becomes one query.

## Retrieval and the anti-hallucination guardrail

Hybrid BM25 + embeddings, hard-filtered by `state` and `topic`, run **at build time only**.

Then the **Quote Integrity Validator** in the publish path: any span rendered to a child as
constitutional text must byte-match an L1 clause. No match ⇒ the artifact is rejected, not
shipped. Implementation: `src/ingest/validators/quote-integrity.ts`.
