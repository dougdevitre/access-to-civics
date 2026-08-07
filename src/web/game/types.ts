export type Phase = 'draft' | 'negotiate' | 'mirror' | 'ratify' | 'charter';

export interface Seat {
  index: number;              // seat, never a student identity
  constituency: string;
  privateGoal: string;
}

export interface Vote {
  nodeId: string;
  seatIndex: number;
  optionId: string;
  round: 1 | 2;               // round 1 = before argument, round 2 = after
}

export interface ConventionState {
  phase: Phase;
  nodeIndex: number;
  seats: Seat[];
  votes: Vote[];
  adopted: Record<string, string>;   // nodeId -> optionId
  ratified: boolean | null;
}
