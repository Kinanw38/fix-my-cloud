// Every translation key used by the UI code or by index.html exists in both languages,
// the level list stays in sync, and the public address is configured in one place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import en from '../src/i18n/en.js';
import he from '../src/i18n/he.js';
import { manifest } from '../src/levels/manifest.js';
import { allLevels } from '../src/levels/index.js';
import { SITE_URL } from '../src/config.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const uiFiles = readdirSync(new URL('../src/ui/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'src/ui/' + f);

test('every translation key used in the UI exists in English and Hebrew', () => {
  const used = new Set();
  for (const f of uiFiles) {
    const s = read(f);
    for (const re of [/\bt\('([\w.]+)'/g, /key: '([a-z]+\.[\w.]+)'/g, /log\('([a-z]+\.[\w.]+)'/g, /\? '([a-z]+\.[\w]+)' : '([a-z]+\.[\w]+)'/g]) {
      for (const m of s.matchAll(re)) m.slice(1).filter(Boolean).forEach((k) => used.add(k));
    }
  }
  for (const m of read('index.html').matchAll(/data-t(?:-label)?="([^"]+)"/g)) used.add(m[1]);
  for (const n of [1, 2, 3]) used.add(`lesson.${n}`);
  used.add('stage.1'); used.add('stage.3');
  for (const r of ['rookie', 'quiet', 'runbook']) used.add(`rank.${r}`);
  for (const d of ['easy', 'medium', 'hard']) used.add(`diff.${d}`);
  for (const k of [...used].filter((x) => !x.endsWith('.'))) { // keys ending in a dot are built dynamically (checked above)
    assert.ok(k in en, `missing in en: ${k}`);
    assert.ok(k in he, `missing in he: ${k}`);
  }
  assert.ok(used.size > 100);
});

test('placeholders match between languages', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const k of Object.keys(en)) assert.equal(ph(en[k]), ph(he[k]), k);
});

test('the manifest lists exactly the levels that exist', () => {
  assert.deepEqual(manifest.map((m) => m.id), allLevels.map((l) => l.id));
  for (const m of manifest) assert.ok(readFileSync(new URL('../src/levels/' + m.file, import.meta.url)), m.file);
});

test('the public address is the same in config.js and index.html', () => {
  const html = read('index.html');
  assert.match(html, new RegExp(`og:url" content="${SITE_URL.replace(/[.]/g, '\\.')}"`));
  assert.match(html, new RegExp(`og:image" content="${SITE_URL.replace(/[.]/g, '\\.')}docs/media/og.png"`));
});

test('the page has the link-preview tags', () => {
  const html = read('index.html');
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'name="description"', 'name="theme-color"', 'rel="icon"']) assert.ok(html.includes(tag), tag);
});
