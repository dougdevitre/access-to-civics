# 01 — Concept: Charter

## The design decision

Don't build a quiz. Build a **drafting simulator** where kids write their own state's charter,
live with the consequences, and then get shown what real states actually did.

That single choice converts 50 constitutions from a trivia bank into a **comparison corpus** —
the only model where having all 50 in the knowledge base is a feature rather than a
content-maintenance tax.

## Core loop

### 1. DRAFT
The convention faces a charter question:

> *"Who gets to put a law on the ballot — only the legislature, or any citizen with enough
> signatures?"*

Each delegate holds an **asymmetric private goal card**: rural counties, a city, kids under 18,
small business, a religious minority. You cannot satisfy all of them, and your goal is secret.

A constitution is a negotiation, not a solo optimization. A game a kid can solve alone teaches
that constitutions are a puzzle with a correct answer. They aren't — they're what's left after
people who disagree run out of leverage.

### 2. NEGOTIATE
Delegates argue, trade, and vote. The teacher chairs the convention (see "Teacher as chair").

### 3. MIRROR — *where the knowledge base earns its keep*
The game reveals 2–4 real states that made this exact choice, with the actual clause text, its
citation, and a plain-language gloss.

> Missouri chose this in Art. III, §49. Delaware went the other way.

Every kid sees **their own state's text** without anyone building 50 curricula.

### 4. RATIFY
The drafted charter must pass a class vote. Losing ratification is the best ten minutes of
learning in the product.

## Consequences are a person, not a stat

`delta_funding: -4` teaches nothing to an eleven-year-old. A letter does.

After each round, one **named citizen** writes to the convention about how the rule landed on
them — a kid whose school lost its music program, a farmer who can't get a road, a family who
won a case *because* of a clause the convention almost cut.

Letters are pre-written at build time, keyed on `(decision_id, outcome_band)`. See
`data/seed/letters.csv`. Cost: one content table. Benefit: the only thing that survives summer.

## Act II — live under your own rule (deferred)

Replay as a governor or judge bound by the class's own charter, facing a case where their clause
produces a result they hate. Self-authored constraint is the entire point of constitutionalism
and no civics game currently does it. **Deferred out of v1** — see the cut list.

## Teacher as convention chair

Teachers adopt what makes them look good and gives them control, not what replaces them. The
teacher console can freeze the convention, inject a crisis, force a debate, and call the
ratification vote. This is a design position, not a dashboard feature.

## Age bands

| Band | Grades | Shape |
|---|---|---|
| 8–10 | 3–5 | 6 decisions, no hidden goals, teacher-led vote |
| 11–14 | 6–8 | 18 decisions, asymmetric goal cards, team negotiation |

## Alternate / companion formats

- **"Whose Job Is It?"** — 90-second sorting arcade routing a problem (pothole, school lunch,
  expired license) to the right branch and level of government. Cheapest to build, works at age
  7, doubles as the ingestion smoke test. **Recommended as the v0 shell.**
- **"Rights Detective"** — kid gets a fact pattern and hunts the clause that protects them.
  Strongest fit with the Access To justice pillar.
- **"Amendment Arcade"** — run a real ballot-measure campaign: signatures, ballot language,
  surviving the opposition ad. Best for grades 7–9.

These become Charter's interstitials, not separate products.

## The trap to design against

If one charter reliably scores best, you've built propaganda with a scoreboard. At least four
very different charters must be able to win. Make it a test: run 10,000 simulated playthroughs
and check the win distribution across strategy archetypes. Lopsided ⇒ retune before launch.
