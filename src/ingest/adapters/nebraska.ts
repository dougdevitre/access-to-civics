import { readFileSync } from 'node:fs';
import { Clause } from '../../schema/index.js';
import { htmlToText } from './html.js';
import type { RawDocument, StateAdapter, TableOfContentsEntry } from './types.js';

/**
 * Nebraska adapter. VERIFIED 2026-08 by scripts/probe-ne.mjs.
 *
 * The easiest of the three so far: nebraskalegislature.gov serves one plain HTML page per
 * section at `laws/articles.php?article=<ROMAN>-<section>`, no application shell, no browser.
 * The one trap the probe found is that `article=III` without a section answers HTTP 200 with a
 * 37-byte empty body rather than a 404 — another reminder that a status code proves nothing.
 * The harvest manifest's marker check is what distinguishes a document from a polite blank.
 *
 * Scope is a single clause, and deliberately so. Art. III §1 vests the legislative authority in
 * a Legislature "consisting of one chamber" — Nebraska is the only state that answers that
 * question differently, which is the entire reason it is in the corpus.
 *
 * Network fetch and extraction are split as they are for Missouri and Texas: scripts/harvest-ne.mjs
 * runs on a GitHub runner and commits the raw bytes; this adapter reads them.
 */

const RAW_DIR = 'data/raw/ne';
const TARGETS_FILE = 'data/seed/ne/ingest-targets.json';
const SENSITIVITY_FILE = 'data/seed/clause-sensitivity.json';

interface Target {
  urn: string;
  article_roman: string;
  article_heading: string;
  section_label: string;
  topics: string[];
}

interface ManifestDoc {
  file: string;
  urn?: string;
  url: string;
  sha256: string;
}

export interface ParsedSection {
  articleRoman: string;
  sectionLabel: string;
  heading: string;
  body: string;
  /** The amendment history the site prints under each section, captured but never rendered. */
  sourceNotes: string[];
}

/**
 * Parse one section page. Verified structure:
 *
 *   <div class="statute">
 *     <h2>III-1.</h2>
 *     <h3>Legislative authority; how vested; power of initiative; power of referendum.</h3>
 *     <p class="text-justify">The legislative authority of the state shall be vested in …</p>
 *     <div class="statute_source"><h2>Source</h2><ul><li>Neb. Const. art. III, sec. 1 (1875);</li>…
 *
 * Everything from `statute_source` onward is the site's editorial history, not constitutional
 * text, and is cut before the body is read.
 */
export function parseSectionPage(html: string): ParsedSection {
  const start = html.indexOf('<div class="statute">');
  if (start === -1) throw new Error('Section page has no <div class="statute"> block');
  const sourceStart = html.indexOf('<div class="statute_source"', start);
  const segment = html.slice(start, sourceStart === -1 ? undefined : sourceStart);

  const labelMatch = /<h2>\s*([IVXL]+)-([0-9A-Za-z-]+)\s*\.?\s*<\/h2>/.exec(segment);
  if (!labelMatch) throw new Error('Section page has no "<ARTICLE>-<SECTION>." heading');

  const headingMatch = /<h3>([\s\S]*?)<\/h3>/.exec(segment);
  if (!headingMatch) throw new Error('Section page has no <h3> section heading');
  const heading = htmlToText(headingMatch[1]!).replace(/\.$/, '').trim();

  const paragraphs: string[] = [];
  for (const m of segment.slice(headingMatch.index).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = htmlToText(m[1]!);
    if (text) paragraphs.push(text);
  }
  const body = paragraphs.join('\n\n');
  if (!body) throw new Error('Section page yielded empty clause text');

  const sourceNotes: string[] = [];
  if (sourceStart !== -1) {
    for (const m of html.slice(sourceStart).matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const text = htmlToText(m[1]!);
      if (text) sourceNotes.push(text);
    }
  }

  return {
    articleRoman: labelMatch[1]!,
    sectionLabel: labelMatch[2]!,
    heading,
    body,
    sourceNotes,
  };
}

function loadTargets(): Target[] {
  return JSON.parse(readFileSync(TARGETS_FILE, 'utf8')).targets as Target[];
}

export class NebraskaAdapter implements StateAdapter {
  readonly state = 'NE';
  readonly sourceRoot = 'https://nebraskalegislature.gov/laws/browse-constitution.php';

  async fetch(): Promise<RawDocument[]> {
    const manifest = JSON.parse(readFileSync(`${RAW_DIR}/manifest.json`, 'utf8')) as {
      fetched_at: string;
      documents: ManifestDoc[];
    };
    return manifest.documents.map((d) => ({
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
    const manifest = JSON.parse(readFileSync(`${RAW_DIR}/manifest.json`, 'utf8')) as {
      documents: ManifestDoc[];
    };
    const urnByUrl = new Map(manifest.documents.filter((d) => d.urn).map((d) => [d.url, d.urn!]));
    const sensitivity = JSON.parse(readFileSync(SENSITIVITY_FILE, 'utf8')).clauses as Record<
      string,
      { sensitivity: string } | undefined
    >;

    const clauses: Clause[] = [];
    for (const doc of docs) {
      const urn = urnByUrl.get(doc.url);
      if (!urn) continue; // the index page
      const target = targets.find((t) => t.urn === urn);
      if (!target) throw new Error(`Harvested document has no target: ${doc.url}`);

      const parsed = parseSectionPage(doc.body);
      if (parsed.articleRoman !== target.article_roman) {
        throw new Error(`${urn}: page is Article ${parsed.articleRoman}, expected ${target.article_roman}`);
      }
      if (parsed.sectionLabel !== target.section_label) {
        throw new Error(`${urn}: page is Section ${parsed.sectionLabel}, expected ${target.section_label}`);
      }

      clauses.push(
        Clause.parse({
          urn,
          state: 'NE',
          article: { num: parsed.articleRoman, heading: target.article_heading },
          section: parsed.sectionLabel,
          section_heading: parsed.heading,
          text: parsed.body,
          text_status: 'fetched',
          topics: target.topics,
          status: 'operative',
          // Nebraska prints amendment YEARS ("Amended 1934, Initiative Measure No. 330"), not
          // dates. Amendments are ratified at the November general election, but turning a year
          // into a date would be inference, and this repo does not infer legal facts. Null until
          // a source states the day.
          effective_date: null,
          supersedes: null,
          source_url: doc.url,
          source_sha256: doc.sha256,
          sensitivity: sensitivity[urn]?.sensitivity ?? 'none',
        }),
      );
    }

    if (clauses.length !== targets.length) {
      throw new Error(`Extracted ${clauses.length} clauses but ${targets.length} targets are configured`);
    }
    return clauses;
  }
}
