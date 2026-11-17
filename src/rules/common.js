// Shared helpers for the rules engine. Pure functions, no DOM.
// Parsing is line based and tolerant on purpose. No regex here has a
// nested quantifier, and user text is never matched with a trailing
// `\s*$`-style pattern, so adversarial input stays linear.

export const MAX_INPUT = 20000;

export const fail = (ruleId, line, en, he) => ({
  ruleId,
  ...(line ? { line } : {}),
  message: { en, he },
});

export const result = (failures) => ({ passed: failures.length === 0, failures });

// Returns a ready failure result for empty or oversized input, else null.
export function guard(code) {
  if (typeof code !== 'string' || code.trim() === '') {
    return result([fail('input-empty', 0, 'Nothing to check yet.', 'אין עדיין מה לבדוק.')]);
  }
  if (code.length > MAX_INPUT) {
    return result([
      fail('input-too-large', 0, 'Code is too long to check (limit 20,000 characters).', 'הקוד ארוך מדי לבדיקה (עד 20,000 תווים).'),
    ]);
  }
  return null;
}

// Removes comments but keeps every newline, so line numbers stay true.
// mode "hcl": # // and /* */. mode "hash": # only, and only after whitespace.
export function stripComments(text, mode = 'hash') {
  const hcl = mode === 'hcl';
  let out = '';
  let inBlock = false;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '\n') { out += c; quote = ''; continue; }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; i++; }
      continue;
    }
    if (quote) {
      out += c;
      if (c === '\\' && n !== undefined && n !== '\n') { out += n; i++; }
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || (c === "'" && !/\w/.test(text[i - 1] ?? ' '))) { quote = c; out += c; continue; }
    if (hcl && c === '/' && n === '*') { inBlock = true; i++; continue; }
    const lineComment = c === '#'
      ? hcl || i === 0 || /\s/.test(text[i - 1])
      : hcl && c === '/' && n === '/';
    if (lineComment) {
      while (i + 1 < text.length && text[i + 1] !== '\n') i++;
      continue;
    }
    out += c;
  }
  return out;
}

export const toLines = (text, mode) =>
  stripComments(text.replace(/\r\n?/g, '\n'), mode).split('\n');

// "key = value" -> [key, value] or null. Rejects "==".
export function kv(line) {
  const i = line.indexOf('=');
  if (i < 1 || line[i + 1] === '=') return null;
  const key = line.slice(0, i).trim();
  if (!/^[A-Za-z_][\w.-]*$/.test(key)) return null;
  return [key, line.slice(i + 1).trim()];
}

// Strips surrounding quotes, spaces and a trailing comma.
export function unq(v) {
  const junk = '"\', \t';
  let s = 0;
  let e = v.length;
  while (s < e && junk.includes(v[s])) s++;
  while (e > s && junk.includes(v[e - 1])) e--;
  return v.slice(s, e);
}

export const strings = (raw) => [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]);

function braceDelta(line) {
  let d = 0;
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\') { i++; continue; }
    if (c === '"') q = !q;
    else if (!q) { if (c === '{') d++; else if (c === '}') d--; }
  }
  return d;
}

// Finds blocks whose first line matches headRe (which must include the "{").
// Tolerant: an unclosed block runs to the end of the range.
export function findBlocks(lines, headRe, from = 0, to = lines.length) {
  const blocks = [];
  for (let i = from; i < to; i++) {
    if (!headRe.test(lines[i])) continue;
    let depth = 0;
    let j = i;
    for (; j < to; j++) {
      depth += braceDelta(lines[j]);
      if (depth <= 0) break;
    }
    blocks.push({ start: i, end: Math.min(j, to - 1) });
    i = Math.min(j, to - 1);
  }
  return blocks;
}

// Collects "key = value" pairs in a line range. Multi-line lists are joined.
export function attrsOf(lines, start, end) {
  const map = new Map();
  for (let i = start; i <= end && i < lines.length; i++) {
    const p = kv(lines[i]);
    if (!p) continue;
    const [key, first] = p;
    let raw = first;
    let j = i;
    if (raw.startsWith('[')) {
      while (!raw.includes(']') && j + 1 <= end) { j++; raw += ' ' + lines[j].trim(); }
    }
    if (!map.has(key)) map.set(key, { raw, value: unq(raw), values: strings(raw), line: i + 1 });
    i = j;
  }
  return map;
}
