// An optional 3-step tour: a small card at the bottom that points at one thing at a time.
// Keyboard and screen-reader friendly. Esc leaves.
import { $, $$ } from './dom.js';
import { t } from './i18n.js';

const STEPS = [
  { target: '#inspector', key: 'tour.evidence' },
  { target: '#modebox', key: 'tour.mode' },
  { target: '.scene', key: 'tour.map' },
  { target: '#run', key: 'tour.run' },
];
let step = -1; let opener = null;

function mark(on) { $$('.is-tour').forEach((n) => n.classList.remove('is-tour')); if (on) $(STEPS[step].target)?.classList.add('is-tour'); }

function showStep(i) {
  step = i; const s = STEPS[i]; $('#coach').hidden = false;
  $('#coach-step').textContent = t('tour.step', { i: i + 1, n: STEPS.length }); $('#coach-text').textContent = t(s.key);
  $('#coach-back').disabled = i === 0; $('#coach-next').textContent = t(i === STEPS.length - 1 ? 'tour.done' : 'tour.next');
  mark(true); $(s.target)?.scrollIntoView({ block: 'nearest' }); $('#coach-title').focus();
}

export function endTour() {
  if (step < 0) return; step = -1; mark(false); $('#coach').hidden = true; opener?.focus(); opener = null;
}

export const startTour = () => { opener = document.activeElement; showStep(0); };

export function initTour() {
  $('#coach-next').addEventListener('click', () => (step === STEPS.length - 1 ? endTour() : showStep(step + 1)));
  $('#coach-back').addEventListener('click', () => step > 0 && showStep(step - 1));
  $('#coach-skip').addEventListener('click', endTour);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') endTour(); });
  document.addEventListener('langchange', () => { if (step >= 0) showStep(step); });
}
