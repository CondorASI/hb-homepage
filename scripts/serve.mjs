// Tiny static server for dist/ (used by screenshots + lighthouse). Exports start(port) => Promise<server>.
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

export function start(port, root = 'dist') {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(root, p);
    try {
      const s = await stat(file);
      const body = await readFile(s.isDirectory() ? join(file, 'index.html') : file);
      const type = types[extname(file)] ?? 'application/octet-stream';
      const compress = /^(text\/|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=31536000', ...(compress ? { 'content-encoding': 'gzip' } : {}) });
      res.end(compress ? gzipSync(body) : body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1].endsWith('serve.mjs') && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const port = Number(process.argv[2] ?? 4321);
  await start(port);
  console.log(`serving dist/ on http://127.0.0.1:${port}`);
}
