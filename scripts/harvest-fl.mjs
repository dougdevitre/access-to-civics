#!/usr/bin/env node
/**
 * Florida L0 harvest.
 *
 * The Senate publishes the whole constitution as a single document — 622KB, every article and
 * section in it, navigated by fragment anchors. So one fetch covers every target we will ever
 * have, and the raw file is named for the document rather than for any section in it.
 */
import { harvestState } from './lib/harvest.mjs';

const failures = await harvestState({
  state: 'fl',
  sectionUrl: () => 'https://www.flsenate.gov/Laws/Constitution',
  fileFor: () => 'constitution',
});
process.exit(failures > 0 ? 1 : 0);
