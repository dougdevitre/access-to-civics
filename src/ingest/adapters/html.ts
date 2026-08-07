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
    // Hex character references, which Florida uses throughout — em-space between a subsection
    // letter and its text, em-dash after every catchline. Left undecoded they survive as the
    // literal string "&#x2003;" in the middle of a clause a child reads.
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}
