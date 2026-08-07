# ADR 0002 — Stable clause URNs

**Status:** Accepted
**Date:** 2026-08-06

## Context

Game content authored in year one must still resolve in year five, across constitutional
amendments, renumbering, and source-site redesigns. Content references cannot depend on URLs,
database IDs, or array positions.

## Decision

Every clause gets a stable URN, modelled on the Akoma Ntoso URI labelling convention:

```
urn:const:us:<state>:art-<article>:sec-<section>[@<effective-date>]
```

- Lowercase, zero-padded article numbers, section identifiers slugified.
- The `@date` suffix pins a specific version. **Omitting it means "current operative version."**
- Game content should reference the **undated** form unless it deliberately teaches a historical
  version.
- Superseded versions are retained, never deleted, and linked via `supersedes`.

## Consequences

- Amendments create a new dated URN; the undated form resolves forward automatically.
- Renumbering by a state is a migration event requiring an alias record, not a URN rewrite.
- CI can verify that every `clause_ref` in `data/seed/` resolves against the published L1 store.

Implementation: `src/schema/urn.ts`.
