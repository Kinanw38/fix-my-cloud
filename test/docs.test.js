// Docs, privacy scan and the published site stay honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allLevels } from '../src/levels/index.js';
import { scanText } from '../scripts/privacy-check.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('every real-world source is listed in docs/incident-sources.md', () => {
  const doc = read('docs/incident-sources.md');
  for (const l of allLevels) for (const e of l.realWorld ?? []) for (const s of e.sources) assert.ok(doc.includes(s.url), s.url);
});

test('privacy scan flags personal data and allows documentation values', () => {
  // The bad samples are assembled here, so they never exist as text in the repository.
  const bad = [
    ['mail me at ', 'someone', '@', 'gmail.com'].join(''),
    ['server ', ['10', '1', '2', '3'].join('.')].join(''),
    ['path ', '/home/', 'someone', '/project'].join(''),
    ['C:', '\\Users\\', 'Someone', '\\x'].join(''),
    ['call +1 555 ', '123 4567'].join(''),
    ['arn:aws:iam::', '210987654321', ':role/x'].join(''),
  ];
  for (const text of bad) assert.ok(scanText(text, 't.txt').hits.length > 0, text);
  const good = ['user@example.com', '203.0.113.7 and 198.51.100.0/24 and 192.0.2.1', '0.0.0.0/0 and 127.0.0.1 and 169.254.169.254', 'arn:aws:iam::123456789012:role/x', 'version 4.14.0'];
  for (const text of good) assert.deepEqual(scanText(text, 't.txt').hits, [], text);
});

test('the repository passes its own privacy scan', () => {
  const out = execFileSync('node', ['scripts/privacy-check.mjs'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.match(out, /0 problem/);
});

test('the built site contains only what visitors need', () => {
  const out = mkdtempSync(join(tmpdir(), 'fmc-site-'));
  execFileSync('node', ['scripts/build-site.mjs'], { cwd: new URL('..', import.meta.url), env: { ...process.env, OUT: out } });
  const top = readdirSync(out);
  for (const need of ['index.html', '404.html', 'styles', 'src', 'assets', 'LICENSE', '.nojekyll']) assert.ok(top.includes(need), need);
  for (const never of ['test', 'e2e', 'scripts', 'node_modules', 'internal', 'package.json', '.github']) assert.ok(!top.includes(never), never);
  assert.ok(existsSync(join(out, 'docs/media/og.png')));
});

test('workflows use least privilege and the deploy waits for tests and verifies the live site', () => {
  const ci = read('.github/workflows/ci.yml'); const pages = read('.github/workflows/pages.yml');
  assert.match(ci, /permissions:\s*\n\s+contents: read/);
  assert.match(pages, /needs: test/); assert.match(pages, /needs: deploy/); assert.match(pages, /concurrency:/);
  assert.match(pages, /pages: write/); assert.match(pages, /id-token: write/);
  for (const w of [ci, pages]) { assert.ok(!/docker|terraform|trivy/i.test(w)); assert.ok(/npm ci/.test(w)); }
});

test('nothing for post-launch features exists in the repo text', () => {
  for (const f of ['README.md', 'docs/HOW_IT_WORKS.md', 'docs/ADD_A_LEVEL.md', 'index.html', 'package.json']) {
    assert.ok(!/dockerfile|docker-compose|terraform\/secure|trivy|daily incident/i.test(read(f)), f);
  }
});
