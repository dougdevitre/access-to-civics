#!/usr/bin/env node
/**
 * Texas L0 harvest.
 *
 * The Legislature's site is a JavaScript application as of 2026: every URL returns the same
 * shell and the constitutional text is rendered client-side, so a static fetch returns the
 * index for every section. We render instead. The path itself is still deterministic — the
 * article is arabic in the URL and roman in the citation, and the section label goes through
 * verbatim, including forms like "1-e".
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'tx',
  render: true,
  sectionUrl: (t) =>
    `https://statutes.capitol.texas.gov/Docs/CN/htm/CN.${t.article_arabic}/CN.${t.article_arabic}.${t.section_label}.htm`,
});
process.exit(failures > 0 ? 1 : 0);
