import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TexasAdapter, lastAmendmentDate, parseArticleSection } from './texas.js';

/**
 * Fixtures are the real committed L0 documents under data/raw/tx/ — the same bytes the published
 * corpus was extracted from, so these tests pin the verified document structure. Texas publishes
 * one document per article, so each fixture contains dozens of sections the parser must not
 * wander into.
 */
const article = (n: string) => readFileSync(`data/raw/tx/art-${n}.html`, 'utf8');

describe('lastAmendmentDate', () => {
  it('takes the last date in the source note, which is when the section last changed', () => {
    expect(
      lastAmendmentDate('(Feb. 15, 1876. Amended Aug. 11, 1891, Nov. 4, 1980; Subsec. (b) amended Nov. 2, 2021.)'),
    ).toBe('2021-11-02');
  });

  it('is null when there is no note and when a note carries no date', () => {
    expect(lastAmendmentDate(null)).toBeNull();
    expect(lastAmendmentDate('(TEMPORARY TRANSITION PROVISION: See Appendix, Note 3.)')).toBeNull();
  });
});

describe('parseArticleSection', () => {
  it('parses Article 5 Section 2 (Supreme Court) out of the whole article', () => {
    const parsed = parseArticleSection(article('05'), '5.2');
    expect(parsed.sectionLabel).toBe('2');
    expect(parsed.heading).toBe('SUPREME COURT; JUSTICES');
    expect(parsed.body.startsWith('(a) The Supreme Court shall consist of the Chief Justice and eight Justices')).toBe(true);
    expect(parsed.effectiveDate).toBe('2021-11-02');
  });

  it('keeps subsections as separate paragraphs rather than one run-on line', () => {
    const parsed = parseArticleSection(article('05'), '5.2');
    const paragraphs = parsed.body.split('\n\n');
    expect(paragraphs.length).toBeGreaterThan(5);
    expect(paragraphs.some((p) => p.startsWith('(b) No person shall be eligible'))).toBe(true);
    expect(paragraphs.some((p) => p.startsWith('(A) a practicing lawyer'))).toBe(true);
  });

  it('stops at the next section and never bleeds into it', () => {
    const parsed = parseArticleSection(article('05'), '5.2');
    expect(parsed.body).not.toContain('Sec. 3');
    expect(parsed.body).not.toContain('Court of Criminal Appeals shall consist');
  });

  it('excludes the amendment-history note from the clause body', () => {
    const parsed = parseArticleSection(article('08'), '8.1-e');
    expect(parsed.body).toBe('No State ad valorem taxes shall be levied upon any property within this State.');
    expect(parsed.sourceNote).toContain('Added Nov. 5, 1968');
    expect(parsed.body).not.toContain('TEMPORARY TRANSITION');
  });

  it('parses hyphenated section labels like 1-e', () => {
    expect(parseArticleSection(article('08'), '8.1-e').sectionLabel).toBe('1-e');
  });

  it('parses Article 7 Section 3 including the local school tax subsection', () => {
    const parsed = parseArticleSection(article('07'), '7.3');
    expect(parsed.heading).toBe(
      'TAXES FOR BENEFIT OF SCHOOLS; PROVISION OF FREE TEXT BOOKS; SCHOOL DISTRICTS',
    );
    // Subsection (e) is the reason this clause is cited: local districts tax themselves,
    // with voter approval, to fund their own schools.
    expect(parsed.body).toContain('the Legislature may authorize an additional ad valorem tax');
    expect(parsed.body).toContain('a majority of the qualified voters of the district');
  });

  it('does not confuse the internal record ids with section anchors', () => {
    // Each section anchor is followed by an id like "123128.112203"; if those were treated as
    // section anchors the segment boundaries would land mid-section.
    expect(() => parseArticleSection(article('05'), '123128.112203')).toThrow(/no section anchor/);
  });

  it('throws on a document that does not match the verified structure', () => {
    expect(() => parseArticleSection('<html><body>maintenance</body></html>', '5.2')).toThrow();
  });
});

describe('TexasAdapter', () => {
  it('extracts every configured target as a valid Clause with provenance', async () => {
    const adapter = new TexasAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    expect(clauses.length).toBe(3);
    for (const clause of clauses) {
      expect(clause.state).toBe('TX');
      expect(clause.text).toBeTruthy();
      expect(clause.text_status).toBe('fetched');
      expect(clause.source_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(clause.section_heading).toBeTruthy();
      // The hashed document and the page we send a reader to are different hosts here, and
      // both must be official.
      expect(new URL(clause.source_url).hostname).toBe('tcss.legis.texas.gov');
      expect(new URL(clause.citation_url!).hostname).toBe('statutes.capitol.texas.gov');
    }
  });

  it('produces a scoped table of contents matching the extraction', async () => {
    const adapter = new TexasAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    const toc = await adapter.tableOfContents(docs);
    expect(toc.reduce((sum, t) => sum + t.sectionCount, 0)).toBe(clauses.length);
  });
});
