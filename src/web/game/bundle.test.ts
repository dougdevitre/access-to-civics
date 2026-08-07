import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DecisionNode, GoalCard, parseUrn } from '../../schema/index.js';
import type { StateBundle } from './bundle.js';

/**
 * Integrity check on the generated demo bundle — this transitively validates the seed
 * CSVs and the builder script against the Zod schemas that define the content model.
 */
const bundle = JSON.parse(
  readFileSync('public/bundles/mo-demo.json', 'utf8'),
) as StateBundle;

describe('demo bundle', () => {
  it('has every decision conforming to the DecisionNode schema', () => {
    for (const decision of bundle.decisions) {
      const parsed = DecisionNode.parse({
        node_id: decision.node_id,
        age_band: decision.age_band,
        prompt: decision.prompt,
        topic: decision.topic,
        options: decision.options.map((o) => ({
          option_id: o.option_id,
          label: o.label,
          clause_refs: o.clause_refs,
          favors: o.favors,
          harms: o.harms,
        })),
      });
      expect(parsed.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has every goal card conforming to the GoalCard schema', () => {
    for (const card of bundle.goal_cards) GoalCard.parse(card);
    expect(bundle.goal_cards.length).toBeGreaterThan(0);
  });

  it('resolves every clause_ref to a clause record with a parseable URN', () => {
    for (const decision of bundle.decisions) {
      for (const option of decision.options) {
        for (const ref of option.clause_refs) {
          expect(() => parseUrn(ref)).not.toThrow();
          expect(bundle.clauses[ref], `missing clause record for ${ref}`).toBeDefined();
        }
      }
    }
  });

  it('carries the D02-B ref the old CSV parser silently dropped', () => {
    const d02b = bundle.decisions
      .find((d) => d.node_id === 'D02')
      ?.options.find((o) => o.option_id === 'D02-B');
    expect(d02b?.clause_refs).toContain('urn:const:us:mo:art-05:sec-25a');
    expect(d02b?.label).toBe('A commission nominates, the governor appoints');
  });

  it('never carries invented clause text — unfetched means null', () => {
    for (const clause of Object.values(bundle.clauses)) {
      if (clause.text_status === 'unfetched') expect(clause.text).toBeNull();
    }
  });
});
