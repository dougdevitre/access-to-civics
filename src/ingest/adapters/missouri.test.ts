import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MissouriAdapter, htmlToText, parseSectionPage } from './missouri.js';

/**
 * Fixtures are the real committed L0 pages under data/raw/mo/ — the same bytes the
 * published corpus was extracted from, so these tests pin the verified page structure.
 */
const page = (name: string) => readFileSync(`data/raw/mo/${name}.html`, 'utf8');

describe('htmlToText', () => {
  it('strips tags, decodes entities, collapses whitespace', () => {
    expect(htmlToText('  <b>a</b> &amp; <i>b</i>&nbsp;&nbsp;c ')).toBe('a & b c');
  });
});

describe('parseSectionPage', () => {
  it('parses Article III Section 49 (initiative)', () => {
    const parsed = parseSectionPage(page('art-03-sec-49'));
    expect(parsed.articleRoman).toBe('III');
    expect(parsed.sectionLabel).toBe('49');
    expect(parsed.heading).toBe('Reservation of power to enact and reject laws.');
    expect(parsed.body.startsWith('The people reserve power to propose and enact or reject laws')).toBe(true);
    expect(parsed.effectiveDate).toBe('1945-02-27');
  });

  it('parses lettered sections like V 25(a)', () => {
    const parsed = parseSectionPage(page('art-05-sec-25a'));
    expect(parsed.sectionLabel).toBe('25(a)');
    expect(parsed.effectiveDate).toBe('1976-09-02');
    expect(parsed.body).toContain('nonpartisan judicial commission');
  });

  it('parses the current (Dec 2024) suffrage section', () => {
    const parsed = parseSectionPage(page('art-08-sec-02'));
    expect(parsed.sectionLabel).toBe('2');
    expect(parsed.effectiveDate).toBe('2024-12-05');
    expect(parsed.body.startsWith('Only citizens of the United States')).toBe(true);
  });

  it('never includes footnotes or annotations in the clause body', () => {
    const parsed = parseSectionPage(page('art-03-sec-49'));
    expect(parsed.body).not.toContain('Source: Const of 1875');
    expect(parsed.body).not.toContain('S.W.2d');
  });

  it('throws on pages that do not match the verified structure', () => {
    expect(() => parseSectionPage('<html><body>maintenance page</body></html>')).toThrow();
  });
});

describe('MissouriAdapter', () => {
  it('extracts every configured target as a valid Clause with provenance', async () => {
    const adapter = new MissouriAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    expect(clauses.length).toBeGreaterThanOrEqual(10);
    for (const clause of clauses) {
      expect(clause.text).toBeTruthy();
      expect(clause.text_status).toBe('fetched');
      expect(clause.source_url).toContain('revisor.mo.gov');
      expect(clause.source_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(clause.section_heading).toBeTruthy();
    }
  });

  it('produces a scoped table of contents matching the extraction', async () => {
    const adapter = new MissouriAdapter();
    const toc = await adapter.tableOfContents([]);
    const total = toc.reduce((sum, t) => sum + t.sectionCount, 0);
    const adapter2 = new MissouriAdapter();
    const docs = await adapter2.fetch();
    const clauses = await adapter2.extract(docs);
    expect(total).toBe(clauses.length);
  });
});
