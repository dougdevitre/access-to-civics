import { describe, expect, it } from 'vitest';
import { mindChangeCount, ratify, tally, winningOption } from './engine.js';
import type { ConventionState, Vote } from './types.js';

const vote = (seatIndex: number, optionId: string, round: 1 | 2, nodeId = 'D01'): Vote => ({
  nodeId,
  seatIndex,
  optionId,
  round,
});

describe('tally', () => {
  it('counts votes for the given node and round only', () => {
    const votes = [
      vote(0, 'A', 1),
      vote(1, 'A', 1),
      vote(2, 'B', 1),
      vote(0, 'B', 2),          // other round
      vote(3, 'A', 1, 'D02'),   // other node
    ];
    const counts = tally(votes, 'D01', 1);
    expect(counts.get('A')).toBe(2);
    expect(counts.get('B')).toBe(1);
    expect([...counts.keys()]).toHaveLength(2);
  });

  it('returns an empty map when nothing matches', () => {
    expect(tally([], 'D01', 1).size).toBe(0);
  });
});

describe('winningOption', () => {
  it('returns the plurality option', () => {
    const votes = [vote(0, 'A', 2), vote(1, 'A', 2), vote(2, 'B', 2)];
    expect(winningOption(votes, 'D01', 2)).toBe('A');
  });

  it('returns null on a tie — the convention must keep talking', () => {
    const votes = [vote(0, 'A', 2), vote(1, 'B', 2)];
    expect(winningOption(votes, 'D01', 2)).toBeNull();
  });

  it('returns null when there are no votes', () => {
    expect(winningOption([], 'D01', 2)).toBeNull();
  });
});

describe('mindChangeCount', () => {
  it('counts seats that switched between round 1 and round 2', () => {
    const votes = [
      vote(0, 'A', 1), vote(0, 'B', 2), // switched
      vote(1, 'A', 1), vote(1, 'A', 2), // held firm
      vote(2, 'B', 1),                  // never voted in round 2
    ];
    expect(mindChangeCount(votes, 'D01')).toBe(1);
  });

  it('ignores votes on other nodes', () => {
    const votes = [vote(0, 'A', 1, 'D02'), vote(0, 'B', 2, 'D02')];
    expect(mindChangeCount(votes, 'D01')).toBe(0);
  });
});

describe('ratify', () => {
  const base: ConventionState = {
    phase: 'ratify',
    nodeIndex: 3,
    seats: [],
    votes: [],
    adopted: {},
    ratified: null,
  };

  it('ratifies on a majority yes and advances to the charter phase', () => {
    const next = ratify(base, 3, 2);
    expect(next.phase).toBe('charter');
    expect(next.ratified).toBe(true);
  });

  it('fails ratification on a tie', () => {
    expect(ratify(base, 2, 2).ratified).toBe(false);
  });

  it('does not mutate the input state', () => {
    ratify(base, 3, 2);
    expect(base.phase).toBe('ratify');
    expect(base.ratified).toBeNull();
  });
});
