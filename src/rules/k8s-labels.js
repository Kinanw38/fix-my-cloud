// INC-0006: the deprecated "master" node label is gone, use "control-plane".
import { guard, result, fail, toLines, unq } from './common.js';

const OLD = 'node-role.kubernetes.io/master';
const NEW = 'node-role.kubernetes.io/control-plane';

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hash');
  const failures = [];
  lines.forEach((l, i) => {
    if (l.includes(OLD)) failures.push(fail('deprecated-master-label', i + 1, 'The selector uses the old "master" label', 'ה-selector משתמש בתווית "master" הישנה'));
  });
  if (!lines.some((l) => l.includes(NEW))) {
    failures.push(fail('missing-control-plane-label', 0, 'Nothing selects the "control-plane" label', 'שום דבר לא בוחר את התווית "control-plane"'));
  }
  const isDaemonSet = lines.some((l) => l.trimStart().startsWith('kind:') && unq(l.split(':')[1] ?? '') === 'DaemonSet');
  const hasContainers = lines.some((l) => l.trimStart().startsWith('containers:'));
  if (!isDaemonSet || !hasContainers) {
    failures.push(fail('invalid-daemonset', 0, 'This is no longer a valid DaemonSet', 'זה כבר לא DaemonSet תקין'));
  }
  return result(failures);
}
