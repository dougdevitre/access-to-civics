#!/usr/bin/env node
/**
 * Delaware L0 harvest.
 *
 * Plain HTML, one page per article, no shell and no browser. The one thing to know is that the
 * file numbers do not match the article numbers: constitution-17.html is ARTICLE XVI. The probe
 * found this the hard way — constitution-16.html is a real, complete, correctly-served document,
 * it is just ARTICLE XV. So the file comes from the target rather than from arithmetic, and the
 * marker check is what proves the pairing.
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'de',
  sectionUrl: (t) => `https://delcode.delaware.gov/constitution/${t.source_file}.html`,
  // One document per article, so the raw file is named for the article, not the section.
  fileFor: (t) => `art-${t.article_roman.toLowerCase()}`,
});
process.exit(failures > 0 ? 1 : 0);
