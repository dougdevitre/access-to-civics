#!/usr/bin/env node
/**
 * CI gate: no unreviewed or unfrozen gloss in a published bundle (docs/07-roadmap.md).
 * Mirrors isPublishable() in src/schema/gloss.ts. Advisory until data/published exists —
 * the gloss pipeline has not run yet.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE_DIR = 'data/published';

if (!existsSync(BUNDLE_DIR)) {
  console.warn(`[gloss-freeze] no ${BUNDLE_DIR} yet — gate is advisory until the gloss pipeline runs`);
  process.exit(0);
}

let failures = 0;
let checked = 0;
for (const file of readdirSync(BUNDLE_DIR).filter((f) => f.endsWith('.json'))) {
  const bundle = JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8'));
  for (const gloss of bundle.glosses ?? []) {
    checked++;
    const publishable = gloss.frozen === true && gloss.reviewed_by != null && gloss.reviewed_at != null;
    if (!publishable) {
      console.error(`[gloss-freeze] unpublishable gloss for ${gloss.clause_urn} in ${file}`);
      failures++;
    }
  }
}

console.log(`[gloss-freeze] ${checked} glosses checked, ${failures} unpublishable`);
process.exit(failures > 0 ? 1 : 0);
