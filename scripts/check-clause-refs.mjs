#!/usr/bin/env node
/**
 * CI gate: every clause_ref in data/seed/decisions.csv must be a well-formed clause URN,
 * and — once published bundles exist under data/published — must resolve against them.
 * Until ingest has run there is no store, so the resolution half stays advisory.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsvRecords } from './lib/csv.mjs';

const DECISIONS = 'data/seed/decisions.csv';
const BUNDLE_DIR = 'data/published';
const URN_RE = /^urn:const:us:[a-z]{2}:art-[a-z0-9-]+:sec-[a-z0-9-]+(?:@\d{4}-\d{2}-\d{2})?$/;

const records = parseCsvRecords(readFileSync(DECISIONS, 'utf8'));
const refs = new Set();
let malformed = 0;
for (const rec of records) {
  for (const ref of (rec.clause_refs ?? '').split(';').map((s) => s.trim()).filter(Boolean)) {
    refs.add(ref);
    if (!URN_RE.test(ref)) {
      console.error(`[check] malformed clause URN at ${rec.node_id}/${rec.option_id}: "${ref}"`);
      malformed++;
    }
  }
}

console.log(`[check] ${refs.size} distinct clause refs in ${DECISIONS}`);
if (malformed > 0) process.exit(1);

if (!existsSync(BUNDLE_DIR)) {
  console.warn(`[check] no ${BUNDLE_DIR} yet — resolution check is advisory until ingest has run`);
  process.exit(0);
}

// Resolution is required only for states whose corpus has been published. Refs to states
// without an adapter yet stay advisory — their Mirror cards honestly say "pending".
const published = new Set();
const publishedStates = new Set();
for (const file of readdirSync(BUNDLE_DIR).filter((f) => f.endsWith('.json'))) {
  const bundle = JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8'));
  if (bundle.state) publishedStates.add(String(bundle.state).toLowerCase());
  for (const clause of bundle.clauses ?? []) published.add(baseUrn(clause.urn));
}

const stateOf = (ref) => ref.split(':')[3] ?? '';
const inScope = [...refs].filter((ref) => publishedStates.has(stateOf(ref)));
const advisory = refs.size - inScope.length;
const misses = inScope.filter((ref) => !published.has(baseUrn(ref)));
for (const miss of misses) console.error(`[check] unresolvable clause ref: ${miss}`);
console.log(
  `[check] ${inScope.length} refs checked against published states (${[...publishedStates].join(', ')}), ` +
  `${advisory} advisory (state not yet published), ${misses.length} unresolvable`,
);
process.exit(misses.length > 0 ? 1 : 0);

function baseUrn(urn) {
  const at = urn.indexOf('@');
  return at === -1 ? urn : urn.slice(0, at);
}
