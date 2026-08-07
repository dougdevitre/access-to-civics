import { z } from 'zod';

export const AgeBand = z.enum(['8-10', '11-14']);
export type AgeBand = z.infer<typeof AgeBand>;

/** Asymmetric private goals. A constitution is a negotiation, not a solo optimization. */
export const GoalCard = z.object({
  id: z.string(),
  constituency: z.string(),      // "rural counties", "kids under 18", "small business"
  private_goal: z.string(),
  age_band: AgeBand,
});
export type GoalCard = z.infer<typeof GoalCard>;

export const DecisionOption = z.object({
  option_id: z.string(),
  label: z.string(),
  /** Real clauses from real states that made this choice. Validated against L1 in CI. */
  clause_refs: z.array(z.string()).min(1),
  /** Which constituencies this option pleases or angers. Drives the negotiation, not a score. */
  favors: z.array(z.string()).default([]),
  harms: z.array(z.string()).default([]),
});

export const DecisionNode = z.object({
  node_id: z.string(),
  age_band: AgeBand,
  prompt: z.string(),
  topic: z.string(),
  options: z.array(DecisionOption).min(2),
});
export type DecisionNode = z.infer<typeof DecisionNode>;

/** Consequences are a person, not a stat. Pre-written, keyed on (decision, outcome band). */
export const CitizenLetter = z.object({
  letter_id: z.string(),
  node_id: z.string(),
  option_id: z.string(),
  writer_name: z.string(),
  writer_age: z.number().int().nullable(),
  body: z.string(),
  tone: z.enum(['grateful', 'worried', 'angry', 'hopeful']),
});
export type CitizenLetter = z.infer<typeof CitizenLetter>;

/**
 * Signature metric: did a delegate change their mind after hearing the other side?
 * See docs/04-distribution-and-cut-list.md. Aggregate only — no child identifiers.
 */
export const MindChangeEvent = z.object({
  session_code: z.string(),
  node_id: z.string(),
  seat_index: z.number().int(),   // seat, not student
  first_vote: z.string(),
  final_vote: z.string(),
  heard_opposing_argument: z.boolean(),
});
export type MindChangeEvent = z.infer<typeof MindChangeEvent>;
