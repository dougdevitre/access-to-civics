import { describe, expect, it } from 'vitest';
import { Clause } from '../../schema/index.js';
import { validateQuotes } from './quote-integrity.js';

const clause = (urn: string, text: string | null) =>
  Clause.parse({
    urn,
    state: 'MO',
    article: { num: 'III', heading: null },
    section: '49',
    text,
    text_status: text === null ? 'unfetched' : 'verified',
    effective_date: null,
    source_url: 'https://revisor.mo.gov/main/Home.aspx',
  });

const URN = 'urn:const:us:mo:art-03:sec-49';

describe('validateQuotes', () => {
  it('accepts a span that byte-matches the stored clause', () => {
    const clauses = [clause(URN, 'The people reserve power to propose and enact laws.')];
    const spans = [{ location: 'mirror-card:D01-B', clause_urn: URN, quoted_text: 'reserve power' }];
    expect(validateQuotes(spans, clauses)).toEqual([]);
  });

  it('matches dated span URNs against undated stored clauses', () => {
    const clauses = [clause(URN, 'The people reserve power.')];
    const spans = [
      { location: 'x', clause_urn: `${URN}@2024-11-05`, quoted_text: 'reserve power' },
    ];
    expect(validateQuotes(spans, clauses)).toEqual([]);
  });

  it('rejects a span whose clause is unknown', () => {
    const spans = [{ location: 'x', clause_urn: URN, quoted_text: 'anything' }];
    expect(validateQuotes(spans, [])).toEqual([
      { location: 'x', clause_urn: URN, reason: 'UNKNOWN_CLAUSE' },
    ]);
  });

  it('rejects a span whose clause text has not been fetched', () => {
    const spans = [{ location: 'x', clause_urn: URN, quoted_text: 'anything' }];
    expect(validateQuotes(spans, [clause(URN, null)])).toEqual([
      { location: 'x', clause_urn: URN, reason: 'TEXT_NOT_FETCHED' },
    ]);
  });

  it('rejects invented text — the span must be a substring of the source', () => {
    const clauses = [clause(URN, 'The people reserve power.')];
    const spans = [{ location: 'x', clause_urn: URN, quoted_text: 'The people surrender power.' }];
    expect(validateQuotes(spans, clauses)).toEqual([
      { location: 'x', clause_urn: URN, reason: 'NOT_A_SUBSTRING' },
    ]);
  });
});
