import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Phone check: the game played the way a child on a phone, a keyboard user and a screen-reader
 * user actually play it. tests/a11y.pw.ts proves every screen passes axe; axe cannot see what
 * happens BETWEEN screens, which is where these failures lived:
 *
 *  - Picking a choice, passing the device, "Pick again", opening or closing the leaving notice:
 *    each replaced the focused button with new content and dropped focus to <body>. A keyboard
 *    user had to Tab from the top of the page again; a screen reader announced nothing at all.
 *  - The grown-up pages and the rule book had no <h1>, so "jump to heading 1" found nothing.
 *  - "Read it to me" and "See the real page" were 24-31px tall on a phone.
 *  - The browser bar was tinted near-black over a paper-coloured page: a dark band on a
 *    light-only design.
 */

const DECISIONS: unknown[] = JSON.parse(readFileSync('public/bundles/mo-demo.json', 'utf8')).decisions;
const NODE_COUNT = DECISIONS.length;

/**
 * Headless Chromium ships no speech voices, so the read-aloud button would never render and its
 * size and behaviour would go unchecked. This stands in a local voice; nothing is spoken or sent.
 */
const LOCAL_VOICE = `(() => {
  const voice = { localService: true, lang: 'en-US', name: 'Test voice' };
  const synth = { getVoices: () => [voice], speak() {}, cancel() {}, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
})();`;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Name of the focused element, or null when focus has fallen back to <body>. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    const label = a.getAttribute('aria-label');
    if (label) return label.trim();
    // Text as a screen reader hears it: decoration marked aria-hidden is not part of the name.
    const copy = a.cloneNode(true) as Element;
    copy.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    return (copy.textContent || '').trim();
  });

/**
 * Keyboard only: Tab forward to the control whose name starts with `name`, press Enter, and
 * require that focus landed somewhere — not back on <body>.
 */
async function press(page: Page, name: string, step: string) {
  const re = new RegExp('^' + escape(name));
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const now = await focused(page);
    if (now !== null && re.test(now)) {
      await page.keyboard.press('Enter');
      expect(await focused(page), `${step}: focus fell back to <body> after "${name}"`).not.toBeNull();
      return;
    }
  }
  throw new Error(`${step}: could not reach "${name}" with Tab`);
}

test('ages 8-10: the whole game is playable by keyboard and focus is never dropped', async ({ page }) => {
  await page.addInitScript(LOCAL_VOICE);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await press(page, 'Ages 8–10', 'band');
  await press(page, 'Start', 'start');
  const picks = [
    'Anyone who gets enough people to sign',
    'Experts make a list. The governor picks one.',
    'The state makes sure every school gets enough',
    'Only people who own land',
    'More than half of people say yes',
    'Two groups',
  ];
  for (let node = 0; node < NODE_COUNT; node++) {
    for (const vote of [1, 2]) {
      await press(page, picks[node]!, `q${node + 1} vote ${vote}`);
      // Focus lands on the confirmation itself, so a screen reader announces the pick.
      expect(await focused(page)).toMatch(/^You picked/);
      if (node === 0 && vote === 1) {
        await press(page, 'Pick again', 'pick again');
        await press(page, picks[node]!, 'pick again, then pick');
      }
      await press(page, 'Lock it in', `q${node + 1} lock in ${vote}`);
    }
    if (node === 0) {
      await press(page, 'Read it to me', 'read aloud');
      await press(page, 'See the real page', 'open leaving notice');
      expect(await focused(page)).toMatch(/leaving Charter/);
      await press(page, 'Stay here', 'stay here');
      expect(await focused(page)).toMatch(/^See the real page/);
    }
    await press(page, 'Next question', `q${node + 1} next`);
  }
  await press(page, 'Yes — keep our rules', 'ratify');
  await press(page, 'Lock it in', 'ratify lock in');
  await expect(page.getByRole('heading', { name: 'You did it.' })).toBeVisible();
});

test('ages 11-14: pass-and-play by keyboard, focus follows every hand-off', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await press(page, 'Ages 11–14', 'band');
  await press(page, 'Open the convention', 'open');
  const optionB = [
    'Citizens with enough signatures',
    'A commission nominates, the governor appoints',
    'The state must fund a minimum for every school',
    'Every adult citizen',
    'A supermajority must say yes',
    'One group',
  ];
  for (let node = 0; node < NODE_COUNT; node++) {
    for (let vote = 0; vote < 10; vote++) {
      await press(page, optionB[node]!, `q${node + 1} vote ${vote + 1}`);
      // 5 seats by default: after the tenth vote the question resolves.
      if (vote === 9) break;
      // After the fifth vote the debate opens and focus goes to the question heading instead,
      // which is the top of the new phase; every other vote hands focus to the hand-off card.
      if (vote !== 4) {
        expect(await focused(page), `q${node + 1} vote ${vote + 1}`).toMatch(/^Pass the device to Seat/);
      }
      await press(page, 'Ready to vote', `q${node + 1} hand-off ${vote + 1}`);
      expect(await focused(page)).toMatch(/^Seat \d/);
    }
    await expect(page.getByRole('heading', { name: 'What real states did' })).toBeVisible();
    await press(page, 'Next question', `q${node + 1} next`);
  }
  for (let seat = 0; seat < 5; seat++) {
    await press(page, 'Ratify', `ratify seat ${seat + 1}`);
    if (seat < 4) await press(page, 'Ready to vote', `ratify hand-off ${seat + 1}`);
  }
  await expect(page.getByRole('heading', { name: 'Ratified.' })).toBeVisible();
});

/** One h1 per screen, and no level skipped below it. */
async function expectHeadingOutline(page: Page, screen: string) {
  const levels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'), (h) => Number(h.tagName[1])),
  );
  expect(levels.filter((l) => l === 1), `${screen}: exactly one h1`).toHaveLength(1);
  expect(levels[0], `${screen}: first heading is the h1`).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i]!, `${screen}: h${levels[i - 1]} is followed by h${levels[i]}`).toBeLessThanOrEqual(
      levels[i - 1]! + 1,
    );
  }
}

test('every page has one h1 and an unbroken heading outline', async ({ page }) => {
  await page.goto('/');
  // Wait for the state bundle: until it loads, the screen is "Getting ready…".
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
  await expectHeadingOutline(page, 'home');
  for (const [nav, screen] of [
    ['Our privacy promise', 'privacy'],
    ['For grown-ups', 'grown-ups'],
    ['Teachers & families', 'teachers'],
    ['Read the rule book', 'rule book'],
    ['Read the full disclaimer', 'disclaimer'],
  ] as const) {
    await page.getByRole('button', { name: nav }).click();
    await expectHeadingOutline(page, screen);
  }
});

/** Every control is at least 44px both ways, the house rule for a phone in a child's hand. */
async function expectTapTargets(page: Page, screen: string) {
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main button, main a[href], main select, main summary'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => ({ name: (el.textContent || '').trim().slice(0, 40), box: el.getBoundingClientRect() }))
      // A phone number inside a sentence keeps its line height; its hit area is checked below.
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(({ name, box }) => `${name} (${Math.round(box.width)}x${Math.round(box.height)})`),
  );
  expect(small, `${screen}: controls under 44px`).toEqual([]);
}

test('tap targets are 44px at 320 and 375 wide, read-aloud and source links included', async ({ page }) => {
  await page.addInitScript(LOCAL_VOICE);
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open the rule book' })).toBeVisible();
    await expectTapTargets(page, `home @${width}`);
    await page.getByRole('button', { name: 'Read the rule book' }).click();
    await expect(page.getByRole('button', { name: /Read it to me/ }).first()).toBeVisible();
    await expectTapTargets(page, `rule book @${width}`);
  }
});

test('phone numbers inside the disclaimer text have a 44px hit area', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Read the full disclaimer' }).click();
  const links = page.locator('main a[href^="tel:"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    // The visible text stays inline; the hit area is a ::after overlay around it.
    const hit = await link.evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      return { w: parseFloat(after.width), h: parseFloat(after.height), pos: after.position };
    });
    expect(hit.pos).toBe('absolute');
    expect(hit.h).toBeGreaterThanOrEqual(44);
    expect(hit.w).toBeGreaterThanOrEqual(44);
  }
});

test('no dark band: the browser bar is tinted paper, not ink, on a light-only page', async ({ page }) => {
  await page.goto('/');
  const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  for (const [where, hex] of [['index.html', theme], ['manifest', manifest.theme_color]] as const) {
    const h = String(hex).replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    expect(luminance, `${where} theme colour ${hex} is dark`).toBeGreaterThan(0.5);
  }
});

test('long file names wrap at 200% zoom on a 375px phone', async ({ page }) => {
  // 375 CSS px at 200% zoom leaves 188 CSS px of layout width.
  await page.setViewportSize({ width: 188, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
  await page.getByRole('button', { name: 'For grown-ups' }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'grown-ups page scrolls sideways').toBeLessThanOrEqual(0);
});
