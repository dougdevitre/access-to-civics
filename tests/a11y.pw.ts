import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * End-to-end + accessibility gate. Plays both band experiences to completion against the
 * production build and runs an axe scan on every distinct screen. Serious or critical
 * violations fail CI (WCAG 2.2 AA target — see docs/05-compliance.md).
 */

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
  };

  for (let node = 0; node < 4; node++) {
    const pick = picks[node]!;
    await page.getByRole('button', { name: pick }).click(); // vote 1
    await expect(page.getByText(/help or hurt/i)).toBeVisible();
    await page.getByRole('button', { name: pick }).click(); // vote 2
    await expect(page.getByRole('heading', { name: 'What real states did' })).toBeVisible();
    if (node === 0) {
      await expect(page.getByText('A letter to your convention')).toBeVisible();
      await expect(page.getByText('Turn and talk')).toBeVisible();
      await expectNoSeriousViolations(page, '8-10 mirror');
    }
    if (node === 3) {
      // The Virginia landowner clause never renders raw for 8-10.
      await expect(page.getByText(/hard history/i)).toBeVisible();
      await expect(page.getByText(/Virginia Constitution/)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Next question' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Do you keep your rules?' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes — keep our rules' }).click();
  await expect(page.getByRole('heading', { name: 'You did it.' })).toBeVisible();
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
  ];
  const optionA = [
    'Only the legislature',
    'Voters elect them',
    'Each town pays for its own',
    'Only people who own land',
  ];

  for (let node = 0; node < 4; node++) {
    for (let round = 0; round < 2; round++) {
      for (let seat = 0; seat < 3; seat++) {
        // Seat 0 starts on A and switches — one mind-change per question.
        const name = round === 0 && seat === 0 ? optionA[node]! : optionB[node]!;
        await page.getByRole('button', { name, exact: true }).click();
      }
    }
    await expect(page.getByRole('heading', { name: 'What real states did' })).toBeVisible();
    await expect(page.getByText('Mail for the convention')).toBeVisible();
    if (node === 0) {
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
  await page.getByRole('button', { name: 'Ratify', exact: true }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ratified.' })).toBeVisible();
  await expect(page.getByText(/4 votes changed/)).toBeVisible();
});

test('trust pages are reachable and accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Our privacy promise' }).click();
  await expect(page.getByRole('heading', { name: 'Our privacy promise' })).toBeVisible();
  await expectNoSeriousViolations(page, 'privacy promise');

  await page.getByRole('button', { name: 'For grown-ups' }).click();
  await expect(page.getByText(/question by question/i)).toBeVisible();
  await expectNoSeriousViolations(page, 'grown-ups');

  await page.getByRole('button', { name: 'Teachers & families' }).click();
  await expect(page.getByText(/Standards alignment/)).toBeVisible();
  await expectNoSeriousViolations(page, 'teachers');
});

test('keyboard-only entry works', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); // skip link
  await expect(page.getByText('Skip to the game')).toBeFocused();
  await page.keyboard.press('Tab'); // first band button
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Charter' })).toBeVisible();
});
