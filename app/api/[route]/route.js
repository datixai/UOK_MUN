import { handle } from '../../../lib/core';

export const dynamic = 'force-dynamic';

// Adapts the Next.js Request to the shared handler in lib/core.js.
async function run(request, { params }) {
  let body;
  if (request.method !== 'GET') { try { body = await request.json(); } catch (e) { body = {}; } }
  const req = { method: request.method, headers: Object.fromEntries(request.headers), body, socket: {} };
  let out = '{}';
  const res = { statusCode: 200, setHeader() {}, end(s) { out = s; } };
  await handle(req, res, params.route);
  return new Response(out, { status: res.statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
export { run as GET, run as POST, run as PUT };
