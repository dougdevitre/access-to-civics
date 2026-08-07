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
├── docs/                    Design, KB model, compliance, roadmap, ADRs
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

## Quick start

```bash
npm install
npm run typecheck
npm run ingest -- --state MO --dry-run   # fetch + verify, writes nothing
npm run gates                            # content gates (advisory until ingest has run)
npm run dev                              # game shell at :5173
```

## Ship date

**September 17** — Constitution Day. Federal law requires every educational institution
receiving federal funds to hold an educational program on the U.S. Constitution that day.
Scope backward from it. See `docs/04-distribution-and-cut-list.md`.

## Status

Scaffold. Missouri is the pilot state. Nothing here is production-ready and no clause text
has been ingested yet — every seed record is deliberately `text: null`.

## License

MIT. The ingested constitutional text is public domain; the glosses, decision nodes, and
citizen letters in `data/` are MIT alongside the code.
