'use strict';
// UOK_MUN API logic shared by the Next.js route and any other runner. Developed by Datix AI.
const crypto = require('crypto');
const { read, mutate, secret, saveImage, HttpError } = require('./store');

const KEYS = ['site', 'info', 'committees', 'schedule', 'news', 'regs', 'members', 'attendance', 'scores', 'sessions'];
const ROLES = ['Delegate', 'Chair', 'Vice Chair', 'Rapporteur', 'Secretary'];
const ENV_EMAIL = () => (process.env.ADMIN_EMAIL || '').toLowerCase();
const ENV_PASS = () => process.env.ADMIN_PASSWORD || '';
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/* ---------- tokens: stateless, signed, tied to the current password so a change logs everyone out ---------- */
const b64 = b => Buffer.from(b).toString('base64url');
async function sign(extra) {
  const p = b64(JSON.stringify({ exp: Date.now() + 12 * 3600e3, ...extra }));
  return p + '.' + crypto.createHmac('sha256', await secret()).update(p).digest('base64url');
}
async function verify(req) { // returns the token payload, or null
  const t = String(req.headers.authorization || '').replace(/^Bearer /, ''), [p, sig] = t.split('.');
  if (!p || !sig) return null;
  const ok = crypto.createHmac('sha256', await secret()).update(p).digest('base64url');
  if (ok.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(ok), Buffer.from(sig))) return null;
  try { const j = JSON.parse(Buffer.from(p, 'base64url').toString()); return j.exp > Date.now() ? j : null; } catch (e) { return null; }
}
const adminVer = st => (ENV_EMAIL() && ENV_PASS() ? 'env' : st.admin ? st.admin.h.slice(0, 16) : 'none');
const memberVer = m => (m.pw ? m.pw.h.slice(0, 16) : 'none');
async function needAdmin(req) {
  const p = await verify(req);
  if (!p || p.role !== 'admin' || p.v !== adminVer(await read())) throw new HttpError(401, 'Login required.');
}

const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const safe = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const makePw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return { salt, h: hashPw(pw, salt) }; };
const DUMMY = makePw('dummy-password-for-timing');
const adminSet = st => !!((ENV_EMAIL() && ENV_PASS()) || st.admin);
function adminOk(st, email, pw) {
  if (ENV_EMAIL() && ENV_PASS()) return safe(email, ENV_EMAIL()) & safe(pw, ENV_PASS()) ? true : false;
  const a = st.admin, rec = a || DUMMY;
  const hashOk = safe(hashPw(pw, rec.salt), rec.h); // always hash, so timing does not reveal whether the account exists
  return !!a && safe(email, a.email) && hashOk;
}

/* ---------- rate limit (per server instance) ---------- */
const hits = new Map();
function limited(req, bucket, max) {
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const k = bucket + ip, now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < 60e3);
  a.push(now); hits.set(k, a);
  if (hits.size > 5000) hits.clear();
  return a.length > max;
}

/* ---------- input helpers ---------- */
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
const clean = (v, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const cleanText = (v, n = 1000) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\r/g, '').slice(0, n);
const digits = s => String(s || '').replace(/\D/g, '');
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const bool = v => v === true;
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
const idOf = v => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
const imgOk = v => v === '' || /^https:\/\/[^\s"'<>\\]{1,1500}$/.test(v) || /^\/[A-Za-z0-9/_.-]{1,200}$/.test(v) || (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 80000);
const img = v => { v = String(v ?? ''); return imgOk(v) ? v : ''; };
const small = (v, max) => { const j = JSON.stringify(v ?? {}); if (j.length > max) throw new HttpError(413, 'Data section is too large.'); return JSON.parse(j); };

// Everything the admin sends is rebuilt field by field: unknown keys are dropped, types and lengths are enforced.
const SITE_BOOL = ['showCountdown', 'showStats', 'showVenue', 'showSeats', 'showNews', 'showHow', 'showCommittees', 'showAgendas', 'showSchedule', 'showStatus', 'regOpen', 'showChairs', 'showContact'];
const SANITIZE = {
  site: s => {
    if (!isObj(s)) throw new HttpError(400, 'Invalid site settings.');
    const o = { tagline: clean(s.tagline, 120), cta: clean(s.cta, 60), closedMsg: clean(s.closedMsg, 300), regNote: clean(s.regNote, 300), email: clean(s.email, 120) };
    SITE_BOOL.forEach(k => { o[k] = bool(s[k]); });
    o.contacts = (Array.isArray(s.contacts) ? s.contacts : []).slice(0, 10).map(c => ({ name: clean(c && c.name, 80), role: clean(c && c.role, 120), phone: clean(c && c.phone, 30) }));
    return o;
  },
  info: s => {
    if (!isObj(s)) throw new HttpError(400, 'Invalid event details.');
    return { date: /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : '', venue: clean(s.venue, 200), fee: clean(s.fee, 100), contact: clean(s.contact, 200), about: cleanText(s.about, 2000) };
  },
  committees: a => {
    if (!Array.isArray(a)) throw new HttpError(400, 'Invalid committees.');
    return a.slice(0, 30).map(c => ({ id: idOf(c.id) || 'c' + Date.now(), name: clean(c.name, 40), full: clean(c.full, 120), note: clean(c.note, 200), a1: clean(c.a1, 400), a2: clean(c.a2, 400), chairs: clean(c.chairs, 200), countries: cleanText(c.countries, 4000), seats: num(c.seats, 0, 1000), ...(c.logo ? { logo: img(c.logo) } : {}) }));
  },
  schedule: a => {
    if (!Array.isArray(a)) throw new HttpError(400, 'Invalid schedule.');
    return a.slice(0, 300).map(s => ({ day: clean(s.day, 40), time: clean(s.time, 10), title: clean(s.title, 160), desc: clean(s.desc, 400), place: clean(s.place, 120) }));
  },
  news: a => {
    if (!Array.isArray(a)) throw new HttpError(400, 'Invalid announcements.');
    return a.slice(0, 100).map(n => ({ title: clean(n.title, 160), text: cleanText(n.text, 1000), date: clean(n.date, 40) }));
  },
  regs: a => a.slice(0, 20000).map(r => ({
    id: idOf(r.id), name: clean(r.name, 120), uni: clean(r.uni, 160), dept: clean(r.dept, 160), email: clean(r.email, 160).toLowerCase(), phone: clean(r.phone, 30), role: clean(r.role, 40),
    p1: clean(r.p1, 40), p2: clean(r.p2, 40), p3: clean(r.p3, 40), exp: num(r.exp, 0, 99), why: clean(r.why, 500), status: ['pending', 'approved', 'rejected'].includes(r.status) ? r.status : 'pending',
    paid: bool(r.paid), committee: clean(r.committee, 40), country: clean(r.country, 120), created: clean(r.created, 40)
  })).filter(r => r.id),
  members: a => {
    if (!Array.isArray(a)) throw new HttpError(400, 'Invalid members.');
    return a.slice(0, 3000).map(m => ({
      id: idOf(m.id), name: clean(m.name, 120), email: clean(m.email, 160).toLowerCase(), phone: clean(m.phone, 30), role: ROLES.includes(m.role) ? m.role : 'Delegate', committee: idOf(m.committee),
      country: clean(m.country, 160), persona: clean(m.persona, 120), details: cleanText(m.details, 1500), photo: img(m.photo), source: clean(m.source, 40), code: String(m.code || '').replace(/\D/g, '').slice(0, 12),
      ...(m.resetPw === true ? { resetPw: true } : {})
    })).filter(m => m.id);
  },
  attendance: o => small(isObj(o) ? o : {}, 600000),
  scores: o => small(isObj(o) ? o : {}, 600000),
  sessions: o => small(isObj(o) ? o : {}, 300000)
};

// Safe view of a member: never includes email, phone, code or password.
// Pictures stored inline are served from /api/photo (cacheable) instead of being embedded in every page.
const ver = s => { let h = 0; for (let i = 0; i < s.length; i += 97) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36) + s.length.toString(36); };
const sigOf = async id => crypto.createHmac('sha256', await secret()).update('photo:' + id).digest('base64url').slice(0, 16);
async function mPhoto(m) { const p = m.photo || ''; return p.startsWith('data:') ? '/api/photo?m=' + encodeURIComponent(m.id) + '&t=' + (await sigOf(m.id)) + '&v=' + ver(p) : p; }
const cLogo = c => { const p = c.logo || ''; return p.startsWith('data:') ? '/api/photo?c=' + encodeURIComponent(c.id) + '&v=' + ver(p) : p; };
const pubMember = async m => ({ id: m.id, name: m.name, photo: await mPhoto(m), role: m.role, committee: m.committee, country: m.country || '', persona: m.persona || '' });
async function photo(q) { // returns { type, buf } or null
  const st = await read();
  let val = '';
  if (q.m) { const m = (st.members || []).find(x => x.id === q.m); if (m && safe(String(q.t || ''), await sigOf(m.id))) val = m.photo || ''; }
  else if (q.c) { const c = (st.committees || []).find(x => x.id === q.c); val = (c && c.logo) || ''; }
  const mm = val.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  return mm ? { type: mm[1], buf: Buffer.from(mm[2], 'base64') } : null;
}
const isChair = m => m.role && m.role !== 'Delegate';

async function publicData(state) {
  const ap = state.regs.filter(r => r.status === 'approved'), byC = {}, members = state.members || [];
  members.forEach(m => { if (m.committee && m.role === 'Delegate') byC[m.committee] = (byC[m.committee] || 0) + 1; });
  const out = { adminSet: adminSet(state), counts: { total: state.regs.length, approved: ap.length, delegates: members.filter(m => m.role === 'Delegate').length, byC } };
  if (state.site) out.site = state.site;
  if (state.info) out.info = state.info;
  if (state.committees) out.committees = state.committees.map(c => ({ ...c, countries: '', logo: cLogo(c) }));
  if (state.schedule) out.schedule = state.schedule;
  if (state.news) out.news = state.news;
  out.chairs = await Promise.all(members.filter(m => isChair(m) && m.committee).map(pubMember));
  return out;
}
const adminView = st => {
  const o = {};
  KEYS.forEach(k => { if (st[k] !== undefined) o[k] = st[k]; });
  if (o.members) o.members = o.members.map(({ pw, ...m }) => ({ ...m, hasAccount: !!pw }));
  return o;
};

async function handle(req, res, route) {
  try {
    const M = req.method;
    if (M === 'GET' && route === 'public') return send(res, 200, await publicData(await read()));

    /* ----- applicants ----- */
    if (M === 'POST' && route === 'register') {
      if (limited(req, 'reg', 12)) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
      const d = await body(req);
      const r = { name: clean(d.name, 120), uni: clean(d.uni, 160), dept: clean(d.dept, 160), email: clean(d.email, 160).toLowerCase(), phone: clean(d.phone, 30),
        role: clean(d.role, 40), p1: clean(d.p1, 40), p2: clean(d.p2, 40), p3: clean(d.p3, 40), exp: num(d.exp, 0, 99), why: clean(d.why, 500) };
      if (!r.name || !r.phone || !EMAIL_RE.test(r.email)) throw new HttpError(400, 'Please enter your name, a valid email and your phone number.');
      if (digits(r.phone).length < 7 || digits(r.phone).length > 15) throw new HttpError(400, 'Enter a valid phone number.');
      await mutate(st => {
        if (st.regs.length >= 20000) throw new HttpError(503, 'Registrations are temporarily unavailable.');
        // an email that is already registered gets the same reply as a new one, so the form cannot be used to find out who registered
        if (st.regs.some(x => x.email === r.email)) return;
        const max = st.regs.reduce((m, x) => Math.max(m, +String(x.id).slice(4) || 0), 0);
        Object.assign(r, { id: 'UOK-' + String(max + 1).padStart(4, '0'), status: 'pending', paid: false, committee: '', country: '', created: new Date().toISOString() });
        st.regs.push(r);
      });
      return send(res, 200, { ok: true });
    }

    if (M === 'POST' && route === 'status') {
      if (limited(req, 'st', 20)) throw new HttpError(429, 'Too many attempts.');
      const d = await body(req), st = await read(), email = clean(d.email, 160).toLowerCase();
      const tail = v => digits(v).slice(-10); // +92 300 1234567 and 0300 1234567 are the same number
      const r = st.regs.find(x => x.email === email && tail(x.phone) === tail(d.phone) && tail(d.phone).length >= 7);
      if (!r) throw new HttpError(404, 'No match. Check the email and phone number.');
      const m = (st.members || []).find(x => (x.email || '').toLowerCase() === email);
      const c = (st.committees || []).find(x => x.id === (m ? m.committee : r.committee));
      return send(res, 200, { name: r.name, status: m ? 'approved' : r.status, paid: r.paid, committee: c ? c.name : '', country: (m ? m.country : r.country) || '', role: m ? m.role : '' });
    }

    /* ----- admin account ----- */
    if (M === 'POST' && (route === 'login' || route === 'setup')) {
      if (limited(req, 'login', 8)) throw new HttpError(429, 'Too many attempts. Wait a minute.');
      const d = await body(req), email = clean(d.email, 160).toLowerCase(), pw = String(d.password || '').slice(0, 200);
      if (route === 'setup') {
        if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email.');
        if (ENV_EMAIL() && email !== ENV_EMAIL()) throw new HttpError(403, 'Only the owner email can create the admin account.');
        if (pw.length < 8) throw new HttpError(400, 'Use at least 8 characters.');
        const adm = { email, ...makePw(pw) };
        await mutate(st => { if (adminSet(st)) throw new HttpError(403, 'Admin account already exists.'); st.admin = adm; });
        return send(res, 200, { token: await sign({ role: 'admin', v: adm.h.slice(0, 16) }) });
      }
      const st = await read();
      if (!adminOk(st, email, pw)) throw new HttpError(401, 'Wrong email or password.');
      return send(res, 200, { token: await sign({ role: 'admin', v: adminVer(st) }) });
    }

    if (M === 'POST' && route === 'changepw') {
      await needAdmin(req);
      if (limited(req, 'chpw', 8)) throw new HttpError(429, 'Too many attempts. Wait a minute.');
      const d = await body(req), cur = String(d.current || '').slice(0, 200), pw = String(d.password || '').slice(0, 200);
      if (ENV_EMAIL() && ENV_PASS()) throw new HttpError(400, 'The admin password is set in the server environment (ADMIN_PASSWORD). Change it there.');
      if (pw.length < 8) throw new HttpError(400, 'Use at least 8 characters.');
      await mutate(st => {
        if (!st.admin || !adminOk(st, st.admin.email, cur)) throw new HttpError(403, 'Current password is wrong.');
        st.admin = { email: st.admin.email, ...makePw(pw) };
      });
      return send(res, 200, { ok: true });
    }

    /* ----- delegate / chair accounts (created by the admin) ----- */
    if (M === 'POST' && route === 'activate') {
      if (limited(req, 'act', 8)) throw new HttpError(429, 'Too many attempts. Wait a minute.');
      const d = await body(req), email = clean(d.email, 160).toLowerCase(), code = clean(d.code, 20), pw = String(d.password || '').slice(0, 200);
      if (pw.length < 8) throw new HttpError(400, 'Use at least 8 characters for your password.');
      const out = await mutate(st => {
        const m = (st.members || []).find(x => (x.email || '').toLowerCase() === email);
        if (!m || !m.code || !safe(m.code, code)) throw new HttpError(403, 'Check your email and access code. Ask the organisers if you do not have one.');
        m.pw = makePw(pw); m.code = '';
        return { id: m.id, v: memberVer(m) };
      });
      return send(res, 200, { token: await sign({ role: 'member', ...out }) });
    }
    if (M === 'POST' && route === 'mlogin') {
      if (limited(req, 'mlogin', 8)) throw new HttpError(429, 'Too many attempts. Wait a minute.');
      const d = await body(req), email = clean(d.email, 160).toLowerCase(), pw = String(d.password || '').slice(0, 200);
      const m = ((await read()).members || []).find(x => (x.email || '').toLowerCase() === email && x.pw);
      const rec = m ? m.pw : DUMMY, hashOk = safe(hashPw(pw, rec.salt), rec.h);
      if (!m || !hashOk) throw new HttpError(401, 'Wrong email or password.');
      return send(res, 200, { token: await sign({ role: 'member', id: m.id, v: memberVer(m) }) });
    }
    if (M === 'GET' && route === 'whoami') {
      const p = await verify(req);
      if (!p || p.role !== 'member') throw new HttpError(401, 'Login required.');
      const st = await read(), m = (st.members || []).find(x => x.id === p.id);
      if (!m || !m.pw || p.v !== memberVer(m)) throw new HttpError(401, 'Please sign in again.');
      const c = (st.committees || []).find(x => x.id === m.committee);
      return send(res, 200, { name: m.name, photo: await mPhoto(m), role: m.role, committee: c ? c.name : '', country: m.country || '' });
    }
    if (M === 'GET' && route === 'me') {
      const p = await verify(req);
      if (!p || p.role !== 'member') throw new HttpError(401, 'Login required.');
      const st = await read(), members = st.members || [], m = members.find(x => x.id === p.id);
      if (!m || !m.pw || p.v !== memberVer(m)) throw new HttpError(401, 'Please sign in again.');
      const c = (st.committees || []).find(x => x.id === m.committee), mates = m.committee ? members.filter(x => x.committee === m.committee) : [];
      return send(res, 200, {
        me: { ...(await pubMember(m)), email: m.email, details: m.details || '' },
        committee: c ? { ...c, countries: '', logo: cLogo(c) } : null,
        chairs: await Promise.all(mates.filter(isChair).map(pubMember)), delegates: await Promise.all(mates.filter(x => !isChair(x)).map(pubMember)),
        schedule: st.schedule || [], site: { email: (st.site || {}).email, contacts: (st.site || {}).contacts }
      });
    }

    /* ----- admin only ----- */
    if (M === 'POST' && route === 'upload') {
      await needAdmin(req);
      const d = await body(req), m = String(d.dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) throw new HttpError(400, 'Send a PNG, JPEG or WebP image.');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 3e6) throw new HttpError(413, 'Image is too large (3 MB max).');
      return send(res, 200, { url: await saveImage(clean(d.name || 'image.png', 80), buf, m[1]) });
    }

    if (M === 'GET' && route === 'pulse') { // tiny status check so the admin screen does not download everything every few seconds
      await needAdmin(req);
      const st = await read();
      return send(res, 200, { n: st.regs.length, a: (st.members || []).filter(m => m.pw).length });
    }

    if (route === 'state') {
      await needAdmin(req);
      if (M === 'GET') return send(res, 200, adminView(await read()));
      if (M === 'PUT') {
        const d = await body(req), s = isObj(d.state) ? d.state : {}, known = new Set((Array.isArray(d.known) ? d.known : []).map(String));
        const clear = {};
        KEYS.forEach(k => { if (s[k] !== undefined) clear[k] = SANITIZE[k](s[k]); });
        const out = await mutate(st => {
          KEYS.forEach(k => { if (k !== 'regs' && k !== 'members' && clear[k] !== undefined) st[k] = clear[k]; });
          if (clear.regs) st.regs = clear.regs.concat(st.regs.filter(r => !known.has(r.id))); // keep registrations made while the admin was editing
          if (clear.members) { // passwords never travel to the browser, so keep the stored ones
            const old = new Map((st.members || []).map(m => [m.id, m]));
            st.members = clear.members.map(m => { const { resetPw, ...rest } = m, o = old.get(m.id); return o && o.pw && !resetPw ? { ...rest, pw: o.pw } : rest; });
            const seen = new Set();
            st.members = st.members.filter(m => { const e = m.email; if (!e) return true; if (seen.has(e)) return false; seen.add(e); return true; }); // one account per email
          }
          return { regs: st.regs, accounts: (st.members || []).filter(m => m.pw).map(m => m.id) };
        });
        return send(res, 200, out);
      }
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    return send(res, e.status || 400, { error: e.status ? e.message : 'Bad request' });
  }
}
module.exports = { handle, makePw, photo, mPhoto, cLogo };
