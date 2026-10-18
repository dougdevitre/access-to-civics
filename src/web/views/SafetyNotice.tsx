import { NEUTRAL } from '../copy.js';

/**
 * The safety note at the foot of every screen, including the load-error and crash screens.
 *
 * Written for the child holding the device: what this is (a game for learning), what it is not
 * (advice, or a lawyer or counselor), and the two numbers to call — printed in full and tappable,
 * never behind a click. The canonical adult wording lives on the "For parents and teachers"
 * page, which `onReadMore` opens; the crash screen has no app to navigate with, so it passes
 * nothing and the link is left out rather than left broken.
 *
 * No dialog, no acknowledgment, no storage: this app has no grown-up setup flow to hang one
 * on, a legal dialog is not something to put in front of an eight-year-old, and remembering a
 * click would need browser storage, which the privacy gate forbids.
 */
export function SafetyNotice({ onReadMore }: { onReadMore?: () => void }) {
  return (
    <div className="safety-notice" role="note" aria-label={NEUTRAL.safetyLabel}>
      <p>{NEUTRAL.safetyAbout}</p>
      <ul className="safety-lines">
        <li>
          {NEUTRAL.safetyDangerLead}{' '}
          <a href="tel:911" aria-label="Call 911">911</a>
        </li>
        <li>
          {NEUTRAL.safetyCrisisLead}{' '}
          <a href="tel:988" aria-label="Call or text 988">988</a>
        </li>
      </ul>
      <p>{NEUTRAL.safetyCheck}</p>
      {onReadMore && (
        <p>
          {NEUTRAL.safetyMoreLead}{' '}
          <button type="button" className="linklike" onClick={onReadMore}>
            {NEUTRAL.safetyMore}
          </button>
        </p>
      )}
    </div>
  );
}
