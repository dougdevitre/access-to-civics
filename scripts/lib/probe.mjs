/**
 * Shared source probe: diagnostics for a state whose official site we have not figured out yet.
 * Writes nothing, commits nothing — the workflow log is the whole output.
 *
 * The Texas ingest is why this exists. That site answers HTTP 200 with an identical application
 * shell for every document URL, so a harvester that trusts status codes stores the shell and
 * reports success. Two checks catch that class of failure, and both are here:
 *
 *   1. Does an expected marker phrase actually appear in the bytes? Status codes are not evidence.
 *   2. If the page is an application, what does that application itself request? The real document
 *      host is usually in that list. For Texas it was a different domain entirely.
 *
 * Run via .github/workflows/ingest-probe.yml, read the log, then write the adapter.
 */
import { lookup, resolve4, resolve6 } from 'node:dns/promises';

const UA =
  'access-to-civics-ingest/0.1 (open-source civic education; https://github.com/dougdevitre/access-to-civics)';

const bar = (label) => console.log(`\n${'='.repeat(70)}\n${label}\n${'='.repeat(70)}`);

/**
 * A response is a shell when it carries almost no prose however many bytes it weighs. Naming
 * specific frameworks was the first attempt and it gave a false negative on California, whose
 * JSF pages are 160KB of ViewState around a few hundred characters of navigation. Measuring the
 * prose is framework-agnostic and does not go stale.
 */
function textOf(body) {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleOf(body) {
  return /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
}

/**
 * Print the links on a page with their text. When a state publishes an index, reading it beats
 * guessing URL shapes — Delaware's file numbers are offset from its article numbers, and no
 * amount of guessing would have found that. One round trip instead of three.
 */
function dumpLinks(body, base, filter) {
  const seen = new Set();
  const rows = [];
  for (const m of body.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1];
    // Fragments are kept on purpose. Florida publishes its entire constitution as one document
    // whose article and section navigation is nothing but #A11S05-style anchors; dropping those
    // threw away the whole map and left a one-row link list.
    if (/^(mailto:|javascript:)/i.test(href)) continue;
    try {
      href = new URL(href, base).toString();
    } catch {
      continue;
    }
    const text = textOf(m[2]).slice(0, 80);
    if (!text) continue;
    const row = `${text}  ->  ${href}`;
    if (seen.has(row)) continue;
    if (filter && !filter.test(row)) continue;
    seen.add(row);
    rows.push(row);
  }
  return rows;
}

async function probeDns(host) {
  bar(`DNS — ${host}`);
  for (const [name, fn] of [['lookup', lookup], ['resolve4', resolve4], ['resolve6', resolve6]]) {
    try {
      console.log(`  ${name.padEnd(9)} ${JSON.stringify(await fn(host))}`);
    } catch (err) {
      console.log(`  ${name.padEnd(9)} ERROR ${err.code ?? err.message}`);
    }
  }
}

async function probeFetch(candidates, marker, altMarkers, links) {
  bar('Plain fetch of candidate paths');
  const hits = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html,application/json' },
        redirect: 'follow',
      });
      const type = res.headers.get('content-type') ?? '';
      const length = Number(res.headers.get('content-length') ?? '0');
      if (!/text|html|json|xml/i.test(type) || length > 20_000_000) {
        // A bulk archive is not a document. Reading one into a string threw
        // "Cannot create a string longer than 0x1fffffe8 characters" after five and a half
        // minutes, which is most of a probe run spent learning nothing.
        console.log(`\n  ${url}\n    ${res.status}  skipped: ${type || 'unknown type'}, ${length}B`);
        continue;
      }
      const body = await res.text();
      const text = textOf(body);
      const found = text.toLowerCase().includes(marker.toLowerCase());
      if (found) hits.push(url);
      console.log(
        `\n  ${url}${res.url === url ? '' : `\n    -> ${res.url}`}` +
          `\n    ${res.status}  ${body.length}B raw, ${text.length}B prose  marker=${found}` +
          `\n    title: ${titleOf(body).slice(0, 100)}`,
      );
      if (!found) {
        // Why it missed matters more than that it missed: a shell has no prose, a wrong page
        // has plenty of the wrong prose, and a near-miss means the marker needs loosening.
        console.log(`    prose head: ${text.slice(0, 220)}`);
        for (const alt of altMarkers) {
          console.log(`    alt "${alt}": ${text.toLowerCase().includes(alt.toLowerCase())}`);
        }
      }
      if (links) {
        const rows = dumpLinks(body, res.url, links instanceof RegExp ? links : null);
        console.log(`    ${rows.length} link(s):`);
        for (const row of rows.slice(0, 120)) console.log(`      ${row}`);
        if (rows.length > 120) console.log(`      … ${rows.length - 120} more`);
      }
    } catch (err) {
      console.log(`\n  ${url}\n    ERR ${err.cause?.code ?? err.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return hits;
}

async function probeBrowser(url, marker) {
  bar('Browser — what does the page itself request?');
  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch (err) {
    console.log(`  cannot import @playwright/test: ${err.message}`);
    return;
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ userAgent: UA });
    const requests = [];
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()}`));

    try {
      // domcontentloaded, not networkidle: an analytics beacon that never settles will otherwise
      // fail the navigation and look like a connection problem.
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(4000);
      const text = await page.evaluate(() => document.body?.innerText ?? '');
      console.log(`  ${url} -> ${res?.status()}`);
      console.log(`  rendered innerText ${text.length} chars, marker=${text.toLowerCase().includes(marker.toLowerCase())}`);
      console.log(`  --- first 400 chars ---\n${text.slice(0, 400)}`);
    } catch (err) {
      console.log(`  ${url} -> FAILED: ${err.message.split('\n')[0]}`);
    }

    // Third-party noise (fonts, analytics) is dropped; what matters is same-org document hosts.
    // Only obvious media and trackers are dropped. Scripts stay: a document sometimes arrives
    // as one, and a filter that hides the answer defeats the point of the probe.
    const interesting = requests.filter(
      (r) => !/googletagmanager|google-analytics|fonts\.(gstatic|googleapis)|\.woff2?|\.(png|gif|jpe?g|svg|ico|css)(\?|$)/i.test(r),
    );
    console.log(`  --- ${interesting.length} of ${requests.length} requests (assets and trackers dropped) ---`);
    for (const r of interesting) console.log(`    ${r}`);
  } finally {
    await browser.close();
  }
}

/**
 * @param {object} opts
 * @param {string} opts.host        the host whose DNS to check
 * @param {string[]} opts.candidates  URLs to try with a plain fetch, in preference order
 * @param {string} opts.marker      a phrase that must appear if the response is the real document
 * @param {string[]} [opts.altMarkers] looser phrases, reported when the marker misses
 * @param {boolean|RegExp} [opts.links] print each candidate's links, optionally filtered — use this
 *        on an index page to read the article-to-URL mapping instead of guessing it
 * @param {string} [opts.renderUrl] page to open in a browser; defaults to the first candidate
 */
export async function probeState({ host, candidates, marker, altMarkers = [], links, renderUrl }) {
  await probeDns(host);
  const hits = await probeFetch(candidates, marker, altMarkers, links);

  if (hits.length > 0) {
    console.log(`\n[probe] ${hits.length} candidate(s) returned the real document:`);
    for (const url of hits) console.log(`  ${url}`);
    console.log('[probe] a plain fetch is enough for this state — no browser needed.');
  } else {
    console.log('\n[probe] no candidate returned the document. Checking what the page loads.');
    await probeBrowser(renderUrl ?? candidates[0], marker);
  }
  console.log('\n[probe] done — diagnostics only, nothing written.');
}
