// The level screen: state changes, actions, and the glue that renders every part.
import { $, el, htmlIcon, mmss } from './dom.js';
import { t, tx } from './i18n.js';
import { S, app, resetState } from './state.js';
import { applyChoice } from '../lib/choices.js';
import { levelScore } from '../lib/score.js';
import { recordSolve, get, set } from './store.js';
import { miniScene } from './scene.js';
import { setMood, root } from './motion.js';
import { scene } from './scene.js';
import { renderCode, renderChoices, problemLines } from './code.js';
import { renderResult } from './result.js';
import { toast } from './toast.js';
import { nextTarget } from './nav.js';

const L = () => app.level;
const practice = () => L().incidentId === null;
const start = () => { S.started = true; };
const log = (key, vars, cls) => { S.logs.push({ key, vars, cls, at: S.seconds }); };
const handlers = { tapLine, choose };

/* ---------- opening a level ---------- */
export function openLevel(level) {
  app.level = level; resetState(level); scene.configure(level.scene);
  root.dataset.mood = 'night'; $('#timer').textContent = '00:00'; $('#brief').hidden = true;
  $('#done').hidden = true; $('#stamp').classList.remove('is-open'); $('#lesson').classList.remove('is-open');
  render();
  if (!S.briefed) $('#brief-title').focus({ preventScroll: true });
}

/* ---------- actions ---------- */
function tapLine(i) {
  start();
  if (problemLines().has(i + 1)) { S.lineChosen = true; S.miss = false; log('log.line'); } else S.miss = true;
  render();
  if (S.lineChosen) $('#choices button')?.focus();
}

// Choices are re-applied from the text before the first choice, so every option can be switched.
function choose(group, opt) {
  start();
  if (S.base === null) { S.base = S.code; S.history.push(S.code); }
  S.picks[group.id] = opt.id;
  let next = S.base;
  for (const g of L().choices) {
    const o = g.options.find((x) => x.id === S.picks[g.id]);
    if (o) next = applyChoice(next, o) ?? next;
  }
  const a = S.code.split('\n'); const b = next.split('\n');
  S.applied = b.findIndex((l, i) => l !== a[i]);
  S.code = next; S.edited = true; S.failures = [];
  render();
}

function run() {
  if (S.solved) { document.dispatchEvent(new CustomEvent('fmc:next')); return; } // after a fix, the same button goes on
  start();
  const res = L().check(S.code); const real = res.failures.filter((f) => !f.ruleId.startsWith('input-'));
  S.failures = real.filter((f) => f.line); S.chips = real; S.applied = -1;
  if (res.passed) {
    if (!S.solved) solve();
    S.result = { key: 'result.pass' };
  } else if (res.failures[0]?.ruleId === 'input-empty') {
    S.result = { key: 'err.empty' };
  } else if (res.failures[0]?.ruleId === 'input-too-large') {
    S.result = { key: 'err.tooLong' };
  } else {
    S.count = real.length; S.result = { key: 'result.fail', vars: { n: real.length } }; log('log.failed', { rule: real[0]?.ruleId }, 'is-bad');
  }
  render(); $('#result').focus();
}

function solve() {
  S.solved = true; S.solvedAt = S.seconds; S.count = 0; S.reveal = true;
  if (!practice()) S.score = levelScore({ maxTier: S.tier, seconds: S.seconds });
  recordSolve(L().id, S.score); log('log.contained', null, 'is-good');
  setMood('dawn');
  requestAnimationFrame(() => { $('#stamp').classList.add('is-open'); $('#lesson').classList.add('is-open'); });
}

function hint() {
  start(); if (S.tier >= 3) return;
  S.tier++; log('log.hint', { n: S.tier });
  if (S.tier >= (practice() ? 1 : 2)) S.lineHint = true; // practice hints are free, so the first one already points
  render();
}

function showFix() {
  start(); S.history.push(S.code); S.code = L().fix; S.base = null; S.picks = {};
  S.tier = 3; S.lineHint = true; S.lineChosen = true; S.edited = true; S.failures = []; log('log.fix'); render();
}

// Start over: a fresh attempt (code, timer and hints). Undo brings the old attempt back for 5 seconds.
function startOver() {
  const snapshot = structuredClone(S); const mood = root.dataset.mood;
  openLevel(L());
  toast(t('toast.startover'), { label: t('btn.undo'), run: () => { Object.assign(S, snapshot); if (mood) root.dataset.mood = mood; render(); } });
}

function undo() {
  const prev = S.history.pop(); if (prev === undefined) return;
  S.code = prev; S.base = null; S.picks = {}; S.failures = []; S.chips = []; render();
}

async function copy() {
  try { await navigator.clipboard.writeText(S.code); toast(t('toast.copied')); } catch { toast(t('err.copyUnavailable')); }
}

function inspect() {
  start(); log('log.inspect'); render();
  $('#file-title').focus(); $('#file-title').scrollIntoView({ block: 'nearest' });
}

/* ---------- the briefing: what happened, what is wrong, what you need to do ---------- */
function briefGo() {
  S.briefed = true; const done = new Set(get('briefed', [])); done.add(L().id); set('briefed', [...done]);
  render(); document.dispatchEvent(new CustomEvent('fmc:briefed'));
  $('#guide').scrollIntoView({ block: 'nearest' });
}

function renderBrief(animate) {
  const l = L(); const sc = l.scene;
  $('#brief-id').hidden = practice(); $('#brief-id').textContent = l.incidentId ?? '';
  $('#brief-title').textContent = tx(l.title);
  $('#brief-what').textContent = tx(sc.brief); $('#brief-wrong').textContent = tx(sc.alert); $('#brief-goal').textContent = tx(sc.goal);
  $('#brief-art').replaceChildren(miniScene(sc, false, true));
  const items = [...document.querySelectorAll('#brief-story li')];
  if (!animate) { items.forEach((li) => li.classList.add('is-in')); return; }
  items.forEach((li) => li.classList.remove('is-in'));
  if (root.dataset.motion === 'off') items.forEach((li) => li.classList.add('is-in'));
  else items.forEach((li, i) => setTimeout(() => li.classList.add('is-in'), 250 + i * 450)); // one line at a time, like being told
}

/* ---------- rendering ---------- */
function stageIndex() { return S.solved ? 3 : S.edited ? 1 : 0; }

function renderHeader() {
  const l = L(); const sc = l.scene; const cur = stageIndex(); void cur;
  $('#tag-practice').hidden = !practice(); $('#inc-id').hidden = practice(); $('#inc-id').textContent = l.incidentId ?? '';
  $('#lvl-title').textContent = tx(l.title);
  $('#alert').classList.toggle('is-over', S.solved);
  $('#alert-label').textContent = t(S.solved ? 'alert.closed' : 'alert.label');
  $('#alert-icon').setAttribute('href', S.solved ? '#i-check' : '#i-cross');
  $('#pager').textContent = S.solved ? t('alert.over', { what: tx(sc.capClosed) }) : `${t('alert.prefix')} ${tx(sc.alert)}`;
  const goal = tx(sc.goal); $('#goal-text').textContent = goal.charAt(0).toUpperCase() + goal.slice(1);
  $('#file-name').textContent = l.file; $('#lang-tag').textContent = l.language; $('#intro').textContent = tx(l.intro);
  $('#meter-label').textContent = tx(sc.meter);
  $('#meter').classList.toggle('is-zero', S.count === 0);
  $('#exposed').replaceChildren(htmlIcon(S.count === 0 ? 'i-check' : 'i-cross'), String(S.count));
  const cap = $('#scene-caption'); cap.textContent = tx(S.solved ? sc.capClosed : sc.capOpen); cap.classList.toggle('is-closed', S.solved);
  $('#timer').textContent = mmss(S.seconds);
}

function renderHints() {
  const next = Math.min(S.tier + 1, 3);
  $('#hint-label').textContent = S.tier >= 3 ? t('hint.none') : practice() ? t('hint.label', { n: next }) : t('hint.labelCost', { n: next, c: 10 });
  $('#hint').disabled = S.tier >= 3;
  $('#hint-note').classList.toggle('is-open', S.tier > 0);
  $('#hint-text').replaceChildren(...L().hints.slice(0, S.tier).map((h) => el('p', '', tx(h))));
  $('#why').setAttribute('aria-expanded', String(S.why)); $('#why-note').classList.toggle('is-open', S.why);
  $('#why-text').replaceChildren(el('p', '', tx(L().lesson.whatWasWrong)), el('p', '', tx(L().lesson.whyItMatters)));
  $('#undo').disabled = S.history.length === 0;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.mode === 'write') === S.editing)));
}

// The task card: three steps with the current one marked, and one line saying exactly what to do now.
function renderGuide() {
  const failed = !S.solved && S.chips?.length && S.result?.key === 'result.fail';
  let cur; let key;
  if (S.solved) { cur = 4; key = 'guide.done'; }
  else if (failed) { cur = 3; key = 'guide.failed'; }
  else if (S.editing) { cur = S.edited ? 3 : 2; key = S.edited ? 'guide.3' : 'guide.edit'; }
  else if (!S.lineChosen) { cur = 1; key = 'guide.1'; }
  else if (!S.edited) { cur = 2; key = 'guide.2'; }
  else { cur = 3; key = 'guide.3'; }
  document.querySelectorAll('#steps3 li').forEach((li, i) => {
    li.className = i + 1 < cur ? 'is-done' : i + 1 === cur ? 'is-current' : '';
    li.querySelector('.steps3__n').replaceChildren(...(i + 1 < cur ? [htmlIcon('i-check')] : [document.createTextNode(String(i + 1))]));
    if (i + 1 === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('#guide').className = 'task__now' + (S.solved ? ' is-done' : failed ? ' is-warn' : '');
  $('#guide-text').textContent = t(key);
}

// A soft mark on what to use next, so the eye knows where to go. It follows the same steps as the guide.
function renderNext() {
  const failed = !S.solved && S.chips?.length && S.result?.key === 'result.fail';
  const ready = S.edited && !S.solved && !failed;
  const choosing = !S.editing && S.lineChosen && !S.edited && !S.solved;
  const writing = (S.editing || !S.lineChosen) && !S.solved && !ready;
  $('.codebox').classList.toggle('is-next', writing || failed);
  $('#choices').classList.toggle('is-next', choosing);
  // One button in one place: Check, then Next. It is loud only when it is time to press it.
  $('#run').textContent = S.solved ? t(nextTarget() ? 'result.next' : 'result.allDone') : t('btn.run');
  $('#run').classList.toggle('is-quiet', !(S.solved || ready || failed));
}

function renderLog() {
  $('#log').replaceChildren(...S.logs.map((l) => { const li = el('li'); li.append(el('time', '', mmss(l.at)), el('span', l.cls, t(l.key, l.vars))); return li; }));
  $('#log').scrollTop = $('#log').scrollHeight;
}

export function render() {
  if (!app.level) return;
  const wasBrief = !$('#brief').hidden;
  $('#brief').hidden = S.briefed; $('#level-body').hidden = !S.briefed;
  if (!S.briefed) { renderBrief(!wasBrief); return; }
  renderHeader(); renderCode(handlers); renderChoices(handlers); scene.paint(S.solved); renderHints(); renderResult(); renderGuide(); renderNext(); renderLog();
  $('#feedback').hidden = !(S.result || S.chips?.length);
  $('#err').textContent = S.miss ? t('pick.miss') : '';
}

/* ---------- one-time wiring ---------- */
export function initLevelView(onPick) {
  scene.init($('#graph'), () => { inspect(); onPick?.(); });
  $('#run').addEventListener('click', run);
  $('#hint').addEventListener('click', hint);
  $('#why').addEventListener('click', () => { S.why = !S.why; render(); });
  $('#showfix').addEventListener('click', showFix);
  $('#startover').addEventListener('click', startOver);
  $('#undo').addEventListener('click', undo);
  $('#copy').addEventListener('click', copy);
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { start(); S.editing = b.dataset.mode === 'write'; render(); if (S.editing) $('#editor').focus(); }));
  $('#brief-go').addEventListener('click', briefGo);
  $('#rebrief').addEventListener('click', () => { S.briefed = false; render(); });
  $('#editor').addEventListener('input', (e) => {
    start(); if (!S.history.length) S.history.push(S.code);
    S.code = e.target.value; S.base = null; S.picks = {}; S.edited = S.code !== L().vulnerableCode; S.applied = -1;
    renderHeader(); renderHints(); renderGuide(); renderNext();
  });
  document.addEventListener('keydown', (e) => {
    if (!app.level || $('#view-level').hidden) return;
    if (e.ctrlKey && e.key === 'Enter') { run(); return; }
    const n = Number(e.key); const g = L().choices;
    if (!e.target.closest?.('textarea, input') && !e.ctrlKey && !e.metaKey && !e.altKey && !S.editing && S.lineChosen && g.length === 1 && n >= 1 && n <= g[0].options.length) choose(g[0], g[0].options[S.order[g[0].id][n - 1]]);
  });
  document.addEventListener('langchange', render);
  // The timer starts at the first interaction and pauses while the tab is hidden.
  setInterval(() => { if (app.level && S.started && !S.solved && !document.hidden) { S.seconds++; $('#timer').textContent = mmss(S.seconds); } }, 1000);
}
