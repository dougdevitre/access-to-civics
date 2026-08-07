#!/usr/bin/env node
/**
 * Texas source probe — diagnostics only, writes nothing, commits nothing.
 *
 * Two things we do not yet know about statutes.capitol.texas.gov:
 *
 *   1. Where the constitutional text actually lives. The site is an Angular application as
 *      of 2026 and every document path we have tried returns the same 250874-byte shell.
 *      The app must load the text from somewhere; this probe tries the plausible paths and,
 *      if a browser will run, records every network request the app makes so we can see the
 *      real one rather than guess.
 *   2. Why Chromium gets ERR_CONNECTION_REFUSED from a runner where plain fetch() gets 200.
 *
 * Run via .github/workflows/ingest-probe.yml. Read the log, then write the adapter.
 */
import { lookup, resolve4, resolve6 } from 'node:dns/promises';

const HOST = 'statutes.capitol.texas.gov';
const ORIGIN = `https://${HOST}`;
const UA =
  'access-to-civics-ingest/0.1 (open-source civic education; https://github.com/dougdevitre/access-to-civics)';

// Art. V §2 is the probe target: it is one of the three clauses the game cites, and
// "Supreme Court" is a phrase that cannot appear in a generic site shell.
const MARKER = 'supreme court';

const CANDIDATES = [
  // Article-level documents — the shape the site used before the rewrite.
  '/Docs/CN/htm/CN.5.htm',
  '/SOTWDocs/CN/htm/CN.5.htm',
  '/StatutesByDate/docs/CN/htm/CN.5.htm',
  // Section-level, the shape we guessed and that returned the shell.
  '/Docs/CN/htm/CN.5/CN.5.2.htm',
  // The old WebForms entry points.
  '/GetStatute.aspx?code=CN&level=SE&value=5.2',
  '/Docs/CN/pdf/CN.5.pdf',
  // Asset paths the app is known to use, to confirm non-shell responses are possible at all.
  '/assets/StatuteCodeTree.json',
];

const bar = (label) => console.log(`\n${'='.repeat(70)}\n${label}\n${'='.repeat(70)}`);

async function probeDns() {
  bar('DNS');
  for (const [name, fn] of [['lookup', lookup], ['resolve4', resolve4], ['resolve6', resolve6]]) {
    try {
      console.log(`  ${name.padEnd(9)} ${JSON.stringify(await fn(HOST))}`);
    } catch (err) {
      console.log(`  ${name.padEnd(9)} ERROR ${err.code ?? err.message}`);
    }
  }
}

async function probeFetch() {
  bar('Plain fetch of candidate paths');
  for (const path of CANDIDATES) {
    try {
      const res = await fetch(ORIGIN + path, {
        headers: { 'user-agent': UA, accept: 'text/html,application/json' },
        redirect: 'follow',
      });
      const body = await res.text();
      const isShell = body.includes('data-beasties-container') || body.includes('<base href="/">');
      console.log(
        `  ${String(res.status).padEnd(4)} ${String(body.length).padStart(8)}B ` +
          `${isShell ? 'SHELL ' : 'REAL  '} marker=${body.toLowerCase().includes(MARKER)}  ` +
          `${res.url === ORIGIN + path ? path : `${path} -> ${res.url}`}`,
      );
    } catch (err) {
      console.log(`  ERR  ${path}: ${err.cause?.code ?? err.message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function probeBrowser() {
  bar('Browser');
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

    // Control: if this fails too, the problem is Chromium's networking, not the Texas site.
    try {
      const control = await page.goto('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      console.log(`  control example.com -> ${control?.status()}`);
    } catch (err) {
      console.log(`  control example.com -> FAILED: ${err.message.split('\n')[0]}`);
    }

    // Every request the app makes. This is the point of the whole probe: the URL that
    // carries the actual clause text will be in this list.
    const requests = [];
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()}`));

    const target = `${ORIGIN}/Docs/CN/htm/CN.5/CN.5.2.htm`;
    try {
      const res = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(4000);
      const text = await page.evaluate(() => document.body?.innerText ?? '');
      console.log(`  ${target} -> ${res?.status()}`);
      console.log(`  rendered innerText (${text.length} chars), marker=${text.toLowerCase().includes(MARKER)}`);
      console.log(`  --- first 600 chars ---\n${text.slice(0, 600)}`);
    } catch (err) {
      console.log(`  ${target} -> FAILED: ${err.message.split('\n')[0]}`);
    }

    console.log(`  --- ${requests.length} network requests ---`);
    for (const r of requests) console.log(`    ${r}`);
  } finally {
    await browser.close();
  }
}

await probeDns();
await probeFetch();
await probeBrowser();
console.log('\n[probe] done — diagnostics only, nothing written.');
