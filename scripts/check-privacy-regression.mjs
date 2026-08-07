#!/usr/bin/env node
/**
 * CI gate (blocking once a build exists): the privacy promise, enforced. Scans the built
 * site for anything that could collect, store, or transmit data about a child — tracking
 * scripts, cookies, storage APIs, beacons, or network calls to non-allowlisted hosts.
 * A clean pass is what lets the grown-ups page say "no tracking can be introduced silently."
 *
 * Sourcemaps (.map) are excluded: they contain library source text, not executed code.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.warn('[privacy] no dist/ yet — run npm run build first; gate is advisory until then');
  process.exit(0);
}

/** Hosts that may legitimately appear as strings in the shipped code. */
const ALLOWED_HOSTS = new Set([
  'revisor.mo.gov',        // official Missouri source links (behind the leaving-notice UI)
  'github.com',            // contact / source / issue reporting on the grown-ups page
  'react.dev',             // React production error-decoder URLs (strings, never fetched)
  'reactjs.org',           // ditto, older React error-decoder host in the prod bundle
  'bit.ly',                // workbox debug-message doc link (a console string, never fetched)
  'www.w3.org',            // SVG/xmlns namespace declarations
]);

const FORBIDDEN = [
  'document.cookie',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'openDatabase',
  'sendBeacon',
  'google-analytics',
  'googletagmanager',
  'gtag(',
  'mixpanel',
  'segment.io',
  'posthog',
  'sentry.io',
  'hotjar',
  'doubleclick',
  'facebook.net',
  'fbq(',
];

const SCAN_EXT = new Set(['.js', '.html', '.json', '.webmanifest', '.css']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let failures = 0;
let scanned = 0;

for (const path of walk(DIST)) {
  if (!SCAN_EXT.has(extname(path))) continue;
  scanned++;
  const content = readFileSync(path, 'utf8');

  for (const marker of FORBIDDEN) {
    if (content.includes(marker)) {
      console.error(`[privacy] forbidden marker "${marker}" in ${path}`);
      failures++;
    }
  }

  for (const match of content.matchAll(/https?:\/\/([a-z0-9][a-z0-9.-]*)/gi)) {
    const host = match[1].toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) {
      console.error(`[privacy] non-allowlisted host "${host}" referenced in ${path}`);
      failures++;
    }
  }
}

console.log(`[privacy] ${scanned} built files scanned, ${failures} violation(s)`);
process.exit(failures > 0 ? 1 : 0);
