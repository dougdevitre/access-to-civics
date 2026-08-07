/**
 * The static per-state bundle the game shell loads. Produced at build time by
 * scripts/build-demo-bundle.mjs (and later by the real ingest publish path).
 * Fetched as a static asset — this is not an API call and must never become one.
 */

export type Band = '8-10' | '11-14';

export interface BundleOption {
  option_id: string;
  label: string;
  label_8_10: string;
  clause_refs: string[];
  favors: string[];
  harms: string[];
}

export interface BundleDecision {
  node_id: string;
  age_band: string;
  prompt: string;
  prompt_8_10: string;
  topic: string;
  options: BundleOption[];
}

export interface BundleGoalCard {
  id: string;
  constituency: string;
  private_goal: string;
  age_band: string;
}

export interface BundleLetter {
  letter_id: string;
  node_id: string;
  option_id: string;
  age_band: string;
  writer_name: string;
  writer_age: number | null;
  tone: 'grateful' | 'worried' | 'angry' | 'hopeful';
  body: string;
}

export interface BundleReflection {
  node_id: string;
  age_band: string;
  prompt: string;
}

export interface BundleTopic {
  label: string;
  kid_label: string;
}

export interface BundleClause {
  urn: string;
  state: string;
  citation: string;
  heading: string | null;
  /** Official section heading from the source page; present once ingested. */
  section_heading?: string | null;
  /** null until the ingest pipeline has fetched it from the official source. */
  text: string | null;
  text_status: 'unfetched' | 'fetched' | 'verified';
  source_url: string | null;
  /** Where to send a reader, when that differs from the document we hashed. See schema/clause.ts. */
  citation_url?: string | null;
  source_sha256?: string | null;
  effective_date?: string | null;
  /** Human-reviewed plain-language rewrites (L2). Present only once frozen. */
  gloss_grade_5?: string | null;
  gloss_grade_8?: string | null;
  /** Editorial review of record; 'unreviewed' when no human has set a value. */
  sensitivity: 'none' | 'historical_harm' | 'teacher_mediated' | 'unreviewed';
  /** When true, the 8-10 band shows the teacher note instead of the clause card. */
  mediated_8_10?: boolean;
  teacher_note_8_10?: string | null;
}

export interface StateBundle {
  bundle_id: string;
  state: string;
  state_name: string;
  topics: Record<string, BundleTopic>;
  decisions: BundleDecision[];
  goal_cards: BundleGoalCard[];
  letters: BundleLetter[];
  reflections: BundleReflection[];
  clauses: Record<string, BundleClause>;
}

export async function loadBundle(url: string): Promise<StateBundle> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load state bundle from ${url} (HTTP ${res.status})`);
  return (await res.json()) as StateBundle;
}

export function promptFor(d: BundleDecision, band: Band): string {
  return band === '8-10' ? d.prompt_8_10 : d.prompt;
}

export function labelFor(o: BundleOption, band: Band): string {
  return band === '8-10' ? o.label_8_10 : o.label;
}

export function glossFor(clause: BundleClause, band: Band): string | null {
  return (band === '8-10' ? clause.gloss_grade_5 : clause.gloss_grade_8) ?? null;
}

export function topicLabelFor(bundle: StateBundle, topicId: string, band: Band): string {
  const topic = bundle.topics[topicId];
  if (!topic) return topicId.replaceAll('_', ' ').toLowerCase();
  return band === '8-10' ? topic.kid_label : topic.label;
}

export function letterFor(
  bundle: StateBundle,
  nodeId: string,
  optionId: string,
  band: Band,
): BundleLetter | undefined {
  const matches = bundle.letters.filter((l) => l.node_id === nodeId && l.option_id === optionId);
  return matches.find((l) => l.age_band === band) ?? matches[0];
}

export function reflectionFor(
  bundle: StateBundle,
  nodeId: string,
  band: Band,
): BundleReflection | undefined {
  const matches = bundle.reflections.filter((r) => r.node_id === nodeId);
  return matches.find((r) => r.age_band === band) ?? matches[0];
}
