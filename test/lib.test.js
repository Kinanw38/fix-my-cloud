import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelScore, rankFor } from '../src/lib/score.js';
import { buildRun } from '../src/lib/shuffle.js';
import { diffLines } from '../src/lib/diff.js';
import { visibleRealWorld } from '../src/lib/realworld.js';
import { allLevels, pack1 } from '../src/levels/index.js';

test('score formula', () => {
  assert.equal(levelScore({ maxTier: 0, seconds: 0 }), 100);
  assert.equal(levelScore({ maxTier: 0, seconds: 60 }), 100);
  assert.equal(levelScore({ maxTier: 0, seconds: 70 }), 99);
  assert.equal(levelScore({ maxTier: 2, seconds: 0 }), 80);
  assert.equal(levelScore({ maxTier: 3, seconds: 100 }), 66);
  assert.equal(levelScore({ maxTier: 3, seconds: 99999 }), 20);
});

test('rank thresholds', () => {
  assert.equal(rankFor(600), 'runbook');
  assert.equal(rankFor(480), 'runbook');
  assert.equal(rankFor(479), 'quiet');
  assert.equal(rankFor(300), 'quiet');
  assert.equal(rankFor(299), 'rookie');
  assert.equal(rankFor(0), 'rookie');
});

test('seeded shuffle: same seed, same run', () => {
  for (const mode of ['easy', 'full']) {
    assert.deepEqual(buildRun(allLevels, mode, 42), buildRun(allLevels, mode, 42));
  }
  const runs = new Set(Array.from({ length: 30 }, (_, s) => buildRun(allLevels, 'easy', s).join()));
  assert.ok(runs.size > 1, 'different seeds give different runs');
});

test('shuffle: only incident levels, 5 per run, ramp and easy mix are right', () => {
  const byId = Object.fromEntries(allLevels.map((l) => [l.id, l]));
  const order = { easy: 0, medium: 1, hard: 2 };
  for (let seed = 0; seed < 50; seed++) {
    const easy = buildRun(allLevels, 'easy', seed);
    assert.equal(easy.length, 5);
    assert.ok(easy.every((id) => byId[id].incidentId && byId[id].difficulty !== 'hard'));
    const full = buildRun(allLevels, 'full', seed);
    assert.equal(full.length, 5);
    assert.equal(new Set(full).size, 5);
    const d = full.map((id) => order[byId[id].difficulty]);
    assert.deepEqual(d, [...d].sort((a, b) => a - b));
  }
});

test('diff', () => {
  assert.deepEqual(diffLines('a\nb\nc', 'a\nB\nc'), [
    { type: 'same', text: 'a' },
    { type: 'del', text: 'b' },
    { type: 'add', text: 'B' },
    { type: 'same', text: 'c' },
  ]);
  assert.deepEqual(diffLines('a', 'a').map((x) => x.type), ['same']);
  const l = pack1[0];
  const types = diffLines(l.vulnerableCode, l.fix).map((x) => x.type);
  assert.ok(types.includes('add') || types.includes('del'));
  // Huge input falls back instead of building a giant table.
  const big = Array.from({ length: 3000 }, (_, i) => `l${i}`).join('\n');
  assert.ok(diffLines(big, big + 'x').length > 0);
});

test('every real-world source has an https url and a verified flag, all start unverified', () => {
  for (const l of allLevels) {
    for (const e of l.realWorld ?? []) {
      assert.ok(e.sources.length > 0);
      for (const s of e.sources) {
        assert.match(s.url, /^https:\/\//);
        assert.equal(typeof s.verified, 'boolean');
        assert.equal(s.verified, false, `${l.id}: flip to true only after the maintainer verifies it`);
      }
    }
  }
});

test('unverified sources never reach the card data', () => {
  for (const l of allLevels) {
    const v = visibleRealWorld(l);
    assert.equal(v.mode, 'pattern');
    assert.deepEqual(v.entries, []);
    assert.ok(!JSON.stringify(v).includes('http'));
  }
});

test('once a source is verified, only verified links show', () => {
  const l = { ...pack1[3], realWorld: structuredClone(pack1[3].realWorld) };
  l.realWorld[0].sources[0].verified = true;
  const v = visibleRealWorld(l);
  assert.equal(v.mode, 'verified');
  assert.equal(v.entries.length, 1);
  assert.equal(v.entries[0].sources.length, 1);
  assert.ok(v.entries[0].sources.every((s) => s.verified));
});
