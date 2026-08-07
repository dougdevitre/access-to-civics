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
  candidates: [
    'https://delcode.delaware.gov/constitution/constitution-16.shtml',
    'https://delcode.delaware.gov/constitution/constitution-16.html',
    'https://delcode.delaware.gov/constitution/16/index.shtml',
    'https://delcode.delaware.gov/constitution/index.shtml',
    'https://legis.delaware.gov/Constitution',
  ],
});
