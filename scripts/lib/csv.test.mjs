import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvRecords } from './csv.mjs';

describe('parseCsv', () => {
  it('keeps commas inside quoted fields intact', () => {
    expect(parseCsv('a,"one, two",c')).toEqual([['a', 'one, two', 'c']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('a,"say ""hi""",c')).toEqual([['a', 'say "hi"', 'c']]);
  });

  it('handles CRLF and LF line endings', () => {
    expect(parseCsv('a,b\r\nc,d\ne,f')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ]);
  });

  it('handles empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });
});

describe('parseCsvRecords', () => {
  it('keys fields by the header row', () => {
    const records = parseCsvRecords('id,label\n1,"a, b"\n2,c\n');
    expect(records).toEqual([
      { id: '1', label: 'a, b' },
      { id: '2', label: 'c' },
    ]);
  });

  it('parses the exact row shape that broke the old split(",") gate', () => {
    const row =
      'node_id,age_band,prompt,topic,option_id,option_label,clause_refs,favors,harms\n' +
      'D02,11-14,"How do we choose judges?",JUDICIAL_SELECTION,D02-B,' +
      '"A commission nominates, the governor appoints",' +
      'urn:const:us:mo:art-05:sec-25a,court-neutrality,voters';
    const [rec] = parseCsvRecords(row);
    expect(rec?.clause_refs).toBe('urn:const:us:mo:art-05:sec-25a');
    expect(rec?.option_label).toBe('A commission nominates, the governor appoints');
  });
});
