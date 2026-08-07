import type { Clause } from '../../schema/index.js';
import { baseUrn } from '../../schema/index.js';

/**
 * Quote Integrity Validator.
 *
 * Any span rendered to a child as constitutional text must byte-match a stored clause.
 * No match => the artifact is rejected, not shipped. This runs in the publish path and in CI.
 *
 * This is the single control that makes "no invented legal text, ever" enforceable rather
 * than aspirational. See docs/adr/0001-no-runtime-llm.md.
 */

export interface QuotedSpan {
  /** Where this appears, for the failure message: "mirror-card:D07-B" */
  location: string;
  clause_urn: string;
  quoted_text: string;
}

export interface QuoteViolation {
  location: string;
  clause_urn: string;
  reason: 'UNKNOWN_CLAUSE' | 'TEXT_NOT_FETCHED' | 'NOT_A_SUBSTRING';
}

export function validateQuotes(spans: QuotedSpan[], clauses: Clause[]): QuoteViolation[] {
  const byUrn = new Map<string, Clause>();
  for (const c of clauses) byUrn.set(baseUrn(c.urn), c);

  const violations: QuoteViolation[] = [];

  for (const span of spans) {
    const clause = byUrn.get(baseUrn(span.clause_urn));
    if (!clause) {
      violations.push({ ...pick(span), reason: 'UNKNOWN_CLAUSE' });
      continue;
    }
    if (clause.text === null) {
      violations.push({ ...pick(span), reason: 'TEXT_NOT_FETCHED' });
      continue;
    }
    if (!clause.text.includes(span.quoted_text.trim())) {
      violations.push({ ...pick(span), reason: 'NOT_A_SUBSTRING' });
    }
  }

  return violations;
}

function pick(s: QuotedSpan) {
  return { location: s.location, clause_urn: s.clause_urn };
}
