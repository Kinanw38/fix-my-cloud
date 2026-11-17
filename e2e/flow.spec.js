// The flows around the game: Home, refresh, "welcome back", Check -> Next. One consistent story.
import { test, expect } from '@playwright/test';
import { boot, levels, solveByEdit, ensureEdit } from './helpers.js';

test('Home is in the top bar and brings back the opening page, then Start continues', async ({ page }) => {
  await boot(page, { hash: '/level/p2-pin-the-version' });
  await page.click('#nav-home');
  await expect(page.locator('#home-title')).toBeVisible();
  await expect(page.locator('#nav-home')).toHaveAttribute('aria-current', 'page');
  await page.click('#home-start');
  await expect(page.locator('#task-goal')).toBeVisible();
});

test('one button: Run checks turns into Next level after a fix', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await expect(page.locator('#run')).toHaveText('Run checks');
  await solveByEdit(page, levels['p1-flip-the-switch']);
  await expect(page.locator('#run')).toHaveText('Next level');
  await page.click('#run');
  await expect(page.locator('#lvl-title')).toHaveText('Pin the version');
});

test.describe('welcome back after a refresh', () => {
  const opts = { ask: true, solved: ['p1-flip-the-switch'], hash: '/level/p2-pin-the-version' };

  test('asks once, Continue keeps everything and does not ask again in the same visit', async ({ page }) => {
    await boot(page, opts);
    await expect(page.locator('#welcome-back')).toBeVisible();
    await expect(page.locator('#wb-text')).toContainText('1 of 8');
    await page.click('#wb-continue');
    await expect(page.locator('#welcome-back')).toBeHidden();
    await page.click('#nav-board'); await page.click('#nav-home');
    await expect(page.locator('#welcome-back')).toBeHidden();
  });

  test('"do not ask again" is remembered', async ({ page }) => {
    await boot(page, opts);
    await page.check('#wb-noask'); await page.click('#wb-continue');
    await page.reload();
    await expect(page.locator('#welcome-back')).toBeHidden();
  });

  test('start from the beginning needs a second confirmation, then clears progress', async ({ page }) => {
    await boot(page, opts);
    await page.click('#wb-restart');
    await expect(page.locator('#wb-sure')).toBeVisible();
    await page.click('#wb-back');
    await expect(page.locator('#wb-continue')).toBeVisible();
    await page.click('#wb-restart'); await page.click('#wb-yes');
    await expect(page.locator('#home-title')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fmc.solved')))).toEqual([]);
    await page.reload();
    await expect(page.locator('#welcome-back')).toBeHidden(); // nothing left to ask about
  });

  test('no dialog for a first-time visitor or when nothing is solved', async ({ page }) => {
    await boot(page, { ask: true, hash: '/level/p1-flip-the-switch' });
    await expect(page.locator('#welcome-back')).toBeHidden();
  });

  test('the footer link opens the confirmation directly', async ({ page }) => {
    await boot(page, { hash: '/level/p1-flip-the-switch' });
    await page.click('#reset-all');
    await expect(page.locator('#wb-sure')).toBeVisible();
  });
});

test('map labels stay inside the picture and the target label is under the cloud, every level, both languages', async ({ page }) => {
  for (const lang of ['en', 'he']) {
    for (const id of Object.keys(levels)) {
      await boot(page, { lang, hash: `/level/${id}` });
      const bad = await page.evaluate(() => [...document.querySelectorAll('#graph text')].filter((n) => n.getClientRects().length).map((n) => { const b = n.getBBox(); return { t: n.textContent, x: b.x, y: b.y, r: b.x + b.width, b: b.y + b.height }; }).filter((b) => b.x < 0 || b.r > 480 || b.y < 20 || b.b > 252));
      expect(await page.locator('#graph text').count(), `${lang} ${id} has labels`).toBeGreaterThan(2);
      expect(bad, `${lang} ${id}`).toEqual([]);
    }
  }
});

test('no closing card while incidents are open', async ({ page }) => {
  await boot(page, { hash: '/board' });
  await expect(page.locator('#board-thanks')).toBeHidden();
});

test('closing card with an optional star link once every incident is solved', async ({ page }) => {
  await boot(page, { hash: '/board', solved: Object.keys(levels) });
  await expect(page.locator('#board-thanks a')).toHaveAttribute('rel', /noopener/);
});

test('top-bar reset: asks first, then clears everything and opens like a first visit', async ({ page }) => {
  await boot(page, { hash: '/level/p2-pin-the-version', solved: ['p1-flip-the-switch'] });
  await page.click('#nav-reset');
  await expect(page.locator('#wb-sure')).toContainText('everything');
  await page.click('#wb-yes');
  await expect(page.locator('#home-title')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fmc.solved'))).toBe('[]'); // the test helper re-seeds the other keys on every load
});

test('the message at the bottom has an X, and the X closes it', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await page.click('#startover');
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toast')).toHaveClass(/is-in/);
  await page.click('.toast__x');
  await expect(page.locator('#toast')).toBeHidden();
});

test('solving moves night to dawn without hiding the page', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await solveByEdit(page, levels['p1-flip-the-switch']);
  await expect(page.locator('html')).toHaveAttribute('data-mood', 'dawn');
  await expect(page.locator('body')).not.toHaveClass(/is-swapping/);
  await expect(page.locator('#editor')).toBeVisible(); // what you typed is still there
});

test('the language switch has a sliding pill and the page language follows', async ({ page }) => {
  await boot(page, { hash: '/board' });
  await expect(page.locator('.seg')).toHaveAttribute('data-active', 'en');
  await page.click('[data-lang="he"]');
  await expect(page.locator('.seg')).toHaveAttribute('data-active', 'he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
