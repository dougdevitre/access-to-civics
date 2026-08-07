import { describe, expect, it } from 'vitest';
import { checkString } from '../../scripts/lib/readability.mjs';
import { COPY, GLOSSARY, NEUTRAL, termsIn } from './copy.js';
import type { Band } from './game/bundle.js';

/**
 * The reading-level gate for UI copy: every string a child can read must sit inside its
 * band's Flesch-Kincaid ceiling (glossary-taught terms substituted first — they are
 * explicitly defined in the Tricky Words panel).
 */

const SAMPLE_ARGS: Record<string, unknown[]> = {
  setupIntro: [4],
  voteCount: [3],
  adopted: ['Every grown-up citizen'],
  mindChanged: [2],
  mindSummary: [3],
  letterFrom: ['Maya', 9],
  ratifyTally: [3, 2],
  questionEyebrow: [1, 4, 'Schools'],
  seatEyebrow: [1, 'Teachers'],
  phaseName: ['negotiate'],
  handoffTitle: [2, 'The big city'],
  charterDocTitle: ['Missouri'],
  articleLabel: [1],
};

function realize(key: string, value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'function') {
    const args = SAMPLE_ARGS[key];
    if (!args) throw new Error(`No sample args for copy function "${key}" — add them to SAMPLE_ARGS`);
    return (value as (...a: unknown[]) => string)(...args);
  }
  throw new Error(`Unexpected copy value type for "${key}"`);
}

describe.each(['8-10', '11-14'] as Band[])('copy register %s', (band) => {
  const register = COPY[band];
  for (const [key, value] of Object.entries(register)) {
    it(`"${key}" reads at or below the ${band} ceiling`, () => {
      const text = realize(key, value);
      const result = checkString(text, band);
      expect(
        result.ok,
        `${key} scored grade ${result.grade.toFixed(1)} for band ${band}: "${text}"`,
      ).toBe(true);
    });
  }
});

/** Sample arguments per neutral copy function, so every string can be realized and scored. */
const NEUTRAL_ARGS: Record<string, unknown[]> = {
  pilot: ['Missouri'],
  factQuestions: [5],
  // Two states ingested, so the branch that names a state count is the one scored.
  factClauses: [14, 2],
};

describe('neutral chrome copy', () => {
  for (const [key, value] of Object.entries(NEUTRAL)) {
    it(`"${key}" is readable by the youngest band`, () => {
      const text =
        typeof value === 'function'
          ? (value as (...args: unknown[]) => string)(...(NEUTRAL_ARGS[key] ?? ['Missouri']))
          : value;
      const result = checkString(text, '8-10');
      expect(
        result.ok,
        `${key} scored grade ${result.grade.toFixed(1)}: "${text}"`,
      ).toBe(true);
    });
  }
});

describe('glossary', () => {
  it('defines every entry in kid language', () => {
    for (const entry of GLOSSARY) {
      const result = checkString(entry.kid, '8-10');
      expect(
        result.ok,
        `glossary "${entry.term}" definition scored grade ${result.grade.toFixed(1)}: "${entry.kid}"`,
      ).toBe(true);
    }
  });

  it('finds terms present in text', () => {
    const terms = termsIn('Do you ratify this constitution?').map((t) => t.term);
    expect(terms).toContain('ratify');
    expect(terms).toContain('constitution');
  });
});
