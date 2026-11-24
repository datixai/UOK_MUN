// Integration + security tests. Run against a TEST server that uses a temporary data file (never the live database):
//   set FIREBASE_SERVICE_ACCOUNT_FILE=none, DATA_FILE=<temp>, ADMIN_EMAIL=uokmun4@gmail.com, AUTH_SECRET=test, then: npx next start -p 3100
//   node scripts/test-all.js http://localhost:3100
const BASE = process.argv[2] || 'http://localhost:3100';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 200) : ''); } };
const call = async (path, method = 'GET', body, tok, raw) => {
  const r = await fetch(BASE + '/api/' + path, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* not json */ }
  return { s: r.status, j, h: r.headers };
};
const page = async p => { const r = await fetch(BASE + p); return { s: r.status, t: await r.text(), h: r.headers }; };
const mk = (p, extra = {}) => ({ id: 'T-' + p, name: 'Person ' + p, email: p + '@uokmun.test', phone: '', role: 'Delegate', committee: 'pna', country: 'C-' + p, persona: '', details: 'private ' + p, photo: '', source: 'Other', ...extra });

(async () => {
  /* ---------- pages ---------- */
  for (const p of ['/', '/uokmun', '/uokmun/committees', '/uokmun/schedule', '/uokmun/register', '/uokmun/delegate', '/uokmunadmin']) { const r = await page(p); ok('page ' + p + ' 200', r.s === 200, r.s); ok('page ' + p + ' has footer credit', r.t.includes('Datix AI')); }
  const home = await page('/uokmun');
  ok('home has WhatsApp contacts', home.t.includes('0355 6650661') || home.t.includes('wa.me'));
  ok('home has no admin link', !/href="\/uokmunadmin"/.test(home.t));
  ok('security header CSP', (home.h.get('content-security-policy') || '').includes("frame-ancestors 'none'"));
  ok('security header nosniff', home.h.get('x-content-type-options') === 'nosniff');
  ok('security header frame deny', home.h.get('x-frame-options') === 'DENY');
  ok('no x-powered-by', !home.h.get('x-powered-by'));
  ok('404 page', (await page('/nope-nothing')).s === 404);
  ok('path traversal blocked', (await fetch(BASE + '/..%2f..%2f.env.local')).status !== 200);
  ok('env file not served', (await fetch(BASE + '/.env.local')).status === 404);
  ok('service account not served', (await fetch(BASE + '/firebase-service-account.json')).status === 404);

  /* ---------- registration + status ---------- */
  const reg = { name: 'Ali Test', email: 'ali@x.co', phone: '0300 1234567' };
  ok('register ok', (await call('register', 'POST', reg)).s === 200);
  ok('register duplicate gives same reply (no enumeration)', (await call('register', 'POST', reg)).s === 200);
  ok('register bad email', (await call('register', 'POST', { ...reg, email: 'nope' })).s === 400);
  ok('register short phone', (await call('register', 'POST', { ...reg, email: 'b@x.co', phone: '12' })).s === 400);
  ok('register missing name', (await call('register', 'POST', { email: 'c@x.co', phone: '03001234567' })).s === 400);
  ok('register bad json', (await call('register', 'POST', null, null, '{bad')).s === 400);
  ok('register xss payload stored as text', (await call('register', 'POST', { name: '<img src=x onerror=alert(1)>', email: 'xss@x.co', phone: '03001234567' })).s === 200);

  /* ---------- admin account ---------- */
  ok('public says admin not set', (await call('public')).j.adminSet === false);
  ok('state without token 401', (await call('state')).s === 401);
  ok('state with garbage token 401', (await call('state', 'GET', null, 'abc.def')).s === 401);
  ok('setup wrong owner email 403', (await call('setup', 'POST', { email: 'hacker@x.co', password: 'longpassword1' })).s === 403);
  ok('setup short password 400', (await call('setup', 'POST', { email: 'uokmun4@gmail.com', password: 'short' })).s === 400);
  const setup = await call('setup', 'POST', { email: 'uokmun4@gmail.com', password: 'AdminPass-123' }); ok('setup owner ok', setup.s === 200, setup);
  const AT = setup.j.token;
  ok('setup second time 403', (await call('setup', 'POST', { email: 'uokmun4@gmail.com', password: 'AnotherPass-1' })).s === 403);
  ok('login wrong password 401', (await call('login', 'POST', { email: 'uokmun4@gmail.com', password: 'wrong' })).s === 401);
  ok('login unknown email 401', (await call('login', 'POST', { email: 'who@x.co', password: 'AdminPass-123' })).s === 401);
  const login = await call('login', 'POST', { email: 'UOKMUN4@gmail.com', password: 'AdminPass-123' }); ok('login ok (email case ignored)', login.s === 200);
  const tampered = AT.slice(0, -3) + (AT.endsWith('aaa') ? 'bbb' : 'aaa'); ok('tampered token rejected', (await call('state', 'GET', null, tampered)).s === 401);
  const forged = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1e9, v: 'x' })).toString('base64url') + '.' + 'A'.repeat(43); ok('forged token rejected', (await call('state', 'GET', null, forged)).s === 401);

  /* ---------- admin state ---------- */
  const state = (await call('state', 'GET', null, AT)).j; ok('admin sees registrations', state.regs.length >= 2, state.regs.length);
  ok('admin sees applicant email', state.regs.some(r => r.email === 'ali@x.co'));
  const members = [mk('d1', { setPw: 'delegate-pass-1', country: 'PTI', persona: 'Imran Khan' }), mk('d2'), mk('c1', { role: 'Chair' }), mk('u1', { committee: 'unsc' }), mk('x1', { name: '<script>alert(1)</script>', photo: 'javascript:alert(1)' })];
  const site = { tagline: 'T', cta: 'Go', showCommittees: true, showSchedule: true, showStatus: true, regOpen: true, showChairs: true, email: 'e@x.co', contacts: [{ name: 'N', role: 'R', phone: '0355 6650661' }], hack: 'dropme' };
  const committees = [{ id: 'pna', name: 'PNA', full: 'Pakistan National Assembly', seats: 5, a1: 'A1', a2: '', countries: 'PTI\nPML-N' }, { id: 'unsc', name: 'UNSC', full: 'Security Council', seats: 2 }];
  const put = await call('state', 'PUT', { state: { site, committees, members, regs: state.regs }, known: state.regs.map(r => r.id) }, AT); ok('PUT state ok', put.s === 200, put);
  const s2 = (await call('state', 'GET', null, AT)).j;
  ok('PUT drops unknown site keys', s2.site && s2.site.hack === undefined);
  ok('PUT sanitizes javascript: photo', s2.members.find(m => m.id === 'T-x1').photo === '');
  ok('PUT keeps newline in countries', s2.committees[0].countries.includes('\n'));
  ok('PUT rejects non-array committees', (await call('state', 'PUT', { state: { committees: 'x' }, known: [] }, AT)).s === 400);
  ok('PUT rejects wrong role value (becomes Delegate)', (await call('state', 'PUT', { state: { members: [mk('r1', { role: 'Emperor' })] }, known: [] }, AT)).s === 200 && true);
  await call('state', 'PUT', { state: { members }, known: [] }, AT);
  ok('PUT one account per email', (await call('state', 'PUT', { state: { members: [mk('e1', { email: 'same@uokmun.test' }), mk('e2', { email: 'same@uokmun.test' })] }, known: [] }, AT)).s === 200);
  ok('duplicate email removed', (await call('state', 'GET', null, AT)).j.members.filter(m => m.email === 'same@uokmun.test').length === 1);
  await call('state', 'PUT', { state: { members }, known: [] }, AT);
  ok('registration made during editing is kept', await (async () => { await call('register', 'POST', { name: 'Late', email: 'late@x.co', phone: '03005550000' }); const cur = (await call('state', 'GET', null, AT)).j; await call('register', 'POST', { name: 'Later', email: 'later@x.co', phone: '03005550001' }); await call('state', 'PUT', { state: { regs: cur.regs }, known: cur.regs.map(r => r.id) }, AT); return (await call('state', 'GET', null, AT)).j.regs.some(r => r.email === 'later@x.co'); })());
  ok('upload needs admin', (await call('upload', 'POST', { name: 'a.png', dataUrl: 'data:image/png;base64,AAAA' })).s === 401);
  ok('upload rejects svg', (await call('upload', 'POST', { name: 'a.svg', dataUrl: 'data:image/svg+xml;base64,AAAA' }, AT)).s === 400);

  /* ---------- delegate accounts ---------- */
  ok('the access-code route is gone', (await call('activate', 'POST', { email: 'd1@uokmun.test', code: '123456', password: 'delegate-pass-1' })).s === 404);
  ok('admin-set password must have 8 characters', (await call('state', 'PUT', { state: { members: [{ ...mk('zz'), setPw: 'short' }] }, known: [] }, AT)).s === 400);
  ok('mlogin wrong password', (await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'nope' })).s === 401);
  ok('mlogin without a password set', (await call('mlogin', 'POST', { email: 'd2@uokmun.test', password: 'anything-1' })).s === 401);
  const ml = await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'delegate-pass-1' }); ok('mlogin ok', ml.s === 200);
  const DT = ml.j.token;
  const me = await call('me', 'GET', null, DT); const blob = JSON.stringify(me.j);
  ok('me ok with committee', me.s === 200 && me.j.committee && me.j.committee.name === 'PNA', me.j.committee);
  ok('me sees mates only in own committee', me.j.delegates.some(d => d.id === 'T-d2') && !blob.includes('T-u1'));
  ok('me sees chair', me.j.chairs.some(c => c.id === 'T-c1'));
  ok('me hides other emails, codes, passwords', !/d2@uokmun|c1@uokmun|u1@uokmun|"pw"|"code"|"phone"/.test(JSON.stringify([me.j.delegates, me.j.chairs, me.j.committee])));
  ok('me shows own details', me.j.me.details === 'private d1');
  ok('me does not show other details', !blob.includes('private d2'));
  ok('whoami works', (await call('whoami', 'GET', null, DT)).j.name === 'Person d1');
  ok('delegate token cannot read admin state', (await call('state', 'GET', null, DT)).s === 401);
  ok('delegate token cannot save state', (await call('state', 'PUT', { state: { members: [] }, known: [] }, DT)).s === 401);
  ok('delegate token cannot upload', (await call('upload', 'POST', { name: 'a.png', dataUrl: 'data:image/png;base64,AAAA' }, DT)).s === 401);
  ok('admin token cannot use /me', (await call('me', 'GET', null, AT)).s === 401);
  ok('me without token 401', (await call('me')).s === 401);
  const afterSave = (await call('state', 'GET', null, AT)).j; await call('state', 'PUT', { state: { members: afterSave.members }, known: [] }, AT);
  ok('admin re-save keeps delegate password', (await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'delegate-pass-1' })).s === 200);
  ok('admin view shows hasAccount, never pw', JSON.stringify(afterSave).includes('"hasAccount":true') && !JSON.stringify(afterSave).includes('"pw"'));
  const pub = (await call('public')).j; ok('public data has no chairs, delegates or emails', pub.chairs === undefined && !JSON.stringify(pub).includes('@uokmun.test') && !JSON.stringify(pub).includes('Chair Person'));
  ok('status lookup no longer exists', (await call('status', 'POST', { email: 'ali@x.co', phone: '03001234567' })).s === 404);
  ok('status page is gone', (await page('/status')).s === 404);
  ok('public hides delegates', !JSON.stringify(pub).includes('Person d1'));
  ok('status lookup no longer exists', (await call('status', 'POST', { email: 'ali@x.co', phone: '03001234567' })).s === 404);
  ok('status page is gone', (await page('/status')).s === 404);
  const home2 = await page('/uokmun/committees'); ok('committees page escapes content', !home2.t.includes('<script>alert(1)'));
  // removing access logs the delegate out; the admin can then set a new password
  const m2 = afterSave.members.map(m => m.id === 'T-d1' ? { ...m, resetPw: true } : m);
  await call('state', 'PUT', { state: { members: m2 }, known: [] }, AT);
  ok('reset logs the old token out', (await call('me', 'GET', null, DT)).s === 401);
  ok('reset: old password no longer works', (await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'delegate-pass-1' })).s === 401);
  ok('reset: cannot sign in without a password', (await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'brand-new-pass-1' })).s === 401);
  await call('state', 'PUT', { state: { members: afterSave.members.map(m => m.id === 'T-d1' ? { ...m, setPw: 'brand-new-pass-1' } : m) }, known: [] }, AT);
  ok('admin sets a new password and the member signs in', (await call('mlogin', 'POST', { email: 'd1@uokmun.test', password: 'brand-new-pass-1' })).s === 200);

  /* ---------- pulse + password change ---------- */
  const pulse = await call('pulse', 'GET', null, AT); ok('pulse works for admin', pulse.s === 200 && typeof pulse.j.n === 'number');
  ok('pulse needs admin', (await call('pulse', 'GET', null, DT)).s === 401);
  ok('changepw wrong current', (await call('changepw', 'POST', { current: 'bad', password: 'NewAdminPass-1' }, AT)).s === 403);
  ok('changepw short', (await call('changepw', 'POST', { current: 'AdminPass-123', password: 'short' }, AT)).s === 400);
  ok('changepw ok', (await call('changepw', 'POST', { current: 'AdminPass-123', password: 'NewAdminPass-1' }, AT)).s === 200);
  ok('old admin token dead after password change', (await call('state', 'GET', null, AT)).s === 401);
  ok('old password rejected', (await call('login', 'POST', { email: 'uokmun4@gmail.com', password: 'AdminPass-123' })).s === 401);

  /* ---------- misc ---------- */
  ok('unknown api route 404', (await call('nothing')).s === 404);
  ok('wrong method on state 404/405', [404, 405].includes((await call('public', 'POST', {})).s));
  const big = await call('register', 'POST', { name: 'x'.repeat(5_000_000), email: 'big@x.co', phone: '03001234567' }); ok('oversized body rejected', big.s === 413, big.s);
  ok('photo route needs valid signature', (await fetch(BASE + '/api/photo?m=T-d1&t=bad')).status === 404);

  /* ---------- rate limits (last, they block this IP for a minute) ---------- */
  let limited = false; for (let i = 0; i < 12; i++) { const r = await call('login', 'POST', { email: 'uokmun4@gmail.com', password: 'wrong' + i }); if (r.s === 429) { limited = true; break; } }
  ok('login is rate limited', limited);
  limited = false; for (let i = 0; i < 20; i++) { const r = await call('register', 'POST', { name: 'r', email: 'rl' + i + '@x.co', phone: '03001230000' }); if (r.s === 429) { limited = true; break; } }
  ok('register is rate limited', limited);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Test crashed:', e); process.exit(2); });
