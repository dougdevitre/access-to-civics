import { describe, expect, it } from 'vitest';
import {
  checkString,
  countSyllables,
  fleschKincaidGrade,
  substituteTaughtTerms,
} from './readability.mjs';

describe('countSyllables', () => {
  it.each([
    ['cat', 1],
    ['paper', 2],
    ['library', 3],
    ['vote', 1],
    ['idea', 2],
  ])('counts %s as %d', (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});

describe('fleschKincaidGrade', () => {
  it('scores simple text low', () => {
    const grade = fleschKincaidGrade('The dog ran. The cat sat. We saw them play.');
    expect(grade).toBeLessThan(2);
  });

  it('scores dense text high', () => {
    const grade = fleschKincaidGrade(
      'Constitutional jurisprudence necessitates comprehensive institutional deliberation regarding intergovernmental appropriations.',
    );
    expect(grade).toBeGreaterThan(12);
  });
});

describe('substituteTaughtTerms', () => {
  it('replaces taught terms and their inflections', () => {
    const out = substituteTaughtTerms('The delegates ratified the constitution.', [
      'delegate',
      'ratify',
      'constitution',
    ]);
    expect(out).toBe('The vote ratified the vote.');
  });
});

describe('checkString', () => {
  it('skips very short strings', () => {
    expect(checkString('Start', '8-10').skipped).toBe(true);
  });

  it('fails adult prose against the 8-10 band', () => {
    const result = checkString(
      'Your delegation will draft a comprehensive constitution encompassing numerous interdependent provisions.',
      '8-10',
    );
    expect(result.ok).toBe(false);
  });

  it('passes kid prose against the 8-10 band', () => {
    const result = checkString('Read both choices out loud. Pick one as a class.', '8-10');
    expect(result.ok).toBe(true);
  });
});
