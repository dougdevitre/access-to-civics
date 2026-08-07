#!/usr/bin/env node
/**
 * Texas L0 harvest. The Legislature serves one static page per constitutional section at a
 * predictable path, so unlike Missouri there is nothing to guess: the article is arabic in
 * the URL and roman in the citation, and the section label goes through verbatim
 * (including forms like "1-e").
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'tx',
  sectionUrl: (t) =>
    `https://statutes.capitol.texas.gov/Docs/CN/htm/CN.${t.article_arabic}/CN.${t.article_arabic}.${t.section_label}.htm`,
});
process.exit(failures > 0 ? 1 : 0);
