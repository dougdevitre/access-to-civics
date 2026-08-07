import type { ConventionState, Vote } from './types.js';

/**
 * Deterministic and inspectable. There is no hidden scoring function.
 *
 * Note what is absent: a three-decade outcome simulation. See
 * docs/04-distribution-and-cut-list.md — negotiation plus ratification carries most of the
 * learning, and the sim is where neutrality risk concentrates.
 */

export function tally(votes: Vote[], nodeId: string, round: 1 | 2): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of votes) {
    if (v.nodeId !== nodeId || v.round !== round) continue;
    counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1);
  }
  return counts;
}

export function winningOption(votes: Vote[], nodeId: string, round: 1 | 2): string | null {
  let best: string | null = null;
  let bestCount = -1;
  let tied = false;
  for (const [option, count] of tally(votes, nodeId, round)) {
    if (count > bestCount) { best = option; bestCount = count; tied = false; }
    else if (count === bestCount) tied = true;
  }
  return tied ? null : best;   // a tie is a real outcome: the convention must keep talking
}

/**
 * The signature metric. Aggregate count of seats that voted one way, heard the opposing
 * constituency, and switched. See docs/04-distribution-and-cut-list.md.
 */
export function mindChangeCount(votes: Vote[], nodeId: string): number {
  const first = new Map<number, string>();
  const final = new Map<number, string>();
  for (const v of votes) {
    if (v.nodeId !== nodeId) continue;
    (v.round === 1 ? first : final).set(v.seatIndex, v.optionId);
  }
  let changed = 0;
  for (const [seat, firstVote] of first) {
    const finalVote = final.get(seat);
    if (finalVote && finalVote !== firstVote) changed++;
  }
  return changed;
}

export function ratify(state: ConventionState, yes: number, no: number): ConventionState {
  return { ...state, phase: 'charter', ratified: yes > no };
}
