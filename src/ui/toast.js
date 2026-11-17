// A calm, short message with an optional action (for example Undo). It disappears by itself.
import { $, el } from './dom.js';

let timer;
export function toast(text, action, ms = 5000) {
  const box = $('#toast');
  const nodes = [el('span', '', text)];
  if (action) {
    const b = el('button', 'btn btn--text', action.label); b.type = 'button';
    b.addEventListener('click', () => { action.run(); hideToast(); });
    nodes.push(b);
  }
  box.replaceChildren(...nodes); box.hidden = false;
  clearTimeout(timer); timer = setTimeout(hideToast, ms);
}
export function hideToast() { const box = $('#toast'); if (box) box.hidden = true; }
