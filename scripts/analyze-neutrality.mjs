#!/usr/bin/env node
/**
 * Neutrality review (docs/07-roadmap.md: "Dominant strategy — reviewed", and
 * docs/04-distribution-and-cut-list.md: "If one charter reliably scores best, you've built
 * propaganda with a scoreboard").
 *
 * The three-decade outcome simulation was cut, so there is no score to analyse. What
 * remains, and what actually carries the lean, is the favors/harms graph: if every option
 * on one side of the board helps the same constituencies, the content teaches a side.
 *
 * This REPORTS, it does not gate. Forcing every constituency into perfect symmetry would
 * manufacture false balance — some asymmetries are honest (nobody is harmed by universal
 * suffrage). A human reads this and decides. That is why the roadmap marks the row
 * "reviewed" rather than "blocking".
 */
import { readFileSync } from 'node:fs';
import { parseCsvRecords } from './lib/csv.mjs';

const rows = parseCsvRecords(readFileSync('data/seed/decisions.csv', 'utf8'));

const split = (v) => (v ?? '').split(';').map((s) => s.trim()).filter(Boolean);

const constituencies = new Map();
const nodes = new Map();

for (const row of rows) {
  const node = nodes.get(row.node_id) ?? { options: [] };
  node.options.push(row);
  nodes.set(row.node_id, node);

  for (const [field, key] of [['favors', 'favors'], ['harms', 'harms']]) {
    for (const name of split(row[field])) {
      const entry = constituencies.get(name) ?? { favors: [], harms: [] };
      entry[key].push(row.option_id);
      constituencies.set(name, entry);
    }
  }
}

console.log(`[neutrality] ${nodes.size} decision nodes, ${constituencies.size} constituencies\n`);

// 1. Options that name no one they hurt. Sometimes honest, sometimes a free lunch.
const noHarms = rows.filter((r) => split(r.harms).length === 0);
console.log('Options with no stated cost:');
if (noHarms.length === 0) console.log('  (none)');
for (const r of noHarms) {
  console.log(`  ${r.option_id}  "${r.option_label}"`);
}

// 2. Constituencies that only ever win, or only ever lose, across the whole board.
console.log('\nOne-sided constituencies (never appear on the other side):');
const oneSided = [...constituencies.entries()].filter(
  ([, e]) => e.favors.length === 0 || e.harms.length === 0,
);
if (oneSided.length === 0) console.log('  (none)');
for (const [name, e] of oneSided.sort()) {
  const side = e.harms.length === 0 ? 'always helped' : 'always harmed';
  const where = (e.favors.length ? e.favors : e.harms).join(', ');
  console.log(`  ${name.padEnd(20)} ${side.padEnd(14)} (${where})`);
}

// 3. Per-node symmetry: both options should name winners and losers, or the question is
//    not really a choice.
console.log('\nPer-node balance:');
for (const [nodeId, node] of [...nodes.entries()].sort()) {
  const summary = node.options
    .map((o) => `${o.option_id}:+${split(o.favors).length}/-${split(o.harms).length}`)
    .join('  ');
  console.log(`  ${nodeId}  ${summary}`);
}

console.log(
  '\n[neutrality] review only — nothing here fails the build. Asymmetry can be honest;\n' +
  '             a person decides whether each one is.',
);
