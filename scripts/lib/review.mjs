/**
 * Who has actually checked the editorial layer.
 *
 * The clause TEXT is byte-verified against a hashed source, so nobody has to take our word for
 * it. The GLOSS is different: it is the sentence a child reads and believes, and no checksum can
 * tell you whether it is a fair account of the clause above it. The same is true of the
 * sensitivity call, which decides whether an eight-year-old sees a clause at all.
 *
 * Those were drafted in one editorial pass and marked `initial-editorial-pass`. That string is a
 * placeholder, not a person. isPublishable() in src/schema/gloss.ts only asks that reviewed_by be
 * non-null, so the placeholder satisfies it — which is how an unreviewed corpus passes a gate
 * named "gloss freeze". This module exists to make that distinction visible everywhere it matters.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Strings that look like a reviewer but are not a person. */
export const PLACEHOLDER_REVIEWERS = new Set(['initial-editorial-pass', 'unreviewed', 'tbd', '']);

export function isNamedReviewer(value) {
  return typeof value === 'string' && !PLACEHOLDER_REVIEWERS.has(value.trim().toLowerCase());
}

export const CORPUS_DIR = 'data/published';

/** Every published corpus, newest schema shape, sorted by state for stable output. */
export function loadCorpora(dir = CORPUS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => String(a.state).localeCompare(String(b.state)));
}

/** Sensitivity is a review of record too, and it has exactly the same placeholder problem. */
export function loadSensitivity(file = 'data/seed/clause-sensitivity.json') {
  if (!existsSync(file)) return { reviewed_by: null, clauses: {} };
  return JSON.parse(readFileSync(file, 'utf8'));
}
