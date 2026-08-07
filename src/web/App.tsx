import { useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import type { Band, BundleClause, BundleDecision, StateBundle } from './game/bundle.js';
import {
  glossFor,
  labelFor,
  letterFor,
  loadBundle,
  promptFor,
  reflectionFor,
  topicLabelFor,
} from './game/bundle.js';
import { mindChangeCount, ratify, tally, winningOption } from './game/engine.js';
import type { ConventionState, Seat } from './game/types.js';
import { COPY, NEUTRAL, termsIn } from './copy.js';
import type { Copy } from './copy.js';
import { GrownUps, PrivacyPromise, TeachersFamilies } from './views/TrustPages.js';

/**
 * Game shell. Deliberately thin — the content comes from a static per-state bundle produced
 * at build time. There is no API call here and there must never be one.
 *
 * Two modes, per docs/01-concept.md:
 *  - 8-10: whole-class, teacher-led. No hidden goals, one vote per round, cast together.
 *  - 11-14: pass-and-play delegates with private goal cards.
 * A seat is a constituency, never a student identity. All state lives in page memory and
 * is gone on reload — nothing is stored or transmitted, which is the point.
 */

const BUNDLE_URL = `${import.meta.env.BASE_URL}bundles/mo-demo.json`;

type View = 'game' | 'privacy' | 'grownups' | 'teachers' | 'explore';

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
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<View>('game');
  const [band, setBand] = useState<Band | null>(null);
  const [state, setState] = useState<ConventionState>(FRESH);
  const [ratifyVotes, setRatifyVotes] = useState({ yes: 0, no: 0 });
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    loadBundle(BUNDLE_URL).then(setBundle, () => setLoadError(true));
  }, []);

  // Keep keyboard and screen-reader users oriented: focus the page heading on every
  // phase, question, or view change.
  useEffect(() => {
    headingRef.current?.focus();
  }, [view, band, state.phase, state.nodeIndex]);

  const reset = () => {
    setState(FRESH);
    setRatifyVotes({ yes: 0, no: 0 });
  };

  const chrome = (children: ReactNode) => (
    <>
      <a className="skip-link" href="#main">{NEUTRAL.skipLink}</a>
      <main className="convention" id="main">
        {children}
      </main>
      <footer className="site-footer">
        <nav aria-label="About Charter">
          {view !== 'game' && (
            <button type="button" onClick={() => setView('game')}>{NEUTRAL.navGame}</button>
          )}
          <button type="button" onClick={() => setView('privacy')}>{NEUTRAL.navPrivacy}</button>
          <button type="button" onClick={() => setView('grownups')}>{NEUTRAL.navGrownups}</button>
          <button type="button" onClick={() => setView('teachers')}>{NEUTRAL.navTeachers}</button>
          {bundle && (
            <button type="button" onClick={() => setView('explore')}>{NEUTRAL.navExplore}</button>
          )}
          {band && view === 'game' && (
            <button type="button" onClick={() => { setBand(null); reset(); }}>
              {NEUTRAL.changeBand}
            </button>
          )}
        </nav>
      </footer>
    </>
  );

  if (view !== 'game') {
    return chrome(
      <div ref={(el) => { headingRef.current = el as unknown as HTMLHeadingElement; }} tabIndex={-1}>
        {view === 'privacy' && <PrivacyPromise />}
        {view === 'grownups' && <GrownUps />}
        {view === 'teachers' && <TeachersFamilies />}
        {view === 'explore' && bundle && <Explore bundle={bundle} band={band ?? '8-10'} />}
      </div>,
    );
  }

  if (loadError) {
    return chrome(
      <>
        <h1 ref={headingRef} tabIndex={-1}>{NEUTRAL.loadErrTitle}</h1>
        <p role="alert">{NEUTRAL.loadErrBody}</p>
      </>,
    );
  }
  if (!bundle) {
    return chrome(<p aria-live="polite">{NEUTRAL.loading}</p>);
  }

  if (!band) {
    return chrome(
      <>
        <p className="eyebrow">{NEUTRAL.pilot(bundle.state_name)}</p>
        <h1 ref={headingRef} tabIndex={-1}>{NEUTRAL.title}</h1>
        <p>{NEUTRAL.tagline}</p>
        <h2>{NEUTRAL.whoPlaying}</h2>
        <div className="options band-pick">
          <button type="button" onClick={() => setBand('8-10')}>
            <strong>{NEUTRAL.band8}</strong>
            <span>{NEUTRAL.band8Sub}</span>
          </button>
          <button type="button" onClick={() => setBand('11-14')}>
            <strong>{NEUTRAL.band11}</strong>
            <span>{NEUTRAL.band11Sub}</span>
          </button>
        </div>
      </>,
    );
  }

  return chrome(
    <Game
      bundle={bundle}
      band={band}
      state={state}
      setState={setState}
      ratifyVotes={ratifyVotes}
      setRatifyVotes={setRatifyVotes}
      onReset={reset}
      headingRef={headingRef}
    />,
  );
}

function Game({
  bundle,
  band,
  state,
  setState,
  ratifyVotes,
  setRatifyVotes,
  onReset,
  headingRef,
}: {
  bundle: StateBundle;
  band: Band;
  state: ConventionState;
  setState: Dispatch<SetStateAction<ConventionState>>;
  ratifyVotes: { yes: number; no: number };
  setRatifyVotes: (v: { yes: number; no: number }) => void;
  onReset: () => void;
  headingRef: MutableRefObject<HTMLHeadingElement | null>;
}) {
  const copy = COPY[band];
  const classMode = band === '8-10';
  const decisions = bundle.decisions;
  const node = decisions[state.nodeIndex];
  // Class mode confirms each single tap; delegate mode shows a pass-the-device card
  // between seats so one kid can't accidentally vote for the next.
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);

  // Clear per-question interaction state when the question changes. Deliberately NOT on
  // phase change: the pass-the-device card must survive the round-1 -> round-2 boundary,
  // where the device is with the last voter and seat 1 votes next.
  useEffect(() => {
    setPendingChoice(null);
    setHandoff(false);
  }, [state.nodeIndex]);

  const begin = (seatCount: number) => {
    const seats: Seat[] = classMode
      ? [{ index: 0, constituency: 'The whole class', privateGoal: '' }]
      : Array.from({ length: seatCount }, (_, i) => {
          const card = bundle.goal_cards[i % bundle.goal_cards.length];
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
      if (winner === null) return { ...prev, votes }; // tie — keep talking
      return {
        ...prev,
        votes,
        adopted: { ...prev.adopted, [current.node_id]: winner },
        phase: 'mirror',
      };
    });
  };

  const chooseOption = (optionId: string) => {
    if (classMode) {
      setPendingChoice(optionId);
      return;
    }
    castVote(optionId);
    setHandoff(true);
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
    return (
      <>
        <p className="eyebrow">{NEUTRAL.pilot(bundle.state_name)}</p>
        <h1 ref={headingRef} tabIndex={-1}>{NEUTRAL.title}</h1>
        <p>{copy.setupIntro(decisions.length)}</p>
        <p>{copy.setupMode}</p>
        <SetupControls classMode={classMode} copy={copy} onBegin={begin} />
      </>
    );
  }

  if (state.phase === 'ratify') {
    return (
      <RatifyScreen
        bundle={bundle}
        band={band}
        copy={copy}
        state={state}
        classMode={classMode}
        votesSoFar={ratifyVotes}
        onVote={castRatifyVote}
        headingRef={headingRef}
      />
    );
  }

  if (state.phase === 'charter') {
    return (
      <CharterScreen
        bundle={bundle}
        band={band}
        copy={copy}
        state={state}
        onReset={onReset}
        headingRef={headingRef}
      />
    );
  }

  if (!node) return null;

  const round = state.phase === 'draft' ? 1 : 2;
  const votedThisRound = state.votes.filter(
    (v) => v.nodeId === node.node_id && v.round === round,
  ).length;
  const seat = state.seats[votedThisRound % state.seats.length];
  const roundComplete = votedThisRound >= state.seats.length;
  const tied = state.phase === 'negotiate' && roundComplete;
  const prompt = promptFor(node, band);

  return (
    <>
      <p className="eyebrow">
        {copy.questionEyebrow(state.nodeIndex + 1, decisions.length, topicLabelFor(bundle, node.topic, band))}
      </p>
      <ProgressDots current={state.nodeIndex} total={decisions.length} done={false} />
      <h1 ref={headingRef} tabIndex={-1}>{prompt}</h1>

      {state.phase === 'draft' && seat && (
        <>
          <h2>{copy.vote1Heading}</h2>
          <p>{copy.vote1Intro}</p>
          <VoteFlow
            node={node}
            band={band}
            copy={copy}
            seat={seat}
            classMode={classMode}
            handoff={handoff}
            onHandoffDone={() => setHandoff(false)}
            pendingChoice={pendingChoice}
            onChoose={chooseOption}
            onLockIn={(id) => { castVote(id); setPendingChoice(null); }}
            onRedo={() => setPendingChoice(null)}
          />
        </>
      )}

      {state.phase === 'negotiate' && !tied && seat && (
        <>
          <TallyBoard node={node} band={band} copy={copy} state={state} />
          <h2>{copy.vote2Heading}</h2>
          <p>{copy.vote2Intro}</p>
          <VoteFlow
            node={node}
            band={band}
            copy={copy}
            seat={seat}
            classMode={classMode}
            handoff={handoff}
            onHandoffDone={() => setHandoff(false)}
            pendingChoice={pendingChoice}
            onChoose={chooseOption}
            onLockIn={(id) => { castVote(id); setPendingChoice(null); }}
            onRedo={() => setPendingChoice(null)}
          />
        </>
      )}

      {tied && (
        <>
          <TallyBoard node={node} band={band} copy={copy} state={state} />
          <p role="status">
            <strong>{copy.tieTitle}</strong> {copy.tieBody}
          </p>
          <div className="options">
            <button type="button" onClick={revoteAfterTie}>{copy.tieButton}</button>
          </div>
        </>
      )}

      {state.phase === 'mirror' && (
        <MirrorScreen
          node={node}
          bundle={bundle}
          band={band}
          copy={copy}
          state={state}
          onContinue={continueFromMirror}
        />
      )}

      <TrickyWords node={node} band={band} copy={copy} />
      <p aria-live="polite" className="sr-only">{copy.phaseName(state.phase)}</p>
    </>
  );
}

function SetupControls({
  classMode,
  copy,
  onBegin,
}: {
  classMode: boolean;
  copy: Copy;
  onBegin: (seatCount: number) => void;
}) {
  const [seatCount, setSeatCount] = useState(5);
  return (
    <>
      {!classMode && (
        <p>
          <label>
            {copy.seatLabel}{' '}
            <select value={seatCount} onChange={(e) => setSeatCount(Number(e.target.value))}>
              {[3, 5, 7].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </p>
      )}
      <div className="options">
        <button type="button" onClick={() => onBegin(seatCount)}>{copy.begin}</button>
      </div>
    </>
  );
}

function ProgressDots({ current, total, done }: { current: number; total: number; done: boolean }) {
  return (
    <div className="dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={done || i < current ? 'dot dot-done' : i === current ? 'dot dot-now' : 'dot'}
        />
      ))}
    </div>
  );
}

function VoteFlow({
  node,
  band,
  copy,
  seat,
  classMode,
  handoff,
  onHandoffDone,
  pendingChoice,
  onChoose,
  onLockIn,
  onRedo,
}: {
  node: BundleDecision;
  band: Band;
  copy: Copy;
  seat: Seat;
  classMode: boolean;
  handoff: boolean;
  onHandoffDone: () => void;
  pendingChoice: string | null;
  onChoose: (optionId: string) => void;
  onLockIn: (optionId: string) => void;
  onRedo: () => void;
}) {
  if (!classMode && handoff) {
    return (
      <section className="handoff" aria-label={copy.handoffTitle(seat.index + 1, seat.constituency)}>
        <p><strong>{copy.handoffTitle(seat.index + 1, seat.constituency)}</strong></p>
        <div className="options">
          <button type="button" onClick={onHandoffDone}>{copy.handoffReady}</button>
        </div>
      </section>
    );
  }

  if (classMode && pendingChoice) {
    const chosen = node.options.find((o) => o.option_id === pendingChoice);
    const chosenLabel = chosen ? labelFor(chosen, band) : '';
    return (
      <section className="handoff" aria-label={`${copy.confirmPick} ${chosenLabel}`}>
        <p><strong>{copy.confirmPick} {chosenLabel}</strong></p>
        <div className="options">
          <button type="button" onClick={() => onLockIn(pendingChoice)}>{copy.lockIn}</button>
          <button type="button" onClick={onRedo}>{copy.redo}</button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={copy.seatEyebrow(seat.index + 1, seat.constituency)}>
      {!classMode && (
        <>
          <p className="eyebrow">{copy.seatEyebrow(seat.index + 1, seat.constituency)}</p>
          <details>
            <summary>{copy.goalCardSummary}</summary>
            <p>{seat.privateGoal}</p>
          </details>
        </>
      )}
      <div className="options vote-options">
        {node.options.map((o) => (
          <button key={o.option_id} type="button" onClick={() => onChoose(o.option_id)}>
            {labelFor(o, band)}
          </button>
        ))}
      </div>
    </section>
  );
}

function TallyBoard({
  node,
  band,
  copy,
  state,
}: {
  node: BundleDecision;
  band: Band;
  copy: Copy;
  state: ConventionState;
}) {
  const counts = tally(state.votes, node.node_id, 1);
  return (
    <section aria-label={copy.tallyHeading}>
      <h2 className="eyebrow-heading">{copy.tallyHeading}</h2>
      <ul className="tally">
        {node.options.map((o) => {
          const n = counts.get(o.option_id) ?? 0;
          const label = labelFor(o, band);
          return (
            <li key={o.option_id}>
              <strong>{label}</strong> — {copy.voteCount(n)}
              <span className="meter" aria-hidden="true">
                {Array.from({ length: state.seats.length }, (_, i) => (
                  <span key={i} className={i < n ? 'meter-unit filled' : 'meter-unit'} />
                ))}
              </span>
              {o.favors.length > 0 && (
                <span className="chip favors">{copy.helps}: {o.favors.join(', ')}</span>
              )}
              {o.harms.length > 0 && (
                <span className="chip harms">{copy.hurts}: {o.harms.join(', ')}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MirrorScreen({
  node,
  bundle,
  band,
  copy,
  state,
  onContinue,
}: {
  node: BundleDecision;
  bundle: StateBundle;
  band: Band;
  copy: Copy;
  state: ConventionState;
  onContinue: () => void;
}) {
  const adoptedId = state.adopted[node.node_id];
  const adopted = node.options.find((o) => o.option_id === adoptedId);
  const changed = mindChangeCount(state.votes, node.node_id);
  if (!adopted) return null;
  const letter = adoptedId ? letterFor(bundle, node.node_id, adoptedId, band) : undefined;
  const reflection = reflectionFor(bundle, node.node_id, band);
  return (
    <>
      <p>
        <strong>{copy.adopted(labelFor(adopted, band))}</strong>{' '}
        {changed > 0 ? copy.mindChanged(changed) : copy.mindHeld}
      </p>
      <section aria-labelledby="mirror">
        <h2 className="eyebrow-heading" id="mirror">{copy.mirrorHeading}</h2>
        {adopted.clause_refs.map((ref) => (
          <ClauseCard key={ref} clause={bundle.clauses[ref]} urn={ref} band={band} copy={copy} />
        ))}
      </section>
      {letter && (
        <section aria-labelledby="letter">
          <h2 className="eyebrow-heading" id="letter">{copy.letterHeading}</h2>
          <blockquote className="letter" data-tone={letter.tone}>
            {letter.body}
            <cite>{copy.letterFrom(letter.writer_name, letter.writer_age)}</cite>
          </blockquote>
        </section>
      )}
      {reflection && (
        <section aria-labelledby="reflect">
          <h2 className="eyebrow-heading" id="reflect">{copy.reflectHeading}</h2>
          <p className="reflect">{reflection.prompt}</p>
        </section>
      )}
      <div className="options">
        <button type="button" onClick={onContinue}>{copy.next}</button>
      </div>
    </>
  );
}

/** Browse every ingested clause — the corpus is bigger than the decision graph. */
function Explore({ bundle, band }: { bundle: StateBundle; band: Band }) {
  const copy = COPY[band];
  const ingested = Object.values(bundle.clauses)
    .filter((c) => c.text !== null)
    .sort((a, b) => a.urn.localeCompare(b.urn));
  return (
    <article>
      <h2>{copy.exploreTitle}</h2>
      <p>{copy.exploreIntro}</p>
      {ingested.map((clause) => (
        <ClauseCard key={clause.urn} clause={clause} urn={clause.urn} band={band} copy={copy} />
      ))}
    </article>
  );
}

/**
 * On-device text-to-speech (docs/05-compliance.md: audio narration of clause text).
 * Privacy rule: only voices the browser marks localService are used — a network voice
 * would transmit the clause text to a third party, so with no local voice the button
 * simply doesn't render.
 */
function ReadAloud({ copy, text }: { copy: Copy; text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const check = () =>
      setAvailable(
        window.speechSynthesis.getVoices().some((v) => v.localService && v.lang.startsWith('en')),
      );
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', check);
      window.speechSynthesis.cancel();
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const voice = synth.getVoices().find((v) => v.localService && v.lang.startsWith('en'));
    if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <p className="read-aloud">
      <button type="button" className="linklike" aria-pressed={speaking} onClick={toggle}>
        {speaking ? copy.readStop : `🔊 ${copy.readAloud}`}
      </button>
    </p>
  );
}

/** Only official government sources may render as links, and only over HTTPS. */
function isAllowedSource(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'revisor.mo.gov' || u.hostname.endsWith('.gov'));
  } catch {
    return false;
  }
}

function ClauseCard({
  clause,
  urn,
  band,
  copy,
}: {
  clause: BundleClause | undefined;
  urn: string;
  band: Band;
  copy: Copy;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!clause) {
    return (
      <blockquote className="clause">
        <em>No clause record for {urn}.</em>
      </blockquote>
    );
  }

  // docs/05-compliance.md: historical_harm never surfaces raw in an 8-10 Mirror card.
  if (band === '8-10' && clause.sensitivity !== 'none') {
    return (
      <blockquote className="clause mediated">
        <em>{clause.teacher_note_8_10 ?? copy.sensitiveFraming}</em>
        <cite>{clause.citation}</cite>
      </blockquote>
    );
  }

  const showSource = clause.source_url !== null && isAllowedSource(clause.source_url);
  const gloss = glossFor(clause, band);
  return (
    <blockquote className="clause">
      {clause.sensitivity !== 'none' && (
        <p className="framing">
          {clause.sensitivity === 'historical_harm'
            ? copy.sensitiveFraming
            : clause.teacher_note_8_10 ?? copy.sensitiveFraming}
        </p>
      )}
      {clause.text ? (
        <>
          <p className="framing">
            {copy.realWords}
            {clause.section_heading && <> “{clause.section_heading}”</>}
          </p>
          {clause.text}
          {gloss && (
            <div className="gloss">
              <p className="framing">{copy.whatThisMeans}</p>
              {gloss}
            </div>
          )}
          <ReadAloud
            copy={copy}
            text={[clause.section_heading ?? '', clause.text, gloss ?? ''].join('. ')}
          />
        </>
      ) : (
        <em>{copy.pendingClause}</em>
      )}
      <cite>
        {clause.citation}
        {showSource && !confirming && (
          <>
            {' · '}
            <button type="button" className="linklike" onClick={() => setConfirming(true)}>
              {copy.sourceLink} ↗
            </button>
          </>
        )}
      </cite>
      {showSource && confirming && (
        <div className="leaving" role="group" aria-label={copy.leavingTitle}>
          <p><strong>{copy.leavingTitle}</strong> {copy.leavingBody}</p>
          <div className="options">
            <a
              href={clause.source_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setConfirming(false)}
            >
              {copy.leavingGo} ↗
            </a>
            <button type="button" onClick={() => setConfirming(false)}>{copy.leavingStay}</button>
          </div>
        </div>
      )}
    </blockquote>
  );
}

function TrickyWords({ node, band, copy }: { node: BundleDecision; band: Band; copy: Copy }) {
  const text = [
    promptFor(node, band),
    ...node.options.map((o) => labelFor(o, band)),
    copy.ratifyTitle,
  ].join(' ');
  const terms = termsIn(text);
  if (terms.length === 0) return null;
  return (
    <details className="tricky">
      <summary>{copy.trickyWords}</summary>
      <dl>
        {terms.map((t) => (
          <div key={t.term}>
            <dt>{t.term}</dt>
            <dd>
              {t.kid}
              {t.watchOut && <em> {t.watchOut}</em>}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function RatifyScreen({
  bundle,
  band,
  copy,
  state,
  classMode,
  votesSoFar,
  onVote,
  headingRef,
}: {
  bundle: StateBundle;
  band: Band;
  copy: Copy;
  state: ConventionState;
  classMode: boolean;
  votesSoFar: { yes: number; no: number };
  onVote: (yes: boolean) => void;
  headingRef: MutableRefObject<HTMLHeadingElement | null>;
}) {
  const seatIndex = (votesSoFar.yes + votesSoFar.no) % state.seats.length;
  const seat = state.seats[seatIndex];
  const [pending, setPending] = useState<boolean | null>(null);
  const [handoff, setHandoff] = useState(false);

  const choose = (yes: boolean) => {
    if (classMode) {
      setPending(yes);
      return;
    }
    onVote(yes);
    setHandoff(true);
  };

  return (
    <>
      <p className="eyebrow">{copy.phaseName('ratify')}</p>
      <ProgressDots current={bundle.decisions.length} total={bundle.decisions.length} done />
      <h1 ref={headingRef} tabIndex={-1}>{copy.ratifyTitle}</h1>
      <p>{copy.ratifyIntro}</p>
      <ul className="tally">
        {bundle.decisions.map((d) => {
          const adopted = d.options.find((o) => o.option_id === state.adopted[d.node_id]);
          return (
            <li key={d.node_id}>
              <strong>{promptFor(d, band)}</strong> — {adopted ? labelFor(adopted, band) : copy.undecided}
            </li>
          );
        })}
      </ul>
      {seat && !classMode && handoff && (
        <section className="handoff" aria-label={copy.handoffTitle(seat.index + 1, seat.constituency)}>
          <p><strong>{copy.handoffTitle(seat.index + 1, seat.constituency)}</strong></p>
          <div className="options">
            <button type="button" onClick={() => setHandoff(false)}>{copy.handoffReady}</button>
          </div>
        </section>
      )}
      {seat && classMode && pending !== null && (
        <section className="handoff" aria-label={`${copy.confirmPick} ${pending ? copy.ratifyYes : copy.ratifyNo}`}>
          <p><strong>{copy.confirmPick} {pending ? copy.ratifyYes : copy.ratifyNo}</strong></p>
          <div className="options">
            <button type="button" onClick={() => { onVote(pending); setPending(null); }}>{copy.lockIn}</button>
            <button type="button" onClick={() => setPending(null)}>{copy.redo}</button>
          </div>
        </section>
      )}
      {seat && !(!classMode && handoff) && !(classMode && pending !== null) && (
        <section aria-label={copy.seatEyebrow(seat.index + 1, seat.constituency)}>
          {!classMode && <p className="eyebrow">{copy.seatEyebrow(seat.index + 1, seat.constituency)}</p>}
          <div className="options vote-options">
            <button type="button" onClick={() => choose(true)}>{copy.ratifyYes}</button>
            <button type="button" onClick={() => choose(false)}>{copy.ratifyNo}</button>
          </div>
        </section>
      )}
      {!classMode && (
        <p aria-live="polite" className="eyebrow">{copy.ratifyTally(votesSoFar.yes, votesSoFar.no)}</p>
      )}
    </>
  );
}

function CharterScreen({
  bundle,
  band,
  copy,
  state,
  onReset,
  headingRef,
}: {
  bundle: StateBundle;
  band: Band;
  copy: Copy;
  state: ConventionState;
  onReset: () => void;
  headingRef: MutableRefObject<HTMLHeadingElement | null>;
}) {
  const totalChanged = bundle.decisions.reduce(
    (sum, d) => sum + mindChangeCount(state.votes, d.node_id),
    0,
  );
  const adoptedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <>
      <div className="no-print">
        <p className="eyebrow">{copy.phaseName('charter')}</p>
        {state.ratified ? (
          <h1 ref={headingRef} tabIndex={-1}>{copy.ratifiedTitle}</h1>
        ) : (
          <>
            <h1 ref={headingRef} tabIndex={-1}>{copy.notRatifiedTitle}</h1>
            <p>{copy.notRatifiedBody}</p>
          </>
        )}
      </div>
      {state.ratified && (
        <section className="charter-doc" aria-label={copy.charterDocTitle(bundle.state_name)}>
          <p className="seal seal-mark" aria-hidden="true">⬤</p>
          <h2>{copy.charterDocTitle(bundle.state_name)}</h2>
          <p className="eyebrow">{adoptedDate}</p>
          <ol className="articles">
            {bundle.decisions.map((d, i) => {
              const adopted = d.options.find((o) => o.option_id === state.adopted[d.node_id]);
              return (
                <li key={d.node_id}>
                  <span className="eyebrow">{copy.articleLabel(i + 1)} · {promptFor(d, band)}</span>
                  <strong>{adopted ? labelFor(adopted, band) : copy.undecided}</strong>
                </li>
              );
            })}
          </ol>
          <p>{copy.mindSummary(totalChanged)}</p>
          <p className="eyebrow">{copy.signedLine}</p>
          <div className="signatures" aria-hidden="true">
            {state.seats.map((seat) => (
              <span key={seat.index} className="signature-line" />
            ))}
          </div>
        </section>
      )}
      {!state.ratified && (
        <ul className="tally">
          {bundle.decisions.map((d) => {
            const adopted = d.options.find((o) => o.option_id === state.adopted[d.node_id]);
            return (
              <li key={d.node_id}>
                <strong>{promptFor(d, band)}</strong> — {adopted ? labelFor(adopted, band) : copy.undecided}
              </li>
            );
          })}
        </ul>
      )}
      {!state.ratified && <p>{copy.mindSummary(totalChanged)}</p>}
      <div className="options no-print">
        {state.ratified && (
          <button type="button" onClick={() => window.print()}>{copy.printCharter}</button>
        )}
        <button type="button" onClick={onReset}>{copy.playAgain}</button>
      </div>
    </>
  );
}
