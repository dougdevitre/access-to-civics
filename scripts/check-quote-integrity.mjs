#!/usr/bin/env node
/**
 * CI gate (blocking): the Quote Integrity rule from docs/adr/0001-no-runtime-llm.md,
 * enforced at the shipped-artifact level. Every non-null clause text in the web bundle
 * must byte-equal the published corpus text for the same URN — no invented, trimmed, or
 * "improved" legal text can ship. Advisory until a corpus exists under data/published/.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE_DIR = 'data/published';
const WEB_BUNDLE = 'public/bundles/mo-demo.json';

if (!existsSync(BUNDLE_DIR)) {
  console.warn(`[quote] no ${BUNDLE_DIR} yet — gate is advisory until ingest has run`);
  process.exit(0);
}

const corpus = new Map();
for (const file of readdirSync(BUNDLE_DIR).filter((f) => f.endsWith('.json'))) {
  const bundle = JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8'));
  for (const clause of bundle.clauses ?? []) corpus.set(baseUrn(clause.urn), clause.text);
}

if (!existsSync(WEB_BUNDLE)) {
  console.error(`[quote] ${WEB_BUNDLE} missing — run npm run bundle:demo`);
  process.exit(1);
}

let failures = 0;
let checked = 0;
const web = JSON.parse(readFileSync(WEB_BUNDLE, 'utf8'));
for (const clause of Object.values(web.clauses ?? {})) {
  if (clause.text === null || clause.text === undefined) continue;
  checked++;
  const published = corpus.get(baseUrn(clause.urn));
  if (published === undefined) {
    console.error(`[quote] ${clause.urn} renders text but has no published corpus entry`);
    failures++;
  } else if (clause.text !== published) {
    console.error(`[quote] ${clause.urn} text does NOT byte-match the published corpus`);
    failures++;
  }
}

console.log(`[quote] ${checked} rendered clause texts checked against the corpus, ${failures} violation(s)`);
process.exit(failures > 0 ? 1 : 0);

function baseUrn(urn) {
  const at = urn.indexOf('@');
  return at === -1 ? urn : urn.slice(0, at);
}
