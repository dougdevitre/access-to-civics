/**
 * Marks, not illustration.
 *
 * The product had no imagery at all — one filled circle and one emoji — which for an eight-year-old
 * means every screen looks like every other screen and nothing is findable by shape. These are
 * small objects from a convention: a quill, a ballot box, a schoolhouse, a set of scales. Drawn in
 * the same line weight as the ledger rules, in `currentColor`, so they read as something inked on
 * the page rather than clip art dropped onto it.
 *
 * Three rules they follow:
 *  - **No people.** Nothing here depicts a child or an adult. A kids' product that draws children
 *    takes on a whole category of representation questions, and objects do the wayfinding job.
 *  - **Decorative only.** Every mark is aria-hidden and always sits beside a text label. Removing
 *    them all would lose nothing for a screen-reader user, which is the test.
 *  - **Inline.** No sprite, no external file, no request. The CSP forbids external assets and the
 *    app has to work with no wifi.
 */

// `| undefined` explicitly: the repo runs exactOptionalPropertyTypes.
type MarkProps = { className?: string | undefined };

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/** Direct democracy: a hand putting a paper in the box. */
export function BallotMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 11h16v9H4z" />
      <path d="M9 11V4h6v7" />
      <path d="M10.5 7.5h3" />
      <path d="M10 15h4" />
    </svg>
  );
}

/** Courts: a balance, level rather than tipped. */
export function ScalesMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M5 8h14" />
      <path d="M5 8 2.5 13h5z" />
      <path d="M19 8l-2.5 5h5z" />
    </svg>
  );
}

/** Schools. */
export function SchoolMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M3 10 12 5l9 5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/** The franchise: a check on a ballot slip. */
export function VoteMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M5 4h14v16H5z" />
      <path d="M8.5 12l2.5 2.5L16 9" />
    </svg>
  );
}

/** Amending: a quill over a line. */
export function QuillMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M4 20c6-1 9-4 12-9 1.5-2.5 2-5 2-5s-2.5.5-5 2c-5 3-8 6-9 12z" />
      <path d="M4 20l5-5" />
    </svg>
  );
}

/** The legislature: two chambers, or one. */
export function ChambersMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M3 20h18" />
      <path d="M4 20v-7h7v7" />
      <path d="M13 20v-7h7v7" />
      <path d="M3 11 12 5l9 6" />
    </svg>
  );
}

/** Money. */
export function CoinsMark({ className }: MarkProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="9" cy="9" r="5" />
      <path d="M14.5 6.2A5 5 0 0 1 15 16a5 5 0 0 1-1.6-.3" />
    </svg>
  );
}

/**
 * The wax seal. The one place the design spends boldness, and it was a plain filled circle.
 * Drawn as a stamped disc with a pressed rim, so ratification looks like something that happened
 * to the document rather than a bullet point.
 */
export function SealMark({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden focusable={false} className={className}>
      <circle cx="32" cy="32" r="26" fill="currentColor" />
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="1.5"
        opacity=".55"
      />
      <path
        d="M32 16l4.2 8.9 9.6 1.4-7 7 1.7 9.8L32 38.4l-8.5 4.7 1.7-9.8-7-7 9.6-1.4z"
        fill="var(--paper)"
        opacity=".8"
      />
    </svg>
  );
}

/**
 * Topic id (data/taxonomy/topics.json) → mark. Unmapped topics get nothing rather than a
 * default, because a wrong picture is worse than no picture.
 */
const BY_TOPIC: Record<string, (p: MarkProps) => JSX.Element> = {
  DIRECT_DEMOCRACY: BallotMark,
  JUDICIAL_SELECTION: ScalesMark,
  EDUCATION_ESTABLISHMENT: SchoolMark,
  SUFFRAGE: VoteMark,
  AMENDMENT_PROCESS: QuillMark,
  LEGISLATIVE: ChambersMark,
  PUBLIC_FINANCE: CoinsMark,
};

export function TopicMark({ topic, className }: { topic: string; className?: string }) {
  const Mark = BY_TOPIC[topic];
  return Mark ? <Mark className={className} /> : null;
}
