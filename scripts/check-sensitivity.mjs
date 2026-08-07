#!/usr/bin/env node
/**
 * CI gate (blocking): implements the "Sensitivity" row of docs/07-roadmap.md and the
 * docs/05-compliance.md rule that historical_harm never surfaces raw in an 8-10 Mirror
 * card. Both bands can reach every decision node, so every referenced clause must:
 *   1. have an entry in the sensitivity review of record (data/seed/clause-sensitivity.json)
 *   2. if non-'none', carry the 8-10 mediation flag and a teacher note
 * and the shipped bundle must carry the same values.
 */
import { readFileSync, existsSync } from 'node:fs';
import { parseCsvRecords } from './lib/csv.mjs';

const review = JSON.parse(readFileSync('data/seed/clause-sensitivity.json', 'utf8')).clauses;
const decisions = parseCsvRecords(readFileSync('data/seed/decisions.csv', 'utf8'));

let failures = 0;
const refs = new Set();
for (const row of decisions) {
  for (const ref of (row.clause_refs ?? '').split(';').map((s) => s.trim()).filter(Boolean)) {
    refs.add(ref);
  }
}

for (const ref of refs) {
  const entry = review[ref];
  if (!entry) {
    console.error(`[sensitivity] no review of record for ${ref} — every reachable clause needs one`);
    failures++;
    continue;
  }
  if (entry.sensitivity !== 'none') {
    if (entry.mediated_8_10 !== true || !entry.teacher_note_8_10) {
      console.error(
        `[sensitivity] ${ref} is ${entry.sensitivity} but lacks 8-10 mediation (mediated_8_10 + teacher_note_8_10)`,
      );
      failures++;
    }
  }
}

// The shipped bundle must agree with the review of record.
const BUNDLE = 'public/bundles/mo-demo.json';
if (existsSync(BUNDLE)) {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8'));
  for (const ref of refs) {
    const clause = bundle.clauses?.[ref];
    const expected = review[ref]?.sensitivity ?? 'unreviewed';
    if (!clause) continue; // clause-refs gate covers missing records
    if (clause.sensitivity !== expected) {
      console.error(
        `[sensitivity] bundle ${ref} carries "${clause.sensitivity}" but review of record says "${expected}" — regenerate the bundle`,
      );
      failures++;
    }
  }
} else {
  console.warn(`[sensitivity] ${BUNDLE} not found — run npm run bundle:demo`);
}

console.log(`[sensitivity] ${refs.size} clause refs checked, ${failures} problem(s)`);
process.exit(failures > 0 ? 1 : 0);
