# access-to-civics — **Charter**

A civic education game for kids (ages 8–14) built on the primary text of all 50 U.S. state
constitutions. Kids run a constitutional convention, negotiate a charter, ratify it by vote,
and then see the real clauses from real states that made the same choice.

Part of the **Access To** open civic tech initiative.

## Thesis

Nobody has made **state** constitutions playable. iCivics owns federal and historical civics
(260+ resources, districts in every state). Their state-government material is an overview
lesson, not a 50-state primary-source engine. That gap is this repo.

The design consequence: don't build a quiz. Build a **drafting simulator**, which is the only
model where having 50 constitutions is a feature rather than a content-maintenance tax.

## Core loop

| Beat | What happens |
|---|---|
| **DRAFT** | The convention faces a charter question. Delegates hold asymmetric private goal cards. |
| **NEGOTIATE** | You cannot satisfy every constituency. Something gets traded. |
| **MIRROR** | The game reveals real clauses from real states that made this choice, cited. |
| **RATIFY** | The class votes. Losing ratification is the best ten minutes in the product. |

## Non-negotiable engineering constraints

1. **Zero runtime LLM calls.** Everything a child sees is precomputed, human-reviewed, and
   frozen at build time. See `docs/adr/0001-no-runtime-llm.md`.
2. **Offline-first PWA.** Per-state static bundles. No network call in a classroom means no
   COPPA surface, no per-seat cost, and no dependency on school wifi.
3. **No invented legal text, ever.** Clause text enters the system only through the ingest
   pipeline, from a cited source, with a checksum. Nothing is hand-typed. The Quote Integrity
   Validator (`src/ingest/validators/quote-integrity.ts`) fails the build if any
   rendered text does not byte-match a stored clause.
4. **No child accounts.** Teacher-provisioned anonymous seats, session codes, no PII.

## One repo, one package

No workspaces, no sub-packages. Everything is `src/` with plain relative imports, one
`package.json`, one `tsconfig.json`. The pieces are separated by directory, not by publishing
boundary — nothing here is consumed by anything outside this repo, so a package boundary would
be cost without benefit.

Per the Access To convention, pillars get their own repos; the pieces *inside* a pillar do not.

## Repo layout

```
access-to-civics/
├── index.html · vite.config.ts · tsconfig.json · package.json
├── docs/                    Design, KB model, compliance, roadmap, adding a state, ADRs
├── data/
│   ├── taxonomy/            Controlled topic vocabulary
│   └── seed/                Decision nodes, goal cards, citizen letters, sample clause records
├── src/
│   ├── schema/              Shared zod types + URN utilities (source of truth)
│   ├── ingest/              fetch → normalize → verify → publish pipeline
│   ├── api/                 Lambda + DynamoDB single-table read layer (build-time only)
│   └── web/                 React/Vite PWA game shell
├── scripts/                 CI content gates
└── infra/                   CDK stack (stub)
```

## Two age bands, two experiences

The game asks who's playing and routes the whole experience by band — not just easier words:

| | **Ages 8–10** | **Ages 11–14** |
|---|---|---|
| Mode | Whole-class, teacher-led. No hidden goals. | Pass-and-play delegates with secret goal cards. |
| Copy register | Flesch-Kincaid ≤ ~4.8, enforced in CI | ≤ ~7.8, enforced in CI |
| Sensitive history | `historical_harm` clauses never render raw — a teacher-mediated card appears instead | Rendered inside explicit framing |

Every decision outcome has a **citizen letter** in both registers (consequences are a person,
not a stat), every question ends with a **turn-and-talk prompt** answered out loud — never
typed — and the number the game celebrates is how many players **changed their mind** after
hearing the other side. That metric lives on the device only.

## The trust layer

Charter collects nothing: no accounts, no cookies, no analytics, no ads, no free text, no
server-side state. That posture is documented in-app (a kid-readable privacy promise plus a
full page for grown-ups and district reviewers) and **enforced in CI** — a privacy-regression
gate scans every build for tracking markers, storage APIs, and non-allowlisted hosts, and
fails the release if any appear. Reading levels, clause sensitivity review, and an axe
accessibility scan (WCAG 2.2 AA target) are blocking gates too. External links go only to
official government sources, behind a kid-language "you're leaving Charter" notice, with
referrer suppression at the header level.

## Quick start

```bash
npm install
npm run typecheck
npm test                                 # unit tests incl. copy reading-level gate
npm run build                            # demo bundle + typecheck + vite build
npm run gates                            # content, sensitivity, reading-level, privacy gates
npm run test:a11y                        # Playwright e2e + axe scan (both bands)
npm run dev                              # game shell at :5173
```

## Ship date

**September 17** — Constitution Day. Federal law requires every educational institution
receiving federal funds to hold an educational program on the U.S. Constitution that day.
Scope backward from it. See `docs/04-distribution-and-cut-list.md`.

## Status: prototype

Playable and live via Vercel from `main`, and clearly labelled a prototype in the app.
Four states are ingested, seventeen clauses in all. Missouri is the pilot (twelve clauses from
the official Revisor pages); Texas proved the pipeline generalises, from a site that serves an
application shell to every document URL; Nebraska is there for one clause, the only single-chamber
legislature in the country; Delaware for one more, the only state that amends its constitution
without ever asking the voters. All carry sha256 provenance and human-reviewed glosses at two
reading levels. Every other state appears as a verified
citation with its words still pending — nothing is ever hand-typed. See `docs/07-roadmap.md`.

## Help us get your state right

**We have already been wrong.** An August 2026 review of our own citations found two errors:
Virginia's modern universal-suffrage clause was cited as authority for a landowner-only
franchise, and New Hampshire's state education-duty clause was attached to the local-funding
option — reversing what the *Claremont* cases hold it to mean. Both are fixed, and
`npm run gates` now fails if any citation from a state we have not ingested lacks a human
verification record. We assume there are more we have not caught.

If you know your state's constitution — as a revisor, law librarian, secretary of state
office, bar association LRE committee, historian, teacher, or student — we would be glad of
your help:

| What | Where |
|---|---|
| Check a citation | `data/seed/citation-verification.json` lists every un-ingested citation with sources, reasoning, and caveats |
| Correct a framing | A citation can be accurate and still misrepresent what a provision means in practice. This is the harder failure and the one we most need help with. |
| Flag a clause needing care | `data/seed/clause-sensitivity.json` — some history needs adult framing before a child reads it |
| Add your state | `docs/08-adding-a-state.md` is the recipe; `src/ingest/adapters/` has four worked models, about a hundred lines each |

Open an issue and we will credit you unless you'd rather we didn't. The one thing we cannot
accept is constitutional text by email or hand-typed: words enter only through the pipeline,
from an official source, with a checksum. That rule is what makes the rest trustworthy, and
it applies to us too.

## License

MIT. The ingested constitutional text is public domain; the glosses, decision nodes, and
citizen letters in `data/` are MIT alongside the code.
