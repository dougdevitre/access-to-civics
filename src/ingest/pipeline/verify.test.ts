import { describe, expect, it } from 'vitest';
import { Clause } from '../../schema/index.js';
import type { TableOfContentsEntry } from '../adapters/types.js';
import { corpusChecksum, verifyExtraction } from './verify.js';

const clause = (urn: string, articleNum: string, text: string | null) =>
  Clause.parse({
    urn,
    state: 'MO',
    article: { num: articleNum, heading: null },
    section: '1',
    text,
    text_status: text === null ? 'unfetched' : 'fetched',
    effective_date: null,
    source_url: 'https://revisor.mo.gov/main/Home.aspx',
  });

const toc = (articleNum: string, sectionCount: number): TableOfContentsEntry => ({
  articleNum,
  heading: null,
  sectionCount,
});

describe('verifyExtraction', () => {
  it('passes when extraction matches the table of contents', () => {
    const clauses = [
      clause('urn:const:us:mo:art-01:sec-1', 'I', 'text one'),
      clause('urn:const:us:mo:art-01:sec-2', 'I', 'text two'),
    ];
    const result = verifyExtraction(clauses, [toc('I', 2)], []);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('flags a section count mismatch', () => {
    const result = verifyExtraction([clause('urn:x', 'I', 't')], [toc('I', 3)], []);
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('SECTION_COUNT_MISMATCH');
  });

  it('flags articles absent from the official ToC', () => {
    const result = verifyExtraction(
      [clause('urn:x', 'I', 't'), clause('urn:y', 'XCIX', 't')],
      [toc('I', 1)],
      [],
    );
    expect(result.issues.map((i) => i.code)).toContain('ORPHAN_ARTICLE');
  });

  it('flags fetched clauses with empty text', () => {
    const bad = { ...clause('urn:x', 'I', 'ok'), text: '   ' };
    const result = verifyExtraction([bad], [toc('I', 1)], []);
    expect(result.issues.map((i) => i.code)).toContain('EMPTY_TEXT');
  });

  it('does not flag empty text on unfetched clauses', () => {
    const result = verifyExtraction([clause('urn:x', 'I', null)], [toc('I', 1)], []);
    expect(result.issues.map((i) => i.code)).not.toContain('EMPTY_TEXT');
  });
});

describe('corpusChecksum', () => {
  const a = clause('urn:const:us:mo:art-01:sec-1', 'I', 'alpha');
  const b = clause('urn:const:us:mo:art-02:sec-1', 'II', 'beta');

  it('is order-independent', () => {
    expect(corpusChecksum([a, b])).toBe(corpusChecksum([b, a]));
  });

  it('changes when any clause text changes', () => {
    const mutated = { ...b, text: 'gamma' };
    expect(corpusChecksum([a, b])).not.toBe(corpusChecksum([a, mutated]));
  });
});
