/**
 * Shared L0 harvest: fetch the targeted pages for a state, store them raw, and record
 * url + timestamp + sha256 per document. Never edited, only superseded
 * (docs/02-knowledge-base.md). Runs on a GitHub Actions runner because dev sandboxes
 * may have no egress to state government sites.
 *
 * Per-state scripts supply only the URL for a target; everything else is common.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const UA =
  'access-to-civics-ingest/0.1 (open-source civic education; https://github.com/dougdevitre/access-to-civics)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function slugFor(urn) {
  return urn.replace(/^urn:const:us:[a-z]{2}:/, '').replaceAll(':', '-');
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    redirect: 'follow',
  });
  return { status: res.status, body: await res.text(), capture: 'raw-bytes' };
}

/**
 * Some states now serve their constitution from a JavaScript application that returns the
 * same shell for every URL and renders the text client-side (Texas, as of 2026). Static
 * fetching gets nothing. We render the page in a real browser and hash the resulting DOM.
 *
 * This is a weaker provenance claim than raw bytes and the manifest says so: the capture is
 * what the official site rendered to a browser at that moment, not a document it served.
 * Everything downstream still byte-verifies against this snapshot, so a child never sees
 * words that are not in it.
 */
async function renderPage(url) {
  // `@playwright/test`, not `playwright` — the test package is the declared devDependency and
  // re-exports the same browser API. Importing `playwright` directly worked in a hoisted local
  // install and then failed on the CI runner with ERR_MODULE_NOT_FOUND.
  const { chromium } = await import('@playwright/test');
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage({ userAgent: UA });
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Give the app a beat to paint after the network settles.
    await page.waitForTimeout(1500);
    const body = await page.content();
    const visible = (await page.evaluate(() => document.body?.innerText ?? '')).slice(0, 300);
    return { status: response?.status() ?? 0, body, capture: 'rendered-dom', visible };
  } finally {
    await browser.close();
  }
}

/**
 * @param {object} opts
 * @param {string} opts.state          two-letter code, lowercase
 * @param {(t: object) => string} opts.sectionUrl  builds the URL for one target
 * @param {boolean} [opts.render]  render in a browser instead of fetching raw bytes
 */
export async function harvestState({ state, sectionUrl, render = false }) {
  const get = render ? renderPage : fetchPage;
  const rawDir = `data/raw/${state}`;
  const config = JSON.parse(readFileSync(`data/seed/${state}/ingest-targets.json`, 'utf8'));

  mkdirSync(rawDir, { recursive: true });
  const manifest = {
    fetched_at: new Date().toISOString(),
    source_root: config.index_url,
    documents: [],
  };
  let failures = 0;

  if (config.index_url) {
    const { status, body, capture } = await get(config.index_url);
    writeFileSync(`${rawDir}/index.html`, body);
    manifest.documents.push({
      file: 'index.html',
      url: config.index_url,
      http_status: status,
      capture,
      sha256: createHash('sha256').update(body).digest('hex'),
      bytes: Buffer.byteLength(body),
    });
    console.log(`[harvest] ${state} index ${status} ${Buffer.byteLength(body)}B`);
    if (status !== 200) failures++;
    await sleep(1500);
  }

  for (const target of config.targets) {
    const url = sectionUrl(target);
    const { status, body, capture, visible } = await get(url);
    const file = `${slugFor(target.urn)}.html`;
    writeFileSync(`${rawDir}/${file}`, body);
    const markerFound = body.toLowerCase().includes(String(target.expect).toLowerCase());
    manifest.documents.push({
      file,
      urn: target.urn,
      url,
      http_status: status,
      capture,
      sha256: createHash('sha256').update(body).digest('hex'),
      bytes: Buffer.byteLength(body),
      marker_found: markerFound,
      // Recorded so a failed harvest can be diagnosed without another round trip.
      ...(visible ? { visible_head: visible } : {}),
    });
    console.log(
      `[harvest] ${target.urn} ${status} ${Buffer.byteLength(body)}B marker=${markerFound}`,
    );
    if (status !== 200) failures++;
    if (!markerFound) {
      console.warn(`[harvest] WARNING: expected marker "${target.expect}" not found in ${file}`);
    }
    await sleep(1500);
  }

  writeFileSync(`${rawDir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `[harvest] wrote ${rawDir}/manifest.json (${manifest.documents.length} documents, ${failures} HTTP failure(s))`,
  );
  return failures;
}
