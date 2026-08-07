#!/usr/bin/env node
/**
 * L0 harvest: fetch the targeted Missouri Constitution pages from the official Revisor
 * site and store them raw — url, timestamp, sha256 — under data/raw/mo/. Never edited,
 * only superseded (docs/02-knowledge-base.md). Runs on a GitHub Actions runner via
 * .github/workflows/ingest-harvest.yml because the dev sandbox has no egress to *.mo.gov.
 *
 * This script only fetches and records. Extraction happens separately, offline, against
 * these committed bytes (src/ingest/adapters/missouri.ts), so the words shown to a child
 * are always traceable to a hash of an official page.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const RAW_DIR = 'data/raw/mo';
const config = JSON.parse(readFileSync('data/seed/mo/ingest-targets.json', 'utf8'));

const UA =
  'access-to-civics-ingest/0.1 (open-source civic education; https://github.com/dougdevitre/access-to-civics)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sectionUrl(target) {
  const params = new URLSearchParams({
    constit: 'y',
    section: `${target.article_roman}  ${target.section_label}`,
  });
  return `https://revisor.mo.gov/main/OneSection.aspx?${params.toString()}`;
}

function slugFor(urn) {
  return urn.replace('urn:const:us:mo:', '').replaceAll(':', '-');
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    redirect: 'follow',
  });
  const body = await res.text();
  return { status: res.status, body };
}

mkdirSync(RAW_DIR, { recursive: true });
const manifest = { fetched_at: new Date().toISOString(), source_root: config.index_url, documents: [] };
let failures = 0;

// Article index first (the official table of contents).
{
  const { status, body } = await fetchPage(config.index_url);
  const sha256 = createHash('sha256').update(body).digest('hex');
  writeFileSync(`${RAW_DIR}/index.html`, body);
  manifest.documents.push({
    file: 'index.html',
    url: config.index_url,
    http_status: status,
    sha256,
    bytes: Buffer.byteLength(body),
  });
  console.log(`[harvest] index ${status} ${Buffer.byteLength(body)}B`);
  if (status !== 200) failures++;
  await sleep(1500);
}

for (const target of config.targets) {
  const url = sectionUrl(target);
  const { status, body } = await fetchPage(url);
  const sha256 = createHash('sha256').update(body).digest('hex');
  const file = `${slugFor(target.urn)}.html`;
  writeFileSync(`${RAW_DIR}/${file}`, body);
  const markerFound = body.toLowerCase().includes(target.expect.toLowerCase());
  manifest.documents.push({
    file,
    urn: target.urn,
    url,
    http_status: status,
    sha256,
    bytes: Buffer.byteLength(body),
    marker_found: markerFound,
  });
  console.log(
    `[harvest] ${target.urn} ${status} ${Buffer.byteLength(body)}B marker=${markerFound}`,
  );
  if (status !== 200) failures++;
  if (!markerFound) console.warn(`[harvest] WARNING: expected marker "${target.expect}" not found in ${file}`);
  await sleep(1500);
}

writeFileSync(`${RAW_DIR}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[harvest] wrote ${RAW_DIR}/manifest.json (${manifest.documents.length} documents, ${failures} HTTP failure(s))`);
process.exit(failures > 0 ? 1 : 0);
