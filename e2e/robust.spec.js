// Never break for a visitor: broken levels, crashes, blocked storage, missing features, wrong paths.
import { test, expect } from '@playwright/test';
import { levels, boot, watch, solveByEdit, solveByTap, ensureEdit, axeSerious } from './helpers.js';

test('one broken level never takes down the board or the other levels', async ({ page }) => {
  await page.route('**/src/levels/inc-0004-destroy.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'throw new Error("boom");' }));
  await boot(page, { hash: '/board' });
  await expect(page.locator('#tickets .ticket')).toHaveCount(8);
  await expect(page.locator('#tickets .ticket--off')).toHaveCount(1);
  await page.goto('./#/level/inc-0004-destroy');
  await expect(page.locator('#level-error-title')).toBeVisible();
  await expect(page.locator('#level-error-title')).not.toContainText('boom');
  await page.goto('./#/level/inc-0001-open-to-the-world');
  await expect(page.locator('#inc-id')).toHaveText('INC-0001');
  await solveByTap(page, levels['inc-0001-open-to-the-world']);
  await expect(page.locator('#done')).toBeVisible();
});

test('a runtime crash shows one calm line and a Reload button, never a stack trace', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await page.evaluate(() => setTimeout(() => { throw new Error('secret-stack-detail'); }, 0));
  await expect(page.locator('#banner')).toBeVisible();
  const text = await page.locator('#banner').innerText();
  expect(text).toContain('Something broke on our side');
  expect(text).not.toMatch(/secret-stack-detail|Error|\bat \w/);
  await expect(page.locator('#banner-reload')).toBeVisible();
});

test('blocked storage: the game keeps working and says so calmly', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto('./#/level/p1-flip-the-switch');
  await page.click('#brief-go'); // the briefing first
  await expect(page.locator('#alert')).toBeVisible();
  await expect(page.locator('#storage-note')).toBeVisible();
  await solveByEdit(page, levels['p1-flip-the-switch']);
  await expect(page.locator('#done')).toBeVisible();
});

test('copy falls back to a plain message when the clipboard is blocked', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { get() { return { writeText: () => Promise.reject(new Error('denied')) }; } }); });
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await page.click('#copy');
  await expect(page.locator('#toast')).toContainText('Copy is not available');
  await expect(page.locator('#run')).toBeEnabled();
});

test('the share card downloads as a real PNG', async ({ page }) => {
  await boot(page, { hash: '/level/inc-0002-key-in-the-repo' });
  await solveByTap(page, levels['inc-0002-key-in-the-repo']);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#share')]);
  expect(dl.suggestedFilename()).toMatch(/\.png$/);
  const fs = await import('node:fs'); const buf = fs.readFileSync(await dl.path());
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buf.readUInt32BE(16)).toBe(1200); expect(buf.readUInt32BE(20)).toBe(627);
});

test('unverified sources never reach the page', async ({ page }) => {
  await boot(page, { hash: '/level/inc-0002-key-in-the-repo' });
  await solveByTap(page, levels['inc-0002-key-in-the-repo']);
  await expect(page.locator('#rw-body')).toContainText('Inspired by a common pattern');
  await expect(page.locator('#rw-body a')).toHaveCount(0);
  const html = await page.content();
  for (const word of ['Elektra', 'Uber', 'darkreading', 'theregister', 'reddit.com']) expect(html).not.toContain(word);
});

test('once a source is verified, only the verified one shows', async ({ page }) => {
  await page.route('**/src/levels/inc-0002-key-in-the-repo.js', async (r) => {
    const res = await r.fetch(); let body = await res.text();
    body = body.replace('verified: false }));', "verified: title.startsWith('Dark Reading') }));"); // verify only the first source
    await r.fulfill({ response: res, body });
  });
  await boot(page, { hash: '/level/inc-0002-key-in-the-repo' });
  await solveByTap(page, levels['inc-0002-key-in-the-repo']);
  await expect(page.locator('#rw-body a')).toHaveCount(1);
  await expect(page.locator('#rw-body a')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('#rw-body')).toContainText('Elektra-Leak');
  expect(await page.content()).not.toContain('Uber');
});

test('hints cost points and the score follows the formula', async ({ page }) => {
  await boot(page, { hash: '/level/inc-0001-open-to-the-world' });
  for (let i = 0; i < 3; i++) await page.click('#hint');
  await solveByEdit(page, levels['inc-0001-open-to-the-world']);
  await expect(page.locator('#scoreline')).toContainText('Score 70');
});

test('progress is remembered: after solving, a reload resumes on the next level', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await solveByEdit(page, levels['p1-flip-the-switch']);
  await page.goto('./'); await page.reload();
  await expect(page.locator('#lvl-title')).toHaveText('Pin the version');
});

test('a wrong address shows a friendly 404 with a link back', async ({ page }) => {
  const res = await page.goto('./does-not-exist');
  expect(res.status()).toBe(404);
  await page.getByRole('link', { name: 'Back to Fix My Cloud' }).click();
  await expect(page.locator('#view-home')).toBeVisible(); // a first visit lands on the opening page
});

test('Hebrew switch keeps the player\'s edit and code stays left-to-right', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await ensureEdit(page); await page.fill('#editor', 'service: mine\nnetwork:\n  public: true');
  await page.click('[data-lang="he"]');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#editor')).toHaveValue(/service: mine/);
  expect(await page.locator('#editor').evaluate((e) => getComputedStyle(e).direction)).toBe('ltr');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the next thing to do is softly marked, and Run checks is quiet until it is time', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await ensureEdit(page);
  await expect(page.locator('.codebox')).toHaveClass(/is-next/);
  await expect(page.locator('#run')).toHaveClass(/is-quiet/);
  await page.fill('#editor', levels['p1-flip-the-switch'].fix);
  await expect(page.locator('#run')).not.toHaveClass(/is-quiet/);
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#done')).toBeVisible();
  await expect(page.locator('#run')).toHaveText(/Next level|See all incidents/);
});

test('every level opens with a briefing: what happened, what is wrong, your goal', async ({ page }) => {
  const log = watch(page);
  await boot(page, { hash: '/level/inc-0002-key-in-the-repo', brief: true });
  await expect(page.locator('#brief')).toBeVisible();
  await expect(page.locator('#level-body')).toBeHidden();
  await expect(page.locator('#brief-story li.is-in')).toHaveCount(3); // told one line at a time: wait for all of them
  await expect(page.locator('#brief-what')).not.toBeEmpty();
  expect(await axeSerious(page)).toEqual([]);
  await page.click('#brief-go');
  await expect(page.locator('#level-body')).toBeVisible();
  await expect(page.locator('#brief')).toBeHidden();
  await page.click('#rebrief'); // the briefing can be read again
  await expect(page.locator('#brief')).toBeVisible();
  expect(log.errors).toEqual([]);
});

test('two ways to fix, each explained, and the pick list has real choices', async ({ page }) => {
  await boot(page, { hash: '/level/p1-flip-the-switch' });
  await expect(page.locator('[data-mode]')).toHaveCount(2);
  await page.click('[data-mode="pick"]');
  await expect(page.locator('#editor')).toBeHidden();
  await page.locator('.line--tap').nth(2).click();
  expect(await page.locator('#choices .opt').count()).toBeGreaterThanOrEqual(3); // not just two
  await page.click('[data-mode="write"]');
  await expect(page.locator('#editor')).toBeVisible();
  await expect(page.locator('[data-mode="write"]')).toContainText('Any correct fix is accepted');
});

test('the help buttons look like buttons: each has a visible frame', async ({ page }) => {
  await boot(page, { hash: '/level/inc-0001-open-to-the-world' });
  for (const id of ['#hint', '#why', '#showfix']) {
    const border = await page.locator(id).evaluate((e) => getComputedStyle(e).borderTopWidth);
    expect(border).not.toBe('0px');
  }
});
