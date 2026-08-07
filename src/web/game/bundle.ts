/**
 * The static per-state bundle the game shell loads. Produced at build time by
 * scripts/build-demo-bundle.mjs (and later by the real ingest publish path).
 * Fetched as a static asset — this is not an API call and must never become one.
 */

export interface BundleOption {
  option_id: string;
  label: string;
  clause_refs: string[];
  favors: string[];
  harms: string[];
}

export interface BundleDecision {
  node_id: string;
  age_band: string;
  prompt: string;
  topic: string;
  options: BundleOption[];
}

export interface BundleGoalCard {
  id: string;
  constituency: string;
  private_goal: string;
  age_band: string;
}

export interface BundleClause {
  urn: string;
  state: string;
  citation: string;
  heading: string | null;
  /** null until the ingest pipeline has fetched it from the official source. */
  text: string | null;
  text_status: 'unfetched' | 'fetched' | 'verified';
  source_url: string | null;
}

export interface StateBundle {
  bundle_id: string;
  state: string;
  state_name: string;
  decisions: BundleDecision[];
  goal_cards: BundleGoalCard[];
  clauses: Record<string, BundleClause>;
}

export async function loadBundle(url: string): Promise<StateBundle> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load state bundle from ${url} (HTTP ${res.status})`);
  return (await res.json()) as StateBundle;
}
