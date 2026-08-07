import { describe, expect, it } from 'vitest';
import { UrnError, baseUrn, clauseSortKey, formatUrn, isDated, parseUrn } from './urn.js';

describe('parseUrn', () => {
  it('parses an undated URN', () => {
    expect(parseUrn('urn:const:us:mo:art-09:sec-01a')).toEqual({
      state: 'mo',
      article: '09',
      section: '01a',
    });
  });

  it('parses a dated URN', () => {
    expect(parseUrn('urn:const:us:mo:art-09:sec-01a@2024-11-05')).toEqual({
      state: 'mo',
      article: '09',
      section: '01a',
      effectiveDate: '2024-11-05',
    });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseUrn('  urn:const:us:tx:art-05:sec-02 ').state).toBe('tx');
  });

  it.each([
    'urn:const:us:mo:art-09',            // missing section
    'urn:const:us:MO:art-09:sec-01a',    // uppercase state
    'urn:const:us:mo:art-09:sec-01a@05-11-2024', // bad date
    'not-a-urn',
  ])('rejects %s', (bad) => {
    expect(() => parseUrn(bad)).toThrow(UrnError);
  });
});

describe('formatUrn', () => {
  it('round-trips with parseUrn', () => {
    const urn = 'urn:const:us:mo:art-03:sec-49@2024-11-05';
    expect(formatUrn(parseUrn(urn))).toBe(urn);
  });

  it('slugifies human-style article and section labels', () => {
    expect(formatUrn({ state: 'MO', article: '09', section: '1(a)' })).toBe(
      'urn:const:us:mo:art-09:sec-1a',
    );
  });
});

describe('baseUrn / isDated', () => {
  it('strips the version suffix', () => {
    expect(baseUrn('urn:const:us:mo:art-09:sec-01a@2024-11-05')).toBe(
      'urn:const:us:mo:art-09:sec-01a',
    );
  });

  it('leaves undated URNs untouched', () => {
    expect(baseUrn('urn:const:us:mo:art-09:sec-01a')).toBe('urn:const:us:mo:art-09:sec-01a');
  });

  it('reports dated state', () => {
    expect(isDated('urn:const:us:mo:art-09:sec-01a@2024-11-05')).toBe(true);
    expect(isDated('urn:const:us:mo:art-09:sec-01a')).toBe(false);
  });
});

describe('clauseSortKey', () => {
  it('builds the DynamoDB sort key', () => {
    expect(clauseSortKey({ state: 'mo', article: '09', section: '01a' })).toBe(
      'CLAUSE#ART09#SEC01A',
    );
  });
});
