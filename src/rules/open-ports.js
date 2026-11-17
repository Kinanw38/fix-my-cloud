// INC-0001: management and database ports must not be open to the world.
import { guard, result, fail, toLines, findBlocks, attrsOf } from './common.js';

const WORLD = ['0.0.0.0/0', '::/0'];
const RISKY = [
  { port: 22, id: 'ssh-open-world', en: 'Port 22 (SSH)', he: 'פורט 22 (SSH)' },
  { port: 3389, id: 'rdp-open-world', en: 'Port 3389 (RDP)', he: 'פורט 3389 (RDP)' },
  { port: 3306, id: 'db-open-world', en: 'Port 3306 (MySQL)', he: 'פורט 3306 (MySQL)' },
];

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hcl');
  const sgs = findBlocks(lines, /^\s*resource\s+"aws_security_group"\s+"[^"]*"\s*\{/);
  if (!sgs.length) {
    return result([fail('missing-security-group', 0, 'No aws_security_group resource found.', 'לא נמצא משאב aws_security_group.')]);
  }
  const failures = [];
  for (const sg of sgs) {
    for (const ing of findBlocks(lines, /^\s*ingress\s*\{/, sg.start + 1, sg.end)) {
      const a = attrsOf(lines, ing.start + 1, ing.end);
      const cidrAttr = [a.get('cidr_blocks'), a.get('ipv6_cidr_blocks')].filter(Boolean);
      const open = cidrAttr.flatMap((x) => x.values).find((v) => WORLD.includes(v));
      if (!open) continue;
      const all = a.get('protocol')?.value === '-1';
      const from = Number(a.get('from_port')?.value);
      const to = Number(a.get('to_port')?.value);
      for (const r of RISKY) {
        if (all || (from <= r.port && r.port <= to)) {
          failures.push(fail(r.id, cidrAttr[0].line, `${r.en} is open to ${open}`, `${r.he} פתוח ל-${open}`));
        }
      }
    }
  }
  return result(failures);
}
