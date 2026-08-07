#!/usr/bin/env node
/**
 * Nebraska source probe.
 *
 * Nebraska is worth ingesting for one clause: Art. III §1 vests the legislative authority in a
 * Legislature "consisting of one chamber". It is the only unicameral state, which makes it the
 * honest other side of a question every other state answers the same way.
 *
 * The URL shape on nebraskalegislature.gov is not documented, so the plausible forms are tried
 * and the log decides. "one chamber" cannot appear in a generic site shell, so it is a safe marker.
 */
import { probeState } from './lib/probe.mjs';

const ROOT = 'https://nebraskalegislature.gov';

await probeState({
  host: 'nebraskalegislature.gov',
  marker: 'one chamber',
  candidates: [
    `${ROOT}/laws/articles.php?article=III`,
    `${ROOT}/laws/constitution.php?article=III&section=1`,
    `${ROOT}/laws/articles.php?article=III-1`,
    `${ROOT}/laws/statutes.php?statute=III-1`,
    `${ROOT}/laws/browse-constitution.php`,
  ],
});
