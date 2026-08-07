# 09 — Editorial review

## The two claims on a clause card, and why only one is verified

Every Mirror card makes two claims, and they do not carry the same weight.

**The clause text is verified by machine.** It is fetched from the state's official site, stored
with a sha256 checksum under `data/raw/`, extracted by a per-state adapter, and re-checked on
every build. The quote-integrity gate fails the release if a single character of rendered text
does not byte-match the stored document. Nothing is hand-typed and nothing is paraphrased. This
claim needs nobody's word for it, including ours.

**The plain-language gloss is not verified, and cannot be.** A gloss is the sentence a child
actually reads and believes. No checksum can tell you whether it is a fair account of the clause
printed above it. The same is true of the sensitivity call, which decides whether an eight-year-old
sees a clause at all, and of the citation's *fit* — whether a provision really stands for the
proposition we attach it to.

That second category is where this project has been wrong before, twice, in ways that looked fine:

- Virginia's **modern universal-suffrage clause** was cited as authority for a landowner-only
  franchise. The citation was to a real, current provision. It said close to the opposite of what
  we used it for.
- New Hampshire's **state education-duty clause** was attached to the local-funding option,
  reversing what the *Claremont* cases hold it to mean. New Hampshire's local-funding system was
  not enshrined by that article; it was struck down under it.

Neither was a typo, a broken link, or a checksum failure. Both were plausible, well-formed, and
wrong. A machine cannot catch that class of error. A person who knows the state can.

## Current status

`npm run review:status` prints it. As of August 2026:

- **0 of 18** glosses signed off by a named person
- **0 of 22** sensitivity calls signed off by a named person

Everything carries `initial-editorial-pass`, which is a placeholder, not a person. Note that the
gloss-freeze gate passes anyway: `isPublishable()` in `src/schema/gloss.ts` only asks that
`reviewed_by` be non-null, so a placeholder satisfies a gate named "gloss freeze". That is a real
weakness in the gate and it is stated here rather than hidden. The app's grown-ups page reports
the count so a reader is told directly.

## Doing a review

```bash
npm run review:sheet     # writes review/<state>.md from the published corpus
npm run review:status    # who has signed off on what
```

`review/<state>.md` pairs every clause's verbatim text — with its source URL and checksum — with
both glosses and the sensitivity call, followed by five questions and a place to sign. It renders
on GitHub, so a reviewer never has to open a JSON file.

The five questions, in the order they matter:

1. Does the citation point at the provision we say it does?
2. Is the 8–10 gloss a fair account of this clause?
3. Is the 11–14 gloss a fair account of this clause?
4. Does either gloss leave out a qualification that changes the meaning?
5. Is the sensitivity call right for a child of that age?

**Question 4 is the one we most need.** A gloss can be accurate and still misleading — by dropping
the qualification that matters, or by making a contested reading sound settled. That is the harder
failure and the one no gate will ever catch.

## Recording sign-off

Sign-off lives in the seed data, never in the generated sheet.

- Glosses: `data/seed/<state>/glosses.json` — set `reviewed_by` to your name or your committee's
  and `reviewed_at` to the date, per gloss.
- Sensitivity: `data/seed/clause-sensitivity.json` — `reviewed_by` and `reviewed_at` at the top.

Then `npm run ingest -- --state <XX> --write`, `npm run review:sheet`, `npm run review:status`.
The count is carried into the shipped bundle, so the app tells the truth about itself either way.

If you disagree with a gloss, open an issue rather than editing it in place. The disagreement is
worth keeping, and a corrected gloss with no record of what it used to say teaches nobody anything.

## Who we are asking

The people who would actually know, in rough order of how much a "no" from them would change:

| Who | What they would catch |
|---|---|
| State revisors and legislative counsel offices | A citation pointing at a superseded or misnumbered provision |
| Law librarians | The same, plus which edition of a historical constitution we should be citing |
| Bar association law-related-education committees | A gloss that states a contested reading as settled |
| State constitutional-law academics | Text-versus-practice gaps like *Claremont* |
| Teachers, and students | A gloss that is accurate and still lands wrong with a real child |

The last row is not a courtesy. A teacher noticing "that is not what that clause means" is the
single most valuable thing that can happen to this project.

## What we cannot accept

Constitutional text by email, or hand-typed. Words enter only through the ingest pipeline, from an
official source, with a checksum. That rule is what makes everything else trustworthy, and it
applies to us too. Corrections to *glosses*, *framings*, *sensitivity calls*, and *citations* are
exactly what we are asking for — those are ours, and they are the part that has been wrong.
