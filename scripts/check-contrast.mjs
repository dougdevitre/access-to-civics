#!/usr/bin/env node
/**
 * CI gate (blocking): every colour pair the design actually uses meets WCAG 2.2 AA.
 *
 * The compliance doc has claimed "WCAG 2.2 AA as a floor" since the first commit, and the axe
 * scan checks the rendered page — but axe only sees the states a Playwright run happens to walk
 * through, and it never sees a token that is defined and not yet used. This reads the palette out
 * of src/web/styles.css and checks the pairs directly, so a new ink cannot be added at a tone
 * that fails and then quietly used somewhere the e2e path does not reach.
 *
 * Thresholds are the AA ones: 4.5:1 for body text, 3:1 for large text and for non-text UI
 * (borders, focus rings, state indicators) per SC 1.4.11.
 */
import { readFileSync } from 'node:fs';

const CSS = 'src/web/styles.css';

/**
 * Pull `--name: #rrggbb;` out of ONE selector block, so the gate and the design cannot drift.
 * Scoped deliberately: the stylesheet redefines several of these under prefers-contrast, and a
 * naive whole-file scan silently checked the high-contrast overrides instead of the palette
 * everyone actually sees.
 */
function readTokens(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`no "${selector}" block in ${CSS}`);
  const open = css.indexOf('{', start);
  const end = css.indexOf('}', open);
  const block = css.slice(open, end);
  const tokens = {};
  for (const m of block.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

/** CIE L*a*b*, for the one question contrast ratio cannot answer: are these two hues telling apart? */
function lab(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(full.slice(i, i + 2), 16)));
  // sRGB D65 -> XYZ, then XYZ -> Lab.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76. Roughly: under ~20 two colours start being confusable at a glance. */
function deltaE(a, b) {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const css = readFileSync(CSS, 'utf8');
const t = readTokens(css, ':root {');

const missing = ['--paper', '--ink', '--iron', '--rule', '--seal', '--care', '--focus', '--action', '--thrive', '--strain']
  .filter((name) => !t[name]);
if (missing.length > 0) {
  console.error(`[contrast] token(s) not found in ${CSS}: ${missing.join(', ')}`);
  process.exit(1);
}

/**
 * Every pair the design relies on, with the threshold that applies to it. "text" is body copy;
 * "ui" is a border, rule, indicator or focus ring, which AA allows at 3:1.
 */
const PAIRS = [
  ['body text on paper', t['--ink'], t['--paper'], 4.5, 'text'],
  ['secondary text on paper', t['--iron'], t['--paper'], 4.5, 'text'],
  ['helps ink on paper', t['--thrive'], t['--paper'], 4.5, 'text'],
  ['hurts ink on paper', t['--strain'], t['--paper'], 4.5, 'text'],
  ['link / linklike on paper', t['--focus'], t['--paper'], 4.5, 'text'],
  ['primary button label', t['--paper'], t['--action'], 4.5, 'text'],
  ['seal on paper', t['--seal'], t['--paper'], 4.5, 'text'],
  ['mediation rule on paper', t['--care'], t['--paper'], 3, 'ui'],
  ['focus ring on paper', t['--focus'], t['--paper'], 3, 'ui'],
  ['button border on paper', t['--ink'], t['--paper'], 3, 'ui'],
  ['ledger rule on paper', t['--rule'], t['--paper'], 1.2, 'ui'],
];

let failures = 0;
console.log('[contrast] WCAG 2.2 AA against the palette in src/web/styles.css\n');
for (const [label, fg, bg, min, kind] of PAIRS) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures++;
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(6)}:1  (min ${String(min).padEnd(3)} ${kind})  ${label}  ${fg} on ${bg}`,
  );
}

/*
 * The ledger rule is deliberately BELOW text contrast — it is paper texture, not information,
 * and the design note says so. Checked from the other side: if it ever climbs to where it could
 * be mistaken for a line of content, that is a regression too.
 */
const ruleRatio = contrast(t['--rule'], t['--paper']);
if (ruleRatio > 2.5) {
  console.error(
    `  FAIL ${ruleRatio.toFixed(2)}:1  ledger rule is too strong — it should read as paper, not as content`,
  );
  failures++;
}

/*
 * The two meaning-carrying inks must also be distinguishable FROM EACH OTHER, not just from the
 * page. Colour is never the only signal (each chip carries its word and a glyph) but a reader who
 * does use colour should not have to guess.
 */
const inkPairs = [
  ['helps vs hurts', t['--thrive'], t['--strain']],
  ['hurts vs seal', t['--strain'], t['--seal']],
  ['mediation vs seal', t['--care'], t['--seal']],
];
console.log('\n  Distinctness (CIE76 ΔE — contrast ratio cannot see hue):');
for (const [label, a, b] of inkPairs) {
  const d = deltaE(a, b);
  const ok = d >= 20;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ΔE ${d.toFixed(1).padStart(5)}   ${label}`);
}

console.log(`\n[contrast] ${PAIRS.length} pairs checked, ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
