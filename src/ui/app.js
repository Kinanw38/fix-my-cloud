// Entry point: boot, routing, level loading, and the safety net. Hash routes keep every URL relative,
// so the site works under any subpath (GitHub Pages serves it under /<repo-name>/).
//   #/            resume (the last unfinished level, or practice 1 on a first visit)
//   #/level/<id>  open a level      #/board  the incident board      #/run/<easy|full>/<seed>  a shuffle run
import { $ } from './dom.js';
import { initLang, setLang, t, tx } from './i18n.js';
import { initMotion, swap, motionOff, setMood } from './motion.js';
import { app, S } from './state.js';
import { get, set, solvedIds, storageOk } from './store.js';
import { manifest } from '../levels/manifest.js';
import { buildRun } from '../lib/shuffle.js';
import { initLevelView, openLevel } from './level.js';
import { initResult } from './result.js';
import { initBoard, renderBoard } from './board.js';
import { initTour, startTour } from './tour.js';
import { initWelcomeBack, maybeWelcomeBack } from './welcomeback.js';
import { renderHome, initHome, stopDemo } from './home.js';
import { nextTarget } from './nav.js';

/* ---------- safety net: never show a stack trace, never a blank page ---------- */
function crash(err) { console.error(err); $('#banner').hidden = false; }
window.addEventListener('error', (e) => crash(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => crash(e.reason));

/* ---------- level loading: one at a time, so one broken file breaks only itself ---------- */
export async function loadLevel(id) {
  if (app.levels.has(id)) return app.levels.get(id);
  const m = manifest.find((x) => x.id === id);
  if (!m) return null;
  try {
    const level = (await import(`../levels/${m.file}`)).default;
    if (typeof level?.check !== 'function' || typeof level.vulnerableCode !== 'string') throw new Error(`Level ${id} is not valid`);
    app.levels.set(id, level); app.failed.delete(id); return level;
  } catch (e) { console.error(e); app.failed.add(id); return null; }
}
const loadAll = () => Promise.all(manifest.map((m) => loadLevel(m.id)));

/* ---------- views ---------- */
function show(view) {
  document.body.dataset.view = view;
  if (view !== 'level') setMood('night'); // a solved level must not leave the home page and the board in dawn colours
  if (view !== 'home') stopDemo();
  $('#view-home').hidden = view !== 'home'; $('#view-level').hidden = view !== 'level'; $('#view-board').hidden = view !== 'board';
  $('#nav-board').setAttribute('aria-current', view === 'board' ? 'page' : 'false'); $('#nav-home').setAttribute('aria-current', view === 'home' ? 'page' : 'false');
}

let booted = false; // do not steal focus on the very first load
async function showLevel(id) {
  const level = await loadLevel(id);
  if (!level) { swap(() => { show('level'); $('#level-body').hidden = true; $('#level-error').hidden = false; $('#level-error-title').focus(); }); return; }
  if (app.run && !app.run.ids.includes(id)) app.run = null;
  if (app.run) app.run.i = app.run.ids.indexOf(id);
  const takeFocus = booted; // decided now, so the very first load never steals focus
  try {
    swap(() => {
      show('level'); $('#level-error').hidden = true; $('#level-body').hidden = false;
      openLevel(level); $('#run-chip').hidden = !app.run;
      if (app.run) $('#run-chip').textContent = t('board.runActive', { i: app.run.i + 1, n: app.run.ids.length, seed: app.run.seed });
      if (takeFocus) $('#task-goal').focus({ preventScroll: true });
      if (app.pendingTour && S.briefed) { app.pendingTour = false; startTour(); }
    });
    set('last', id);
  } catch (e) { console.error(e); swap(() => { show('level'); $('#level-body').hidden = true; $('#level-error').hidden = false; }); }
}

const firstUnsolved = () => manifest.find((m) => !solvedIds().has(m.id))?.id ?? manifest[0].id;

async function showHome() {
  const p1 = await loadLevel(manifest[0].id);
  if (!p1) { await showBoard(); return; }
  swap(() => { show('home'); renderHome(p1, solvedIds().size > 0); $('#home-title').focus({ preventScroll: true }); });
}

async function showBoard() {
  await loadAll();
  swap(() => { show('board'); renderBoard(); $('#board-title').focus({ preventScroll: true }); });
}

async function startRun(mode, seed) {
  await loadAll();
  const ids = buildRun([...app.levels.values()], mode === 'full' ? 'full' : 'easy', seed);
  app.run = { mode, seed, ids, i: 0 };
  history.replaceState(null, '', `#/level/${ids[0]}`); await showLevel(ids[0]);
}

async function resume() {
  if (!get('welcome', false)) { history.replaceState(null, '', '#/home'); await showHome(); return; } // first visit: the opening page
  const solved = solvedIds(); const last = get('last', null);
  const id = last && manifest.some((m) => m.id === last) && !solved.has(last) ? last : manifest.find((m) => !solved.has(m.id))?.id;
  if (!id) { await showBoard(); return; }
  history.replaceState(null, '', `#/level/${id}`); await showLevel(id);
}

async function route() {
  const [kind, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (kind === 'home') await showHome();
    else if (kind === 'board') await showBoard();
    else if (kind === 'level' && a) await showLevel(a);
    else if (kind === 'run') await startRun(a, Number(b) || 1);
    else await resume();
  } catch (e) { crash(e); }
}

/* ---------- boot ---------- */
initLang(); initMotion($('#graph'));
initLevelView(); initResult(); initBoard();
initTour(); initWelcomeBack();
initHome(() => showHome());
const begin = (id, tour = false) => { set('welcome', true); app.pendingTour = tour; location.hash = `#/level/${id}`; };
$('#home-start').addEventListener('click', () => begin(firstUnsolved()));
$('#home-tour').addEventListener('click', () => begin(manifest[0].id, true));
$('#home-skip').addEventListener('click', () => begin(manifest.find((m) => m.id.startsWith('inc-')).id));
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => swap(() => setLang(b.dataset.lang))));
document.addEventListener('fmc:briefed', () => { if (app.pendingTour) { app.pendingTour = false; startTour(); } });
$('#banner-reload').addEventListener('click', () => location.reload());
document.addEventListener('fmc:next', () => { const n = nextTarget(); location.hash = n ? `#/level/${n}` : '#/board'; });
if (!storageOk()) $('#storage-note').hidden = false;
window.addEventListener('hashchange', route);
// The opening scene stays at least a moment (so it never flashes), then fades into the game.
const splash = $('#splash');
function leaveSplash() {
  const wait = navigator.webdriver ? 0 : Math.max(0, 1100 - performance.now()); // automated tests skip the minimum
  return new Promise((done) => setTimeout(() => {
    splash?.classList.add('is-done');
    setTimeout(() => { splash?.remove(); done(); }, motionOff() ? 0 : 700); // = --dur-intro x 1.5 plus a little
  }, wait));
}
route().finally(async () => {
  booted = true;
  await leaveSplash();
  const open = app.levels.get(location.hash.match(/^#\/level\/([\w-]+)/)?.[1]); // only on a level screen
  if (open) maybeWelcomeBack(tx(open.title));
  // Quietly load the other levels after the first screen is up: switching levels and opening the board become instant.
  setTimeout(() => loadAll().catch(() => {}), 800);
});
