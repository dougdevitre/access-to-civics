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

await probeState({
  host: 'www.nh.gov',
  marker: 'cherish the interest of literature',
  altMarkers: ['Art.] 83', 'Encouragement of Literature', 'two thirds', 'Constitutional Convention'],
  links: true,
  candidates: [
    // The General Court site was rebuilt: gencourt.state.nh.us now redirects to gc.nh.gov and
    // every constitution path there is a 404 whose own body points here.
    'https://www.nh.gov/glance/state-constitution',
    'https://www.nh.gov/glance/constitution.htm',
    'https://sos.nh.gov/administration/state-constitution/',
    'https://gc.nh.gov/rsa/html/NHTOC/NHTOC-CONSTITUTION.htm',
  ],
});
