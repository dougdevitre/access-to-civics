import { useState } from 'react';
import type { ConventionState } from './game/types.js';

/**
 * Game shell. Deliberately thin — the content comes from a static per-state bundle produced by
 * the ingest pipeline. There is no API call here and there must never be one.
 *
 * Clause text renders only from a loaded bundle. The placeholder below is not constitutional
 * text and is marked as such.
 */
export default function App() {
  const [state] = useState<ConventionState>({
    phase: 'draft',
    nodeIndex: 0,
    seats: [],
    votes: [],
    adopted: {},
    ratified: null,
  });

  return (
    <main className="convention">
      <p className="eyebrow">Article I · Question 1 of 6</p>
      <h1>Who can put a law on the ballot?</h1>

      <p>
        Only the legislature, or any citizen who gathers enough signatures? Talk it over with
        your delegation before you vote — your goal card is yours alone.
      </p>

      <div style={{ display: 'flex', gap: '.75rem', margin: '1.5rem 0' }}>
        <button type="button">Only the legislature</button>
        <button type="button">Citizens with signatures</button>
      </div>

      <section aria-labelledby="mirror">
        <p className="eyebrow" id="mirror">What real states did</p>
        <blockquote className="clause">
          <em>No clause bundle loaded.</em> Run the ingest pipeline to populate this card.
          Nothing in this repo hand-types constitutional text.
          <cite>See docs/adr/0001-no-runtime-llm.md</cite>
        </blockquote>
      </section>

      <p aria-live="polite" className="eyebrow">Phase: {state.phase}</p>
    </main>
  );
}
