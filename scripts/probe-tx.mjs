#!/usr/bin/env node
/**
 * Texas source probe. Kept after the Texas adapter shipped: it is the record of how the document
 * host was found, and re-running it is the fastest way to tell whether the site has moved again.
 *
 * What it established (2026-08): statutes.capitol.texas.gov is an Angular application that answers
 * HTTP 200 with an identical 250874-byte shell for every document path, and the real documents are
 * served by tcss.legis.texas.gov, one file per article.
 */
import { probeState } from './lib/probe.mjs';

const SITE = 'https://statutes.capitol.texas.gov';
const DOCS = 'https://tcss.legis.texas.gov';

await probeState({
  host: 'statutes.capitol.texas.gov',
  marker: 'supreme court',
  candidates: [
    // The host we now harvest from.
    `${DOCS}/resources/CN/htm/CN.5.htm`,
    // The public paths, all of which return the application shell.
    `${SITE}/Docs/CN/htm/CN.5.htm`,
    `${SITE}/Docs/CN/htm/CN.5/CN.5.2.htm`,
    `${SITE}/GetStatute.aspx?code=CN&level=SE&value=5.2`,
  ],
  renderUrl: `${SITE}/Docs/CN/htm/CN.5/CN.5.2.htm`,
});
