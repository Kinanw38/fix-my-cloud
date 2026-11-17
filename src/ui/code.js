// The evidence pane: numbered code lines, the problem lines, and the Tap-mode fix options.
// "Problem lines" come from the level's own check, so every level works the same way.
import { $, el, htmlIcon } from './dom.js';
import { t, tx } from './i18n.js';
import { S, app } from './state.js';

export const problemLines = () => new Set(app.level.check(S.code).failures.map((f) => f.line).filter(Boolean));

export function renderCode(h) {
  const lines = S.code.split('\n');
  const show = !S.solved && (S.lineChosen || S.lineHint); // the problem line is never shown for free: only after a hint, or once you found it
  const bad = show ? problemLines() : new Set();
  const failing = new Set(S.failures.map((f) => f.line));
  const tappable = !S.solved && !S.editing && !S.lineChosen;
  let tagged = false;
  $('#code').replaceChildren(...lines.map((text, i) => {
    const marked = bad.has(i + 1);
    const row = el('div', 'line' + (marked ? ' is-target' : '') + (failing.has(i + 1) ? ' is-failing' : '') + (i === S.applied ? ' is-applied' : ''));
    if (tappable) {
      row.classList.add('line--tap'); row.setAttribute('role', 'button'); row.tabIndex = 0;
      row.addEventListener('click', () => h.tapLine(i));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.tapLine(i); } });
    }
    row.append(el('span', 'line__n', String(i + 1)), el('span', 'line__t', text || ' '));
    if (marked && !tagged && S.lineHint) {
      tagged = true; // one tag is enough
      const tag = el('span', 'line__tag'); tag.append(htmlIcon('i-arrow', 'icon--left'), t(S.lineChosen ? 'code.change' : 'code.tap')); row.appendChild(tag);
    }
    return row;
  }));
  $('#code').hidden = S.editing; $('#editor').hidden = !S.editing;
  if (S.editing && $('#editor').value !== S.code) $('#editor').value = S.code;
  S.applied = -1; // the flash plays once, not on every re-render
}

export function renderChoices(h) {
  const groups = app.level.choices; const single = groups.length === 1;
  $('#choices-wrap').hidden = S.editing || S.solved || !S.lineChosen;
  $('#pick-title').textContent = t('pick.title');
  $('#choices').hidden = !S.lineChosen;
  $('#choices').replaceChildren(...groups.map((g) => {
    const box = el('div', 'optgroup');
    if (!single) box.appendChild(el('p', 'optgroup__title', tx(S.titles[g.id])));
    const list = el('div', 'opts');
    S.order[g.id].map((k) => g.options[k]).forEach((o, i) => {
      const b = el('button', 'opt'); b.type = 'button'; b.dataset.option = o.id;
      b.setAttribute('aria-pressed', String(S.picks[g.id] === o.id));
      if (single) b.setAttribute('aria-keyshortcuts', String(i + 1));
      b.append(el('span', 'opt__key', String(i + 1)), el('span', '', tx(o.label)));
      if (S.picks[g.id] === o.id) b.append(el('span', 'opt__why', tx(o.why)));
      b.addEventListener('click', () => h.choose(g, o));
      list.appendChild(b);
    });
    box.appendChild(list);
    return box;
  }));
}
