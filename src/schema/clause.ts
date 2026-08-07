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
  /** The official section heading as printed on the source page, e.g. "Free public schools — age limit". */
  section_heading: z.string().nullable().default(null),
  text: z.string().nullable(),
  text_status: z.enum(['unfetched', 'fetched', 'verified']).default('unfetched'),
  topics: z.array(z.string()).default([]),
  status: ClauseStatus.default('operative'),
  effective_date: z.string().nullable(),
  supersedes: z.string().nullable().default(null),
  source_url: z.string().url(),
  /**
   * Where a person should go to read this clause in context, when that is not the document we
   * hashed. Usually null — Missouri serves the same page to us and to a reader. Texas does not:
   * the machine-readable article HTML lives on tcss.legis.texas.gov, while a reader belongs on
   * statutes.capitol.texas.gov. source_url is always the bytes behind source_sha256; this is the
   * link we show. Keeping them separate means the citation stays useful without ever weakening
   * what the checksum covers.
   */
  citation_url: z.string().url().nullable().default(null),
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
