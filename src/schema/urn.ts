/**
 * Stable clause URNs. See docs/adr/0002-urn-scheme.md.
 *
 *   urn:const:us:mo:art-09:sec-01a@2024-11-05
 *
 * The @date suffix pins a version. Omit it to mean "current operative version".
 */

export interface ClauseUrnParts {
  state: string;          // two-letter, lowercase in the URN, uppercase in records
  article: string;        // zero-padded, e.g. "09"
  section: string;        // slugified, e.g. "01a"
  effectiveDate?: string; // ISO date, optional
}

const URN_RE =
  /^urn:const:us:([a-z]{2}):art-([a-z0-9-]+):sec-([a-z0-9-]+)(?:@(\d{4}-\d{2}-\d{2}))?$/;

export class UrnError extends Error {
  constructor(input: string, reason: string) {
    super(`Invalid clause URN "${input}": ${reason}`);
    this.name = 'UrnError';
  }
}

export function formatUrn(parts: ClauseUrnParts): string {
  const base =
    `urn:const:us:${parts.state.toLowerCase()}` +
    `:art-${slug(parts.article)}` +
    `:sec-${slug(parts.section)}`;
  return parts.effectiveDate ? `${base}@${parts.effectiveDate}` : base;
}

export function parseUrn(input: string): ClauseUrnParts {
  const m = URN_RE.exec(input.trim());
  if (!m) throw new UrnError(input, 'does not match urn:const:us:<st>:art-<a>:sec-<s>[@<date>]');
  const [, state, article, section, effectiveDate] = m;
  return {
    state: state!,
    article: article!,
    section: section!,
    ...(effectiveDate ? { effectiveDate } : {}),
  };
}

/** Strip the version suffix. Content should reference undated URNs by default. */
export function baseUrn(input: string): string {
  const at = input.indexOf('@');
  return at === -1 ? input : input.slice(0, at);
}

export function isDated(input: string): boolean {
  return input.includes('@');
}

/** DynamoDB sort key for a clause: CLAUSE#ART09#SEC01A */
export function clauseSortKey(parts: ClauseUrnParts): string {
  return `CLAUSE#ART${parts.article.toUpperCase()}#SEC${parts.section.toUpperCase()}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()§.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
