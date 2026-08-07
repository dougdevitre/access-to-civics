#!/usr/bin/env node
/**
 * Editorial review status — a REPORT, not a gate.
 *
 * It answers the one question a district reviewer, a teacher, or a bar association volunteer
 * actually wants answered: how much of what a child reads has been checked by a named person?
 *
 * It does not fail the build. Failing on "not yet reviewed" would only teach us to write a
 * fake name into the field, which is exactly the failure mode it is here to expose.
 * Run `npm run review:sheet` to produce the document a reviewer works through.
 */
import { isNamedReviewer, loadCorpora, loadSensitivity } from './lib/review.mjs';

const corpora = loadCorpora();
if (corpora.length === 0) {
  console.log('[review] no published corpus yet — nothing to review.');
  process.exit(0);
}

let glossTotal = 0;
let glossNamed = 0;
const rows = [];

for (const corpus of corpora) {
  const glosses = corpus.glosses ?? [];
  const named = glosses.filter((g) => isNamedReviewer(g.reviewed_by));
  glossTotal += glosses.length;
  glossNamed += named.length;
  rows.push({
    state: corpus.state,
    clauses: (corpus.clauses ?? []).length,
    glosses: glosses.length,
    named: named.length,
    reviewers: [...new Set(named.map((g) => g.reviewed_by))],
  });
}

console.log('[review] editorial layer — checked by a named person?\n');
console.log('  state  clauses  glosses  named  reviewer(s)');
for (const r of rows) {
  console.log(
    `  ${String(r.state).padEnd(6)} ${String(r.clauses).padStart(7)} ${String(r.glosses).padStart(8)} ` +
      `${String(r.named).padStart(6)}  ${r.reviewers.join(', ') || '—'}`,
  );
}

const sensitivity = loadSensitivity();
const sensitivityCount = Object.keys(sensitivity.clauses ?? {}).length;
const sensitivityNamed = isNamedReviewer(sensitivity.reviewed_by);

console.log(
  `\n  glosses      ${glossNamed}/${glossTotal} checked by a named person` +
    `\n  sensitivity  ${sensitivityNamed ? sensitivityCount : 0}/${sensitivityCount} checked by a named person` +
    `${sensitivityNamed ? ` (${sensitivity.reviewed_by})` : ` (marked "${sensitivity.reviewed_by}")`}`,
);

if (glossNamed < glossTotal || !sensitivityNamed) {
  console.log(
    '\n  The clause text is byte-verified and needs no one\'s word for it. The glosses and the\n' +
      '  sensitivity calls are editorial judgement, and a checksum cannot check them. Until a\n' +
      '  named person signs off, the app says so on the grown-ups page — and it should.\n' +
      '  Next: npm run review:sheet, then docs/09-editorial-review.md.',
  );
}
