import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CitizenLetter, DecisionNode, GoalCard, parseUrn } from '../../schema/index.js';
import type { StateBundle } from './bundle.js';

/**
 * Integrity check on the generated demo bundle — this transitively validates the seed
 * CSVs and the builder script against the Zod schemas that define the content model.
 */
const bundle = JSON.parse(
  readFileSync('public/bundles/mo-demo.json', 'utf8'),
) as StateBundle;

const BANDS = ['8-10', '11-14'] as const;

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

  it('carries an 8-10 register variant for every prompt and option', () => {
    for (const d of bundle.decisions) {
      expect(d.prompt_8_10, `${d.node_id} prompt_8_10`).toBeTruthy();
      for (const o of d.options) expect(o.label_8_10, `${o.option_id} label_8_10`).toBeTruthy();
    }
  });

  it('has every goal card conforming to the GoalCard schema', () => {
    for (const card of bundle.goal_cards) GoalCard.parse(card);
    expect(bundle.goal_cards.length).toBeGreaterThan(0);
  });

  it('has every letter conforming to the CitizenLetter schema', () => {
    for (const letter of bundle.letters) {
      CitizenLetter.parse({
        letter_id: letter.letter_id,
        node_id: letter.node_id,
        option_id: letter.option_id,
        age_band: letter.age_band,
        writer_name: letter.writer_name,
        writer_age: letter.writer_age,
        body: letter.body,
        tone: letter.tone,
      });
    }
  });

  it('has a letter for every decision outcome in every band — consequences are a person', () => {
    for (const d of bundle.decisions) {
      for (const o of d.options) {
        for (const band of BANDS) {
          const letter = bundle.letters.find(
            (l) => l.node_id === d.node_id && l.option_id === o.option_id && l.age_band === band,
          );
          expect(letter, `no ${band} letter for ${o.option_id}`).toBeDefined();
        }
      }
    }
  });

  it('has a reflection prompt for every decision in every band', () => {
    for (const d of bundle.decisions) {
      for (const band of BANDS) {
        const reflection = bundle.reflections.find(
          (r) => r.node_id === d.node_id && r.age_band === band,
        );
        expect(reflection, `no ${band} reflection for ${d.node_id}`).toBeDefined();
      }
    }
  });

  it('ships kid and adult labels for every referenced topic', () => {
    for (const d of bundle.decisions) {
      const topic = bundle.topics[d.topic];
      expect(topic, `topic ${d.topic} missing from bundle`).toBeDefined();
      expect(topic?.label).toBeTruthy();
      expect(topic?.kid_label).toBeTruthy();
    }
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

  it('carries a sensitivity review on every clause, with 8-10 mediation where required', () => {
    for (const clause of Object.values(bundle.clauses)) {
      expect(clause.sensitivity, `${clause.urn} has no sensitivity value`).toBeTruthy();
      expect(clause.sensitivity, `${clause.urn} is unreviewed`).not.toBe('unreviewed');
      if (clause.sensitivity !== 'none') {
        expect(clause.mediated_8_10, `${clause.urn} lacks 8-10 mediation`).toBe(true);
        expect(clause.teacher_note_8_10, `${clause.urn} lacks a teacher note`).toBeTruthy();
      }
    }
  });

  it('flags the Virginia landowner-suffrage clause as historical harm', () => {
    const va = bundle.clauses['urn:const:us:va:art-02:sec-01'];
    expect(va?.sensitivity).toBe('historical_harm');
    expect(va?.mediated_8_10).toBe(true);
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

  it('carries a reviewed gloss at both reading levels for every ingested clause', () => {
    const corpus = JSON.parse(readFileSync('data/published/mo.json', 'utf8')) as {
      glosses: { clause_urn: string; frozen: boolean; reviewed_by: string | null }[];
    };
    expect(corpus.glosses).toHaveLength(11);
    for (const gloss of corpus.glosses) {
      expect(gloss.frozen).toBe(true);
      expect(gloss.reviewed_by).toBeTruthy();
      const clause = bundle.clauses[gloss.clause_urn];
      expect(clause?.gloss_grade_5, `${gloss.clause_urn} grade_5`).toBeTruthy();
      expect(clause?.gloss_grade_8, `${gloss.clause_urn} grade_8`).toBeTruthy();
    }
  });

  it('carries the real ingested Missouri text, byte-equal to the published corpus', () => {
    const corpus = JSON.parse(readFileSync('data/published/mo.json', 'utf8')) as {
      clauses: { urn: string; text: string; source_sha256: string }[];
    };
    expect(corpus.clauses).toHaveLength(11);
    for (const published of corpus.clauses) {
      const clause = bundle.clauses[published.urn];
      expect(clause, `bundle missing ${published.urn}`).toBeDefined();
      expect(clause?.text).toBe(published.text);
      expect(clause?.text_status).toBe('fetched');
      expect(clause?.source_sha256).toBe(published.source_sha256);
    }
  });

  it('only links to official government sources over https', () => {
    for (const clause of Object.values(bundle.clauses)) {
      if (clause.source_url === null) continue;
      const url = new URL(clause.source_url);
      expect(url.protocol).toBe('https:');
      expect(
        url.hostname === 'revisor.mo.gov' || url.hostname.endsWith('.gov'),
        `${clause.urn} links to non-government host ${url.hostname}`,
      ).toBe(true);
    }
  });
});
