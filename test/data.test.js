import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import he from '../src/i18n/he.js';
import { glossary } from '../src/data/glossary.js';

test('every i18n key exists in both languages and is not empty', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(he).sort());
  for (const [k, v] of [...Object.entries(en), ...Object.entries(he)]) {
    assert.ok(typeof v === 'string' && v.trim(), k);
  }
});

test('no exclamation marks and no emoji in UI strings', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const v of [...Object.values(en), ...Object.values(he)]) {
    assert.ok(!v.includes('!'), v);
    assert.ok(!emoji.test(v), v);
  }
});

test('every glossary term exists in both languages', () => {
  for (const [id, t] of Object.entries(glossary)) {
    for (const lang of ['en', 'he']) {
      assert.ok(t[lang]?.term && t[lang]?.def, `${id}.${lang}`);
    }
  }
});
