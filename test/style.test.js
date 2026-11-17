// Guards the design system: the look can only change through tokens.css,
// and the pages stay compatible with the strict CSP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const cssFiles = [...readdirSync(new URL('../styles/', import.meta.url)).map((f) => 'styles/' + f)];
const pages = ['index.html', '404.html'];

test('no hard-coded colors outside tokens.css', () => {
  for (const f of cssFiles.filter((x) => !x.endsWith('tokens.css') && !x.endsWith('fonts.css'))) {
    const hits = stripComments(read(f)).match(/#[0-9a-fA-F]{3,8}\b/g);
    assert.equal(hits, null, `${f}: ${hits}`);
  }
});

test('no durations or easings outside the motion tokens', () => {
  for (const f of cssFiles.filter((x) => !x.endsWith('tokens.css') && !x.endsWith('fonts.css'))) {
    const css = stripComments(read(f));
    // "0s" is allowed: it is the delay in the visibility trick.
    const raw = (css.match(/(?<![\w-])\d*\.?\d+m?s\b/g) ?? []).filter((x) => x !== '0s');
    assert.deepEqual(raw, [], `${f}: raw durations`);
    assert.ok(!/cubic-bezier|ease-in|ease-out|ease-in-out|transition:\s*all/.test(css), `${f}: easing outside tokens`);
  }
});

test('only transform, opacity and dashoffset are animated', () => {
  for (const f of ['styles/components.css', 'styles/screen.css']) {
    for (const m of stripComments(read(f)).matchAll(/@keyframes[^{]+\{([\s\S]*?)\}\s*\}/g)) {
      const props = [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
      for (const p of props) assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(p), `${f}: animates ${p}`);
    }
  }
});

test('no physical left/right properties (RTL safe), except LTR code panes', () => {
  for (const f of cssFiles) {
    const bad = stripComments(read(f)).split('\n').filter((l) => /(margin|padding|border)-(left|right)|\b(left|right)\s*:/.test(l) && !/direction: ltr/.test(l));
    assert.deepEqual(bad, [], f);
  }
});

test('pages: strict CSP present, no inline style, script or handler, no third-party URL', () => {
  for (const p of pages) {
    const html = read(p);
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /default-src 'none'/);
    assert.ok(!/\sstyle\s*=/.test(html), `${p}: inline style`);
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(html), `${p}: inline script`);
    assert.ok(!/\son[a-z]+\s*=/.test(html), `${p}: inline handler`);
    assert.deepEqual([...html.matchAll(/(?:href|src)="(https?:)?\/\/[^"]+"/g)].map((m) => m[0]), [], `${p}: external URL`);
  }
});

test('JS never uses innerHTML, eval or inline style assignment', () => {
  for (const f of readdirSync(new URL('../src/ui/', import.meta.url)).map((n) => 'src/ui/' + n)) {
    const js = read(f).replace(/\/\/.*$/gm, ''); // comments may mention the forbidden words
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function|\.style\.|setAttribute\(\s*['"]style/.test(js), f);
  }
});

test('fonts are self-hosted and licensed', () => {
  const css = read('styles/fonts.css');
  assert.ok(!/https?:/.test(css));
  assert.ok(readFileSync(new URL('../assets/fonts/OFL-Rubik.txt', import.meta.url), 'utf8').includes('SIL Open Font License'));
});
