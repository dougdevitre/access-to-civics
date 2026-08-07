# ADR 0003 — DynamoDB single-table design

**Status:** Accepted
**Date:** 2026-08-06

## Context

The corpus is read-heavy, write-rare (annual re-crawl), and has a small closed set of access
patterns. The dominant query is cross-state comparison on a topic — the Mirror card.

## Decision

One table, `access-to-civics`, with two GSIs.

| Access pattern | PK | SK | Index |
|---|---|---|---|
| Get a state's clause | `STATE#MO` | `CLAUSE#ART09#SEC01A` | base |
| Compare a topic across 50 states | `TOPIC#EDUCATION_ESTABLISHMENT` | `STATE#MO#ART09#SEC01A` | GSI1 |
| Clause version history | `URN#<base-urn>` | `VERSION#2024-11-05` | GSI2 |
| Decision node → options | `NODE#D07` | `OPTION#D07-B` | base |
| Amendment timeline for a state | `STATE#MO` | `AMEND#2024-11-05#03` | base |

GSI1 is the whole game.

## Consequences

- Runtime reads are all `Query`, never `Scan`.
- The table is a **build-time artifact source**, not a live classroom dependency — bundles are
  exported to static JSON per state (see ADR 0001).
- Least-privilege IAM: the publish role writes; the export role reads; nothing in the web tier
  touches DynamoDB at all.
- Secrets and table names resolved from SSM SecureString / env, never hardcoded.
