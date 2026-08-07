/**
 * Flesch-Kincaid grade level, dependency-free. Used by the reading-level CI gate and the
 * copy-register tests. The syllable counter is a heuristic (English orthography has no
 * exact rule), so thresholds should carry ~0.5 grade of slack rather than sit at the edge.
 */

export function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]e|ed|es)$/, '').replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function fleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'-]/g, ''))
    .filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
}

/**
 * Substitute explicitly-taught vocabulary before scoring. Tier 3 terms (constitution,
 * ratify, …) are defined in the in-game Tricky Words panel, so their syllable weight
 * shouldn't count against the register that teaches them.
 */
export function substituteTaughtTerms(text, terms) {
  let out = text;
  for (const term of terms) {
    out = out.replace(new RegExp(`\\b${term}\\w*`, 'gi'), 'vote');
  }
  return out;
}

/** Max Flesch-Kincaid grade per register. Instructions sit below content level on purpose. */
export const MAX_GRADE = {
  '8-10': 4.8,
  '11-14': 7.8,
};

/** Strings shorter than this many words score unreliably; skip them. */
export const MIN_WORDS = 4;

/** Terms taught by the in-game glossary — keep in sync with GLOSSARY in src/web/copy.ts. */
export const TAUGHT_TERMS = [
  'constitution',
  'convention',
  'delegate',
  'delegation',
  'ratify',
  'ratification',
  'ballot',
  'legislature',
  'legislator',
  'charter',
  'citizen',
  'commission',
  'governor',
  'clause',
  'citation',
];

export function gradeFor(text, band) {
  const prepared = substituteTaughtTerms(text, TAUGHT_TERMS);
  return fleschKincaidGrade(prepared);
}

export function checkString(text, band) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return { ok: true, grade: 0, skipped: true };
  const grade = gradeFor(text, band);
  return { ok: grade <= MAX_GRADE[band], grade, skipped: false };
}
