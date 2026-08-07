/**
 * One adapter per state. Roughly ten adapters cover most HTML format families; the tail is
 * manual. Do NOT hand-write 50 bespoke scrapers — use LLM-assisted structure extraction
 * behind the deterministic verifier in ../pipeline/verify.ts.
 */
import type { Clause } from '../../schema/index.js';

export interface RawDocument {
  url: string;
  fetchedAt: string;
  sha256: string;
  body: string;
}

export interface TableOfContentsEntry {
  articleNum: string;
  heading: string | null;
  sectionCount: number;
}

export interface StateAdapter {
  /** Two-letter state code, uppercase. */
  readonly state: string;

  /** Canonical entry point — legislature or Secretary of State, never an aggregator. */
  readonly sourceRoot: string;

  /** Fetch the raw documents. Must not mutate anything. */
  fetch(): Promise<RawDocument[]>;

  /**
   * The official table of contents, parsed independently of the clause extraction.
   * This is the ground truth the verifier checks extraction against.
   */
  tableOfContents(docs: RawDocument[]): Promise<TableOfContentsEntry[]>;

  /** Extract clauses. `text` must be verbatim from source — never normalized for style. */
  extract(docs: RawDocument[]): Promise<Clause[]>;
}
