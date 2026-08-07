import type { StateAdapter, RawDocument, TableOfContentsEntry } from './types.js';
import type { Clause } from '../../schema/index.js';

/**
 * Missouri — pilot state.
 *
 * STATUS: skeleton. Nothing is implemented, and that is deliberate — no clause text should
 * exist in this repo until it has come through fetch() with a checksum.
 *
 * ASSUMPTION: the Missouri Revisor of Statutes site is the canonical source and exposes
 * stable per-section anchors. Verify before building the parser; if anchors turn out to be
 * session-generated, fall back to whole-article fetch plus offset-based extraction.
 */
export class MissouriAdapter implements StateAdapter {
  readonly state = 'MO';
  readonly sourceRoot = 'https://revisor.mo.gov/main/Home.aspx';

  async fetch(): Promise<RawDocument[]> {
    throw new Error('MissouriAdapter.fetch not implemented — see docs/07-roadmap.md Phase 0');
  }

  async tableOfContents(_docs: RawDocument[]): Promise<TableOfContentsEntry[]> {
    throw new Error('MissouriAdapter.tableOfContents not implemented');
  }

  async extract(_docs: RawDocument[]): Promise<Clause[]> {
    throw new Error('MissouriAdapter.extract not implemented');
  }
}
