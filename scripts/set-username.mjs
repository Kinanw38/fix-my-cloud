// Replaces the placeholder YOUR-USERNAME with your GitHub username everywhere it is used (links and link previews).
// Usage: npm run set-username -- your-github-name
// A GitHub username has only letters, digits and hyphens. No spaces, no Hebrew.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const name = process.argv[2];
if (!name || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(name)) {
  console.error('Give a GitHub username: letters, digits and hyphens only (no spaces).\nExample: npm run set-username -- my-name');
  process.exit(1);
}
const root = fileURLToPath(new URL('..', import.meta.url));
let total = 0;
for (const f of ['README.md', 'index.html', 'src/config.js']) {
  const path = root + f; const text = readFileSync(path, 'utf8');
  const count = text.split('YOUR-USERNAME').length - 1;
  if (count) writeFileSync(path, text.replaceAll('YOUR-USERNAME', name));
  total += count; console.log(`${f}: ${count} replaced`);
}
console.log(total ? `Done. ${total} places now use "${name}".` : 'Nothing to replace. The placeholder is already gone.');
