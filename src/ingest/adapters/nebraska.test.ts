import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NebraskaAdapter, parseSectionPage } from './nebraska.js';

/** The real committed L0 page under data/raw/ne/, so this pins the verified page structure. */
const page = readFileSync('data/raw/ne/art-03-sec-01.html', 'utf8');

describe('parseSectionPage', () => {
  it('parses Article III Section 1 (the one-chamber Legislature)', () => {
    const parsed = parseSectionPage(page);
    expect(parsed.articleRoman).toBe('III');
    expect(parsed.sectionLabel).toBe('1');
    expect(parsed.heading).toBe(
      'Legislative authority; how vested; power of initiative; power of referendum',
    );
    expect(parsed.body.startsWith('The legislative authority of the state shall be vested in a Legislature consisting of one chamber.')).toBe(true);
  });

  it('excludes the amendment history from the clause body but keeps it', () => {
    const parsed = parseSectionPage(page);
    expect(parsed.body).not.toContain('Initiative Measure No. 330');
    expect(parsed.body).not.toContain('Source');
    expect(parsed.sourceNotes.some((n) => n.includes('Amended 1934'))).toBe(true);
  });

  it('never picks up the site chrome around the statute block', () => {
    const parsed = parseSectionPage(page);
    expect(parsed.body).not.toContain('Print Friendly');
    expect(parsed.body).not.toContain('Nebraska State Constitution Article');
  });

  it('throws on a page that does not match the verified structure', () => {
    expect(() => parseSectionPage('<html><body>maintenance</body></html>')).toThrow();
  });

  it('throws rather than accept the empty 200 the site returns for a bad section id', () => {
    // article=III with no section answers 200 with a ~37-byte body. Silence must not parse.
    expect(() => parseSectionPage('<html><body></body></html>')).toThrow();
  });
});

describe('NebraskaAdapter', () => {
  it('extracts the configured target as a valid Clause with provenance', async () => {
    const adapter = new NebraskaAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    expect(clauses.length).toBe(1);
    const clause = clauses[0]!;
    expect(clause.state).toBe('NE');
    expect(clause.text).toContain('consisting of one chamber');
    expect(clause.text_status).toBe('fetched');
    expect(clause.source_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(new URL(clause.source_url).hostname).toBe('nebraskalegislature.gov');
    // Nebraska prints amendment years, not dates, and a year is not a date.
    expect(clause.effective_date).toBeNull();
  });

  it('produces a scoped table of contents matching the extraction', async () => {
    const adapter = new NebraskaAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    const toc = await adapter.tableOfContents(docs);
    expect(toc.reduce((sum, t) => sum + t.sectionCount, 0)).toBe(clauses.length);
  });
});
