#!/usr/bin/env node
/**
 * Delaware source probe.
 *
 * Delaware is cited on D01-A: it is the only state whose constitution can be amended with no
 * popular vote at all — two-thirds of each house in two successive General Assemblies, and it is
 * done. That makes it the honest other side of "who can put a law on the ballot", and it is one
 * of the Phase-3 stress cases in docs/07-roadmap.md for exactly that reason.
 *
 * The marker is a phrase from Art. XVI Sec. 1 that cannot appear in a site shell.
 */
import { probeState } from './lib/probe.mjs';

await probeState({
  host: 'delcode.delaware.gov',
  marker: 'two-thirds of all the members elected to each House',
  altMarkers: ['ARTICLE XVI', 'Amendment', 'two-thirds'],
  candidates: [
    // The first probe found that constitution-16.html is ARTICLE XV, not XVI — the file numbers
    // are offset, almost certainly by a preamble file. So Article XVI should be 17.
    'https://delcode.delaware.gov/constitution/constitution-17.html',
    'https://delcode.delaware.gov/constitution/constitution-18.html',
    // Control: the page the first probe actually got.
    'https://delcode.delaware.gov/constitution/constitution-16.html',
    // The index, to read the article-to-file mapping rather than keep guessing it.
    'https://delcode.delaware.gov/constitution/index.html',
  ],
});
