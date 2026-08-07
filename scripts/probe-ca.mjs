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
  candidates: [
    `${ROOT}/codes_displaySection.xhtml?lawCode=CONS&sectionNum=SEC.%208.&articleNum=ARTICLE%202`,
    `${ROOT}/codes_displayText.xhtml?lawCode=CONS&article=ARTICLE%202`,
    `${ROOT}/codes_displayexpandedbranch.xhtml?tocCode=CONS&article=ARTICLE%202`,
    `${ROOT}/codes_displaySection.xhtml?lawCode=CONS&sectionNum=SEC.+8.&articleNum=ARTICLE+2`,
  ],
});
