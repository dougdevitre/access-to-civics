#!/usr/bin/env node
/**
 * New Hampshire source probe.
 *
 * New Hampshire is the highest-value state left: it is cited on two different questions.
 * Part Second Art. 83 is the state's duty to cherish education — the clause the Claremont cases
 * read as putting the funding duty on the state (D03-B) — and Part Second Art. 100 is the
 * two-thirds ratification requirement for amendments (D05-B).
 *
 * The URL shape on gencourt.state.nh.us is not documented, so this dumps the constitution
 * index's links rather than guessing. Reading an index beats guessing a URL shape: Delaware's
 * file numbers turned out to be offset from its article numbers, and no guess would have found
 * that.
 */
import { probeState } from './lib/probe.mjs';

const ROOT = 'https://www.gencourt.state.nh.us';

await probeState({
  host: 'www.gencourt.state.nh.us',
  marker: 'cherish the interest of literature',
  altMarkers: ['Art.] 83', 'Encouragement of Literature', 'two thirds', 'Constitutional Convention'],
  // Only constitution-ish links, so the site's global navigation does not drown the mapping.
  links: /constitution|nhconst|Part|Article|Art\./i,
  candidates: [
    `${ROOT}/nhconstitution/nhconstitution.html`,
    `${ROOT}/nhconstitution/`,
    `${ROOT}/rsa/html/nhtoc.htm`,
    `${ROOT}/constitution/constitution.html`,
  ],
});
