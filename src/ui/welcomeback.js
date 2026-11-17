// "Welcome back": shown once when a visitor with saved progress opens the site. Continue, or start from the
// beginning (with a second "are you sure"). A checkbox stops it from asking again. Esc means continue.
import { $ } from './dom.js';
import { t } from './i18n.js';
import { get, set, solvedIds, resetProgress } from './store.js';
import { manifest } from '../levels/manifest.js';

let asked = false;
const dlg = () => $('#welcome-back');

function show(confirm) {
  $('#wb-title').textContent = t(confirm ? 'wb.resetTitle' : 'wb.title');
  $('#wb-main').hidden = confirm; $('#wb-confirm').hidden = !confirm;
  $('#wb-sure').hidden = !confirm; $('#wb-text').hidden = confirm; $('#wb-ask').hidden = confirm;
}

function restart() { resetProgress(); dlg().close(); location.hash = '#/home'; location.reload(); }

export function hasProgress() {
  const first = manifest[0].id; const last = get('last', null);
  return solvedIds().size > 0 || (last && last !== first);
}

// Called once after the first screen is up.
export function maybeWelcomeBack(levelTitle) {
  if (asked || get('noask', false) || !get('welcome', false) || !hasProgress()) return;
  asked = true;
  $('#wb-text').textContent = t('wb.text', { title: levelTitle, done: solvedIds().size, total: manifest.length });
  $('#wb-noask').checked = false; show(false); dlg().showModal(); $('#wb-continue').focus();
}

export function initWelcomeBack() {
  const close = () => { if ($('#wb-noask').checked) set('noask', true); dlg().close(); };
  $('#wb-continue').addEventListener('click', close);
  $('#wb-restart').addEventListener('click', () => show(true));
  $('#wb-back').addEventListener('click', () => show(false));
  $('#wb-yes').addEventListener('click', restart);
  dlg().addEventListener('cancel', () => { if ($('#wb-noask').checked) set('noask', true); }); // Esc = continue
  // The footer link opens it straight on the "are you sure" question.
  for (const id of ['#reset-all', '#nav-reset']) {
    $(id).addEventListener('click', () => { $('#wb-noask').checked = false; show(true); dlg().showModal(); $('#wb-yes').focus(); });
  }
}
