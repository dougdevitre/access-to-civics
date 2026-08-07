import { z } from 'zod';

/**
 * Plain-language layer. Generated offline in batch, human-reviewed, then FROZEN.
 * Nothing here is produced live in front of a child.
 */
export const Gloss = z.object({
  clause_urn: z.string(),
  grade_5: z.string().nullable(),
  grade_8: z.string().nullable(),
  lang: z.enum(['en', 'es']).default('en'),
  flesch_kincaid: z.number().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  frozen: z.boolean().default(false),
});
export type Gloss = z.infer<typeof Gloss>;

export const READING_LEVEL_BANDS = {
  grade_5: { min: 3.0, max: 6.0 },
  grade_8: { min: 5.5, max: 9.0 },
} as const;

/** CI gate: an unreviewed or unfrozen gloss must never reach a published bundle. */
export function isPublishable(g: Gloss): boolean {
  return g.frozen && g.reviewed_by !== null && g.reviewed_at !== null;
}
