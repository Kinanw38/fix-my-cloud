// INC-0002: no string literal may be assigned to a credential-like name.
import { guard, result, fail, toLines } from './common.js';

// \b anchors the start so a long identifier is scanned once, not per character.
const ASSIGN = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)\s*[rbfRBF]{0,2}["']/g;
const SECRETISH = /key|secret|token|password/i;
const CLIENT = /boto3\s*\.\s*(?:client|resource|Session)\s*\(/;

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hash');
  const failures = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(ASSIGN)) {
      if (SECRETISH.test(m[1])) {
        failures.push(fail('hardcoded-credential', i + 1, `"${m[1]}" is set to a string literal`, `"${m[1]}" מוגדר כמחרוזת קבועה בקוד`));
      }
    }
    // The original fake values must go, wherever they were moved to.
    if (line.includes('DO_NOT_USE') && !failures.some((f) => f.line === i + 1)) {
      failures.push(fail('hardcoded-credential', i + 1, 'The key is still in the code', 'המפתח עדיין בקוד'));
    }
  });
  if (!CLIENT.test(lines.join('\n'))) {
    failures.push(fail('no-boto3-client', 0, 'The code no longer creates a boto3 client or session', 'הקוד כבר לא יוצר client או session של boto3'));
  }
  return result(failures);
}
