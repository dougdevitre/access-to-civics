import { z } from 'zod';

export const Sensitivity = z.enum(['none', 'historical_harm', 'teacher_mediated']);
export type Sensitivity = z.infer<typeof Sensitivity>;

export const ClauseStatus = z.enum(['operative', 'amended', 'repealed', 'superseded']);

/**
 * `text` is nullable on purpose. Clause text enters the system ONLY through the ingest
 * pipeline, from a cited source, with a checksum. It is never hand-typed into a seed file.
 * See docs/adr/0001-no-runtime-llm.md.
 */
export const Clause = z.object({
  urn: z.string(),
  state: z.string().length(2).toUpperCase(),
  article: z.object({ num: z.string(), heading: z.string().nullable() }),
  section: z.string(),
  text: z.string().nullable(),
  text_status: z.enum(['unfetched', 'fetched', 'verified']).default('unfetched'),
  topics: z.array(z.string()).default([]),
  status: ClauseStatus.default('operative'),
  effective_date: z.string().nullable(),
  supersedes: z.string().nullable().default(null),
  source_url: z.string().url(),
  source_sha256: z.string().nullable().default(null),
  sensitivity: Sensitivity.default('none'),
});
export type Clause = z.infer<typeof Clause>;

/** Amendments are first-class so the corpus doubles as a timeline dataset. */
export const AmendmentEvent = z.object({
  state: z.string().length(2),
  ratified_on: z.string(),
  ballot_number: z.string().nullable(),
  subject: z.string(),
  passed: z.boolean(),
  yes_votes: z.number().int().nullable(),
  no_votes: z.number().int().nullable(),
  affects: z.array(z.string()).default([]), // clause URNs
  source_url: z.string().url(),
});
export type AmendmentEvent = z.infer<typeof AmendmentEvent>;

/** Litigation that made the words real. See docs/02-knowledge-base.md, "Text vs. practice". */
export const EnforcementNote = z.object({
  clause_urn: z.string(),
  case_name: z.string(),
  court: z.string(),
  decided_on: z.string(),
  holding_plain: z.string(),
  source_url: z.string().url(),
});
export type EnforcementNote = z.infer<typeof EnforcementNote>;
