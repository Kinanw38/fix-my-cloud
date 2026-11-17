// The opening page: what the game is, what you do, and a short animated example of a real solution.
// The example plays the same three steps as the game: read the alert, fix the line, run checks.
import { $, el, htmlIcon } from './dom.js';
import { t, tx } from './i18n.js';
import { motionOff } from './motion.js';
import { miniScene } from './scene.js';

let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
export function stopDemo() { timers.forEach(clearTimeout); timers = []; }

let parts = {};

function build(level) {
  const lines = level.vulnerableCode.split('\n');
  const bad = lines.findIndex((l) => l.includes('true'));
  const code = el('div', 'demo__lines');
  parts.lines = lines.map((text, i) => {
    const row = el('div', 'demo__line'); const txt = el('span', 'demo__t', text);
    row.append(el('span', 'demo__n', String(i + 1)), txt); code.appendChild(row); return txt;
  });
  parts.bad = bad; parts.badRow = code.children[bad];
  parts.before = lines[bad]; parts.after = lines[bad].replace('true', 'false');
  parts.run = el('span', 'btn btn--primary demo__run', t('btn.run'));
  parts.status = el('span', 'stage-pill demo__status'); parts.dot = el('span', 'stage__dot'); parts.statusText = el('span');
  parts.status.append(parts.dot, parts.statusText);
  parts.mapBox = el('div', 'demo__map'); parts.svg = miniScene(level.scene, false, true); parts.mapBox.append(parts.svg);
  parts.alert = el('p', 'demo__alert', `${t('alert.prefix')} ${tx(level.scene.alert)}`);
  const left = el('div', 'demo__code'); left.append(el('p', 'demo__file', level.file), code, parts.run);
  const right = el('div', 'demo__right'); right.append(parts.alert, parts.mapBox, parts.status);
  $('#demo').replaceChildren(left, right);
}

function setStep(n) {
  $('#demo').dataset.step = String(n);
  document.querySelectorAll('.home__steps li').forEach((li, i) => li.classList.toggle('is-active', i + 1 === n));
}

function setSolved(solved) {
  parts.svg.dataset.state = solved ? 'contained' : 'breached';
  parts.mapBox.dataset.mood = solved ? 'dawn' : 'night';
  parts.statusText.textContent = t(solved ? 'stage.3' : 'stage.1');
  parts.dot.replaceChildren(...(solved ? [htmlIcon('i-check')] : []));
  parts.status.classList.toggle('is-done', solved);
  parts.alert.classList.toggle('is-done', solved);
}

function reset() {
  parts.lines[parts.bad].textContent = parts.before; parts.badRow.classList.remove('is-edited', 'is-hl');
  parts.run.classList.remove('is-pressed'); setSolved(false); setStep(1);
}

// Typing: delete "true" one letter at a time, then type "false".
function type() {
  const from = parts.before.length; const stem = parts.before.slice(0, parts.before.indexOf('true'));
  const frames = [];
  for (let k = 4; k >= 0; k--) frames.push(stem + 'true'.slice(0, k));
  for (let k = 1; k <= 5; k++) frames.push(stem + 'false'.slice(0, k));
  frames.forEach((f, i) => later(() => { parts.lines[parts.bad].textContent = f; }, i * 110));
  return frames.length * 110 + from * 0;
}

function play() {
  reset();
  later(() => { setStep(2); parts.badRow.classList.add('is-hl'); }, 1600);
  later(() => { parts.badRow.classList.add('is-edited'); type(); }, 2600);
  later(() => setStep(3), 4200);
  later(() => parts.run.classList.add('is-pressed'), 4900);
  later(() => parts.run.classList.remove('is-pressed'), 5100);
  later(() => { setSolved(true); $('#demo').dataset.played = 'true'; }, 5300);
  later(play, 10500); // loop
}

function still() { // reduced motion or a weak device: show the finished example, no timers
  reset(); parts.lines[parts.bad].textContent = parts.after; parts.badRow.classList.add('is-edited');
  setSolved(true); setStep(3); $('#demo').dataset.played = 'true';
}

export function renderHome(level, hasProgress) {
  stopDemo(); build(level);
  $('#home-start').textContent = t(hasProgress ? 'home.continue' : 'home.start');
  $('#demo').dataset.played = 'false';
  if (motionOff()) still(); else play();
}

export function initHome(onLang) {
  $('#demo-replay').addEventListener('click', () => { if (!motionOff()) { stopDemo(); $('#demo').dataset.played = 'false'; play(); } });
  document.addEventListener('langchange', () => { if (!$('#view-home').hidden) onLang(); });
}
