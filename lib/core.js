'use strict';
// UOK_MUN API logic shared by the local server and the Vercel function. Developed by Datix AI.
const crypto = require('crypto');
const { read, mutate, secret, HttpError } = require('./store');

const KEYS = ['site', 'info', 'committees', 'schedule', 'news', 'regs', 'attendance', 'scores', 'sessions'];
const ENV_EMAIL = () => (process.env.ADMIN_EMAIL || '').toLowerCase();
const ENV_PASS = () => process.env.ADMIN_PASSWORD || '';

/* ---------- auth (stateless signed tokens, work on serverless) ---------- */
const b64 = b => Buffer.from(b).toString('base64url');
async function sign() {
  const p = b64(JSON.stringify({ exp: Date.now() + 12 * 3600e3 }));
  return p + '.' + crypto.createHmac('sha256', await secret()).update(p).digest('base64url');
}
async function verify(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', ''), [p, sig] = t.split('.');
  if (!p || !sig) return false;
  const ok = crypto.createHmac('sha256', await secret()).update(p).digest('base64url');
  if (ok.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(ok), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const safe = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const adminSet = st => !!((ENV_EMAIL() && ENV_PASS()) || st.admin);
function adminOk(st, email, pw) {
  if (ENV_EMAIL() && ENV_PASS()) return safe(email, ENV_EMAIL()) && safe(pw, ENV_PASS());
  const a = st.admin;
  return !!a && safe(email, a.email) && safe(hashPw(pw, a.salt), a.h);
}

/* ---------- rate limit (per instance) ---------- */
const hits = new Map();
function limited(req, bucket, max) {
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0];
  const k = bucket + ip, now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < 60e3);
  a.push(now); hits.set(k, a);
  if (hits.size > 5000) hits.clear();
  return a.length > max;
}

/* ---------- helpers ---------- */
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
function body(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return Promise.resolve(req.body ? JSON.parse(req.body) : {});
    if (Buffer.isBuffer(req.body)) return Promise.resolve(JSON.parse(req.body.toString() || '{}'));
    return Promise.resolve(req.body);
  }
  return new Promise((ok, no) => {
    let d = '', n = 0;
    req.on('data', c => { n += c.length; if (n > 4e6) { no(new HttpError(413, 'Too large')); req.destroy(); } else d += c; });
    req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { no(new HttpError(400, 'Bad JSON')); } });
  });
}
const clean = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const digits = s => String(s || '').replace(/\D/g, '');

function publicData(state) {
  const ap = state.regs.filter(r => r.status === 'approved'), byC = {};
  ap.forEach(r => { if (r.committee) byC[r.committee] = (byC[r.committee] || 0) + 1; });
  const out = { adminSet: adminSet(state), counts: { total: state.regs.length, approved: ap.length, byC } };
  if (state.site) out.site = state.site;
  if (state.info) out.info = state.info;
  if (state.committees) out.committees = state.committees.map(c => ({ ...c, countries: '' }));
  if (state.schedule) out.schedule = state.schedule;
  if (state.news) out.news = state.news;
  return out;
}

async function handle(req, res, route) {
  try {
    if (req.method === 'GET' && route === 'public') return send(res, 200, publicData(await read()));

    if (req.method === 'POST' && route === 'register') {
      if (limited(req, 'reg', 12)) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
      const d = await body(req);
      const r = { name: clean(d.name), uni: clean(d.uni), dept: clean(d.dept), email: clean(d.email).toLowerCase(), phone: clean(d.phone, 30),
        role: clean(d.role, 40), p1: clean(d.p1, 40), p2: clean(d.p2, 40), p3: clean(d.p3, 40), exp: Math.max(0, Math.min(99, +d.exp || 0)), why: clean(d.why, 500) };
      if (!r.name || !r.phone || !/^\S+@\S+\.\S+$/.test(r.email)) throw new HttpError(400, 'Please enter your name, a valid email and your phone number.');
      if (digits(r.phone).length < 7) throw new HttpError(400, 'Enter a valid phone number.');
      await mutate(st => {
        if (st.regs.some(x => x.email === r.email)) throw new HttpError(409, 'This email is already registered. Use My status to check it.');
        const max = st.regs.reduce((m, x) => Math.max(m, +String(x.id).slice(4) || 0), 0);
        Object.assign(r, { id: 'UOK-' + String(max + 1).padStart(4, '0'), status: 'pending', paid: false, committee: '', country: '', created: new Date().toISOString() });
        st.regs.push(r);
      });
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && route === 'status') {
      if (limited(req, 'st', 20)) throw new HttpError(429, 'Too many attempts.');
      const d = await body(req), st = await read();
      const r = st.regs.find(x => x.email === clean(d.email).toLowerCase() && digits(x.phone) === digits(d.phone));
      if (!r) throw new HttpError(404, 'No match. Check the email and phone number.');
      const c = (st.committees || []).find(x => x.id === r.committee);
      return send(res, 200, { name: r.name, status: r.status, paid: r.paid, committee: c ? c.name : '', country: r.country || '' });
    }

    if (req.method === 'POST' && (route === 'login' || route === 'setup')) {
      if (limited(req, 'login', 8)) throw new HttpError(429, 'Too many attempts. Wait a minute.');
      const d = await body(req), email = clean(d.email).toLowerCase(), pw = String(d.password || '');
      if (route === 'setup') {
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Enter a valid email.');
        if (pw.length < 8) throw new HttpError(400, 'Use at least 8 characters.');
        await mutate(st => {
          if (adminSet(st)) throw new HttpError(403, 'Admin account already exists.');
          const salt = crypto.randomBytes(16).toString('hex');
          st.admin = { email, salt, h: hashPw(pw, salt) };
        });
        return send(res, 200, { token: await sign() });
      }
      if (!adminOk(await read(), email, pw)) throw new HttpError(401, 'Wrong email or password.');
      return send(res, 200, { token: await sign() });
    }

    if (route === 'state') {
      if (!(await verify(req))) throw new HttpError(401, 'Login required.');
      if (req.method === 'GET') { const st = await read(), o = {}; KEYS.forEach(k => { if (st[k] !== undefined) o[k] = st[k]; }); return send(res, 200, o); }
      if (req.method === 'PUT') {
        const d = await body(req), s = d.state || {}, known = new Set(d.known || []);
        const regs = await mutate(st => {
          KEYS.forEach(k => { if (k !== 'regs' && s[k] !== undefined) st[k] = s[k]; });
          if (Array.isArray(s.regs)) st.regs = s.regs.concat(st.regs.filter(r => !known.has(r.id))); // keep registrations made while admin was editing
          return st.regs;
        });
        return send(res, 200, { regs });
      }
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    return send(res, e.status || 400, { error: e.message || 'Bad request' });
  }
}
module.exports = { handle };
