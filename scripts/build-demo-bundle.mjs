#!/usr/bin/env node
/**
 * Builds the static demo bundle the web tier loads: seed decisions + goal cards + letters +
 * reflections + topic labels + the Missouri sample clause records, joined into one JSON file
 * under public/bundles/.
 *
 * Clause `text` stays null until the ingest pipeline has fetched it from the official
 * source — this script never invents constitutional text. Clauses referenced by a
 * decision but absent from the sample corpus get a stub record whose citation is
 * derived mechanically from the URN, clearly marked unfetched.
 *
 * Sensitivity comes from data/seed/clause-sensitivity.json (the editorial review of record
 * until the L2 gloss pipeline exists). Per docs/05-compliance.md, historical_harm clauses
 * never render raw in the 8-10 band; the bundle carries the teacher-mediated note.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseCsvRecords } from './lib/csv.mjs';

const OUT = 'public/bundles/mo-demo.json';

const STATE_NAMES = {
  al: 'Alabama', ak: 'Alaska', az: 'Arizona', ar: 'Arkansas', ca: 'California',
  co: 'Colorado', ct: 'Connecticut', de: 'Delaware', fl: 'Florida', ga: 'Georgia',
  hi: 'Hawaii', id: 'Idaho', il: 'Illinois', in: 'Indiana', ia: 'Iowa',
  ks: 'Kansas', ky: 'Kentucky', la: 'Louisiana', me: 'Maine', md: 'Maryland',
  ma: 'Massachusetts', mi: 'Michigan', mn: 'Minnesota', ms: 'Mississippi', mo: 'Missouri',
  mt: 'Montana', ne: 'Nebraska', nv: 'Nevada', nh: 'New Hampshire', nj: 'New Jersey',
  nm: 'New Mexico', ny: 'New York', nc: 'North Carolina', nd: 'North Dakota', oh: 'Ohio',
  ok: 'Oklahoma', or: 'Oregon', pa: 'Pennsylvania', ri: 'Rhode Island', sc: 'South Carolina',
  sd: 'South Dakota', tn: 'Tennessee', tx: 'Texas', ut: 'Utah', vt: 'Vermont',
  va: 'Virginia', wa: 'Washington', wv: 'West Virginia', wi: 'Wisconsin', wy: 'Wyoming',
};

const URN_RE = /^urn:const:us:([a-z]{2}):art-([a-z0-9-]+):sec-([a-z0-9-]+)$/;

function citationFromUrn(urn) {
  const m = URN_RE.exec(urn);
  if (!m) throw new Error(`Cannot derive citation, malformed URN: ${urn}`);
  const [, st, art, sec] = m;
  const name = STATE_NAMES[st] ?? st.toUpperCase();
  return `${name} Constitution, Article ${trimZeros(art)}, Section ${trimZeros(sec)}`;
}

function trimZeros(slug) {
  return slug.replace(/^0+(?=[0-9])/, '');
}

// --- topics ---
const taxonomy = JSON.parse(readFileSync('data/taxonomy/topics.json', 'utf8'));
const topics = {};
for (const t of taxonomy.topics) {
  topics[t.id] = { label: t.label, kid_label: t.kid_label };
}

// --- decisions (with 8-10 register variants) ---
const decisionRows = parseCsvRecords(readFileSync('data/seed/decisions.csv', 'utf8'));
const nodes = new Map();
for (const row of decisionRows) {
  if (!nodes.has(row.node_id)) {
    nodes.set(row.node_id, {
      node_id: row.node_id,
      age_band: row.age_band,
      prompt: row.prompt,
      prompt_8_10: row.prompt_8_10 || row.prompt,
      topic: row.topic,
      options: [],
    });
  }
  nodes.get(row.node_id).options.push({
    option_id: row.option_id,
    label: row.option_label,
    label_8_10: row.option_label_8_10 || row.option_label,
    clause_refs: splitList(row.clause_refs),
    favors: splitList(row.favors),
    harms: splitList(row.harms),
  });
}

// --- goal cards ---
const goal_cards = parseCsvRecords(readFileSync('data/seed/goal-cards.csv', 'utf8')).map((r) => ({
  id: r.id,
  constituency: r.constituency,
  private_goal: r.private_goal,
  age_band: r.age_band,
}));

// --- citizen letters ---
const letters = parseCsvRecords(readFileSync('data/seed/letters.csv', 'utf8')).map((r) => ({
  letter_id: r.letter_id,
  node_id: r.node_id,
  option_id: r.option_id,
  age_band: r.age_band,
  writer_name: r.writer_name,
  writer_age: r.writer_age ? Number(r.writer_age) : null,
  tone: r.tone,
  body: r.body,
}));

// --- reflection prompts ---
const reflections = parseCsvRecords(readFileSync('data/seed/reflections.csv', 'utf8')).map((r) => ({
  node_id: r.node_id,
  age_band: r.age_band,
  prompt: r.prompt,
}));

// --- sensitivity review of record ---
const sensitivityFile = JSON.parse(readFileSync('data/seed/clause-sensitivity.json', 'utf8'));
const sensitivityByUrn = sensitivityFile.clauses;

// --- clauses: sample corpus first, then URN-derived stubs for anything still missing ---
const sample = JSON.parse(readFileSync('data/seed/mo/clauses.sample.json', 'utf8'));
const clauses = {};
for (const c of sample.clauses) {
  clauses[c.urn] = {
    urn: c.urn,
    state: c.state,
    citation: `${STATE_NAMES[c.state.toLowerCase()] ?? c.state} Constitution, Article ${c.article.num}, Section ${c.section}`,
    heading: c.article.heading,
    text: c.text,
    text_status: c.text_status,
    source_url: c.source_url,
  };
}
for (const node of nodes.values()) {
  for (const opt of node.options) {
    for (const ref of opt.clause_refs) {
      if (clauses[ref]) continue;
      clauses[ref] = {
        urn: ref,
        state: URN_RE.exec(ref)?.[1]?.toUpperCase() ?? '??',
        citation: citationFromUrn(ref),
        heading: null,
        text: null,
        text_status: 'unfetched',
        source_url: null,
      };
    }
  }
}
for (const [urn, clause] of Object.entries(clauses)) {
  const review = sensitivityByUrn[urn];
  clause.sensitivity = review?.sensitivity ?? 'unreviewed';
  if (review?.mediated_8_10) {
    clause.mediated_8_10 = true;
    clause.teacher_note_8_10 = review.teacher_note_8_10 ?? null;
  }
}

const bundle = {
  $comment:
    'GENERATED by scripts/build-demo-bundle.mjs — do not edit by hand. ' +
    'Every clause text is null until the ingest pipeline fetches it from the official source.',
  bundle_id: 'mo-demo',
  state: 'MO',
  state_name: 'Missouri',
  topics,
  decisions: [...nodes.values()].sort((a, b) => a.node_id.localeCompare(b.node_id)),
  goal_cards,
  letters,
  reflections,
  clauses,
};

mkdirSync('public/bundles', { recursive: true });
writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n');
console.log(
  `[bundle] wrote ${OUT}: ${bundle.decisions.length} decisions, ` +
  `${goal_cards.length} goal cards, ${letters.length} letters, ` +
  `${reflections.length} reflections, ${Object.keys(clauses).length} clause records`,
);

function splitList(value) {
  return (value ?? '').split(';').map((s) => s.trim()).filter(Boolean);
}
