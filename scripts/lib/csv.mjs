/**
 * Minimal RFC 4180 CSV parser. Handles quoted fields containing commas, escaped
 * quotes (""), and CRLF/LF line endings. Shared by the CI gates and the demo
 * bundle builder — the seed CSVs contain quoted commas that a naive split(',')
 * silently corrupts (see decisions.csv row D02-B).
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Parse with a header row into records keyed by column name. */
export function parseCsvRecords(text) {
  const rows = parseCsv(text.trim());
  const header = rows.shift() ?? [];
  return rows.map((cols) => Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ''])));
}
