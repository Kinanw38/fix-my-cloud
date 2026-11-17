// A calm, short message with an optional action (for example Undo) and an X. It slides in, and fades out by itself.
import { $, el, htmlIcon } from './dom.js';
import { t } from './i18n.js';
import { motionOff } from './motion.js';

let timer; let hideTimer;
export function toast(text, action, ms = 5000) {
  const box = $('#toast');
  const nodes = [el('span', '', text)];
  if (action) {
    const b = el('button', 'btn btn--text', action.label); b.type = 'button';
    b.addEventListener('click', () => { action.run(); hideToast(); });
    nodes.push(b);
  }
  const x = el('button', 'toast__x'); x.type = 'button'; x.setAttribute('aria-label', t('toast.close')); x.appendChild(htmlIcon('i-cross'));
  x.addEventListener('click', hideToast); nodes.push(x);
  clearTimeout(hideTimer); box.replaceChildren(...nodes); box.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-in')));
  clearTimeout(timer); timer = setTimeout(hideToast, ms);
}
export function hideToast() {
  const box = $('#toast'); if (!box) return;
  clearTimeout(timer); box.classList.remove('is-in');
  clearTimeout(hideTimer); hideTimer = setTimeout(() => { box.hidden = true; }, motionOff() ? 0 : 220); // = --dur-base plus a little
}
