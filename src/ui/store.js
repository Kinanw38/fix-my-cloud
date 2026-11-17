// localStorage, always inside try/catch. If it is missing or blocked, state lives in memory
// and the game keeps working. Only language, scores, progress and the welcome flag are stored. No cookies.
const mem = new Map();
let ok = (() => {
  try { localStorage.setItem('fmc.probe', '1'); localStorage.removeItem('fmc.probe'); return true; } catch { return false; }
})();

export const storageOk = () => ok;

export function get(key, fallback) {
  if (ok) {
    try {
      const v = localStorage.getItem('fmc.' + key);
      if (v !== null) return JSON.parse(v);
    } catch { /* fall through to memory */ }
  }
  return mem.has(key) ? mem.get(key) : fallback;
}

export function set(key, value) {
  mem.set(key, value);
  if (!ok) return;
  try { localStorage.setItem('fmc.' + key, JSON.stringify(value)); } catch { ok = false; }
}

export const solvedIds = () => new Set(get('solved', []));
export const bestScores = () => get('best', {});

export function recordSolve(id, score) {
  const s = solvedIds(); s.add(id); set('solved', [...s]);
  if (score != null) { const b = bestScores(); b[id] = Math.max(b[id] ?? 0, score); set('best', b); }
}

// Start from the beginning: scores, progress and read briefings go. Language and "do not ask again" stay.
export function resetProgress() {
  set('solved', []); set('best', {}); set('briefed', []); set('last', null); set('welcome', false);
}
