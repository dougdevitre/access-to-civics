import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
/**
 * Read from the shipped bundle rather than pinned: adding a decision node should extend these
 * playthroughs, not break them. The per-node picks below still have to be listed by name.
 */
const DECISIONS: { prompt_8_10: string }[] = JSON.parse(
  readFileSync('public/bundles/mo-demo.json', 'utf8'),
).decisions;
const NODE_COUNT: number = DECISIONS.length;


/**
 * End-to-end + accessibility gate. Plays both band experiences to completion against the
 * production build and runs an axe scan on every distinct screen. Serious or critical
 * violations fail CI (WCAG 2.2 AA target — see docs/05-compliance.md).
 */

/**
 * A choice button's accessible name now carries its consequences on the second vote —
 * "Only the lawmakers helps: legislators, stability hurts: organizers, kids" — because a
 * screen-reader user should hear exactly what a sighted child sees printed on the card. So
 * match on the label prefix rather than the whole name; `exact` would silently stop matching
 * the moment the trade-off appears, which is the round that matters most.
 */
const startsWith = (label: string) =>
  new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

async function expectNoSeriousViolations(page: Page, screen: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious,
    `${screen}: ${serious.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('; ')}`,
  ).toEqual([]);
}

test('ages 8-10 class mode: full playthrough with mediated history card', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousViolations(page, 'band select');

  await page.getByRole('button', { name: /Ages 8–10/ }).click();
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
  await expectNoSeriousViolations(page, '8-10 setup');
  await expect(page.getByLabel(/groups/i)).toHaveCount(0); // class mode: no seat picker
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const picks: Record<number, string> = {
    0: 'Anyone who gets enough people to sign',
    1: 'Experts make a list. The governor picks one.',
    2: 'The state makes sure every school gets enough',
    3: 'Only people who own land', // adopt the historical-harm option to test mediation
    4: 'More than half of people say yes',
    5: 'Two groups',
  };

  for (let node = 0; node < NODE_COUNT; node++) {
    const pick = picks[node]!;
    await page.getByRole('button', { name: startsWith(pick) }).click(); // vote 1: pick
    await expect(page.getByText(/You picked/)).toBeVisible();
    await page.getByRole('button', { name: 'Lock it in' }).click(); // vote 1: confirm
    await expect(page.getByText(/help or hurt/i)).toBeVisible();
    await page.getByRole('button', { name: startsWith(pick) }).click(); // vote 2: pick
    await page.getByRole('button', { name: 'Lock it in' }).click(); // vote 2: confirm
    await expect(page.getByRole('heading', { name: 'What real states did' })).toBeVisible();
    if (node === 0) {
      // The dual-text layer: real words plus the grade-5 gloss.
      await expect(page.getByText('What it means:').first()).toBeVisible();
      await expect(page.getByText('A letter to your convention')).toBeVisible();
      await expect(page.getByText('Turn and talk')).toBeVisible();
      await expectNoSeriousViolations(page, '8-10 mirror');
    }
    if (node === 3) {
      // The Virginia freehold clause never renders raw for 8-10, and the citation points at
      // the 1830 constitution that actually had one — not the modern universal-suffrage clause.
      await expect(page.getByText(/old rule from long ago/i)).toBeVisible();
      await expect(page.getByText(/Virginia Constitution of 1830/)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Next question' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Do you keep your rules?' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes — keep our rules' }).click();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByRole('heading', { name: 'You did it.' })).toBeVisible();
  await expect(page.getByText('The Rules of Missouri')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print your rules' })).toBeVisible();
  await expectNoSeriousViolations(page, '8-10 charter');
});

test('ages 11-14 delegate mode: full playthrough with leaving notice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Ages 11–14/ }).click();
  await page.getByLabel(/Delegates at the table/).selectOption('3');
  await page.getByRole('button', { name: 'Open the convention' }).click();

  const optionB = [
    'Citizens with enough signatures',
    'A commission nominates, the governor appoints',
    'The state must fund a minimum for every school',
    'Every adult citizen',
    'A supermajority must say yes',
    'One group',
  ];
  const optionA = [
    'Only the legislature',
    'Voters elect them',
    'Each town pays for its own',
    'Only people who own land',
    'More than half the voters say yes',
    'Two groups that both have to agree',
  ];

  for (let node = 0; node < NODE_COUNT; node++) {
    for (let vote = 0; vote < 6; vote++) {
      const round = Math.floor(vote / 3);
      const seat = vote % 3;
      // Seat 0 starts on A and switches — one mind-change per question.
      const name = round === 0 && seat === 0 ? optionA[node]! : optionB[node]!;
      await page.getByRole('button', { name: startsWith(name) }).click();
      if (vote < 5) {
        // Pass-the-device card guards every next voter.
        await expect(page.getByText(/Pass the device to Seat/)).toBeVisible();
        await page.getByRole('button', { name: 'Ready to vote' }).click();
      }
    }
    await expect(page.getByRole('heading', { name: 'What real states did' })).toBeVisible();
    await expect(page.getByText('Mail for the convention')).toBeVisible();
    if (node === 0) {
      // Real ingested text: MO Art. III §49 renders word for word, with the grade-8 gloss.
      await expect(page.getByText(/The people reserve power to propose/)).toBeVisible();
      await expect(page.getByText('In plain words:').first()).toBeVisible();
      // MO Art. III §49 has an official source: the leaving notice must gate it.
      await page.getByRole('button', { name: /Official source/ }).first().click();
      await expect(page.getByText(/leaving Charter/i)).toBeVisible();
      await page.getByRole('button', { name: 'Stay here' }).click();
      await expectNoSeriousViolations(page, '11-14 mirror');
    }
    await page.getByRole('button', { name: 'Next question' }).click();
  }

  await expect(
    page.getByRole('heading', { name: 'Do you ratify this constitution?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ratify', exact: true }).click();
  await page.getByRole('button', { name: 'Ready to vote' }).click();
  await page.getByRole('button', { name: 'Ratify', exact: true }).click();
  await page.getByRole('button', { name: 'Ready to vote' }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ratified.' })).toBeVisible();
  await expect(page.getByText('The Charter of Missouri')).toBeVisible();
  await expect(page.getByText(new RegExp(`${NODE_COUNT} votes changed`))).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print the charter' })).toBeVisible();
});

test('trust pages are reachable and accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Our privacy promise' }).click();
  await expect(page.getByRole('heading', { name: 'Our privacy promise' })).toBeVisible();
  await expectNoSeriousViolations(page, 'privacy promise');

  await page.getByRole('button', { name: 'For grown-ups' }).click();
  // The disclosure a district reviewer needs: the clause text is machine-verified, the
  // plain-language gloss is not, and the page says which is which rather than letting a green
  // checkmark on one be read as covering the other.
  await expect(page.getByRole('heading', { name: 'What is verified, and what is not' })).toBeVisible();
  await expect(page.getByText(/clause text is verified by machine/i)).toBeVisible();
  await expect(page.getByText(/has been signed off by a named person/i)).toBeVisible();
  await expect(page.getByText(/question by question/i)).toBeVisible();
  // The collaboration request names the errors we already made, on purpose.
  await expect(page.getByRole('heading', { name: 'Help us get your state right' })).toBeVisible();
  await expect(page.getByText(/we have already been wrong/i)).toBeVisible();
  await expectNoSeriousViolations(page, 'grown-ups');

  await page.getByRole('button', { name: 'Teachers & families' }).click();
  await expect(page.getByText(/Standards alignment/)).toBeVisible();
  await expectNoSeriousViolations(page, 'teachers');
});

test('home page orients a newcomer before any choice is made', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
  // The facts row is built from the bundle, not hard-coded.
  await expect(page.getByText(`${NODE_COUNT} questions`)).toBeVisible();
  // Derived from the bundle, so it grows as states are ingested rather than being pinned.
  await expect(page.getByText(/\d+ real clauses from \d+ states/)).toBeVisible();
  // The differentiator a teacher must see without clicking anything.
  await expect(page.getByText(/No accounts\. No ads\. No tracking\./)).toBeVisible();
  // Both audiences have a distinct entry point.
  await expect(page.getByRole('button', { name: 'Open the rule book' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start with the teacher guide' })).toBeVisible();
  // Honest about what this is, and open about wanting to be corrected.
  await expect(page.getByText('Prototype')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Help us get it right' })).toBeVisible();
  await expectNoSeriousViolations(page, 'home');
});

test('rule book explorer shows the full ingested corpus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open the rule book' }).click();
  await expect(page.getByRole('heading', { name: 'The real rule book' })).toBeVisible();

  // Grouped by question, which is the whole point of the view: a reader sees the same question
  // answered differently by different states without starting a game.
  for (const decision of DECISIONS) {
    await expect(page.getByRole('heading', { name: decision.prompt_8_10, exact: true })).toBeVisible();
  }
  // The comparison itself: judicial selection has real text on both sides, from two states.
  const judges = page.getByRole('heading', { name: /How do we pick judges/ });
  await expect(judges).toBeVisible();
  await expect(page.getByText(/Texas Constitution, Article V, Section 2/)).toBeVisible();
  await expect(page.getByText(/Missouri Constitution, Article V, Section 25\(a\)/)).toBeVisible();
  // A tally beside each answer. It counts states whose WORDS are here, not states that
  // chose the answer — California chose this one and its text is still pending.
  await expect(page.getByText(/state.s real words/).first()).toBeVisible();

  // Browse-only clauses still appear, under their own heading — nothing ingested is hidden.
  await expect(page.getByRole('heading', { name: 'More rules in the book' })).toBeVisible();
  await expect(page.getByText(/no law shall be passed impairing the freedom of speech/)).toBeVisible();
  // Teacher-mediated clause never renders raw at the default (8-10) band:
  await expect(page.getByText(/faith and prayer/)).toBeVisible();
  await expect(page.getByText(/natural and indefeasible right to worship/)).toHaveCount(0);
  await expectNoSeriousViolations(page, 'explore');
});

test('keyboard-only entry works', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); // skip link
  await expect(page.getByText('Skip to the game')).toBeFocused();
  await page.keyboard.press('Tab'); // first band button
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
});
