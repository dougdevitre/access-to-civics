# ADR 0001 — No runtime LLM calls

**Status:** Accepted
**Date:** 2026-08-06

## Context

The product shows constitutional text to children aged 8–14 and makes claims about what their
state's constitution says. A hallucinated clause, a misattributed citation, or a plausible-sounding
paraphrase presented as law is an unrecoverable failure — reputationally, pedagogically, and
possibly legally.

Separately: classroom wifi is unreliable, per-seat inference cost does not survive a district
budget cycle, and any network call from a child's device creates a COPPA surface to manage.

## Decision

**No LLM call happens while a child is using the product.**

The model is used at build time only:
1. Structure extraction during ingest, always behind a deterministic verifier.
2. Batch gloss generation, always followed by human review and a freeze.

Everything a child sees is precomputed, reviewed, frozen, and shipped inside a static per-state
bundle.

## Consequences

**Positive**
- Hallucination becomes a build-time defect caught by CI, not a runtime incident in a classroom.
- Marginal cost per student approaches zero; the product can be free permanently.
- No network call in the default session ⇒ dramatically smaller privacy surface.
- Works on a Chromebook with no wifi.

**Negative**
- No open-ended "ask the constitution anything" feature. Accepted.
- Content changes require a rebuild and redeploy. Acceptable — constitutions change annually, in
  November.
- Gloss review is a real human cost that scales with states × clauses. This is the actual budget
  line of the project and should be planned as such.

## Enforcement

`src/ingest/validators/quote-integrity.ts` runs in the publish path and in CI. Any span
rendered to a child as constitutional text must byte-match a stored L1 clause. No match ⇒ the
artifact is rejected.
