import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App.js';
import * as TrustPages from './views/TrustPages.js';

/**
 * The safety notice is part of the chrome, so it has to be on the very first thing a child sees
 * — which, before the state bundle has loaded, is the "Getting ready…" screen. Rendering the
 * shell on the server reaches exactly that screen without a browser: effects never run, so the
 * bundle is never fetched. Every other screen is walked in tests/a11y.pw.ts.
 */

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;|[“”]/g, '"')
    .replace(/&#x27;|[‘’]/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,?])/g, '$1')
    .trim();
}

describe('safety notice in the app shell', () => {
  const html = renderToStaticMarkup(<App />);

  it('shows 911 and 988 as tappable phone links without any interaction', () => {
    expect(html).toMatch(/<a[^>]+href="tel:911"/);
    expect(html).toMatch(/<a[^>]+href="tel:988"/);
    expect(text(html)).toContain('Call 911');
    expect(text(html)).toContain('Call or text 988');
  });

  it('says, in kid language, that this is a game for learning and not advice', () => {
    expect(text(html)).toContain('Charter is a game for learning.');
    expect(text(html)).toMatch(/not advice about the law, health, feelings, money or safety/);
  });

  it('points grown-ups to the full disclaimer', () => {
    expect(text(html)).toContain('Read the full disclaimer');
  });
});

/**
 * The canonical wording for the Access To ecosystem, pinned here on purpose: the page is
 * allowed to add framing around it, never to paraphrase it. If the canonical text changes, this
 * list changes with it, in the same PR.
 */
const CANONICAL_SHORT =
  'Educational information only. Access to Civics is not legal, medical, mental health, financial or safety advice, and using it creates no professional relationship. In danger now? Call 911. For crisis support, call or text 988. Confirm anything important with the official source or a licensed professional.';

const CANONICAL_FULL = [
  'Access to Civics provides general educational information only. It is not legal, medical, mental health, financial or safety advice. Using it does not create an attorney-client, clinician-patient or any other professional relationship with Doug Devitre, CoTrackPro or any contributor.',
  'Not for emergencies. If anyone is in danger, call 911. For crisis support, call or text 988.',
  'Not a substitute for a professional. Talk with a licensed attorney, clinician or trained advocate about your situation.',
  'Information can be wrong or out of date. Laws, programs, phone numbers, eligibility rules and deadlines change. Confirm everything with the official source before you rely on it.',
  'AI output can be incorrect. Review everything it produces. You are responsible for the decisions you make and anything you file or send.',
  'Protect privacy. Do not enter names, case numbers, addresses or other details that identify a person.',
  'No endorsement. Not affiliated with or endorsed by any court, agency or organization it mentions.',
  'No warranty. Provided "as is," without warranties of any kind. To the fullest extent the law allows, the maintainers and contributors are not liable for damages arising from its use.',
];

describe('full disclaimer page for parents and teachers', () => {
  const Disclaimer = (TrustPages as Record<string, unknown>)['Disclaimer'] as
    | (() => JSX.Element)
    | undefined;

  it('exists', () => {
    expect(Disclaimer, 'TrustPages must export a Disclaimer page').toBeTypeOf('function');
  });

  const page = Disclaimer ? text(renderToStaticMarkup(<Disclaimer />)) : '';

  it('is addressed to parents and teachers', () => {
    expect(page).toContain('For parents and teachers');
  });

  it('carries the canonical short notice word for word', () => {
    expect(page).toContain(CANONICAL_SHORT);
  });

  for (const paragraph of CANONICAL_FULL) {
    it(`carries "${paragraph.slice(0, 40)}…" word for word`, () => {
      expect(page).toContain(paragraph);
    });
  }

  it('links 911 and 988 as phone numbers', () => {
    const html = Disclaimer ? renderToStaticMarkup(<Disclaimer />) : '';
    expect(html).toMatch(/href="tel:911"/);
    expect(html).toMatch(/href="tel:988"/);
  });
});
