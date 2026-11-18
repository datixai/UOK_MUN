import { revalidatePath } from 'next/cache';
import { handle, photo } from '../../../lib/core';

export const dynamic = 'force-dynamic';
const MAX_BODY = 4_500_000; // bytes
const J = { 'content-type': 'application/json' };

// Adapts the Next.js Request to the shared handler in lib/core.js.
async function run(request, { params }) {
  const route = String(params.route || '').slice(0, 40);

  if (request.method === 'GET' && route === 'photo') { // inline pictures, cached by the browser and the CDN
    const q = Object.fromEntries(new URL(request.url).searchParams);
    const p = await photo({ m: String(q.m || '').slice(0, 80), c: String(q.c || '').slice(0, 80), t: String(q.t || '').slice(0, 40) }).catch(() => null);
    if (!p) return new Response('Not found', { status: 404 });
    return new Response(p.buf, { headers: { 'content-type': p.type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
  }

  let body;
  if (request.method !== 'GET') {
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response('{"error":"Too large"}', { status: 413, headers: J });
    try { body = text ? JSON.parse(text) : {}; } catch (e) { return new Response('{"error":"Bad JSON"}', { status: 400, headers: J }); }
  }
  const req = { method: request.method, headers: Object.fromEntries(request.headers), body, socket: {} };
  let out = '{}';
  const res = { statusCode: 200, setHeader() {}, end(s) { out = s; } };
  await handle(req, res, route);
  if (request.method === 'PUT' && route === 'state' && res.statusCode === 200) { // the admin saved: refresh the public pages now
    revalidatePath('/', 'layout');
  }
  return new Response(out, { status: res.statusCode, headers: { ...J, 'cache-control': 'no-store' } });
}
export { run as GET, run as POST, run as PUT };
