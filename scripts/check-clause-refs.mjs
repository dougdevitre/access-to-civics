#!/usr/bin/env node
/**
 * CI gate: every clause_ref in data/seed/decisions.csv must resolve against the published
 * L1 store. Until ingest has run there is no store, so this exits 0 with a warning — it
 * becomes blocking the moment a bundle exists.
 */
import { readFileSync, existsSync } from 'node:fs';

const DECISIONS = 'data/seed/decisions.csv';
const BUNDLE_DIR = 'data/published';

const rows = readFileSync(DECISIONS, 'utf8').trim().split('\n').slice(1);
const refs = new Set();
for (const row of rows) {
  const cols = row.split(',');
  const raw = (cols[6] ?? '').replace(/^"|"$/g, '');
  for (const r of raw.split(';').filter(Boolean)) refs.add(r.trim());
}

console.log(`[check] ${refs.size} distinct clause refs in ${DECISIONS}`);

if (!existsSync(BUNDLE_DIR)) {
  console.warn(`[check] no ${BUNDLE_DIR} yet — gate is advisory until ingest has run`);
  process.exit(0);
}

// TODO: load bundles, assert every ref resolves, exit 1 on any miss.
console.error('[check] bundle validation not implemented');
process.exit(1);
