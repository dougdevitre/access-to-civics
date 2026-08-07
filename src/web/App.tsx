import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BundleClause, BundleDecision, StateBundle } from './game/bundle.js';
import { loadBundle } from './game/bundle.js';
import { mindChangeCount, ratify, tally, winningOption } from './game/engine.js';
import type { ConventionState, Seat } from './game/types.js';

/**
 * Game shell. Deliberately thin — the content comes from a static per-state bundle produced
 * at build time. There is no API call here and there must never be one.
 *
 * Pass-and-play: one device, seats vote in turn. A seat is a constituency, never a student
 * identity. Clause text renders only from the bundle; until ingest runs it is null and the
 * card says so — nothing here hand-types constitutional text.
 */

const BUNDLE_URL = `${import.meta.env.BASE_URL}bundles/mo-demo.json`;

const FRESH: ConventionState = {
  phase: 'draft',
  nodeIndex: 0,
  seats: [],
  votes: [],
  adopted: {},
  ratified: null,
};

export default function App() {
  const [bundle, setBundle] = useState<StateBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<ConventionState>(FRESH);
  const [ratifyVotes, setRatifyVotes] = useState({ yes: 0, no: 0 });

  useEffect(() => {
    loadBundle(BUNDLE_URL).then(setBundle, (err: unknown) => {
      setLoadError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  if (loadError) {
    return (
      <Shell>
        <h1>The convention cannot open</h1>
        <p role="alert">The state bundle failed to load: {loadError}</p>
      </Shell>
    );
  }
  if (!bundle) {
    return (
      <Shell>
        <p aria-live="polite">Convening…</p>
      </Shell>
    );
  }

  const decisions = bundle.decisions;
  const node = decisions[state.nodeIndex];

  const reset = () => {
    setState(FRESH);
    setRatifyVotes({ yes: 0, no: 0 });
  };

  const beginConvention = (seatCount: number) => {
    const cards = bundle.goal_cards;
    const seats: Seat[] = Array.from({ length: seatCount }, (_, i) => {
      const card = cards[i % cards.length];
      return {
        index: i,
        constituency: card?.constituency ?? `Delegation ${i + 1}`,
        privateGoal: card?.private_goal ?? 'Represent your neighbors well.',
      };
    });
    setState({ ...FRESH, seats });
  };

  const castVote = (optionId: string) => {
    setState((prev) => {
      const current = decisions[prev.nodeIndex];
      if (!current) return prev;
      const round: 1 | 2 = prev.phase === 'draft' ? 1 : 2;
      const seatIndex = prev.votes.filter(
        (v) => v.nodeId === current.node_id && v.round === round,
      ).length;
      const votes = [...prev.votes, { nodeId: current.node_id, seatIndex, optionId, round }];
      const voted = votes.filter((v) => v.nodeId === current.node_id && v.round === round).length;
      if (voted < prev.seats.length) return { ...prev, votes };
      if (round === 1) return { ...prev, votes, phase: 'negotiate' };
      const winner = winningOption(votes, current.node_id, 2);
      if (winner === null) return { ...prev, votes }; // tie — the convention must keep talking
      return {
        ...prev,
        votes,
        adopted: { ...prev.adopted, [current.node_id]: winner },
        phase: 'mirror',
      };
    });
  };

  const revoteAfterTie = () => {
    setState((prev) => {
      const current = decisions[prev.nodeIndex];
      if (!current) return prev;
      return {
        ...prev,
        votes: prev.votes.filter((v) => !(v.nodeId === current.node_id && v.round === 2)),
      };
    });
  };

  const continueFromMirror = () => {
    setState((prev) =>
      prev.nodeIndex + 1 >= decisions.length
        ? { ...prev, phase: 'ratify' }
        : { ...prev, nodeIndex: prev.nodeIndex + 1, phase: 'draft' },
    );
  };

  const castRatifyVote = (yes: boolean) => {
    const next = { yes: ratifyVotes.yes + (yes ? 1 : 0), no: ratifyVotes.no + (yes ? 0 : 1) };
    setRatifyVotes(next);
    if (next.yes + next.no >= state.seats.length) {
      setState((prev) => ratify(prev, next.yes, next.no));
    }
  };

  if (state.seats.length === 0) {
    return <Setup stateName={bundle.state_name} nodeCount={decisions.length} onBegin={beginConvention} />;
  }

  if (state.phase === 'ratify') {
    return (
      <Ratify
        bundle={bundle}
        state={state}
        votesSoFar={ratifyVotes}
        onVote={castRatifyVote}
      />
    );
  }

  if (state.phase === 'charter') {
    return <Charter bundle={bundle} state={state} onReset={reset} />;
  }

  if (!node) return null;

  const round = state.phase === 'draft' ? 1 : 2;
  const votedThisRound = state.votes.filter(
    (v) => v.nodeId === node.node_id && v.round === round,
  ).length;
  const seat = state.seats[votedThisRound % state.seats.length];
  const roundComplete = votedThisRound >= state.seats.length;
  const tied = state.phase === 'negotiate' && roundComplete;

  return (
    <Shell>
      <p className="eyebrow">
        Question {state.nodeIndex + 1} of {decisions.length} · {node.topic.replaceAll('_', ' ').toLowerCase()} · ages {node.age_band}
      </p>
      <h1>{node.prompt}</h1>

      {state.phase === 'draft' && seat && (
        <>
          <p>
            First vote, before debate. Pass the device around the delegation — your goal card
            is yours alone.
          </p>
          <VotePanel node={node} seat={seat} onVote={castVote} />
        </>
      )}

      {state.phase === 'negotiate' && !tied && seat && (
        <>
          <TallyBoard node={node} state={state} />
          <p>
            Now that you have heard who each choice helps and who it harms, vote again.
            Changing your mind after hearing the other side is the point, not a defeat.
          </p>
          <VotePanel node={node} seat={seat} onVote={castVote} />
        </>
      )}

      {tied && (
        <>
          <TallyBoard node={node} state={state} />
          <p role="status">
            <strong>The vote is tied.</strong> A tie is a real outcome: the convention must keep
            talking. Debate again, then revote.
          </p>
          <div className="options">
            <button type="button" onClick={revoteAfterTie}>Reopen the vote</button>
          </div>
        </>
      )}

      {state.phase === 'mirror' && <Mirror node={node} bundle={bundle} state={state} onContinue={continueFromMirror} />}

      <p aria-live="polite" className="eyebrow">Phase: {state.phase}</p>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="convention">{children}</main>;
}

function Setup({
  stateName,
  nodeCount,
  onBegin,
}: {
  stateName: string;
  nodeCount: number;
  onBegin: (seatCount: number) => void;
}) {
  const [seatCount, setSeatCount] = useState(5);
  return (
    <Shell>
      <p className="eyebrow">A constitutional convention · pilot state: {stateName}</p>
      <h1>Charter</h1>
      <p>
        Your delegation will draft a constitution: {nodeCount} questions, two votes each — one
        before debate, one after. Then you will see what real states wrote, cited clause by
        clause, and decide whether to ratify what you made.
      </p>
      <p>
        <label>
          Delegates at the table{' '}
          <select
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
          >
            {[3, 5, 7].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </p>
      <div className="options">
        <button type="button" onClick={() => onBegin(seatCount)}>Open the convention</button>
      </div>
    </Shell>
  );
}

function VotePanel({
  node,
  seat,
  onVote,
}: {
  node: BundleDecision;
  seat: Seat;
  onVote: (optionId: string) => void;
}) {
  return (
    <section aria-label={`Seat ${seat.index + 1} votes`}>
      <p className="eyebrow">Seat {seat.index + 1} · {seat.constituency}</p>
      <details>
        <summary>Your goal card (private — don&apos;t read it aloud)</summary>
        <p>{seat.privateGoal}</p>
      </details>
      <div className="options">
        {node.options.map((o) => (
          <button key={o.option_id} type="button" onClick={() => onVote(o.option_id)}>
            {o.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function TallyBoard({ node, state }: { node: BundleDecision; state: ConventionState }) {
  const counts = tally(state.votes, node.node_id, 1);
  return (
    <section aria-label="First vote and who each choice affects">
      <p className="eyebrow">The first vote, and who each choice affects</p>
      <ul className="tally">
        {node.options.map((o) => (
          <li key={o.option_id}>
            <strong>{o.label}</strong> — {counts.get(o.option_id) ?? 0} vote(s)
            {o.favors.length > 0 && <span className="chip favors">helps: {o.favors.join(', ')}</span>}
            {o.harms.length > 0 && <span className="chip harms">harms: {o.harms.join(', ')}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Mirror({
  node,
  bundle,
  state,
  onContinue,
}: {
  node: BundleDecision;
  bundle: StateBundle;
  state: ConventionState;
  onContinue: () => void;
}) {
  const adoptedId = state.adopted[node.node_id];
  const adopted = node.options.find((o) => o.option_id === adoptedId);
  const changed = mindChangeCount(state.votes, node.node_id);
  if (!adopted) return null;
  return (
    <>
      <p>
        Your convention adopted: <strong>{adopted.label}</strong>.{' '}
        {changed > 0
          ? `${changed} delegate(s) changed their mind after hearing the other side.`
          : 'No delegate changed their mind this round.'}
      </p>
      <section aria-labelledby="mirror">
        <p className="eyebrow" id="mirror">What real states did</p>
        {adopted.clause_refs.map((ref) => (
          <ClauseCard key={ref} clause={bundle.clauses[ref]} urn={ref} />
        ))}
      </section>
      <div className="options">
        <button type="button" onClick={onContinue}>Next question</button>
      </div>
    </>
  );
}

function ClauseCard({ clause, urn }: { clause: BundleClause | undefined; urn: string }) {
  if (!clause) {
    return (
      <blockquote className="clause">
        <em>No clause record for {urn}.</em>
      </blockquote>
    );
  }
  return (
    <blockquote className="clause">
      {clause.text ? (
        clause.text
      ) : (
        <em>
          Text pending ingest — this citation is real, but the words render only once the
          ingest pipeline has fetched them from the official source. Nothing in this app
          invents constitutional text.
        </em>
      )}
      <cite>
        {clause.citation}
        {clause.source_url && (
          <>
            {' · '}
            <a href={clause.source_url} target="_blank" rel="noreferrer">official source</a>
          </>
        )}
      </cite>
    </blockquote>
  );
}

function Ratify({
  bundle,
  state,
  votesSoFar,
  onVote,
}: {
  bundle: StateBundle;
  state: ConventionState;
  votesSoFar: { yes: number; no: number };
  onVote: (yes: boolean) => void;
}) {
  const seatIndex = (votesSoFar.yes + votesSoFar.no) % state.seats.length;
  const seat = state.seats[seatIndex];
  return (
    <Shell>
      <p className="eyebrow">Ratification</p>
      <h1>Do you ratify this constitution?</h1>
      <ul className="tally">
        {bundle.decisions.map((d) => {
          const adopted = d.options.find((o) => o.option_id === state.adopted[d.node_id]);
          return (
            <li key={d.node_id}>
              <strong>{d.prompt}</strong> — {adopted?.label ?? 'undecided'}
            </li>
          );
        })}
      </ul>
      {seat && (
        <section aria-label={`Seat ${seat.index + 1} ratification vote`}>
          <p className="eyebrow">Seat {seat.index + 1} · {seat.constituency}</p>
          <div className="options">
            <button type="button" onClick={() => onVote(true)}>Ratify</button>
            <button type="button" onClick={() => onVote(false)}>Reject</button>
          </div>
        </section>
      )}
      <p aria-live="polite" className="eyebrow">
        {votesSoFar.yes} for · {votesSoFar.no} against
      </p>
    </Shell>
  );
}

function Charter({
  bundle,
  state,
  onReset,
}: {
  bundle: StateBundle;
  state: ConventionState;
  onReset: () => void;
}) {
  const totalChanged = bundle.decisions.reduce(
    (sum, d) => sum + mindChangeCount(state.votes, d.node_id),
    0,
  );
  return (
    <Shell>
      <p className="eyebrow">The convention adjourns</p>
      {state.ratified ? (
        <>
          <h1>Ratified.</h1>
          <p className="seal">⬤ The charter is sealed.</p>
        </>
      ) : (
        <>
          <h1>Not ratified.</h1>
          <p>
            The convention rejected its own draft. That has happened to real states too —
            back to the drafting table.
          </p>
        </>
      )}
      <ul className="tally">
        {bundle.decisions.map((d) => {
          const adopted = d.options.find((o) => o.option_id === state.adopted[d.node_id]);
          return (
            <li key={d.node_id}>
              <strong>{d.prompt}</strong> — {adopted?.label ?? 'undecided'}
            </li>
          );
        })}
      </ul>
      <p>
        Across the whole convention, {totalChanged} vote(s) changed after hearing the other
        side. That number is the point of the game.
      </p>
      <div className="options">
        <button type="button" onClick={onReset}>Start a new convention</button>
      </div>
    </Shell>
  );
}
