// Motion controller. Looping animations run only when they are affordable and visible. Nothing here needs the network.
// The device hints (memory, cores, save-data) exist only in Chromium. Browsers without them keep motion on.
export const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let sceneVisible = true;

const weakDevice = () =>
  (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
  navigator.connection?.saveData === true;

export function updateMotion() {
  const ok = !reduce.matches && !weakDevice();
  root.dataset.motion = ok ? 'on' : 'off';
  root.dataset.loops = ok && sceneVisible && !document.hidden ? 'on' : 'off';
}

export const motionOff = () => root.dataset.motion === 'off';

export function initMotion(sceneEl) {
  reduce.addEventListener?.('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  if (sceneEl && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { sceneVisible = es.some((e) => e.isIntersecting); updateMotion(); }).observe(sceneEl);
  }
  updateMotion();
}

// A short fade hides a palette or language swap. Instant when motion is off.
export function swap(fn) {
  if (motionOff()) { fn(); return; }
  document.body.classList.add('is-swapping');
  setTimeout(() => { fn(); document.body.classList.remove('is-swapping'); }, 200); // = --dur-base
}

// Night to dawn: nothing disappears. For a moment every colour is allowed to change slowly (see .is-mood in screen.css).
let moodTimer;
export function setMood(m) {
  if ((root.dataset.mood ?? 'night') === m) return;
  if (motionOff()) { root.dataset.mood = m; return; }
  root.classList.add('is-mood');
  requestAnimationFrame(() => { root.dataset.mood = m; });
  clearTimeout(moodTimer); moodTimer = setTimeout(() => root.classList.remove('is-mood'), 1000); // a little more than --dur-mood
}
