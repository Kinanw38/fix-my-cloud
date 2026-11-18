// The opening scene must never start to fade before the first screen is on screen (no dark gap), even on a slow network.
import { test, expect } from '@playwright/test';

test('slow network: the opening scene waits for the first screen', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'network throttling needs Chromium');
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false }); // act like a real visitor: the scene keeps its minimum time
    try { localStorage.setItem('fmc.welcome', 'true'); localStorage.setItem('fmc.noask', 'true'); localStorage.setItem('fmc.briefed', JSON.stringify(['p1-flip-the-switch'])); } catch {}
    window.__fadeStart = null;
    new MutationObserver(() => {
      const s = document.querySelector('#splash');
      if (s && s.classList.contains('is-done') && !window.__fadeStart) window.__fadeStart = { view: document.body.dataset.view || '', swapping: document.body.classList.contains('is-swapping') };
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 500 * 1024, uploadThroughput: 250 * 1024 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto('http://localhost:4173/fix-my-cloud/#/level/p1-flip-the-switch', { waitUntil: 'commit' });
  await page.locator('#splash').waitFor({ state: 'detached', timeout: 20000 });
  const start = await page.evaluate(() => window.__fadeStart);
  expect(start).toEqual({ view: 'level', swapping: false }); // the level was already drawn when the fade began
  await ctx.close();
});
