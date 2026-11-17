// What comes after the open level: the next one in the shuffle run, or the next unsolved one in order.
import { app } from './state.js';
import { solvedIds } from './store.js';
import { manifest } from '../levels/manifest.js';

export function nextTarget() {
  if (app.run) return app.run.ids[app.run.i + 1] ?? null;
  const order = manifest.map((m) => m.id); const solved = solvedIds();
  const at = order.indexOf(app.level.id);
  for (let k = 1; k < order.length; k++) {
    const id = order[(at + k) % order.length];
    if (!solved.has(id)) return id;
  }
  return null;
}
