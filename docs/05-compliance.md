# 05 — Compliance and content safety

*Educational information, not legal advice. Confirm all of this with counsel before launch.*

## Children's privacy (COPPA)

- **No child accounts.** Teacher-provisioned anonymous seats joined by session code.
- **No PII collected, ever** — not names, not emails, not device identifiers tied to a child.
- **No persisted free text** from a child.
- Offline-first delivery means the default classroom session makes no network call at all, which
  removes most of the surface rather than managing it.

## Student records (FERPA)

If it lands in classrooms, keep progress data at the **classroom aggregate** level. Do not build
per-child profiles that then have to be protected. If a district asks for per-student reporting,
that's a paid enterprise conversation with a DPA, not a v1 feature.

## Research ethics

Measuring learning outcomes on minors is research. Aggregate only, IRB review if published,
school-mediated consent, and a plainly worded data promise on the site. Do not build the
surveillance-edtech thing.

## Accessibility

WCAG 2.2 AA as a floor. Keyboard-only path through the entire game. No timed-only mechanics.
Audio narration of clause text. Respect `prefers-reduced-motion`. Spanish at launch.

Constitutional text is genuinely hard to read; a dual-text toggle (original ↔ plain language) is
both an accessibility feature and a teachable moment.

## Historical harm clauses

State constitutions contain repealed slavery, segregation, poll-tax, and marriage-ban
provisions. **This is a data-model problem and it gets solved in the schema.**

- Every clause carries `sensitivity: "none" | "historical_harm" | "teacher_mediated"`.
- Ingest flags candidates; a human sets the final value.
- `historical_harm` clauses never surface raw in a Mirror card to the 8–10 band.
- They surface in the 11–14 band only inside curated framing, with teacher notice ahead of the
  session.

This is the single biggest reputational risk in the project.

## Neutrality

- If a consequence model exists, **publish the weights** and make them inspectable in-game.
  "Here's the math, disagree with it" is defensible; a hidden scoring function is not.
- Recruit a bipartisan reviewer pair (constitutional scholars, one from each side) **at launch,
  not after the first complaint**.
- Run the dominant-strategy test before ship.

## Content moderation

Constrained composition instead of free text. Kids name their state by selecting from curated
word lists. No filter to tune, no moderation queue to staff, no incident to explain.

## Legal text integrity

No constitutional text is ever hand-typed, paraphrased into the clause store, or generated. It
enters only through the ingest pipeline from a cited source with a checksum, and the Quote
Integrity Validator fails the build on any mismatch.
