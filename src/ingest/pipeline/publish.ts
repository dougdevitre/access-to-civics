import type { Clause, Gloss } from '../../schema/index.js';
import { isPublishable } from '../../schema/index.js';
import { validateQuotes, type QuotedSpan } from '../validators/quote-integrity.js';

export interface PublishInput {
  state: string;
  clauses: Clause[];
  glosses: Gloss[];
  quotedSpans: QuotedSpan[];
  ageBand: '8-10' | '11-14';
}

export interface PublishResult {
  ok: boolean;
  errors: string[];
  bundle?: StateBundle;
}

/** The offline artifact. One static JSON file per state per age band. No runtime API. */
export interface StateBundle {
  state: string;
  ageBand: string;
  builtAt: string;
  clauses: Clause[];
  glosses: Gloss[];
}

export function buildBundle(input: PublishInput): PublishResult {
  const errors: string[] = [];

  // 1. Quote integrity — blocking.
  for (const v of validateQuotes(input.quotedSpans, input.clauses)) {
    errors.push(`quote-integrity ${v.reason} at ${v.location} (${v.clause_urn})`);
  }

  // 2. No unreviewed gloss reaches a bundle — blocking.
  for (const g of input.glosses) {
    if (!isPublishable(g)) errors.push(`gloss not frozen/reviewed: ${g.clause_urn}`);
  }

  // 3. Historical-harm clauses never reach the younger band — blocking.
  if (input.ageBand === '8-10') {
    for (const c of input.clauses) {
      if (c.sensitivity !== 'none') {
        errors.push(`sensitivity "${c.sensitivity}" clause reachable in 8-10 band: ${c.urn}`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    bundle: {
      state: input.state,
      ageBand: input.ageBand,
      builtAt: new Date().toISOString(),
      clauses: input.clauses,
      glosses: input.glosses,
    },
  };
}
