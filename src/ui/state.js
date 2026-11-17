// Shared state. `app` holds loaded levels and the current shuffle run. `S` is the state of the open level.
import { get } from './store.js';

export const app = {
  levels: new Map(),   // id -> level module (only the ones loaded so far)
  failed: new Set(),   // ids that failed to load
  level: null,         // the open level
  run: null,           // { mode, seed, ids, i } while a shuffle run is active
};

export const S = {};

// A large screen with a precise pointer starts practice in Edit mode (you type). Phones start in Tap mode.
const wideScreen = () => matchMedia('(min-width: 900px) and (pointer: fine)').matches;

// The options are shown in a random order, so the right one is not always first.
const shuffled = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const initial = (level) => level.check(level.vulnerableCode).failures.filter((f) => !f.ruleId.startsWith('input-'));

export function resetState(level) {
  for (const k of Object.keys(S)) delete S[k];
  const failures = initial(level);
  Object.assign(S, {
    code: level.vulnerableCode,
    base: null,           // text before the first Tap choice, so options can be switched
    picks: {},            // groupId -> optionId
    order: Object.fromEntries(level.choices.map((g) => [g.id, shuffled(g.options.length)])),
    history: [],
    tier: 0,              // highest hint tier used (0 to 3). "Show the fix" counts as 3
    started: false,       // the timer starts at the first interaction
    solved: false,
    solvedAt: null,
    score: null,
    edited: false,
    editing: level.difficulty === 'easy' && wideScreen(), // easy levels start in "write it yourself" on a big screen
    briefed: get('briefed', []).includes(level.id),
    lineChosen: false,    // Tap mode: first find the line, then the fixes appear
    lineHint: false,      // hint 2 reveals the line
    miss: false,
    failures: [],
    count: failures.length, // problems left. Updates when checks run
    titles: Object.fromEntries(level.choices.map((g) => [g.id, failures.find((f) => g.ruleIds.includes(f.ruleId))?.message ?? null])),
    seconds: 0,
    applied: -1,          // line to flash once
    why: false,
    logs: [{ key: 'log.alert', at: 0 }],
  });
}
