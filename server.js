'use strict';
// UOK_MUN local server (static files + API). On Vercel the API runs from api/[route].js instead.
// Developed by Datix AI.
const http = require('http'), fs = require('fs'), path = require('path');
for (const f of ['.env.local', '.env']) { // tiny .env loader, no dependency
  try {
    fs.readFileSync(path.join(__dirname, f), 'utf8').split(/\r?\n/).forEach(l => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    });
  } catch (e) { /* file not present */ }
}
const { handle } = require('./lib/core');
const { useFirebase } = require('./lib/store');
const PORT = +process.env.PORT || 3000, PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (p.startsWith('/api/')) return handle(req, res, p.slice(5));
  const file = path.join(PUB, (p === '/' || p === '/uokmunadmin') ? 'index.html' : p);
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`UOK_MUN running on http://localhost:${PORT} | storage: ${useFirebase() ? 'Firebase Firestore' : 'local file'} | Developed by Datix AI`));
