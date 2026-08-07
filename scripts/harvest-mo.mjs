#!/usr/bin/env node
/**
 * Missouri L0 harvest. The Revisor is an ASP.NET WebForms app; per-section pages resolve
 * via the lenient `section=<ROMAN>++<label>` form. The opaque `bid` parameter is version-
 * scoped and deliberately not used — it cannot be derived and may change under us.
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'mo',
  sectionUrl: (t) => {
    const params = new URLSearchParams({
      constit: 'y',
      section: `${t.article_roman}  ${t.section_label}`,
    });
    return `https://revisor.mo.gov/main/OneSection.aspx?${params.toString()}`;
  },
});
process.exit(failures > 0 ? 1 : 0);
