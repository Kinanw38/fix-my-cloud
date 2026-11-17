// The launch gate: practice 1 and INC-0001 played to success, the board with a filter, and Shuffle,
// at 390px and 1280px, in English and Hebrew, with zero console errors, zero third-party requests
// and zero serious or critical axe violations. One extra run with reduced motion.
import { test, expect } from '@playwright/test';
import { levels, VIEWPORTS, boot, watch, axeSerious, solveByTap, solveByEdit } from './helpers.js';

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  for (const lang of ['en', 'he']) {
    test(`smoke: ${vpName}, ${lang}`, async ({ page }) => {
      await page.setViewportSize(vp);
      const log = watch(page);
      const solve = vpName === 'mobile' ? solveByTap : solveByEdit; // tap mode on phones, edit mode on desktop

      await boot(page, { lang, hash: '/level/p1-flip-the-switch' });
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
      expect(await axeSerious(page), 'axe: practice 1 at start').toEqual([]);
      await solve(page, levels['p1-flip-the-switch']);
      await expect(page.locator('#done')).toBeVisible();
      expect(await axeSerious(page), 'axe: practice 1 solved (dawn)').toEqual([]);

      await page.goto('./#/level/inc-0001-open-to-the-world');
      // waitForFunction instead of expect(): Firefox under automation can crash on the first poll right after a
      // same-page navigation. The game itself does not (checked by hand-written polling). See docs/HOW_IT_WORKS.md.
      await page.waitForFunction(() => document.querySelector('#inc-id')?.textContent === 'INC-0001');
      await solve(page, levels['inc-0001-open-to-the-world']);
      await expect(page.locator('#done')).toBeVisible();

      await page.goto('./#/board');
      await expect(page.locator('#tickets .ticket')).toHaveCount(8);
      await page.locator('#filters .chip').filter({ hasText: 'Secrets' }).click();
      await expect(page.locator('#tickets .ticket')).toHaveCount(2);
      expect(await axeSerious(page), 'axe: board').toEqual([]);

      await page.click('#run-easy');
      await expect(page.locator('#run-chip')).toBeVisible();
      await expect(page.locator('#alert')).toBeVisible();

      expect(log.errors).toEqual([]);
      expect(log.foreign).toEqual([]);
    });
  }
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no looping animation, everything still works', async ({ page }) => {
    const log = watch(page);
    await boot(page, { hash: '/level/p1-flip-the-switch' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('html')).toHaveAttribute('data-loops', 'off');
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations === Infinity).length)).toBe(0);
    await solveByEdit(page, levels['p1-flip-the-switch']);
    await expect(page.locator('#done')).toBeVisible();
    expect(await axeSerious(page)).toEqual([]);
    expect(log.errors).toEqual([]);
  });
});

test('fresh visit: the opening page explains, plays an example, and Start opens practice 1', async ({ page }) => {
  const log = watch(page);
  await page.goto('./');
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('.home__steps li')).toHaveCount(3);
  await page.waitForFunction(() => document.querySelector('#demo')?.dataset.played === 'true', null, { timeout: 20000 }); // the example reached the solved state
  expect(await axeSerious(page), 'axe: opening page').toEqual([]);
  await page.click('#home-start');
  await expect(page.locator('#brief')).toBeVisible(); // first the briefing
  await expect(page.locator('#brief-title')).toHaveText('Flip the switch');
  await page.click('#brief-go');
  await expect(page.locator('#lvl-title')).toHaveText('Flip the switch');
  await expect(page.locator('#guide')).toBeVisible();
  await page.reload();
  await expect(page.locator('#view-level')).toBeVisible(); // a returning visitor resumes, no opening page
  await expect(page.locator('#level-body')).toBeVisible(); // and the briefing is not repeated
  await page.click('.brand');
  await expect(page.locator('#view-home')).toBeVisible(); // the logo goes back to the opening page
  expect(log.errors).toEqual([]);
});

test('opening page: "Show me in the game" starts the tour, and Esc leaves it', async ({ page }) => {
  await page.goto('./');
  await page.click('#home-tour');
  await page.click('#brief-go'); // the tour starts once the briefing is confirmed
  await expect(page.locator('#coach')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#coach')).toBeHidden();
});

test('opening page in Hebrew is right-to-left and the example still plays', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fmc.lang', '"he"'));
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#home-title')).toContainText('משהו השתבש');
  await page.waitForFunction(() => document.querySelector('#demo')?.dataset.played === 'true', null, { timeout: 20000 });
});

test.describe('opening page with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('shows the finished example at once, with no loop', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#demo')).toHaveAttribute('data-played', 'true');
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations === Infinity).length)).toBe(0);
  });
});
