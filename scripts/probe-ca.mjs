#!/usr/bin/env node
/**
 * California source probe.
 *
 * California is cited on D01-B, the initiative side, and is the Phase-3 stress case for
 * initiative-heavy states. Art. II Sec. 8 is the clause that defines the power.
 *
 * leginfo.legislature.ca.gov is a JSF application, so the section and article are query
 * parameters rather than a path, and there is more than one plausible entry point. The marker is
 * the opening words of Sec. 8(a).
 */
import { probeState } from './lib/probe.mjs';

const ROOT = 'https://leginfo.legislature.ca.gov/faces';

await probeState({
  host: 'leginfo.legislature.ca.gov',
  marker: 'the power of the electors to propose statutes',
  altMarkers: ['initiative', 'electors', 'ARTICLE 2', 'VOTING, INITIATIVE'],
  candidates: [
    // The first probe showed every leginfo GET returns ~160KB that is almost entirely JSF
    // ViewState, with a few hundred characters of navigation and no statutory text. These vary
    // the parameter spelling in case one of them is the form the server will actually render.
    `${ROOT}/codes_displaySection.xhtml?lawCode=CONS&sectionNum=SEC.%208.&articleNum=ARTICLE%202`,
    `${ROOT}/codes_displayText.xhtml?lawCode=CONS&division=&title=&part=&chapter=&article=ARTICLE%202`,
    `${ROOT}/codes_displayText.xhtml?lawCode=CONS&article=ARTICLE+2`,
    // The Legislative Counsel also publishes the codes as downloadable files, which would be a
    // document rather than an application response.
    'https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip',
  ],
});
