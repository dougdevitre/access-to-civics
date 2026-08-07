/**
 * HTML → text for ingest adapters.
 *
 * The only transformations allowed here are ones that cannot change a word: decoding entities,
 * removing markup, and collapsing runs of whitespace. Nothing normalizes spelling, punctuation,
 * capitalisation, or archaic usage. What a state wrote is what a child reads.
 */
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
