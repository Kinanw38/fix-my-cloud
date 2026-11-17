// Copies only what visitors need into _site/ (or OUT). Tests, e2e, scripts, docs and dev files never ship.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.env.OUT ?? join(root, '_site');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
for (const item of ['index.html', '404.html', 'styles', 'src', 'assets', 'LICENSE', 'NOTICE.md']) cpSync(join(root, item), join(out, item), { recursive: true });
if (existsSync(join(root, 'docs/media/og.png'))) { mkdirSync(join(out, 'docs/media'), { recursive: true }); cpSync(join(root, 'docs/media/og.png'), join(out, 'docs/media/og.png')); }
writeFileSync(join(out, '.nojekyll'), ''); // GitHub Pages: serve files as they are
console.log(`site built in ${out}`);
