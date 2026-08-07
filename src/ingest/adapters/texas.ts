import { readFileSync } from 'node:fs';
import { Clause } from '../../schema/index.js';
import { htmlToText } from './html.js';
import type { RawDocument, StateAdapter, TableOfContentsEntry } from './types.js';

/**
 * Texas adapter. VERIFIED 2026-08 by scripts/probe-tx.mjs.
 *
 * The public site, statutes.capitol.texas.gov, is an Angular application: every document URL
 * returns the same 250874-byte shell and the text is fetched client-side. The probe recorded the
 * requests that application makes and found the documents themselves on a separate static host,
 * tcss.legis.texas.gov, as plain HTML — one file per ARTICLE, not per section. So unlike
 * Missouri, where the fetched page and the cited section are the same thing, here we hash an
 * article document and extract the cited section out of it. The guarantee is unchanged: every
 * word a child reads byte-matches a document whose sha256 is recorded in data/raw/tx/manifest.json.
 *
 * source_url is that document. citation_url is the human page a reader should be sent to.
 *
 * Network fetch and extraction are split as they are for Missouri: scripts/harvest-tx.mjs runs on
 * a GitHub runner (the dev sandbox has no egress to state sites) and commits the raw bytes; this
 * adapter reads them.
 *
 * Phase-0 scope: only the sections the game cites, listed in data/seed/tx/ingest-targets.json.
 */

const RAW_DIR = 'data/raw/tx';
const TARGETS_FILE = 'data/seed/tx/ingest-targets.json';
const SENSITIVITY_FILE = 'data/seed/clause-sensitivity.json';

interface Target {
  urn: string;
  article_roman: string;
  article_arabic: string;
  article_heading: string;
  section_label: string;
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
  /** Paragraphs joined with a blank line. Texas sections are lettered and numbered lists; run
   *  together on one line they are unreadable, and the breaks are markup, not words. */
  body: string;
  /** The parenthetical adoption/amendment history the site prints under each section. */
  sourceNote: string | null;
  effectiveDate: string | null;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Every section begins with this exact anchor pair — a stable citation anchor ("5.2") followed by
 * an internal record id ("123128.112203"). Matching the pair rather than a lone `<a name>` is what
 * keeps the record ids from being mistaken for section anchors.
 */
const SECTION_ANCHOR = /<p class="left"><a name="([0-9]+\.[0-9A-Za-z-]+)"><\/a><a name="[0-9]+\.[0-9]+"><\/a><\/p>/g;

/** The last date in a source note is when the section last changed. "Nov. 2, 2021" → 2021-11-02. */
export function lastAmendmentDate(sourceNote: string | null): string | null {
  if (!sourceNote) return null;
  const matches = [...sourceNote.matchAll(/([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(\d{4})/g)];
  const last = matches.at(-1);
  if (!last) return null;
  const month = MONTHS[last[1]!.toLowerCase()];
  if (!month) return null;
  return `${last[3]}-${month}-${last[2]!.padStart(2, '0')}`;
}

/**
 * Pull one section out of an article document. Verified structure (all three Phase-0 articles
 * identical):
 *
 *   <p class="left"><a name="5.2"></a><a name="123128.112203"></a></p>
 *   <p style="text-indent:7ex;" class="left"><a href="...#5.2" ...>Sec. 2.  HEADING.</a>  body…</p>
 *   <p style="text-indent:7ex;" class="left">(b)  more body…</p>
 *   <p style="text-indent:13ex;" class="left">(1)  deeper body…</p>
 *   <p class="left">(Feb. 15, 1876. Amended …)</p>          ← source note, not constitutional text
 *
 * The source note is the one paragraph with no text-indent whose text opens a parenthesis. It is
 * the site's editorial history line, so it is captured separately and never rendered as the clause.
 */
export function parseArticleSection(html: string, anchor: string): ParsedSection {
  const anchors = [...html.matchAll(SECTION_ANCHOR)];
  const index = anchors.findIndex((m) => m[1] === anchor);
  if (index === -1) throw new Error(`Article document has no section anchor "${anchor}"`);

  const start = anchors[index]!.index + anchors[index]![0].length;
  const end = anchors[index + 1]?.index ?? html.length;
  const segment = html.slice(start, end);

  // The heading is a link back to this same anchor; that is what identifies it.
  const headingRe = new RegExp(
    `<a [^>]*href="[^"]*#${anchor.replace(/[-.]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</a>`,
  );
  const headingMatch = headingRe.exec(segment);
  if (!headingMatch) throw new Error(`Section ${anchor} has no heading link`);

  const headingRaw = htmlToText(headingMatch[1]!);
  const labelMatch = /^Sec\.\s+([0-9A-Za-z-]+)\.\s*/.exec(headingRaw);
  if (!labelMatch) throw new Error(`Section ${anchor} heading is not in "Sec. N.  TITLE." form: ${headingRaw}`);
  const heading = headingRaw.slice(labelMatch[0].length).replace(/\.$/, '').trim();

  // Body starts immediately after the heading link, inside the same paragraph.
  const rest = segment.slice(headingMatch.index + headingMatch[0].length);
  const paragraphs: string[] = [];
  let sourceNote: string | null = null;

  const firstClose = rest.indexOf('</p>');
  const firstText = htmlToText(firstClose === -1 ? rest : rest.slice(0, firstClose));
  if (firstText) paragraphs.push(firstText);

  const tail = firstClose === -1 ? '' : rest.slice(firstClose + 4);
  for (const m of tail.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/g)) {
    const text = htmlToText(m[2]!);
    if (!text) continue;
    const indented = /text-indent/.test(m[1]!);
    if (!indented && text.startsWith('(')) {
      sourceNote = sourceNote === null ? text : `${sourceNote} ${text}`;
      continue; // history line — keep reading in case the site splits it, but never as body
    }
    if (sourceNote !== null) break; // body cannot resume after the history line
    paragraphs.push(text);
  }

  const body = paragraphs.join('\n\n');
  if (!body) throw new Error(`Section ${anchor} yielded empty clause text`);

  return {
    anchor,
    sectionLabel: labelMatch[1]!,
    heading,
    body,
    sourceNote,
    effectiveDate: lastAmendmentDate(sourceNote),
  };
}

/** "1-e" and "1E" must denote the same section; compare with punctuation and case removed. */
function sectionKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^0+(?=[0-9])/, '');
}

function loadTargets(): Target[] {
  return JSON.parse(readFileSync(TARGETS_FILE, 'utf8')).targets as Target[];
}

export class TexasAdapter implements StateAdapter {
  readonly state = 'TX';
  readonly sourceRoot = 'https://statutes.capitol.texas.gov/';

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
    const byUrn = new Map(manifest.documents.filter((d) => d.urn).map((d) => [d.urn!, d]));
    const bodyByUrl = new Map(docs.map((d) => [d.url, d]));
    const sensitivity = JSON.parse(readFileSync(SENSITIVITY_FILE, 'utf8')).clauses as Record<
      string,
      { sensitivity: string } | undefined
    >;

    const clauses: Clause[] = [];
    for (const target of targets) {
      const entry = byUrn.get(target.urn);
      if (!entry) throw new Error(`No harvested document for ${target.urn}`);
      const doc = bodyByUrl.get(entry.url);
      if (!doc) throw new Error(`Manifest lists ${entry.url} but it was not fetched`);

      const anchor = `${target.article_arabic}.${target.section_label}`;
      const parsed = parseArticleSection(doc.body, anchor);
      if (sectionKey(parsed.sectionLabel) !== sectionKey(target.section_label)) {
        throw new Error(
          `${target.urn}: document says Section ${parsed.sectionLabel}, expected ${target.section_label}`,
        );
      }

      clauses.push(
        Clause.parse({
          urn: target.urn,
          state: 'TX',
          article: { num: target.article_roman, heading: target.article_heading },
          section: target.section_label,
          section_heading: parsed.heading,
          text: parsed.body,
          text_status: 'fetched',
          topics: target.topics,
          status: 'operative',
          effective_date: parsed.effectiveDate,
          supersedes: null,
          source_url: doc.url,
          citation_url: entry.citation_url ?? target.citation_url,
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
