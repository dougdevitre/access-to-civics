import { readFileSync } from 'node:fs';
import { Clause } from '../../schema/index.js';
import { htmlToText } from './html.js';
import type { RawDocument, StateAdapter, TableOfContentsEntry } from './types.js';

/**
 * Delaware adapter. VERIFIED 2026-08 by scripts/probe-de.mjs.
 *
 * Plain HTML, one page per article, no shell and no browser. The trap here is subtler than the
 * other three and worth stating: **the file numbers do not match the article numbers.**
 * `constitution-17.html` is ARTICLE XVI; `constitution-16.html` is ARTICLE XV. That page is a
 * real, complete, correctly-served document — it is simply the wrong article, which no status
 * code, byte count, or well-formedness check would ever flag. So the file name is configured per
 * target in data/seed/de/ingest-targets.json rather than computed, the harvest marker proves the
 * pairing, and extract() re-checks the article heading against the target before trusting a word.
 *
 * Scope is one clause. Art. XVI §1 is why Delaware is cited: amendments pass by two-thirds of
 * each house in two successive General Assemblies and never go to the voters at all.
 *
 * Network fetch and extraction are split as they are for the other states: scripts/harvest-de.mjs
 * runs on a GitHub runner and commits the raw bytes; this adapter reads them.
 */

const RAW_DIR = 'data/raw/de';
const TARGETS_FILE = 'data/seed/de/ingest-targets.json';
const SENSITIVITY_FILE = 'data/seed/clause-sensitivity.json';

/** The site brackets its own content with these comments, so the footer is never in reach. */
const CONTENT_START = 'C O N T E N T   B E L O W   T H I S   L I N E';
const CONTENT_END = 'C O N T E N T   A B O V E   T H I S   L I N E';

/** Each section opens with this. The anchor id is a per-build row id and is deliberately ignored. */
const SECTION_LABEL = /<p class="noStyle section-label">(?:<a id="[^"]*"><\/a>)?\s*§\s*([0-9A-Za-z-]+)\.\s*([\s\S]*?)<\/p>/g;

interface Target {
  urn: string;
  article_roman: string;
  article_heading: string;
  section_label: string;
  source_file: string;
  topics: string[];
}

interface ManifestDoc {
  file: string;
  urn?: string;
  url: string;
  sha256: string;
}

export interface ParsedArticle {
  articleRoman: string;
  articleHeading: string;
}

export interface ParsedSection {
  sectionLabel: string;
  heading: string;
  body: string;
}

/** The article this document actually is, read from its own heading rather than assumed. */
export function parseArticleHeading(html: string): ParsedArticle {
  const m = /<h2>\s*ARTICLE\s+([IVXL]+)\.\s*([^<]*)/i.exec(html);
  if (!m) throw new Error('Article page has no "<h2>ARTICLE <ROMAN>. HEADING" heading');
  return { articleRoman: m[1]!, articleHeading: htmlToText(m[2]!).replace(/\.$/, '').trim() };
}

/**
 * Pull one section out of an article document. Verified structure:
 *
 *   <!-- C O N T E N T   B E L O W   T H I S   L I N E -->
 *   <p class="noStyle section-label"><a id="P1000_159475"></a>§ 1. Proposal and concurrence…</p>
 *   <p>Any amendment or amendments to this Constitution may be proposed…</p>
 *   <a href="…SessionLaws…">83 Del. Laws, c. 147</a> and <a …>84 Del. Laws, c. 16;</a>
 *   <p class="noStyle section-label">…§ 2…
 *
 * The session-law citations after each section are the amendment history. They sit outside any
 * <p>, so collecting paragraphs excludes them — but that is a property of the markup, not an
 * intention, so the body is additionally required to be paragraphs only.
 */
export function parseArticleSection(html: string, sectionLabel: string): ParsedSection {
  const start = html.indexOf(CONTENT_START);
  if (start === -1) throw new Error('Article page has no content-start marker');
  const end = html.indexOf(CONTENT_END, start);
  const content = html.slice(start, end === -1 ? undefined : end);

  const labels = [...content.matchAll(SECTION_LABEL)];
  const index = labels.findIndex((m) => m[1] === sectionLabel);
  if (index === -1) {
    throw new Error(
      `Article document has no section § ${sectionLabel} (found: ${labels.map((m) => m[1]).join(', ') || 'none'})`,
    );
  }

  const label = labels[index]!;
  const from = label.index + label[0].length;
  const to = labels[index + 1]?.index ?? content.length;
  const segment = content.slice(from, to);

  const paragraphs: string[] = [];
  for (const m of segment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = htmlToText(m[1]!);
    if (text) paragraphs.push(text);
  }
  const body = paragraphs.join('\n\n');
  if (!body) throw new Error(`Section § ${sectionLabel} yielded empty clause text`);

  return {
    sectionLabel,
    heading: htmlToText(label[2]!).replace(/\.$/, '').trim(),
    body,
  };
}

function loadTargets(): Target[] {
  return JSON.parse(readFileSync(TARGETS_FILE, 'utf8')).targets as Target[];
}

export class DelawareAdapter implements StateAdapter {
  readonly state = 'DE';
  readonly sourceRoot = 'https://delcode.delaware.gov/constitution/index.html';

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

      // The check that matters most for Delaware: this file claims to be an article, and the
      // file numbers are offset from the article numbers, so it has to say which one it is.
      const article = parseArticleHeading(doc.body);
      if (article.articleRoman !== target.article_roman) {
        throw new Error(
          `${urn}: ${doc.url} is Article ${article.articleRoman}, expected ${target.article_roman}`,
        );
      }

      const parsed = parseArticleSection(doc.body, target.section_label);

      clauses.push(
        Clause.parse({
          urn,
          state: 'DE',
          article: { num: target.article_roman, heading: target.article_heading },
          section: parsed.sectionLabel,
          section_heading: parsed.heading,
          text: parsed.body,
          text_status: 'fetched',
          topics: target.topics,
          status: 'operative',
          // Delaware prints session-law citations ("84 Del. Laws, c. 281"), not dates. A chapter
          // number is not a date, and deriving one would be inference.
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
