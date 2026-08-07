#!/usr/bin/env node
/**
 * Florida source probe.
 *
 * Florida is cited on D05-B: Art. XI Sec. 5(e) is the sixty-percent threshold a constitutional
 * amendment must clear at the ballot — the supermajority side of "how hard should it be to change
 * the rules". The Senate publishes the constitution; whether it is one document or many is what
 * this establishes.
 */
import { probeState } from './lib/probe.mjs';

await probeState({
  host: 'www.flsenate.gov',
  marker: 'sixty percent of the electors voting on the measure',
  altMarkers: ['sixty percent', 'ARTICLE XI', 'AMENDMENTS'],
  links: /Constitution|Article|ARTICLE/i,
  candidates: [
    'https://www.flsenate.gov/Laws/Constitution',
    'https://www.flsenate.gov/Laws/Constitution#A11S05',
    'https://www.flsenate.gov/Laws/Constitution/2024',
  ],
});
