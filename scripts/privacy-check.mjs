// Privacy scan. Fails when tracked files contain personal-looking data: a real email, an IP outside the
// documentation ranges, a home-directory path, a phone-like number, or an AWS account id other than the placeholder.
// Legitimate false positives go in scripts/privacy-allow.json as { file, pattern, reason }, where pattern is the exact
// matched text. Every allowed match is printed, so nothing is hidden.
// An OPTIONAL local-only internal/denylist.txt (gitignored) can add extra strings to block.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRS = new Set(['.git', 'node_modules', 'internal', 'test-results', 'playwright-report', '_site']);
const SKIP_FILES = new Set(['package-lock.json', 'privacy-allow.json']); // the allow-list holds the exact allowed samples
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.zip', '.pdf']);
const DOC_NETS = [[203, 0, 113], [198, 51, 100], [192, 0, 2]];
const IP_OK = new Set(['127.0.0.1', '0.0.0.0', '169.254.169.254']);

export const RULES = [
  { id: 'email', re: /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g, bad: (m) => !/@(([a-z0-9-]+\.)*)example\.(com|org|net)$/i.test(m[0]) },
  { id: 'ipv4', re: /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g, bad: (m) => {
    if (IP_OK.has(m[0])) return false;
    const n = m.slice(1, 5).map(Number); if (n.some((x) => x > 255)) return false; // not an IP (a version number, for example)
    return !DOC_NETS.some((d) => d.every((x, i) => x === n[i]));
  } },
  { id: 'home-path', re: /(\/home\/[A-Za-z0-9._-]+\/|\/Users\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/g, bad: () => true },
  { id: 'phone', re: /(\+\d[\d -]{8,}\d|\(\d{3}\) \d{3}-\d{4}|\b0\d{1,2}-\d{7}\b)/g, bad: () => true },
  { id: 'aws-account', re: /(arn:aws[\w-]*:[\w-]*:[\w-]*:|account[_ -]?id\W{1,4})(\d{12})\b/gi, bad: (m) => m[2] !== '123456789012' },
];

export function scanText(text, file, allow = []) {
  const hits = []; const allowed = [];
  text.split('\n').forEach((line, i) => {
    for (const r of RULES) {
      for (const m of line.matchAll(r.re)) {
        if (!r.bad(m)) continue;
        const entry = { file, line: i + 1, rule: r.id, match: m[0] };
        const ok = allow.find((a) => a.file === file && a.pattern === m[0]);
        (ok ? allowed : hits).push(ok ? { ...entry, reason: ok.reason } : entry);
      }
    }
  });
  return { hits, allowed };
}

function listFiles() {
  try { // tracked files when this is a git repo
    const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean);
  } catch { /* not a git repo yet: walk the folder */ }
  const out = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name); statSync(p).isDirectory() ? walk(p) : out.push(relative(root, p));
  } };
  walk(root); return out;
}

export function run() {
  const allow = existsSync(join(root, 'scripts/privacy-allow.json')) ? JSON.parse(readFileSync(join(root, 'scripts/privacy-allow.json'), 'utf8')) : [];
  const deny = existsSync(join(root, 'internal/denylist.txt')) ? readFileSync(join(root, 'internal/denylist.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const hits = []; const allowed = []; let scanned = 0;
  for (const f of listFiles().map((x) => x.replaceAll('\\', '/'))) {
    if (f.split('/').some((p) => SKIP_DIRS.has(p)) || SKIP_FILES.has(f.split('/').pop()) || BINARY.has(extname(f).toLowerCase())) continue;
    let text; try { text = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue; // binary
    scanned++;
    const r = scanText(text, f, allow); hits.push(...r.hits); allowed.push(...r.allowed);
    for (const d of deny) if (text.toLowerCase().includes(d.toLowerCase())) hits.push({ file: f, line: 0, rule: 'denylist', match: '(a string from internal/denylist.txt)' });
  }
  for (const a of allowed) console.log(`allowed  ${a.file}:${a.line} [${a.rule}] ${a.match}  (${a.reason})`);
  for (const h of hits) console.log(`FOUND    ${h.file}:${h.line} [${h.rule}] ${h.match}`);
  console.log(`privacy check: ${scanned} files scanned, ${hits.length} problem(s), ${allowed.length} allowed match(es)${deny.length ? ', local denylist used' : ''}`);
  return hits.length === 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(run() ? 0 : 1);
