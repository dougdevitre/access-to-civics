#!/usr/bin/env node
/**
 * Nebraska L0 harvest.
 *
 * One plain HTML page per section, no application shell, no browser needed. The section is
 * carried inside the `article` query parameter — `article=III-1`, not `article=III&section=1`.
 * `article=III` on its own answers 200 with an empty body, which is exactly the kind of
 * false success the manifest's marker check exists to catch.
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'ne',
  sectionUrl: (t) =>
    `https://nebraskalegislature.gov/laws/articles.php?article=${t.article_roman}-${t.section_label}`,
});
process.exit(failures > 0 ? 1 : 0);
