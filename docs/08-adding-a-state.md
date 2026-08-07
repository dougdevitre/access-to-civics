# 08 — Adding a state

Three states are in (Missouri, Texas, Nebraska) and the shape of the work is now clear enough to
write down. An adapter is about a hundred lines. The hard part is never the parsing — it is
proving that the bytes you parsed are the bytes the state actually publishes.

Read `docs/02-knowledge-base.md` for the layer model (L0 raw → L1 clauses → L2 glosses → L3 game)
and `docs/06-sources.md` for the per-state notes those three ingests produced.

## The rule that shapes everything else

> Constitutional text enters this repo only through the ingest pipeline, from a cited source,
> with a checksum. Nothing is hand-typed, paraphrased, or recalled from memory.

We cannot accept constitutional text by email, in an issue, or in a pull request diff. Not because
we distrust you — because a rule with exceptions is not a rule, and it is the only thing that makes
the rest of the project trustworthy. It applies to us too.

## Step 0 — Decide what the state is for

Do not start by ingesting a whole constitution. Start with the clauses the game cites, or the one
clause that makes your state worth citing.

Nebraska is one clause. Art. III §1 vests the legislative authority in a Legislature "consisting of
one chamber", and no other state answers that question that way. That single clause is the entire
reason Nebraska is in the corpus, and one clause was the right scope.

Scope widens later by adding entries to `data/seed/<st>/ingest-targets.json` and re-running the
harvest. It is mechanical. Getting the first clause right is not.

## Step 1 — Probe the source

```bash
# write scripts/probe-<st>.mjs, then run it on a GitHub runner:
#   Actions → Ingest probe → Run workflow → state: <st>
```

Copy `scripts/probe-ne.mjs` — it is nine lines. You supply the host, a set of candidate URLs, a
**marker** phrase that must appear if the response is the real document, and optionally looser
`altMarkers` reported when the marker misses.

Run it in the workflow, not locally. Development sandboxes frequently have no egress to state
government sites, and a proxy's 403 looks exactly like a site refusing you.

**Choose the marker from the clause itself.** Something that cannot appear in navigation: "one
chamber", "ad valorem", "two-thirds of all the members elected to each House". Never the state's
name, never "Constitution".

### What the probe protects you from

Every state so far has failed in a way a status code could not detect:

| State | The trap |
|---|---|
| Texas | The public site is an application. Every document URL returns HTTP 200 with an identical 250874-byte shell. The real documents are on a different host entirely, found by recording the requests the site's own application makes. |
| Nebraska | `article=III` with no section answers HTTP 200 with a **37-byte empty body** instead of a 404. |
| Delaware | `constitution-16.html` is **Article XV**. Correct-looking URL, real document, wrong article. |
| California | 160KB responses that are almost entirely framework state wrapped around a few hundred characters of navigation — no law in them at all. |

So: **a status code is not evidence.** The probe reports raw bytes *and* prose bytes precisely
because a large response can be empty of content, and it prints the first 220 characters of prose
on a miss so you can tell a shell (no prose) from the wrong page (plenty of the wrong prose).

## Step 2 — Harvest (L0)

Add `data/seed/<st>/ingest-targets.json` and `scripts/harvest-<st>.mjs`, then run
**Actions → Ingest harvest → state: `<st>`**.

`scripts/lib/harvest.mjs` does everything common: fetch, sha256, byte counts, the marker check, and
the manifest. Your script supplies only the URL for a target. Options worth knowing:

- `sectionUrl` may return an **array** of candidates; the first that returns 200 *and* contains the
  marker wins, and the manifest records which one answered.
- `fileFor` names the raw file, for states whose fetched unit is not the cited unit.
- `render: true` renders in a browser. Treat it as a last resort — a rendered DOM is a weaker
  provenance claim than served bytes, and no state currently needs it.

The workflow commits the raw bytes to `ingest/<st>-raw` with a sha256 manifest. That is the L0
layer, and it is what every later claim is anchored to.

**A missing marker fails the harvest** and nothing is committed. If that happens, the run still
uploads what it fetched as an artifact, so you can look at the bytes and decide whether the URL
was wrong or the marker was. Do not weaken the marker to get past it.

## Step 3 — Write the adapter (L1)

`src/ingest/adapters/` has three worked models. Pick the closest:

| If the source is… | Start from |
|---|---|
| one page per section | `nebraska.ts` |
| one page per article, sections inside | `texas.ts` |
| a query-driven application with lenient parameters | `missouri.ts` |

Implement `fetch()` (read the committed L0 bytes — the network already happened),
`tableOfContents()` (scoped to your targets), and `extract()`.

Three things every adapter must get right:

1. **Cut the editorial matter.** Every state prints something under the clause that is not the
   clause: Missouri's `div.foot` annotations, Texas's parenthetical amendment history, Nebraska's
   `statute_source` list. Capture it separately or drop it, but never let it into `text`.
2. **Alter no words.** `htmlToText` in `adapters/html.ts` decodes entities, strips tags, and
   collapses whitespace. That is the complete list of permitted transformations. Do not normalise
   spelling, punctuation, capitalisation, or archaic usage.
3. **Do not infer.** Nebraska prints amendment *years*, not dates. Amendments are ratified at
   November general elections — and turning that into a date is still inference, so
   `effective_date` is null. Null is an honest answer. A guess is not.

If your source's machine-readable document lives somewhere other than the page a person should
read, set `citation_url` as well as `source_url`. The checksum covers `source_url`; the link a
child follows is `citation_url`. Texas needs both.

Register the adapter in `adapters/registry.ts`, then:

```bash
npm run ingest -- --state XX --dry-run   # verifies, writes nothing
npm run ingest -- --state XX --write     # publishes data/published/xx.json
```

Read the resulting diff. Those are the words a child will read.

## Step 4 — Glosses (L2)

`data/seed/<st>/glosses.json`, two reading levels per clause. `grade_5` is what an 8–10 player
reads under the clause; `grade_8` is for 11–14. Both are enforced in CI by
`scripts/check-reading-level.mjs` — you will fail it, and the right response is usually to shorten
sentences rather than to avoid the word. When a term is load-bearing, teach it in the glossary in
`src/web/copy.ts` instead of writing around it.

A gloss explains **only its own clause**. It never imports rules from neighbouring sections, even
when the neighbour is what makes the clause interesting.

## Step 5 — Tests and gates

Add `src/ingest/adapters/<state>.test.ts` against the **real committed L0 page**, not a synthetic
fixture. The existing three all assert the same shape of thing, and all of it is worth copying:

- the clause parses, with the right article, section, and heading
- the editorial matter is excluded from the body but still captured
- the parser does not bleed into the next section
- the parser **throws** on a page that does not match the verified structure, and on the empty
  body a source might return for a bad id

Then the full local run:

```bash
npm run build && npm run typecheck && npm test && npm run gates && npm run test:a11y
```

You should need **no changes** to the gates themselves. Reading-level discovers gloss files;
the privacy host allowlist derives official source hosts from the published corpus. If you find
yourself editing a gate to accommodate a state, that is a sign the gate was written too narrowly —
fix the gate generally rather than adding your state to a list.

## Step 6 — Write down what you learned

Add a section to `docs/06-sources.md`: the canonical URL shape, the verified page structure, the
trap you hit, and anything a future maintainer would otherwise rediscover the hard way. Every state
so far has had one, and the notes are the most reused artifact in the repo.

## Contributing without writing code

Just as valuable, and often more so:

- **Check a citation.** `data/seed/citation-verification.json` lists every citation from a state we
  have not ingested, with the sources and reasoning behind it.
- **Correct a framing.** A citation can be accurate and still misrepresent what a provision means
  in practice. This is the harder failure and the one we most need help with — it is how both of
  the errors we have found got in.
- **Flag a clause that needs care** before a child reads it: `data/seed/clause-sensitivity.json`.

Open an issue. We will credit you unless you would rather we did not.
