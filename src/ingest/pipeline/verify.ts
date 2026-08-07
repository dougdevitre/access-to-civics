import { createHash } from 'node:crypto';
import type { Clause } from '../../schema/index.js';
import type { RawDocument, TableOfContentsEntry } from '../adapters/types.js';

export interface VerificationIssue {
  severity: 'error' | 'warning';
  code: string;
  detail: string;
}

export interface VerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
}

/**
 * The deterministic verifier. LLM-assisted extraction is fine; unverified extraction is not.
 *
 * Checks:
 *  1. Article and section counts match the official table of contents.
 *  2. No clause references an article absent from the ToC (no orphans).
 *  3. Every clause carries a source URL and a non-empty verbatim text.
 *  4. Concatenated extracted text checksums are recorded for diffing against the next crawl.
 */
export function verifyExtraction(
  clauses: Clause[],
  toc: TableOfContentsEntry[],
  _docs: RawDocument[],
): VerificationResult {
  const issues: VerificationIssue[] = [];
  const tocByArticle = new Map(toc.map((t) => [t.articleNum, t]));

  const extractedCounts = new Map<string, number>();
  for (const c of clauses) {
    extractedCounts.set(c.article.num, (extractedCounts.get(c.article.num) ?? 0) + 1);
  }

  for (const [articleNum, expected] of tocByArticle) {
    const actual = extractedCounts.get(articleNum) ?? 0;
    if (actual !== expected.sectionCount) {
      issues.push({
        severity: 'error',
        code: 'SECTION_COUNT_MISMATCH',
        detail: `Article ${articleNum}: ToC says ${expected.sectionCount}, extracted ${actual}`,
      });
    }
  }

  for (const articleNum of extractedCounts.keys()) {
    if (!tocByArticle.has(articleNum)) {
      issues.push({
        severity: 'error',
        code: 'ORPHAN_ARTICLE',
        detail: `Extracted article ${articleNum} does not appear in the official ToC`,
      });
    }
  }

  for (const c of clauses) {
    if (!c.source_url) {
      issues.push({ severity: 'error', code: 'MISSING_SOURCE', detail: c.urn });
    }
    if (c.text_status !== 'unfetched' && (!c.text || c.text.trim().length === 0)) {
      issues.push({ severity: 'error', code: 'EMPTY_TEXT', detail: c.urn });
    }
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues };
}

/** Corpus checksum, for diffing one crawl against the next. Amendments ratify in November. */
export function corpusChecksum(clauses: Clause[]): string {
  const h = createHash('sha256');
  for (const c of [...clauses].sort((a, b) => a.urn.localeCompare(b.urn))) {
    h.update(c.urn).update('\u0000').update(c.text ?? '').update('\u0000');
  }
  return h.digest('hex');
}
