// A tiny static server with Node built-ins only. It can serve the site under a subpath, like GitHub Pages does
// (BASE=/fix-my-cloud/ PORT=4173 node scripts/serve.mjs). Never serves .git, node_modules or internal/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT ?? 8000);
const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

async function send(res, file, status = 200) {
  const body = await readFile(file);
  res.writeHead(status, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(base)) throw new Error('outside base');
    let rel = path.slice(base.length); if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root) || /(^|[\\/])(\.git|node_modules|internal)([\\/]|$)/.test(rel)) throw new Error('blocked');
    await send(res, file);
  } catch {
    try { await send(res, join(root, '404.html'), 404); } catch { res.writeHead(404); res.end('Not found'); }
  }
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${base}`));
