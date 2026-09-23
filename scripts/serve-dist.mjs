/**
 * Serve dist/ the way GitHub Pages does, for Playwright and Lighthouse.
 *
 * `astro preview` in Astro 7 is a singleton daemon, which a test runner cannot own or
 * stop cleanly. This is a dependency-free static server with Pages' exact resolution
 * rules: /path -> /path/index.html, unknown paths -> 404.html with status 404.
 *
 *   node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../dist');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4322);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

async function resolveFile(pathname) {
  // Reject traversal before touching the filesystem.
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const target = join(ROOT, rel);
  if (!target.startsWith(ROOT)) return null;

  try {
    const s = await stat(target);
    if (s.isFile()) return target;
    if (s.isDirectory()) {
      const index = join(target, 'index.html');
      await stat(index);
      return index;
    }
  } catch {
    try {
      const html = `${target}.html`;
      await stat(html);
      return html;
    } catch {
      return null;
    }
  }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const file = await resolveFile(url.pathname);

  if (!file) {
    const notFound = join(ROOT, '404.html');
    try {
      await stat(notFound);
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      createReadStream(notFound).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('404');
    }
    return;
  }

  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving dist/ on http://127.0.0.1:${PORT}`);
});
