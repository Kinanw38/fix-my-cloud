// The incident board. Each ticket carries a small still of its door: open until you solve it, then locked.
// Practice first, then Pack 1. Filters by difficulty and topic, and Shuffle (a seeded run of 5).
// Nothing is locked: any level opens directly.
import { $, el, svg } from './dom.js';
import { t, tx } from './i18n.js';
import { app } from './state.js';
import { manifest } from '../levels/manifest.js';
import { solvedIds, bestScores } from './store.js';
import { rankFor } from '../lib/score.js';
import { miniScene } from './scene.js';
import { REPO_URL } from '../config.js';

const DIFFS = ['easy', 'medium', 'hard'];
const TAGS = ['Secrets', 'CI/CD', 'Reliability', 'Cloud', 'Kubernetes', 'Network'];
const filter = { difficulty: new Set(), tag: new Set() };

function chipRow(kind, values, label) {
  const row = el('div', 'filters__row'); row.appendChild(el('span', 'filters__label', t(label)));
  for (const v of values) {
    const b = el('button', 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(filter[kind].has(v)));
    b.textContent = kind === 'difficulty' ? t('diff.' + v) : v;
    b.addEventListener('click', () => { filter[kind].has(v) ? filter[kind].delete(v) : filter[kind].add(v); renderBoard(); });
    row.appendChild(b);
  }
  return row;
}

function doorIcon(locked) {
  const s = svg('svg', { class: 'door-mini ' + (locked ? 'is-locked' : 'is-open'), viewBox: '0 0 16 22', 'aria-hidden': 'true' });
  s.appendChild(svg('use', { href: '#i-door-shut' }));
  return s;
}

function ticket(id) {
  const lv = app.levels.get(id); const solved = solvedIds().has(id);
  if (!lv) { const d = el('div', 'ticket ticket--off'); d.append(el('p', 'ticket__title', t('board.unavailable')), el('p', 'err', id)); return d; }
  const a = el('a', 'ticket' + (solved ? ' ticket--done' : '')); a.href = `#/level/${id}`;
  const art = el('div', 'ticket__art'); art.appendChild(miniScene(lv.scene, solved));
  const top = el('div', 'ticket__top');
  top.appendChild(lv.incidentId ? el('span', 'inc-id', lv.incidentId) : el('span', 'tag', t('tag.practice')));
  top.appendChild(el('span', 'status ' + (solved ? 'status--solved' : 'status--new'), t(solved ? 'status.solved' : 'status.new')));
  const years = (lv.realWorld ?? []).map((e) => e.year).filter(Boolean);
  const best = bestScores()[id];
  const meta = [t('diff.' + lv.difficulty) + (lv.difficulty === 'hard' ? ` · ${t('diff.curious')}` : ''), t('board.minutes', { n: lv.estimatedMinutes }), years.length ? String(Math.min(...years)) : null, best != null ? t('board.best', { n: best }) : null].filter(Boolean);
  const body = el('div', 'ticket__body');
  body.append(top, el('h3', 'ticket__title', tx(lv.title)), el('p', 'ticket__tags', lv.tags.join(' · ')), el('p', 'ticket__meta', meta.join('  ·  ')));
  a.append(art, body);
  return a;
}

export function renderBoard() {
  const ids = manifest.map((m) => m.id); const inc = ids.filter((id) => id.startsWith('inc-'));
  const points = inc.reduce((a, id) => a + (bestScores()[id] ?? 0), 0); const done = inc.filter((id) => solvedIds().has(id)).length;
  $('#doors').replaceChildren(...inc.map((id) => doorIcon(solvedIds().has(id))));
  $('#doors').setAttribute('aria-label', t('board.doors', { done, total: inc.length }));
  $('#board-progress').textContent = done === inc.length ? t('rank.final', { points, rank: t('rank.' + rankFor(points)) }) : t('rank.progress', { done, total: inc.length, points });
  $('#filters').replaceChildren(chipRow('difficulty', DIFFS, 'board.difficulty'), chipRow('tag', TAGS, 'board.tag'));
  const shown = ids.filter((id) => { const lv = app.levels.get(id); if (!lv) return true;
    return (!filter.difficulty.size || filter.difficulty.has(lv.difficulty)) && (!filter.tag.size || lv.tags.some((g) => filter.tag.has(g))); });
  $('#tickets').replaceChildren(...shown.map(ticket));
  $('#board-empty').hidden = shown.length > 0;
  // The closing card: once, after every incident is solved. A calm thank you and an optional link. No pop-up, nothing asked.
  const thanks = $('#board-thanks'); thanks.hidden = done < inc.length;
  if (!thanks.hidden && !thanks.querySelector('a')) { const a = el('a', 'btn', ''); a.href = REPO_URL; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.t = 'thanks.star'; a.textContent = t('thanks.star'); thanks.appendChild(a); }
  $('#run-note').textContent = app.run ? t('board.runActive', { i: app.run.i + 1, n: app.run.ids.length, seed: app.run.seed }) : '';
}

export function initBoard() {
  for (const [id, mode] of [['#run-easy', 'easy'], ['#run-full', 'full']]) {
    $(id).addEventListener('click', () => { location.hash = `#/run/${mode}/${Math.floor(Math.random() * 900000) + 100000}`; });
  }
  document.addEventListener('langchange', () => { if (!$('#view-board').hidden) renderBoard(); });
}
