import type { StateBundle } from '../game/bundle.js';
/**
 * The trust layer: a kid-readable privacy promise, a full posture page for adults and
 * district reviewers, and a teachers & families guide. Static content, no data, no forms.
 *
 * The grown-ups page deliberately answers every question a privacy reviewer's rubric asks,
 * explicitly, with "No" or "Not applicable" — silence reads as a warning in those reviews.
 */

const REPO_URL = 'https://github.com/dougdevitre/access-to-civics';

/**
 * How many states have real text, named. This sentence has been hand-edited on every ingest and
 * has been briefly false in between each one, which is not a claim to leave to memory on a page
 * whose whole job is being trustworthy. It is derived from the shipped bundle instead.
 */
export function ingestedStates(bundle: StateBundle | null): string[] {
  const names = new Map<string, string>();
  for (const clause of Object.values(bundle?.clauses ?? {})) {
    if (clause.text === null) continue;
    names.set(clause.state, STATE_NAMES[clause.state] ?? clause.state);
  }
  return [...names.values()].sort();
}

const STATE_NAMES: Record<string, string> = {
  CA: 'California', DE: 'Delaware', FL: 'Florida', MO: 'Missouri',
  NE: 'Nebraska', NH: 'New Hampshire', TX: 'Texas', VA: 'Virginia',
};

/** "Missouri, Texas and Nebraska" — an English list, not a comma-joined array. */
export function listStates(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The subject of the sentence. The bundle can still be loading when a reader opens a trust page
 * directly, and "0 states —  — have had their text ingested" is worse than a vaguer true sentence.
 */
export function ingestedPhrase(names: string[]): string {
  if (names.length === 0) return 'Several states have';
  return `${names.length} states — ${listStates(names)} — have`;
}

/** Placeholder strings that look like a reviewer but are not a person. Mirrors scripts/lib/review.mjs. */
const PLACEHOLDER_REVIEWERS = new Set(['initial-editorial-pass', 'unreviewed', 'tbd', '']);

/**
 * How much of the editorial layer a named person has actually checked.
 *
 * The clause text is byte-verified against a hashed source on every build, so it needs nobody's
 * word for it. The gloss does not have that property: it is the sentence a child reads and
 * believes, and no checksum can tell you whether it is a fair account of the clause above it.
 * A district reviewer is entitled to know which of those two things they are looking at, and
 * the honest answer today is that nobody outside this repository has checked the second one.
 */
export function glossReviewCount(bundle: StateBundle | null): { named: number; total: number } {
  let named = 0;
  let total = 0;
  for (const clause of Object.values(bundle?.clauses ?? {})) {
    if (clause.gloss_grade_5 == null && clause.gloss_grade_8 == null) continue;
    total++;
    const by = clause.gloss_reviewed_by?.trim().toLowerCase() ?? '';
    if (!PLACEHOLDER_REVIEWERS.has(by)) named++;
  }
  return { named, total };
}

export function PrivacyPromise() {
  return (
    <article>
      <h2>Our privacy promise</h2>
      <p className="eyebrow">Written for you, the player. Short version: we don’t know you exist.</p>

      <h3>What stays with you</h3>
      <p>
        Your votes and your rules live only on this device. When you close the page, the game
        forgets them. We never see them. No one does.
      </p>

      <h3>What we never do</h3>
      <ul className="promise-list">
        <li>No accounts. You never sign up or log in.</li>
        <li>No names. We never ask who you are.</li>
        <li>No typing. There is nothing to type into this game.</li>
        <li>No cookies and no trackers.</li>
        <li>No ads. Nothing here is for sale.</li>
        <li>No camera, no microphone, no location.</li>
        <li>No chat and no messages with strangers.</li>
        <li>No selling data. There is no data to sell.</li>
      </ul>

      <h3>Want to erase everything?</h3>
      <p>
        Clear this site’s data in your browser, or just close the page. That’s it. There is
        nothing on our side to delete.
      </p>

      <h3>Something feels wrong?</h3>
      <p>Tell a parent or teacher. They can read the grown-ups page and reach us from there.</p>
    </article>
  );
}

export function GrownUps({ bundle }: { bundle: StateBundle | null }) {
  const states = ingestedStates(bundle);
  const review = glossReviewCount(bundle);
  return (
    <article>
      <h2>For grown-ups: privacy, safety, and how this app works</h2>
      <p className="eyebrow">Last updated August 2026 · applies to the web app at this address</p>

      <p>
        Charter is a free, open-source civic education game. It is built so that the default
        classroom session makes no meaningful data exist in the first place — a smaller privacy
        surface than any policy could manage after the fact. This page answers the questions
        privacy reviewers and district staff ask, explicitly.
      </p>

      <h3>Data practices, question by question</h3>
      <ul className="promise-list">
        <li><strong>Personal information collected:</strong> none. No names, emails, accounts, or identifiers.</li>
        <li><strong>Free-text input from children:</strong> none exists. The interface is buttons and one dropdown.</li>
        <li><strong>Cookies or tracking technologies:</strong> none set by us. No analytics, no pixels, no fingerprinting.</li>
        <li><strong>Third-party scripts, ads, or ad networks:</strong> none. The page loads only its own files.</li>
        <li><strong>Sale or sharing of data:</strong> no — there is no data to sell or share.</li>
        <li><strong>Behavioral or targeted advertising:</strong> no advertising of any kind.</li>
        <li><strong>Social features, chat, or user-generated content:</strong> none.</li>
        <li><strong>Accounts, profiles, or progress tracking on our side:</strong> none. Game state is in-page memory on the device and is gone on reload.</li>
        <li><strong>Precise location, camera, microphone, contacts:</strong> never requested; our security headers actively deny these permissions.</li>
        <li><strong>Push notifications or emails:</strong> none.</li>
        <li><strong>Data retention and deletion:</strong> we retain nothing because we receive nothing. To remove the cached app, clear the site’s data in the browser.</li>
      </ul>

      <h3>The one honest caveat: web hosting</h3>
      <p>
        Like every website, the pages are delivered by a hosting provider (Vercel Inc., our
        only subprocessor). Delivering a page briefly involves your device’s IP address, and
        the host keeps standard, short-lived server logs for security and reliability. We do
        not read, analyze, export, or receive those logs; they are never used to identify
        anyone, build profiles, or advertise. This is the “support for internal operations”
        pattern the FTC’s COPPA Rule recognizes. It is why we say “no server that stores
        anything about you” rather than an absolute “zero data.”
      </p>

      <h3>COPPA and student-privacy posture</h3>
      <ul className="promise-list">
        <li><strong>COPPA:</strong> notice-and-consent obligations attach to the collection of children’s personal information. Charter does not collect it — no accounts, no persistent identifiers set by us, no tracking. There is nothing to consent to.</li>
        <li><strong>FERPA:</strong> Charter never receives student education records, so no school-official relationship or data agreement is ever needed to use it.</li>
        <li><strong>State student-privacy laws (SOPIPA-style, Missouri Student DATA Act):</strong> complied with by construction — no student data exists to sell, profile, or advertise against.</li>
        <li><strong>Districts that require a signed data-privacy agreement:</strong> we will gladly sign one listing zero collected data elements. Contact us via the repository below.</li>
      </ul>

      <h3>Offline by design</h3>
      <p>
        Charter is an installable web app. After the first load it runs from the device cache,
        so a classroom session can run with no network at all — on a Chromebook cart, with bad
        wifi, with no IT ticket. No LLM or AI service is ever called while a child uses the
        product; all content is fixed at build time and reviewed.
      </p>

      <h3>Read-aloud</h3>
      <p>
        The “read it to me” button uses the device’s own built-in voice
        (the browser’s speech synthesis). We only ever use voices the browser marks as
        local — if the device offers only network-based voices, the button does not
        appear, because sending clause text to a third-party voice service would break
        the promise above. Nothing spoken ever leaves the device.
      </p>

      <h3>External links</h3>
      <p>
        The only outbound links in the game go to official state government sources for the
        constitutional text we cite — a state revisor, legislature, or code office. Links open behind a
        “you’re leaving Charter” notice written for kids, in a new tab, with no referrer sent.
        We never link to commercial, advocacy, or account-required sites. Report a broken or
        wrong link through the repository below.
      </p>

      <h3>Security</h3>
      <ul className="promise-list">
        <li>Static site: no database, no server-side code, no user data at rest anywhere.</li>
        <li>HTTPS only, with strict security headers (content security policy, frame denial, referrer suppression, camera/microphone/location denied).</li>
        <li>All code is open source and auditable; the build is checked in CI so no tracking can be introduced silently — a failing “privacy regression” gate blocks the release.</li>
        <li>Report a vulnerability or concern: open an issue at the repository below.</li>
      </ul>

      <h3>What is verified, and what is not</h3>
      <p>
        Two different claims sit on every clause card and they do not carry the same weight.
      </p>
      <ul className="promise-list">
        <li>
          <strong>The clause text is verified by machine.</strong> It is fetched from the state's
          official site, stored with a sha256 checksum, and re-checked on every build — the
          release fails if a single character of rendered text does not byte-match the stored
          document. Nothing is hand-typed and nothing is paraphrased.
        </li>
        <li>
          <strong>The plain-language explanation is not, yet.</strong>{' '}
          {review.named === 0
            ? `None of the ${review.total} glosses has been signed off by a named person; they carry a placeholder.`
            : `${review.named} of ${review.total} glosses have been signed off by a named person.`}{' '}
          A gloss is the sentence a child actually reads and believes, and no checksum can tell
          you whether it fairly describes the clause above it. The same is true of the
          sensitivity calls that decide whether an eight-year-old sees a clause at all.
        </li>
      </ul>
      <p>
        We would rather say that plainly than let a green checkmark on one claim be read as
        covering the other. The review sheets in the repository's <code>review/</code> folder
        pair every clause with its glosses so this can be worked through and signed.
      </p>

      <h3>Help us get your state right</h3>
      <p>
        <strong>Charter is a prototype.</strong> {ingestedPhrase(states)} had their constitutional
        text ingested; every other state appears as a citation with the words still pending. We are asking the people who would know to check our work,
        because we have already been wrong.
      </p>
      <p>
        In August 2026 a review of our own citations found two errors. We cited Virginia’s
        modern universal-suffrage clause as authority for a landowner-only franchise — the
        opposite of what it says. And we attached New Hampshire’s state education-duty clause
        to the local-funding option, reversing what the <em>Claremont</em> cases hold it to
        mean. Both are corrected, and a build gate now blocks any citation from a state we
        have not ingested unless a human has verified it. We assume there are others we have
        not caught.
      </p>
      <p>We would especially welcome help from:</p>
      <ul className="promise-list">
        <li>State revisors of statutes, law librarians, and secretary of state offices</li>
        <li>Bar association law-related education committees</li>
        <li>Constitutional historians and law faculty</li>
        <li>Teachers, librarians, and students in the state — you will spot a wrong framing faster than anyone</li>
      </ul>
      <p>Four things help most, in order of value:</p>
      <ul className="promise-list">
        <li>
          <strong>Check a citation.</strong> Every clause we cite from a state we have not
          ingested is listed in <code>data/seed/citation-verification.json</code> with our
          sources, our reasoning, and our caveats. Tell us where we are wrong.
        </li>
        <li>
          <strong>Tell us when the framing is wrong.</strong> This is the harder failure. A
          citation can be perfectly accurate and still misrepresent what a provision means in
          practice — that is exactly what happened with New Hampshire.
        </li>
        <li>
          <strong>Flag a clause that needs care.</strong> Some history needs adult framing
          before a child reads it. Our sensitivity review is a judgment call and we would
          rather hear that we got it wrong from you than from a family.
        </li>
        <li>
          <strong>Contribute an adapter for your state</strong> so its real words can appear.
          The ones we have are about a hundred lines each, there is a written recipe in the repository, and every state is welcome.
        </li>
      </ul>
      <p>
        The way to reach us is an issue on the repository below. We will credit you unless
        you would rather we did not. One thing we cannot accept: constitutional text sent by
        email or typed in by hand. Words enter only through the pipeline, from an official
        source, with a checksum — that rule is what makes the rest of this trustworthy, and
        it applies to us too.
      </p>

      <h3>Content integrity and nonpartisanship</h3>
      <p>
        No constitutional text is ever hand-typed, paraphrased, or generated: the words of a
        clause enter the app only from an official source, with a citation, and a validator
        rejects anything that does not byte-match. Until that pipeline runs for a state, the
        card says the words are pending — it never shows invented text. Game rules are
        deterministic and inspectable, decision questions present both sides with who each
        choice helps and harms, and the citizen letters are balanced across outcomes. Charter
        measures one thing, on the device only: whether players changed their vote after
        hearing the other side. It is never transmitted.
      </p>

      <h3>Accessibility</h3>
      <p>
        We target WCAG 2.2 AA: full keyboard play, visible focus, no time limits, reduced-motion
        support, and semantic structure, with an automated accessibility scan in CI. Found a
        barrier? Please open an issue — accessibility reports are treated as bugs, not requests.
      </p>

      <h3>Who pays for this</h3>
      <p>
        Charter is free and open source (MIT license). There is no revenue: nothing is sold,
        no ads run, and no data is monetized. The project is developed in the open at the
        repository below.
      </p>

      <p>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source code, contact, and issue reporting on GitHub ↗
        </a>
      </p>
    </article>
  );
}

export function TeachersFamilies({ bundle }: { bundle: StateBundle | null }) {
  const states = ingestedStates(bundle);
  return (
    <article>
      <h2>Teachers &amp; families</h2>
      <p className="eyebrow">How to run Charter in one class period — and what it teaches</p>

      <h3>What the game teaches</h3>
      <p>
        Players draft their state’s rules, negotiate them, and ratify (or reject) their own
        constitution. Then the game shows them what real states actually wrote, cited clause
        by clause. The design goal is civic humility, not civic trivia: the number the game
        celebrates is how many players changed their mind after hearing the other side.
      </p>

      <h3>Two ways to play</h3>
      <ul className="promise-list">
        <li>
          <strong>Ages 8–10 (grades 3–5), about 20 minutes:</strong> whole-class mode. No
          hidden goals, no reading burden beyond short choices. The class discusses each
          question, votes together, votes again after hearing who each choice helps and
          hurts, and reads a short citizen letter. You lead; the screen follows.
        </li>
        <li>
          <strong>Ages 11–14 (grades 6–8), about 30–40 minutes:</strong> delegate mode.
          Pass one device around the table. Each seat holds a secret goal card for a
          constituency (rural counties, teachers, kids under 18…), votes before and after
          debate, and the group ratifies at the end.
        </li>
      </ul>

      <h3>Discussion guide</h3>
      <p>
        Every question ends with a turn-and-talk prompt, answered out loud or on paper —
        never typed into the app. Good closers for either band: <em>What did the other side
        say that made the most sense to you? Which rule would you change tomorrow? Who wasn’t
        at our table who should have been?</em>
      </p>

      <h3>Standards alignment</h3>
      <ul className="promise-list">
        <li>
          <strong>C3 Framework (NCSS):</strong> strongest in Dimension 3 (evaluating sources
          and using evidence — every Mirror card is a cited primary source) and Dimension 4
          (communicating conclusions and taking informed action — the negotiation, the
          ratification vote, and the mind-change reflection). Dimension 2 civics concepts
          (rules, governance, deliberative processes) run throughout.
        </li>
        <li>
          <strong>Missouri Learning Standards, Social Studies (adopted 2016):</strong> the
          <em> Principles of Constitutional Democracy</em> and <em>Governance Systems</em>
          strands. Grades 3–4 address the purposes and principles of constitutions and the
          role of citizens; grades 6–8 deepen governance processes and dispute resolution.
          A code-level crosswalk is in progress.
        </li>
        <li>
          <strong>What Charter does not cover (honesty note):</strong> the federal
          Constitution’s history and structure, court cases, current events, and media
          literacy. Charter is a state-constitution drafting simulator, not a full civics
          curriculum — it pairs well with one.
        </li>
      </ul>

      <h3>Sensitive history, handled deliberately</h3>
      <p>
        Some real clauses carry hard history — property tests for voting, for example. Every
        clause in the game carries an editorial sensitivity review. Clauses flagged
        <em> historical harm</em> never render raw for ages 8–10; the class sees a note that
        says the rule has a hard history and points to you. The 11–14 band sees the same
        material inside explicit framing. You always have the room; nothing lands on a child
        cold.
      </p>

      <h3>This is a prototype — please tell us what is wrong</h3>
      <p>
        {ingestedPhrase(states)} had their constitutional text ingested so far; other states show a
        citation with the words still pending. We have already found and fixed
        two citations that misrepresented a state’s constitution, and we expect there are
        more. If something looks wrong to you — a citation, a framing, a gloss, or a clause
        that needs more care before a child reads it — the grown-ups page explains how to
        reach us. A teacher noticing "that is not what that clause means" is the single most
        valuable thing that can happen to this project right now.
      </p>

      <h3>Practical notes</h3>
      <ul className="promise-list">
        <li>Works offline after the first load — install it from the browser menu for a wifi-proof class set.</li>
        <li>No accounts to provision and no student data to review: the privacy pages here are the whole story.</li>
        <li>Keyboard-only play is fully supported; there are no time limits.</li>
        <li>Free forever, open source, no upsell.</li>
      </ul>
    </article>
  );
}
