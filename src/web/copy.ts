import type { Band } from './game/bundle.js';

/**
 * Every word a child reads, in two registers. The 8-10 register targets roughly
 * Flesch-Kincaid grade 3.0-4.8; the 11-14 register targets 5.0-7.5. Enforced by
 * scripts/check-reading-level.mjs (glossary-taught terms are substituted before
 * scoring, since they are explicitly defined in the Tricky Words panel).
 *
 * Style rules (from docs + research): second person, active voice, one idea per
 * sentence, present tense for process. Simplify syntax, never stance — kids
 * notice being talked down to. Changing your mind is framed as the win.
 */

export interface Copy {
  setupIntro: (n: number) => string;
  setupMode: string;
  seatLabel: string;
  begin: string;
  vote1Heading: string;
  vote1Intro: string;
  vote2Heading: string;
  vote2Intro: string;
  goalCardSummary: string;
  tallyHeading: string;
  helps: string;
  hurts: string;
  voteCount: (n: number) => string;
  tieTitle: string;
  tieBody: string;
  tieButton: string;
  adopted: (label: string) => string;
  mindChanged: (n: number) => string;
  mindHeld: string;
  mirrorHeading: string;
  realWords: string;
  whatThisMeans: string;
  readAloud: string;
  readStop: string;
  pendingClause: string;
  sensitiveFraming: string;
  sourceLink: string;
  leavingTitle: string;
  leavingBody: string;
  leavingGo: string;
  leavingStay: string;
  letterHeading: string;
  letterFrom: (name: string, age: number | null) => string;
  reflectHeading: string;
  next: string;
  ratifyTitle: string;
  ratifyIntro: string;
  ratifyYes: string;
  ratifyNo: string;
  ratifyTally: (yes: number, no: number) => string;
  undecided: string;
  ratifiedTitle: string;
  ratifiedSeal: string;
  notRatifiedTitle: string;
  notRatifiedBody: string;
  mindSummary: (n: number) => string;
  playAgain: string;
  questionEyebrow: (n: number, total: number, topic: string) => string;
  seatEyebrow: (n: number, constituency: string) => string;
  phaseName: (phase: string) => string;
  trickyWords: string;
  handoffTitle: (n: number, constituency: string) => string;
  handoffReady: string;
  confirmPick: string;
  lockIn: string;
  redo: string;
  exploreTitle: string;
  exploreIntro: string;
  exploreNoState: string;
  exploreStatesWords: (n: number) => string;
  exploreNobodyYet: string;
  exploreOther: string;
  exploreOtherIntro: string;
  printCharter: string;
  charterDocTitle: (stateName: string) => string;
  articleLabel: (n: number) => string;
  signedLine: string;
}

const PHASE_NAMES_KID: Record<string, string> = {
  draft: 'First vote',
  negotiate: 'Talk it over',
  mirror: 'What real states did',
  ratify: 'Last vote',
  charter: 'Your rules',
};

const PHASE_NAMES_TEEN: Record<string, string> = {
  draft: 'First vote',
  negotiate: 'Debate',
  mirror: 'What real states did',
  ratify: 'Ratification',
  charter: 'Your charter',
};

export const COPY: Record<Band, Copy> = {
  '8-10': {
    setupIntro: (n) =>
      `You will make ${n} big rules for your state. Vote once. Talk it over. Then vote again. At the end, you see what real states did.`,
    setupMode: 'Play together as one class. Talk first. Then vote.',
    seatLabel: 'How many groups are voting?',
    begin: 'Start',
    vote1Heading: 'Vote 1 · before the talk',
    vote1Intro: 'Read both choices out loud. Pick one as a class.',
    vote2Heading: 'Vote 2 · after the talk',
    vote2Intro:
      'You heard who each choice helps and who it hurts. Vote again. Changing your mind means you listened.',
    goalCardSummary: 'Your goal card (keep it secret)',
    tallyHeading: 'Who does each choice help or hurt?',
    helps: 'helps',
    hurts: 'hurts',
    voteCount: (n) => (n === 0 ? 'no votes yet' : `${n} ${n === 1 ? 'vote' : 'votes'}`),
    tieTitle: 'It’s a tie.',
    tieBody: 'A tie means keep talking. Share one more reason. Then vote again.',
    tieButton: 'Vote again',
    adopted: (label) => `Your class picked: ${label}.`,
    mindChanged: () => 'Your class changed its mind after the talk. That means you listened.',
    mindHeld: 'Your class stuck with its first pick. That can be right too.',
    mirrorHeading: 'What real states did',
    realWords: 'The real words:',
    whatThisMeans: 'What it means:',
    readAloud: 'Read it to me',
    readStop: 'Stop reading',
    pendingClause:
      'This is a real rule from a real state. The exact words are coming soon. We never make up the words.',
    sensitiveFraming: 'This rule has a hard history. Read it with your teacher.',
    sourceLink: 'See the real page',
    leavingTitle: 'You are leaving Charter.',
    leavingBody:
      'This link goes to your state’s real government website. It is written for grown-ups. Ask a teacher or parent if you get stuck.',
    leavingGo: 'Yes, take me there',
    leavingStay: 'Stay here',
    letterHeading: 'A letter to your convention',
    letterFrom: (name, age) => (age ? `From ${name}, age ${age}` : `From ${name}`),
    reflectHeading: 'Turn and talk',
    next: 'Next question',
    ratifyTitle: 'Do you keep your rules?',
    ratifyIntro: 'Here are the rules you made. This is the last vote.',
    ratifyYes: 'Yes — keep our rules',
    ratifyNo: 'No — start over',
    ratifyTally: (yes, no) => `Keep: ${yes} · Start over: ${no}`,
    undecided: 'not picked yet',
    ratifiedTitle: 'You did it.',
    ratifiedSeal: '⬤ Your rules are official.',
    notRatifiedTitle: 'Your class said no.',
    notRatifiedBody: 'You said no to your own rules. Real states have done that too. You can try again.',
    mindSummary: (n) =>
      n === 0
        ? 'Your class never changed its mind. Talk about why.'
        : `Your class changed its mind ${n} ${n === 1 ? 'time' : 'times'}. Listening is the whole game.`,
    playAgain: 'Play again',
    questionEyebrow: (n, total, topic) => `Question ${n} of ${total} · ${topic}`,
    seatEyebrow: (n, constituency) => `Group ${n} · ${constituency}`,
    phaseName: (phase) => PHASE_NAMES_KID[phase] ?? phase,
    trickyWords: 'Tricky words',
    handoffTitle: (n, constituency) => `Pass it to Group ${n}: ${constituency}.`,
    handoffReady: 'We have it',
    confirmPick: 'You picked:',
    lockIn: 'Lock it in',
    redo: 'Pick again',
    exploreTitle: 'The real rule book',
    exploreIntro:
      'Real states had to answer the same questions you did. Here is what they wrote down. ' +
      'Read one question, then look at both answers.',
    exploreNoState: 'No state here yet.',
    // Not "n states chose this": a state can have chosen an answer and still have its words
    // pending, so a count of chosen states would be wrong on the face of the page.
    exploreStatesWords: (n) => (n === 1 ? '1 state’s real words' : `${n} states’ real words`),
    exploreNobodyYet: 'We are still looking for the words for this one.',
    exploreOther: 'More rules in the book',
    exploreOtherIntro: 'These rules are not part of a question. They are here to read.',
    printCharter: 'Print your rules',
    charterDocTitle: (stateName) => `The Rules of ${stateName}`,
    articleLabel: (n) => `Rule ${n}`,
    signedLine: 'Signed by our class:',
  },
  '11-14': {
    setupIntro: (n) =>
      `Your delegation will draft a constitution: ${n} questions, two votes each — one before debate, one after. Then you see what real states wrote, clause by clause, and vote on whether to keep what you made.`,
    setupMode: 'Pass one device around the table. Each seat votes in turn.',
    seatLabel: 'Delegates at the table',
    begin: 'Open the convention',
    vote1Heading: 'First vote · before debate',
    vote1Intro: 'Pass the device around the delegation. Your goal card is yours alone.',
    vote2Heading: 'Second vote · after debate',
    vote2Intro:
      'Now you know who each choice helps and who it harms. Vote again. Changing your mind after hearing the other side is the point, not a defeat.',
    goalCardSummary: 'Your goal card (secret — don’t read it aloud)',
    tallyHeading: 'The first vote, and who each choice affects',
    helps: 'helps',
    hurts: 'harms',
    voteCount: (n) => (n === 0 ? 'no votes yet' : `${n} ${n === 1 ? 'vote' : 'votes'}`),
    tieTitle: 'The vote is tied.',
    tieBody: 'A tie is a real outcome: the convention must keep talking. Debate again, then revote.',
    tieButton: 'Reopen the vote',
    adopted: (label) => `Your convention adopted: ${label}.`,
    mindChanged: (n) =>
      `${n} ${n === 1 ? 'delegate' : 'delegates'} changed their mind after hearing the other side.`,
    mindHeld: 'No delegate changed their mind this round.',
    mirrorHeading: 'What real states did',
    realWords: 'Word for word:',
    whatThisMeans: 'In plain words:',
    readAloud: 'Read aloud',
    readStop: 'Stop reading',
    pendingClause:
      'This citation is real. The exact words appear once they are fetched from the official source — nothing in this app invents constitutional text.',
    sensitiveFraming:
      'This clause carries a hard history: rules like it were used to keep people from voting. Read it as evidence of how the rules changed.',
    sourceLink: 'Official source',
    leavingTitle: 'You’re leaving Charter.',
    leavingBody:
      'This link goes to your state’s real government website. It’s the primary source — written for adults, so it may be dense.',
    leavingGo: 'Take me there',
    leavingStay: 'Stay here',
    letterHeading: 'Mail for the convention',
    letterFrom: (name, age) => (age ? `From ${name}, age ${age}` : `From ${name}`),
    reflectHeading: 'Before you move on',
    next: 'Next question',
    ratifyTitle: 'Do you ratify this constitution?',
    ratifyIntro: 'These are the rules your convention adopted. Each seat casts one final vote.',
    ratifyYes: 'Ratify',
    ratifyNo: 'Reject',
    ratifyTally: (yes, no) => `${yes} for · ${no} against`,
    undecided: 'undecided',
    ratifiedTitle: 'Ratified.',
    ratifiedSeal: '⬤ The charter is sealed.',
    notRatifiedTitle: 'Not ratified.',
    notRatifiedBody:
      'The convention rejected its own draft. That has happened to real states too — back to the drafting table.',
    mindSummary: (n) =>
      `Across the whole convention, ${n} ${n === 1 ? 'vote' : 'votes'} changed after hearing the other side. That number is the point of the game.`,
    playAgain: 'Start a new convention',
    questionEyebrow: (n, total, topic) => `Question ${n} of ${total} · ${topic}`,
    seatEyebrow: (n, constituency) => `Seat ${n} · ${constituency}`,
    phaseName: (phase) => PHASE_NAMES_TEEN[phase] ?? phase,
    trickyWords: 'Tricky words',
    handoffTitle: (n, constituency) => `Pass the device to Seat ${n} · ${constituency}.`,
    handoffReady: 'Ready to vote',
    confirmPick: 'Your vote:',
    lockIn: 'Confirm vote',
    redo: 'Change it',
    exploreTitle: 'The real rule book',
    exploreIntro:
      'Real states faced the same questions and answered them differently. Each clause below is ' +
      'from the official source, word for word, grouped under the question it answers.',
    exploreNoState: 'No state here yet.',
    // Counts the states whose words are on this page, not the states that chose the answer —
    // a citation can be verified while its text is still pending.
    exploreStatesWords: (n) => (n === 1 ? '1 state, in its own words' : `${n} states, in their own words`),
    exploreNobodyYet: 'We have the citation for this one. We do not have the words yet.',
    exploreOther: 'More rules in the book',
    exploreOtherIntro: 'These clauses are not attached to a question. They are here to read.',
    printCharter: 'Print the charter',
    charterDocTitle: (stateName) => `The Charter of ${stateName}`,
    articleLabel: (n) => `Article ${n}`,
    signedLine: 'Signed by the delegates:',
  },
};

/** Strings shown before a band is chosen, and chrome shared by both bands. */
export const NEUTRAL = {
  title: 'Charter',
  tagline: 'Make the rules for your state. Then see what real states did.',
  whoPlaying: 'Who is playing today?',
  band8: 'Ages 8–10',
  band8Sub: 'Play together as a class',
  band11: 'Ages 11–14',
  band11Sub: 'Play as delegates with secret goals',
  pilot: (stateName: string) => `A constitutional convention · pilot state: ${stateName}`,
  loading: 'Getting ready…',
  loadErrTitle: 'The game can’t open',
  loadErrBody: 'The game’s files did not load. Check your connection, then reload the page.',
  crashTitle: 'The game hit a snag',
  crashBody: 'Something went wrong on this page. Reload the page to keep playing.',
  skipLink: 'Skip to the game',
  navGame: 'Back to the game',
  navPrivacy: 'Our privacy promise',
  navGrownups: 'For grown-ups',
  navTeachers: 'Teachers & families',
  navExplore: 'Read the rule book',
  prototypeBadge: 'Prototype',
  prototypeNote: 'This game is still being built. Some parts are not done yet.',
  helpLead: 'Do you know your state’s constitution?',
  helpCta: 'Help us get it right',
  factQuestions: (n: number) => `${n} questions`,
  factClauses: (n: number, states: number) =>
    states > 1 ? `${n} real clauses from ${states} states` : `${n} real clauses`,
  factTime: '20 to 40 minutes',
  factGrades: 'Grades 3 to 8',
  trustStrip: 'No accounts. No ads. No tracking. Works with no wifi.',
  exploreCardTitle: 'The real rule book',
  exploreCardBody:
    'See the same question answered by real states, in their own words.',
  exploreCardCta: 'Open the rule book',
  teacherLead: 'Teaching with this?',
  teacherCta: 'Start with the teacher guide',
  changeBand: 'Switch age group',
  noscript: 'Charter needs JavaScript to run. Nothing is tracked either way.',
};

/**
 * Tier 3 vocabulary, defined in kid language. These terms are explicitly taught,
 * so the reading-level gate substitutes them before scoring. `watchOut` flags
 * polysemy — everyday meanings a kid already holds that collide with the civic one.
 */
export interface GlossaryEntry {
  term: string;
  kid: string;
  watchOut?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'constitution', kid: 'The big list of rules for how a state works.' },
  { term: 'convention', kid: 'A meeting where people write or change the rules.' },
  { term: 'delegate', kid: 'A person picked to speak and vote for a group.' },
  { term: 'delegation', kid: 'The whole team of delegates.' },
  { term: 'ratify', kid: 'To vote yes and make it official.' },
  { term: 'ballot', kid: 'The paper or screen you vote on.' },
  { term: 'legislature', kid: 'The group of people whose job is making laws.' },
  { term: 'charter', kid: 'A written set of rules.' },
  { term: 'citizen', kid: 'A member of a state or country.' },
  { term: 'commission', kid: 'A small group given one job to do.' },
  { term: 'governor', kid: 'The leader of a state.' },
  { term: 'clause', kid: 'One rule inside a constitution.' },
  { term: 'citation', kid: 'The address that tells you where words come from.' },
  { term: 'initiative', kid: 'A way to start a new law yourself, with signatures.' },
  { term: 'referendum', kid: 'A public vote on a law.' },
  { term: 'amendment', kid: 'A change to the official rules.' },
  { term: 'nonpartisan', kid: 'Not tied to one party or side.', watchOut: 'A party here means a political team, not a birthday party.' },
  { term: 'assembly', kid: 'A big group of lawmakers.', watchOut: 'The General Assembly is Missouri\u2019s name for its lawmakers.' },
  { term: 'vacancy', kid: 'An open job that needs to be filled.' },
  { term: 'felony', kid: 'A serious crime.' },
  { term: 'petition', kid: 'A written ask that people sign.' },
  { term: 'remedy', kid: 'A way a court fixes a wrong.' },
  { term: 'executive', kid: 'The part of government that carries out the laws.' },
  { term: 'conscience', kid: 'Your own sense of right and wrong.' },
  {
    term: 'supermajority',
    kid: 'Much more than half. Often 6 out of 10, or 2 out of 3.',
    watchOut: 'A plain majority is just more than half. A supermajority is a higher bar.',
  },
  { term: 'majority', kid: 'More than half.' },
  {
    term: 'bill',
    kid: 'An idea for a new law.',
    watchOut: 'Not money you pay! In government, a bill is an idea for a law.',
  },
];

/** Glossary terms that appear in a given text, for the Tricky Words panel. */
export function termsIn(text: string): GlossaryEntry[] {
  const lower = text.toLowerCase();
  return GLOSSARY.filter((g) => lower.includes(g.term));
}
