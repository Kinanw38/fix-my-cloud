// After a check: the result line, failed-check chips, and (once solved) the stamp, score, lesson,
// "What really happened", your fix as a pull-request diff, and the next actions.
import { $, el, htmlIcon, mmss } from './dom.js';
import { t, tx } from './i18n.js';
import { S, app } from './state.js';
import { diffLines } from '../lib/diff.js';
import { visibleRealWorld } from '../lib/realworld.js';
import { rankFor } from '../lib/score.js';
import { bestScores, solvedIds } from './store.js';
import { nextTarget } from './nav.js';
import { manifest } from '../levels/manifest.js';
import { toast } from './toast.js';

function chips() {
  const list = $('#chips');
  list.replaceChildren(...(S.solved ? [] : S.chips ?? []).map((f) => {
    const b = el('button', 'fail-chip'); b.type = 'button'; b.append(htmlIcon('i-cross'), tx(f.message));
    if (f.line) b.addEventListener('click', () => $('#code').children[f.line - 1]?.scrollIntoView({ block: 'nearest' }));
    const li = el('li'); li.appendChild(b); return li;
  }));
  list.classList.toggle('is-in', !S.solved && (S.chips?.length ?? 0) > 0);
}

function score() {
  const L = app.level;
  if (L.incidentId === null) { $('#scoreline').textContent = t('score.practice'); $('#rankline').textContent = ''; return; }
  $('#scoreline').textContent = t('score.line', { score: S.score, tier: S.tier });
  const ids = manifest.map((m) => m.id).filter((id) => id.startsWith('inc-')); const done = ids.filter((id) => solvedIds().has(id));
  const points = ids.reduce((a, id) => a + (bestScores()[id] ?? 0), 0);
  $('#rankline').textContent = done.length === ids.length ? t('rank.final', { points, rank: t('rank.' + rankFor(points)) }) : t('rank.progress', { done: done.length, total: ids.length, points });
}

function realWorld() {
  const v = visibleRealWorld(app.level); const out = [];
  if (v.mode === 'pattern') out.push(el('p', 'rw__pattern', t('rw.pattern')));
  for (const e of v.entries) {
    out.push(el('h4', 'rw__name', e.year ? `${e.name}, ${e.year}` : e.name), el('p', '', tx(e.summary)));
    const ul = el('ul', 'rw__links');
    for (const s of e.sources.filter((x) => /^https:\/\//.test(x.url))) {
      const a = el('a', 'link', s.title); a.href = s.url; a.rel = 'noopener noreferrer';
      const li = el('li'); li.appendChild(a); ul.appendChild(li);
    }
    out.push(ul);
  }
  out.push(el('p', 'err', t('rw.simplified')));
  if (v.mode === 'verified') out.push(el('p', 'err', t('rw.basedOnPublic')));
  $('#rw-body').replaceChildren(...out);
}

function diff() {
  const box = $('#diff'); const rows = diffLines(app.level.vulnerableCode, S.code);
  box.replaceChildren(el('div', 'diff__file', app.level.file), ...rows.map((r) => {
    const row = el('div', 'diff__line diff__line--' + r.type);
    const sym = el('span', 'diff__sym', r.type === 'del' ? '-' : r.type === 'add' ? '+' : ' '); sym.setAttribute('aria-hidden', 'true');
    const t1 = el('span', 'diff__t', r.text || ' ');
    if (r.type !== 'same') t1.append(el('span', 'sr-only', t(r.type === 'add' ? 'diff.added' : 'diff.removed')));
    row.append(sym, t1); return row;
  }));
  box.classList.remove('is-revealing', 'is-in');
  if (S.reveal) { S.reveal = false; box.classList.add('is-revealing'); void box.offsetWidth; box.classList.add('is-in'); }
}

export function renderResult() {
  $('#result').textContent = S.result ? t(S.result.key, S.result.vars) : '';
  chips();
  $('#done').hidden = !S.solved;
  if (!S.solved) return;
  $('#stamp').replaceChildren(htmlIcon('i-check'), `${t('result.resolvedIn')} `, el('span', 'num', mmss(S.solvedAt)));
  score();
  const L = app.level;
  $('#lesson-body').replaceChildren(...['whatWasWrong', 'whyItMatters', 'bestPractice'].flatMap((k, i) => [el('dt', '', t('lesson.' + (i + 1))), el('dd', '', tx(L.lesson[k]))]));
  realWorld(); diff();
}

export function initResult() {
  $('#to-board').addEventListener('click', () => { location.hash = '#/board'; });
  $('#share').addEventListener('click', async () => {
    try { const { downloadShareCard } = await import('./share.js'); downloadShareCard(); } catch (e) { console.error(e); toast(t('err.share')); }
  });
}
