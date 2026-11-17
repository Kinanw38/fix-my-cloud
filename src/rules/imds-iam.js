// INC-0005: require IMDSv2 and a least-privilege S3 policy.
import { guard, result, fail, toLines, findBlocks, attrsOf } from './common.js';

const BUCKET_ARN = 'arn:aws:s3:::';

export function check(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hcl');
  const failures = [];

  const [inst] = findBlocks(lines, /^\s*resource\s+"aws_instance"\s+"[^"]*"\s*\{/);
  if (!inst) {
    failures.push(fail('missing-instance', 0, 'No aws_instance resource found', 'לא נמצא משאב aws_instance'));
  } else {
    const [meta] = findBlocks(lines, /^\s*metadata_options\s*\{/, inst.start + 1, inst.end);
    const m = meta ? attrsOf(lines, meta.start + 1, meta.end) : new Map();
    if (m.get('http_tokens')?.value !== 'required') {
      failures.push(fail('imds-v1', m.get('http_tokens')?.line ?? inst.start + 1, 'The metadata service accepts IMDSv1 (tokens are optional)', 'שירות המטא-דאטה מקבל IMDSv1 (טוקן אופציונלי)'));
    }
    const hop = m.get('http_put_response_hop_limit');
    if (hop && hop.value !== '1') {
      failures.push(fail('hop-limit', hop.line, 'The hop limit should be 1', 'מגבלת ה-hop צריכה להיות 1'));
    }
  }

  const statements = findBlocks(lines, /^\s*statement\s*\{/);
  if (!statements.length) {
    failures.push(fail('no-statement', 0, 'The policy statement is gone', 'הצהרת המדיניות נמחקה'));
  }
  for (const s of statements) {
    const a = attrsOf(lines, s.start + 1, s.end);
    const actions = a.get('actions');
    if (actions?.values.some((v) => v === '*' || v.toLowerCase() === 's3:*')) {
      failures.push(fail('wildcard-action', actions.line, 'The action is a wildcard (* or s3:*)', 'הפעולה היא wildcard (* או s3:*)'));
    }
    const res = a.get('resources');
    const specific = res && res.values.length > 0 &&
      res.values.every((v) => v.startsWith(BUCKET_ARN) && v.length > BUCKET_ARN.length && v[BUCKET_ARN.length] !== '*');
    if (!specific) {
      failures.push(fail('wildcard-resource', res?.line ?? s.start + 1, 'The resource must be a specific bucket ARN', 'המשאב חייב להיות ARN של bucket ספציפי'));
    }
  }
  return result(failures);
}
