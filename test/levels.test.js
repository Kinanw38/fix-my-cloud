import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allLevels } from '../src/levels/index.js';
import { validateLevel } from '../src/levels/schema.js';
import { applyChoice } from '../src/lib/choices.js';
import { MAX_INPUT } from '../src/rules/common.js';
import { fixtures } from './fixtures.js';

const ids = (r) => r.failures.map((f) => f.ruleId);

for (const level of allLevels) {
  const fx = fixtures[level.id];

  test(`${level.id}: schema`, () => {
    assert.deepEqual(validateLevel(level), []);
    assert.ok(fx, 'fixtures exist');
  });

  test(`${level.id}: vulnerable code fails with the expected rules`, () => {
    const r = level.check(level.vulnerableCode);
    assert.equal(r.passed, false);
    for (const id of fx.expected) assert.ok(ids(r).includes(id), `missing ${id}, got ${ids(r)}`);
    for (const f of r.failures) assert.ok(f.message.en && f.message.he);
  });

  test(`${level.id}: reference fix passes`, () => {
    const r = level.check(level.fix);
    assert.deepEqual(ids(r), []);
    assert.equal(r.passed, true);
  });

  test(`${level.id}: alternative valid fixes pass`, () => {
    assert.ok(fx.alternatives.length >= 2);
    fx.alternatives.forEach((code, i) => {
      const r = level.check(code);
      assert.equal(r.passed, true, `alternative ${i}: ${JSON.stringify(r.failures)}`);
    });
  });

  test(`${level.id}: empty, garbage and deleted-everything fail`, () => {
    const bad = ['', '   \n  ', '}}}{{{ ;;; !!!', '# everything was deleted', 'null', '{}', 'resource', 'a'.repeat(MAX_INPUT + 1)];
    for (const code of bad) assert.equal(level.check(code).passed, false, JSON.stringify(code.slice(0, 20)));
    assert.equal(level.check(undefined).passed, false);
    assert.equal(level.check(42).passed, false);
  });

  test(`${level.id}: line numbers point at real lines`, () => {
    const total = level.vulnerableCode.split('\n').length;
    for (const f of level.check(level.vulnerableCode).failures) {
      if (f.line) assert.ok(f.line >= 1 && f.line <= total);
    }
  });

  test(`${level.id}: Tap mode, every order and every good option passes`, () => {
    const groups = level.choices;
    const orders = permutations(groups.map((_, i) => i));
    const combos = cartesian(groups.map((g) => g.options.filter((o) => o.good)));
    for (const combo of combos) {
      for (const order of orders) {
        let code = level.vulnerableCode;
        for (const gi of order) {
          code = applyChoice(code, combo[gi]);
          assert.notEqual(code, null, `anchor not found for ${groups[gi].id}`);
        }
        const r = level.check(code);
        assert.equal(r.passed, true, `order ${order}: ${JSON.stringify(r.failures)}`);
      }
    }
  });

  test(`${level.id}: Tap mode, every bad option still fails with its rule`, () => {
    for (const g of level.choices) {
      for (const bad of g.options.filter((o) => !o.good)) {
        const r = level.check(applyChoice(level.vulnerableCode, bad));
        assert.equal(r.passed, false, `${g.id}/${bad.id} should fail`);
        assert.ok(ids(r).some((id) => g.ruleIds.includes(id)), `${g.id}/${bad.id} should show ${g.ruleIds}, got ${ids(r)}`);
      }
    }
  });
}

test('level ids and incident ids are unique', () => {
  assert.equal(new Set(allLevels.map((l) => l.id)).size, allLevels.length);
  const inc = allLevels.map((l) => l.incidentId).filter(Boolean);
  assert.equal(new Set(inc).size, inc.length);
  assert.equal(inc.length, 6);
});

test('rules finish fast on adversarial input (ReDoS)', () => {
  const n = MAX_INPUT;
  const inputs = [
    'a'.repeat(n),
    ' '.repeat(n - 1) + 'x',
    '{'.repeat(n),
    '"'.repeat(n),
    'key = '.repeat(Math.floor(n / 6)),
    'a="'.repeat(Math.floor(n / 3)),
    'run: |\n'.repeat(Math.floor(n / 7)),
    '${{ '.repeat(Math.floor(n / 4)),
    'aws_secret_access_key' + ' '.repeat(n - 30) + '=',
    'FROM ' + 'a:'.repeat(Math.floor(n / 2) - 3),
    'resource "aws_security_group" "x" {\ningress {\n'.repeat(Math.floor(n / 40)),
    '/*'.repeat(n / 2),
    '#'.repeat(n),
    '\n'.repeat(n),
  ];
  for (const level of allLevels) {
    for (const code of inputs) {
      const t0 = performance.now();
      level.check(code);
      const ms = performance.now() - t0;
      assert.ok(ms < 100, `${level.id} took ${ms.toFixed(0)}ms on ${JSON.stringify(code.slice(0, 12))}`);
    }
  }
});

function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}
function cartesian(lists) {
  return lists.reduce((acc, list) => acc.flatMap((a) => list.map((x) => [...a, x])), [[]]);
}
