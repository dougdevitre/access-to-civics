#!/usr/bin/env node
/**
 * CI gate (blocking): every kid-facing string in the seed content must sit inside its
 * band's reading level. Implements the "Reading level" row of the docs/07-roadmap.md test
 * plan for the content layer; the UI copy registers are enforced by src/web/copy.test.ts
 * with the same scorer.
 */
import { readFileSync } from 'node:fs';
import { parseCsvRecords } from './lib/csv.mjs';
import { MAX_GRADE, checkString } from './lib/readability.mjs';

let failures = 0;
let checked = 0;

function check(band, where, text) {
  const result = checkString(text, band);
  if (result.skipped) return;
  checked++;
  if (!result.ok) {
    failures++;
    console.error(
      `[reading-level] ${where} (${band}) grade ${result.grade.toFixed(1)} > max ${MAX_GRADE[band]}: "${text}"`,
    );
  }
}

const decisions = parseCsvRecords(readFileSync('data/seed/decisions.csv', 'utf8'));
for (const row of decisions) {
  check('8-10', `decisions.csv ${row.node_id} prompt_8_10`, row.prompt_8_10 ?? '');
  check('11-14', `decisions.csv ${row.node_id} prompt`, row.prompt ?? '');
  check('8-10', `decisions.csv ${row.option_id} label_8_10`, row.option_label_8_10 ?? '');
  check('11-14', `decisions.csv ${row.option_id} label`, row.option_label ?? '');
}

const letters = parseCsvRecords(readFileSync('data/seed/letters.csv', 'utf8'));
for (const row of letters) {
  const band = row.age_band === '8-10' ? '8-10' : '11-14';
  check(band, `letters.csv ${row.letter_id}`, row.body ?? '');
}

const reflections = parseCsvRecords(readFileSync('data/seed/reflections.csv', 'utf8'));
for (const row of reflections) {
  const band = row.age_band === '8-10' ? '8-10' : '11-14';
  check(band, `reflections.csv ${row.node_id}/${row.age_band}`, row.prompt ?? '');
}

console.log(`[reading-level] ${checked} strings checked, ${failures} over band limit`);
process.exit(failures > 0 ? 1 : 0);
