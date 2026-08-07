import { readFileSync } from 'node:fs';
import { Clause } from '../../schema/index.js';
import { htmlToText } from './html.js';
import type { RawDocument, StateAdapter, TableOfContentsEntry } from './types.js';

/**
 * Florida adapter. VERIFIED 2026-08 by scripts/probe-fl.mjs.
 *
 * The Senate publishes the **entire constitution as one 622KB document**, navigated by fragment
 * anchors (`#A11S05` is Article XI Section 5). That is the widest gap yet between the fetched
 * unit and the cited unit — one document, every clause we will ever cite — which is exactly what
 * `source_url` (the bytes the checksum covers) and `citation_url` (where a reader is sent) are
 * for. Every Florida target shares one raw file and one sha256.
 *
 * The markup is the most semantic of the five states: `div.Section` wrapping a `SectionNumber`
 * anchor, a `Catchline` heading, a `SectionBody`, and a sibling `div.History`. Nothing has to be
 * inferred from position.
 *
 * Network fetch and extraction are split as they are elsewhere: scripts/harvest-fl.mjs runs on a
 * GitHub runner and commits the raw bytes; this adapter reads them.
 */

const RAW_DIR = 'data/raw/fl';
const TARGETS_FILE = 'data/seed/fl/ingest-targets.json';
const SENSITIVITY_FILE = 'data/seed/clause-sensitivity.json';

interface Target {
  urn: string;
  article_roman: string;
  article_heading: string;
  section_label: string;
  anchor: string;
  citation_url: string;
  topics: string[];
}

interface ManifestDoc {
  file: string;
  urn?: string;
  url: string;
  citation_url?: string;
  sha256: string;
}

export interface ParsedSection {
  anchor: string;
  sectionLabel: string;
  heading: string;
  /** Subsections joined with a blank line; they are lettered lists and read as a wall otherwise. */
  body: string;
  /** The amendment history the Senate prints under each section, captured but never rendered. */
  history: string | null;
}

/**
 * Pull one section out of the whole-constitution document. Verified structure:
 *
 *   <div class="Section">
 *     <span class="SectionNumber"><a name="A11S05">SECTION 5.</a>&#x2003;</span>
 *     <span class="Catchline"><span class="CatchlineText">Amendment or revision election.</span>…
 *     <span class="SectionBody">
 *       <div class="Subsection"><span class="Id">(a)&#x2003;</span><span class="Text …">…</span></div>
 *       …
 *     </span>
 *     <div class="History">…</div>          ← the Senate's editorial note, not constitutional text
 *   </div>
 */
export function parseSection(html: string, anchor: string): ParsedSection {
  const at = html.indexOf(`<a name="${anchor}">`);
  if (at === -1) throw new Error(`Constitution document has no anchor "${anchor}"`);

  const start = html.lastIndexOf('<div class="Section">', at);
  if (start === -1) throw new Error(`Anchor "${anchor}" is not inside a Section block`);
  // A section ends where the next one begins, or where the next article does.
  const ends = [html.indexOf('<div class="Section">', at), html.indexOf('<div class="Article">', at)]
    .filter((i) => i !== -1);
  const segment = html.slice(start, ends.length ? Math.min(...ends) : undefined);

  const number = /<a name="[^"]*">\s*SECTION\s+([0-9A-Za-z-]+)\.?\s*<\/a>/.exec(segment);
  if (!number) throw new Error(`Section at "${anchor}" has no "SECTION N." number`);

  const catchline = /<span class="CatchlineText">([\s\S]*?)<\/span>/.exec(segment);
  if (!catchline) throw new Error(`Section at "${anchor}" has no catchline`);

  const bodyStart = segment.indexOf('<span class="SectionBody">');
  if (bodyStart === -1) throw new Error(`Section at "${anchor}" has no SectionBody`);
  const historyStart = segment.indexOf('<div class="History">', bodyStart);
  const bodyHtml = segment.slice(bodyStart, historyStart === -1 ? undefined : historyStart);

  // One paragraph per lettered or numbered block, so "(a) … (b) … (c)" does not become one line.
  // A section with no subsections has its text directly in the body, so fall back to the whole.
  const blocks = [...bodyHtml.matchAll(/<div class="(?:Subsection|Paragraph|SubParagraph)">([\s\S]*?)<\/div>/g)]
    .map((m) => htmlToText(m[1]!))
    .filter(Boolean);
  const body = (blocks.length ? blocks : [htmlToText(bodyHtml)]).join('\n\n');
  if (!body) throw new Error(`Section at "${anchor}" yielded empty clause text`);

  const history =
    historyStart === -1
      ? null
      : htmlToText(segment.slice(historyStart)).replace(/^History\.\s*—?\s*/, '').trim() || null;

  return {
    anchor,
    sectionLabel: number[1]!,
    heading: htmlToText(catchline[1]!).replace(/\.$/, '').trim(),
    body,
    history,
  };
}

function loadTargets(): Target[] {
  return JSON.parse(readFileSync(TARGETS_FILE, 'utf8')).targets as Target[];
}

export class FloridaAdapter implements StateAdapter {
  readonly state = 'FL';
  readonly sourceRoot = 'https://www.flsenate.gov/Laws/Constitution';

  async fetch(): Promise<RawDocument[]> {
    const manifest = JSON.parse(readFileSync(`${RAW_DIR}/manifest.json`, 'utf8')) as {
      fetched_at: string;
      documents: ManifestDoc[];
    };
    // Every target shares the one document, so read each distinct file once.
    const byFile = new Map(manifest.documents.map((d) => [d.file, d]));
    return [...byFile.values()].map((d) => ({
      url: d.url,
      fetchedAt: manifest.fetched_at,
      sha256: d.sha256,
      body: readFileSync(`${RAW_DIR}/${d.file}`, 'utf8'),
    }));
  }

  async tableOfContents(_docs: RawDocument[]): Promise<TableOfContentsEntry[]> {
    const byArticle = new Map<string, TableOfContentsEntry>();
    for (const t of loadTargets()) {
      const entry = byArticle.get(t.article_roman) ?? {
        articleNum: t.article_roman,
        heading: t.article_heading,
        sectionCount: 0,
      };
      entry.sectionCount++;
      byArticle.set(t.article_roman, entry);
    }
    return [...byArticle.values()];
  }

  async extract(docs: RawDocument[]): Promise<Clause[]> {
    const targets = loadTargets();
    const doc = docs[0];
    if (!doc) throw new Error('No harvested Florida document');
    const sensitivity = JSON.parse(readFileSync(SENSITIVITY_FILE, 'utf8')).clauses as Record<
      string,
      { sensitivity: string } | undefined
    >;

    const clauses: Clause[] = [];
    for (const target of targets) {
      const parsed = parseSection(doc.body, target.anchor);
      if (parsed.sectionLabel !== target.section_label) {
        throw new Error(
          `${target.urn}: anchor ${target.anchor} is Section ${parsed.sectionLabel}, expected ${target.section_label}`,
        );
      }

      clauses.push(
        Clause.parse({
          urn: target.urn,
          state: 'FL',
          article: { num: target.article_roman, heading: target.article_heading },
          section: parsed.sectionLabel,
          section_heading: parsed.heading,
          text: parsed.body,
          text_status: 'fetched',
          topics: target.topics,
          status: 'operative',
          // Florida's history line gives adoption YEARS ("adopted 2006"), not dates. A year is
          // not a date and deriving one would be inference.
          effective_date: null,
          supersedes: null,
          source_url: doc.url,
          citation_url: target.citation_url,
          source_sha256: doc.sha256,
          sensitivity: sensitivity[target.urn]?.sensitivity ?? 'none',
        }),
      );
    }

    if (clauses.length !== targets.length) {
      throw new Error(`Extracted ${clauses.length} clauses but ${targets.length} targets are configured`);
    }
    return clauses;
  }
}
