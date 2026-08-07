import { readFileSync } from 'node:fs';
import { Clause } from '../../schema/index.js';
import type { RawDocument, StateAdapter, TableOfContentsEntry } from './types.js';

/**
 * Missouri adapter. Canonical source: the Revisor of Statutes constitution pages
 * (revisor.mo.gov, ?constit=y). VERIFIED 2026-08: per-section pages resolve via the
 * lenient `section=<ROMAN>++<label>` form; the opaque `bid` parameter is version-scoped
 * and is deliberately not used.
 *
 * Network fetch and extraction are split on purpose. The dev environment has no egress
 * to *.mo.gov, so scripts/harvest-mo.mjs (run by .github/workflows/ingest-harvest.yml on
 * a GitHub runner) fetches the pages and commits them with sha256 provenance under
 * data/raw/mo/ — the L0 layer. This adapter's fetch() reads those committed bytes, so
 * extraction is deterministic and every word is traceable to a hash of an official page.
 *
 * Phase-0 scope: only the sections listed in data/seed/mo/ingest-targets.json (the
 * clauses the game cites). tableOfContents() is scoped to those targets; the full
 * official ToC lives in the harvested index.html for the eventual full ingest.
 */

const RAW_DIR = 'data/raw/mo';
const TARGETS_FILE = 'data/seed/mo/ingest-targets.json';
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
  effectiveDate: string | null;
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

/** HTML → text: decode entities, strip tags, collapse whitespace. No word is altered. */
export function htmlToText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&thinsp;|&ensp;|&emsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse one Revisor section page. Verified structure (all four Phase-0 pages identical):
 *   <span id="effdt" ...>Effective -  27 Feb 1945...</span>
 *   <div class="norm" ...><p class="norm">
 *     <span class="bold">  III Section 49.<span>  </span>HEADING.  — </span>BODY</p>
 *     <div class="foot" ...>source notes and annotations</div>
 */
export function parseSectionPage(html: string): ParsedSection {
  const effMatch = /id="effdt"[^>]*>\s*Effective\s*-\s*(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/.exec(html);
  const effectiveDate = effMatch
    ? `${effMatch[3]}-${MONTHS[effMatch[2]!] ?? '01'}-${effMatch[1]!.padStart(2, '0')}`
    : null;

  const normStart = html.indexOf('<div class="norm"');
  if (normStart === -1) throw new Error('Section page has no <div class="norm"> block');
  const footStart = html.indexOf('<div class="foot"', normStart);
  const segment = html.slice(normStart, footStart === -1 ? undefined : footStart);

  const bold = /<span class="bold">\s*([IVXL]+)\s+Section\s+([^.<]+)\.<span>\s*<\/span>([\s\S]*?)<\/span>/.exec(
    segment,
  );
  if (!bold) throw new Error('Section page bold header did not match the verified structure');
  const [, articleRoman, sectionLabel, headingHtml] = bold;

  const heading = htmlToText(headingHtml!).replace(/\s*—\s*$/, '').trim();
  const bodyHtml = segment.slice(segment.indexOf(bold[0]) + bold[0].length);
  const body = htmlToText(bodyHtml);
  if (!body) throw new Error('Section page yielded empty clause text');

  return { articleRoman: articleRoman!, sectionLabel: sectionLabel!.trim(), heading, body, effectiveDate };
}

/** "01a" and "1(a)" must denote the same section; compare with zeros and punctuation removed. */
function sectionKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^0+(?=[0-9])/, '');
}

function loadTargets(): Target[] {
  return JSON.parse(readFileSync(TARGETS_FILE, 'utf8')).targets as Target[];
}

export class MissouriAdapter implements StateAdapter {
  readonly state = 'MO';
  readonly sourceRoot = 'https://revisor.mo.gov/main/Home.aspx?constit=y';

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
      const expectedSection = urn.split(':sec-')[1]!;
      if (sectionKey(parsed.sectionLabel) !== sectionKey(expectedSection)) {
        throw new Error(`${urn}: page is Section ${parsed.sectionLabel}, expected ${expectedSection}`);
      }

      clauses.push(
        Clause.parse({
          urn,
          state: 'MO',
          article: { num: parsed.articleRoman, heading: target.article_heading },
          section: parsed.sectionLabel,
          section_heading: parsed.heading,
          text: parsed.body,
          text_status: 'fetched',
          topics: target.topics,
          status: 'operative',
          effective_date: parsed.effectiveDate,
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
