// Every level can be solved in Tap mode and in Edit mode, in English, with zero console errors.
import { test, expect } from '@playwright/test';
import { levels, boot, watch, solveByTap, solveByEdit, ensureEdit } from './helpers.js';

for (const id of Object.keys(levels)) {
  const level = levels[id];
  for (const mode of ['tap', 'edit']) {
    test(`${id}: solvable in ${mode} mode`, async ({ page }) => {
      const log = watch(page);
      await boot(page, { hash: `/level/${id}` });
      await (mode === 'tap' ? solveByTap(page, level) : solveByEdit(page, level));
      await expect(page.locator('#result')).toContainText('Contained');
      await expect(page.locator('#done')).toBeVisible();
      await expect(page.locator('#meter')).toHaveClass(/is-zero/);
      await expect(page.locator('html')).toHaveAttribute('data-mood', 'dawn');
      expect(log.errors).toEqual([]); expect(log.foreign).toEqual([]);
    });
  }
}

test('a bad Tap option fails and shows its rule chip, then a good one fixes it', async ({ page }) => {
  await boot(page, { hash: '/level/inc-0003-pr-title' });
  const lv = levels['inc-0003-pr-title']; const gi = 1;
  await page.locator('.line--tap').nth(lv.check(lv.vulnerableCode).failures.find((f) => f.line).line - 1).click();
  await page.locator('#choices .optgroup').nth(gi).locator(`.opt[data-option="${lv.choices[gi].options.find((o) => !o.good).id}"]`).click();
  await page.click('#run');
  await expect(page.locator('#result')).toContainText('Check failed');
  await expect(page.locator('#chips .fail-chip').first()).toBeVisible();
});

test('empty, garbage and oversized code get plain messages', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await ensureEdit(page);
  for (const [text, msg] of [['', 'Nothing to check yet'], ['x'.repeat(20001), 'too long'], ['}}} ;;;', 'Check failed']]) {
    await page.fill('#editor', text); await page.click('#run');
    await expect(page.locator('#result')).toContainText(msg);
  }
});
