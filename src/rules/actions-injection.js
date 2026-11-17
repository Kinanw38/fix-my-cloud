// INC-0003: untrusted event data must not be expanded inside a `run:` script.
import { guard, result, fail, toLines } from './common.js';

const indentOf = (l) => l.length - l.trimStart().length;

function untrusted(text) {
  let i = 0;
  while ((i = text.indexOf('${{', i)) !== -1) {
    const end = text.indexOf('}}', i);
    const expr = text.slice(i + 3, end === -1 ? undefined : end);
    if (expr.includes('github.event.') || expr.includes('github.head_ref')) return true;
    i += 3;
  }
  return false;
}

// Returns [{ lineNo, text }] for each line that belongs to a run script.
function runLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const at = lines[i].indexOf('run:');
    if (at === -1) continue;
    const before = lines[i].slice(0, at).trim();
    if (before !== '' && before !== '-') continue;
    const value = lines[i].slice(at + 4).trim();
    if (/^[|>][+-]?\d?$/.test(value)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (indentOf(lines[j]) <= at) break;
        out.push({ lineNo: j + 1, text: lines[j] });
        i = j;
      }
    } else {
      out.push({ lineNo: i + 1, text: value });
    }
  }
  return out;
}

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hash');
  const runs = runLines(lines);
  const failures = [];
  for (const r of runs) {
    if (untrusted(r.text)) {
      failures.push(fail('untrusted-in-run', r.lineNo, 'Event data is expanded inside a run script', 'מידע מהאירוע מוזרק ישר לתוך סקריפט run'));
    }
  }
  const perm = lines.findIndex((l) => l.trimStart().startsWith('permissions:'));
  if (perm === -1) {
    failures.push(fail('no-permissions', 0, 'No permissions block. The token gets default rights', 'אין בלוק permissions. הטוקן מקבל הרשאות ברירת מחדל'));
  } else if (lines[perm].split(':')[1]?.trim() === 'write-all') {
    failures.push(fail('write-all', perm + 1, 'permissions is set to write-all', 'permissions מוגדר ל-write-all'));
  }
  if (!runs.length || !/valid/i.test(lines.join('\n'))) {
    failures.push(fail('validation-removed', 0, 'The validation step is gone', 'שלב הוולידציה נמחק'));
  }
  return result(failures);
}
