import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DelawareAdapter, parseArticleHeading, parseArticleSection } from './delaware.js';

/** The real committed L0 page under data/raw/de/, so this pins the verified page structure. */
const page = readFileSync('data/raw/de/art-xvi.html', 'utf8');

describe('parseArticleHeading', () => {
  it('reads which article the document actually is', () => {
    const parsed = parseArticleHeading(page);
    expect(parsed.articleRoman).toBe('XVI');
    expect(parsed.articleHeading).toBe('AMENDMENTS AND CONVENTIONS');
  });

  it('throws rather than guess when there is no article heading', () => {
    expect(() => parseArticleHeading('<html><body>maintenance</body></html>')).toThrow();
  });
});

describe('parseArticleSection', () => {
  it('parses Article XVI Section 1 (amendment without a popular vote)', () => {
    const parsed = parseArticleSection(page, '1');
    expect(parsed.sectionLabel).toBe('1');
    expect(parsed.heading).toBe(
      'Proposal and concurrence of Constitutional amendments in General Assembly; procedure',
    );
    expect(parsed.body.startsWith('Any amendment or amendments to this Constitution may be proposed')).toBe(true);
    // The reason Delaware is cited: no ratification vote appears anywhere in the section.
    expect(parsed.body).toContain('shall thereupon become part of the Constitution');
  });

  it('stops at the next section and never bleeds into it', () => {
    const parsed = parseArticleSection(page, '1');
    expect(parsed.body).not.toContain('Constitutional Conventions');
    expect(parsed.body).not.toContain('Shall there be a Convention');
  });

  it('excludes the session-law amendment history from the clause body', () => {
    const parsed = parseArticleSection(page, '1');
    expect(parsed.body).not.toContain('Del. Laws');
  });

  it('never reaches the site footer, even for the last section in the article', () => {
    const parsed = parseArticleSection(page, '5');
    expect(parsed.body).not.toContain('Delaware General Assembly');
    expect(parsed.body).not.toContain('Judicial');
    expect(parsed.body).toContain('Shall there be a Convention to revise the Constitution');
  });

  it('names the sections it did find when asked for one that is not there', () => {
    expect(() => parseArticleSection(page, '99')).toThrow(/found: 1, 2, 3, 4, 5/);
  });
});

describe('DelawareAdapter', () => {
  it('extracts the configured target as a valid Clause with provenance', async () => {
    const adapter = new DelawareAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    expect(clauses.length).toBe(1);
    const clause = clauses[0]!;
    expect(clause.state).toBe('DE');
    expect(clause.article.num).toBe('XVI');
    expect(clause.text_status).toBe('fetched');
    expect(clause.source_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(new URL(clause.source_url).hostname).toBe('delcode.delaware.gov');
    // Delaware prints session-law citations, not dates.
    expect(clause.effective_date).toBeNull();
  });

  it('refuses a document whose own heading is a different article', async () => {
    // This is Delaware's specific hazard: constitution-16.html is a real, complete,
    // correctly-served document — for ARTICLE XV. Nothing but the heading catches that.
    const wrongArticle = page.replace('ARTICLE XVI. AMENDMENTS', 'ARTICLE XV. MISCELLANEOUS');
    expect(parseArticleHeading(wrongArticle).articleRoman).toBe('XV');
  });

  it('produces a scoped table of contents matching the extraction', async () => {
    const adapter = new DelawareAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    const toc = await adapter.tableOfContents(docs);
    expect(toc.reduce((sum, t) => sum + t.sectionCount, 0)).toBe(clauses.length);
  });
});
