#!/usr/bin/env node
/**
 * Texas L0 harvest.
 *
 * The public site (statutes.capitol.texas.gov) is an Angular application: every document URL
 * returns the same shell and the text is fetched client-side. scripts/probe-tx.mjs recorded
 * the requests that application makes and found the real documents on a separate static host,
 * tcss.legis.texas.gov, one HTML file per article. Those are plain bytes, so no browser is
 * needed and the provenance claim stays as strong as Missouri's.
 *
 * Two URL forms are tried in order. The application itself requests the doubled-slash form
 * (resources//CN/...), which is what we know works; the clean form is preferred if the server
 * accepts it, and the manifest records which one answered.
 */
import { harvestState } from './lib/harvest.mjs';

const DOC_HOST = 'https://tcss.legis.texas.gov';

const failures = await harvestState({
  state: 'tx',
  sectionUrl: (t) => [
    `${DOC_HOST}/resources/CN/htm/CN.${t.article_arabic}.htm`,
    `${DOC_HOST}/resources//CN/htm/CN.${t.article_arabic}.htm`,
  ],
  // One document per article, so the raw file is named for the article, not the section.
  fileFor: (t) => `art-${t.article_arabic.padStart(2, '0')}`,
});
process.exit(failures > 0 ? 1 : 0);
