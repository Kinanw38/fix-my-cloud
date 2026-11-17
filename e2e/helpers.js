import AxeBuilder from '@axe-core/playwright';
import { allLevels } from '../src/levels/index.js';

export const levels = Object.fromEntries(allLevels.map((l) => [l.id, l]));
export const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 860 } };

// Watches a page: console errors and requests to any other origin both fail a test.
export function watch(page) {
  const log = { errors: [], foreign: [] };
  const origin = new URL(page.context()._options?.baseURL ?? 'http://localhost:4173').origin;
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.errors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { const u = new URL(r.url()); if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== 'http://localhost:4173') log.foreign.push(r.url()); });
  return log;
}

// axe must not look at a half-faded page, so wait for the short one-off animations to finish.
async function settle(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(350);
}

export async function axeSerious(page) {
  await settle(page);
  const res = await new AxeBuilder({ page }).analyze();
  return res.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
}

export async function boot(page, { lang = 'en', hash = '', brief = false, ask = false, solved = [] } = {}) {
  // By default every briefing counts as read, so tests go straight to the work. Pass brief: true to see it.
  const ids = brief ? [] : allLevels.map((l) => l.id);
  await page.addInitScript(([l, read, ask, solved]) => { try { if (!sessionStorage.getItem('fmc.seeded')) { sessionStorage.setItem('fmc.seeded', '1'); if (solved.length) localStorage.setItem('fmc.solved', JSON.stringify(solved)); } if (!ask) localStorage.setItem('fmc.noask', 'true'); localStorage.setItem('fmc.lang', JSON.stringify(l)); localStorage.setItem('fmc.welcome', 'true'); localStorage.setItem('fmc.briefed', JSON.stringify(read)); } catch {} }, [lang, ids, ask, solved]);
  await page.goto(hash ? `./#${hash}` : './');
  await page.locator('#alert:visible, #brief-title:visible, #board-title:visible, #level-error-title:visible').first().waitFor();
}

// Practice starts in Edit mode on a big screen with a mouse. These make the test choose the mode it wants.
export async function ensureEdit(page) { if (!(await page.locator('#editor').isVisible())) await page.click('[data-mode="write"]'); }
export async function ensureTap(page) { if (await page.locator('#editor').isVisible()) await page.click('[data-mode="pick"]'); }

// Solve a level the way a player would. Tap mode: find a problem line, then pick the good options.
export async function solveByTap(page, level) {
  await ensureTap(page);
  const bad = level.check(level.vulnerableCode).failures.find((f) => f.line);
  await page.locator('.line--tap').nth(bad.line - 1).click();
  for (const [gi, g] of level.choices.entries()) {
    const good = g.options.find((o) => o.good); // by id: any language, any order
    await page.locator('#choices .optgroup').nth(gi).locator(`.opt[data-option="${good.id}"]`).click();
  }
  await page.click('#run');
}

export async function solveByEdit(page, level) {
  await ensureEdit(page);
  await page.fill('#editor', level.fix);
  await page.keyboard.press('Control+Enter');
}
