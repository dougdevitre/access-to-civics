import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FloridaAdapter, parseSection } from './florida.js';

/**
 * The real committed L0 document under data/raw/fl/ — the entire Florida constitution in one
 * file, which is what makes the "does the parser stay inside its section" tests matter most here.
 */
const doc = readFileSync('data/raw/fl/constitution.html', 'utf8');

describe('parseSection', () => {
  it('parses Article XI Section 5 (amendment or revision election)', () => {
    const parsed = parseSection(doc, 'A11S05');
    expect(parsed.sectionLabel).toBe('5');
    expect(parsed.heading).toBe('Amendment or revision election');
    // Subsection (e) is why this clause is cited.
    expect(parsed.body).toContain('at least sixty percent of the electors voting on the measure');
  });

  it('keeps subsections as separate paragraphs, in order', () => {
    const paragraphs = parseSection(doc, 'A11S05').body.split('\n\n');
    expect(paragraphs).toHaveLength(5);
    expect(paragraphs.map((p) => p.slice(0, 3))).toEqual(['(a)', '(b)', '(c)', '(d)', '(e)']);
  });

  it('decodes hex character references rather than leaving them in the text', () => {
    // Florida separates a subsection letter from its text with &#x2003; (em space). Undecoded,
    // that string would appear verbatim in a clause a child reads.
    const body = parseSection(doc, 'A11S05').body;
    expect(body).not.toContain('&#x');
    expect(body).toMatch(/^\(a\) A proposed amendment/);
  });

  it('excludes the Senate history note from the body but captures it', () => {
    const parsed = parseSection(doc, 'A11S05');
    expect(parsed.body).not.toContain('H.J.R.');
    expect(parsed.body).not.toContain('History');
    expect(parsed.history).toContain('adopted 2006');
  });

  it('stays inside its section, in a document holding the whole constitution', () => {
    const parsed = parseSection(doc, 'A11S05');
    expect(parsed.body).not.toContain('Taxation and budget reform commission');
    expect(parsed.body).not.toContain('SECTION 6');
    expect(parsed.body).not.toContain('SECTION 4');
  });

  it('parses a neighbouring section without drift', () => {
    const parsed = parseSection(doc, 'A11S01');
    expect(parsed.sectionLabel).toBe('1');
    expect(parsed.heading).toBe('Proposal by legislature');
    expect(parsed.body).toContain('three-fifths of the membership of each house');
  });

  it('throws on an anchor that is not in the document', () => {
    expect(() => parseSection(doc, 'A99S99')).toThrow(/no anchor/);
  });
});

describe('FloridaAdapter', () => {
  it('extracts the configured target as a valid Clause with provenance', async () => {
    const adapter = new FloridaAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    expect(clauses.length).toBe(1);
    const clause = clauses[0]!;
    expect(clause.state).toBe('FL');
    expect(clause.article.num).toBe('XI');
    expect(clause.text_status).toBe('fetched');
    expect(clause.source_sha256).toMatch(/^[0-9a-f]{64}$/);
    // One document holds every clause, so the reader link must carry the fragment.
    expect(clause.source_url).toBe('https://www.flsenate.gov/Laws/Constitution');
    expect(clause.citation_url).toBe('https://www.flsenate.gov/Laws/Constitution#A11S05');
    expect(clause.effective_date).toBeNull();
  });

  it('produces a scoped table of contents matching the extraction', async () => {
    const adapter = new FloridaAdapter();
    const docs = await adapter.fetch();
    const clauses = await adapter.extract(docs);
    const toc = await adapter.tableOfContents(docs);
    expect(toc.reduce((sum, t) => sum + t.sectionCount, 0)).toBe(clauses.length);
  });
});
