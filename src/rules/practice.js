// Practice levels P1 (YAML switch) and P2 (Dockerfile pin).
import { guard, result, fail, toLines, unq } from './common.js';

export function checkSwitch(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hash');
  const failures = [];
  if (!lines.some((l) => l.trimStart().startsWith('service:'))) {
    failures.push(fail('service-removed', 0, 'The service definition is gone', 'הגדרת השירות נמחקה'));
  }
  const i = lines.findIndex((l) => l.trimStart().startsWith('public:'));
  if (i === -1) {
    failures.push(fail('missing-public-key', 0, 'The "public" setting is missing', 'ההגדרה "public" חסרה'));
  } else if (!['false', 'no'].includes(unq(lines[i].split(':')[1] ?? '').toLowerCase())) {
    failures.push(fail('service-public', i + 1, 'An internal service is set to public', 'שירות פנימי מוגדר כציבורי'));
  }
  return result(failures);
}

const DIGEST = /@sha256:[a-f0-9]{64}$/;

export function checkPin(code) {
  const g = guard(code);
  if (g) return g;
  const lines = toLines(code, 'hash');
  const failures = [];
  const stages = new Set();
  let firstImage = '';
  lines.forEach((l, i) => {
    const t = l.trim().split(/\s+/).filter((x) => !x.startsWith('--'));
    if (t[0]?.toUpperCase() !== 'FROM' || !t[1]) return;
    const image = t[1];
    if (t[2]?.toUpperCase() === 'AS' && t[3]) stages.add(t[3].toLowerCase());
    if (image.toLowerCase() === 'scratch' || stages.has(image.toLowerCase())) return;
    firstImage ||= image;
    const slash = image.lastIndexOf('/');
    const colon = image.indexOf(':', slash + 1);
    const tag = colon === -1 ? '' : image.slice(colon + 1);
    if (!DIGEST.test(image) && !/^\d+\.\d+/.test(tag)) {
      failures.push(fail('unpinned-image', i + 1, `"${image}" is not pinned to a version`, `"${image}" לא נעוץ לגרסה`));
    }
  });
  if (!firstImage.startsWith('python')) {
    failures.push(fail('wrong-base', 0, 'The Python base image is missing', 'תמונת הבסיס של Python חסרה'));
  }
  return result(failures);
}
