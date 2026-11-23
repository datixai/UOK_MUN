// Tests that data added or changed by the admin shows up for public visitors and delegates, and that a public registration reaches the admin.
// Uses the test accounts (password test123#) and RESTORES the database to how it was at the start.
//   node scripts/test-data-flow.js http://localhost:3000
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:3000';
const PASS = 'test123#';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name, extra !== undefined ? JSON.stringify(extra).slice(0, 200) : ''); } };
const w = ms => new Promise(r => setTimeout(r, ms));
const call = async (p, method = 'GET', body, tok) => {
  const r = await fetch(BASE + '/api/' + p, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const html = async p => (await fetch(BASE + p)).text();
async function until(fn, tries = 12, gap = 1000) { for (let i = 0; i < tries; i++) { if (await fn()) return true; await w(gap); } return false; }
const avatar = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'avatars', 'hassan-mehmood.jpg')).toString('base64');

(async () => {
  console.log('Admin signs in');
  const al = await call('login', 'POST', { email: 'uokmun4@gmail.com', password: PASS }); ok('admin login', al.s === 200, al);
  const AT = al.j.token;
  const snap = (await call('state', 'GET', null, AT)).j; ok('admin can read all data', snap.members.length >= 21 && snap.committees.length >= 7, [snap.members.length, snap.committees.length]);
  const save = async (patch, knownExtra = []) => { const cur = (await call('state', 'GET', null, AT)).j; const next = { ...cur, ...patch(cur) }; return call('state', 'PUT', { state: next, known: cur.regs.map(r => r.id).concat(knownExtra) }, AT); };

  console.log('Admin adds and edits content');
  const tag = 'QA' + Date.now().toString(36);
  let r = await save(c => ({ news: [...c.news, { title: 'News ' + tag, text: 'Added by the test', date: 'today' }] })); ok('add announcement', r.s === 200, r);
  r = await save(c => ({ schedule: [...c.schedule, { day: 'Day 9', time: '08:00', title: 'Session ' + tag, desc: 'desc', place: 'Hall' }] })); ok('add schedule item', r.s === 200, r);
  r = await save(c => ({ committees: [...c.committees, { id: 'qa', name: 'QA', full: 'QA Committee ' + tag, seats: 3, a1: 'Agenda ' + tag, a2: '', note: 'Test|Only', countries: 'Alpha\nBeta' }] })); ok('add committee', r.s === 200, r);
  r = await save(c => ({ committees: c.committees.map(x => x.id === 'pna' ? { ...x, a2: 'Edited agenda ' + tag } : x) })); ok('edit committee agenda', r.s === 200, r);
  r = await save(c => ({ site: { ...c.site, regOpen: false, closedMsg: 'Closed ' + tag } })); ok('switch registration off', r.s === 200, r);

  console.log('Public visitors see the changes (pages refresh at once after a save)');
  ok('home shows announcement', await until(async () => (await html('/')).includes('News ' + tag)));
  ok('schedule shows new item and venue', await until(async () => { const t = await html('/schedule'); return t.includes('Session ' + tag) && t.includes('Day 9'); }));
  ok('committees page shows new committee', await until(async () => { const t = await html('/committees'); return t.includes('QA Committee ' + tag) && t.includes('Agenda ' + tag); }));
  ok('committees page shows edited agenda', (await html('/committees')).includes('Edited agenda ' + tag));
  ok('register page shows closed message', await until(async () => (await html('/register')).includes('Closed ' + tag)));
  await save(c => ({ site: { ...c.site, regOpen: true } }));
  ok('register page reopens', await until(async () => !(await html('/register')).includes('Closed ' + tag)));

  console.log('Public user registers, admin sees it');
  const email = tag.toLowerCase() + '@uokmun.test';
  ok('public registration accepted', (await call('register', 'POST', { name: 'QA Applicant', email, phone: '03005551234' })).s === 200);
  const st = (await call('state', 'GET', null, AT)).j; const reg = st.regs.find(x => x.email === email);
  ok('admin sees the registration', !!reg && reg.status === 'pending', reg);
  r = await save(c => ({ regs: c.regs.map(x => x.id === reg.id ? { ...x, status: 'approved', paid: true } : x) })); ok('admin approves and marks paid', r.s === 200);

  console.log('Admin adds a delegate; the delegate side reacts');
  const qaId = 'T-' + tag;
  r = await save(c => ({ members: [...c.members, { id: qaId, name: 'QA Delegate', email, phone: '03005551234', role: 'Delegate', committee: 'pna', country: 'QA Party', persona: 'QA Persona', details: 'private note ' + tag, photo: avatar, source: 'WhatsApp', setPw: 'qa-password-1' }] })); ok('admin adds delegate with photo', r.s === 200, r);
  const hl = await call('mlogin', 'POST', { email: 'hassan.mehmood@uokmun.test', password: PASS }); ok('existing delegate signs in', hl.s === 200);
  const HT = hl.j.token;
  let me = (await call('me', 'GET', null, HT)).j;
  ok('delegate sees the new delegate in the same committee', me.delegates.some(d => d.id === qaId && d.country === 'QA Party' && d.persona === 'QA Persona'));
  ok('delegate does not see the new delegate\'s private details or email', !JSON.stringify(me).includes('private note ' + tag) && !JSON.stringify(me).includes(email));
  const photoUrl = me.delegates.find(d => d.id === qaId).photo; ok('photo is served from a cacheable URL', photoUrl.startsWith('/api/photo?'), photoUrl);
  const pr = await fetch(BASE + photoUrl); ok('photo loads as an image with long cache', pr.status === 200 && pr.headers.get('content-type') === 'image/jpeg' && /immutable/.test(pr.headers.get('cache-control')), pr.status);
  ok('photo link with wrong signature is refused', (await fetch(BASE + photoUrl.replace(/&t=[^&]+/, '&t=wrong'))).status === 404);
  const act = await call('mlogin', 'POST', { email, password: 'qa-password-1' }); ok('new delegate signs in with the password the admin set', act.s === 200, act);
  const QT = act.j.token; const qme = (await call('me', 'GET', null, QT)).j;
  ok('new delegate sees own details and committee mates', qme.me.details === 'private note ' + tag && qme.delegates.some(d => d.name === 'Hassan Mehmood'));
  ok('whoami for the profile menu', (await call('whoami', 'GET', null, QT)).j.name === 'QA Delegate');

  console.log('Admin edits a delegate; the delegate sees the change');
  r = await save(c => ({ members: c.members.map(m => m.id === 'T-hassan-mehmood' ? { ...m, persona: 'Edited persona ' + tag, country: 'Edited party ' + tag, details: 'Edited details ' + tag } : m) })); ok('admin edits delegate profile', r.s === 200);
  me = (await call('me', 'GET', null, HT)).j; ok('delegate sees the edited profile', me.me.persona === 'Edited persona ' + tag && me.me.country === 'Edited party ' + tag && me.me.details === 'Edited details ' + tag, me.me);
  ok('login still works after the admin saved', (await call('mlogin', 'POST', { email: 'hassan.mehmood@uokmun.test', password: PASS })).s === 200);
  r = await save(c => ({ members: c.members.map(m => m.id === qaId ? { ...m, committee: 'unsc' } : m) }));
  me = (await call('me', 'GET', null, HT)).j; ok('moved delegate disappears from the old committee', !me.delegates.some(d => d.id === qaId));
  const qme2 = (await call('me', 'GET', null, QT)).j; ok('moved delegate now sees the new committee', qme2.committee.id === 'unsc' && qme2.delegates.every(d => d.id !== 'T-hassan-mehmood'));
  r = await save(c => ({ members: c.members.map(m => m.id === 'T-ayesha-khan' ? { ...m, name: 'Ayesha Khan ' + tag } : m) }));
  await w(2500);
  ok('chair names are never shown on the public committees page', !(await html('/committees')).includes('Ayesha Khan'));
  me = (await call('me', 'GET', null, HT)).j; ok('chair rename shows to delegates of that committee only', me.chairs.some(c => c.name === 'Ayesha Khan ' + tag) || me.committee.id !== 'unsc');

  console.log('Delegates cannot change data');
  ok('delegate cannot save state', (await call('state', 'PUT', { state: { news: [] }, known: [] }, HT)).s === 401);
  ok('delegate cannot read admin state', (await call('state', 'GET', null, HT)).s === 401);
  ok('delegate cannot upload', (await call('upload', 'POST', { name: 'a.png', dataUrl: 'data:image/png;base64,AAAA' }, HT)).s === 401);
  ok('delegate cannot change the admin password', (await call('changepw', 'POST', { current: PASS, password: 'hackedpass-1' }, HT)).s === 401);

  console.log('Admin deletes the test data and restores everything');
  const cur = (await call('state', 'GET', null, AT)).j;
  const restore = { site: snap.site, info: snap.info, committees: snap.committees, schedule: snap.schedule, news: snap.news, members: snap.members, regs: snap.regs, attendance: snap.attendance, scores: snap.scores, sessions: snap.sessions };
  r = await call('state', 'PUT', { state: restore, known: cur.regs.map(x => x.id) }, AT); ok('restore saved', r.s === 200, r);
  const end = (await call('state', 'GET', null, AT)).j;
  ok('members back to original', end.members.length === snap.members.length && !end.members.some(m => m.id === qaId));
  ok('registrations back to original', end.regs.length === snap.regs.length && !end.regs.some(x => x.email === email));
  ok('committees, schedule, news back to original', end.committees.length === snap.committees.length && end.schedule.length === snap.schedule.length && end.news.length === snap.news.length);
  ok('delegate password survived the whole test', (await call('mlogin', 'POST', { email: 'hassan.mehmood@uokmun.test', password: PASS })).s === 200);
  ok('public site is clean again', await until(async () => { const t = await html('/'); const c = await html('/committees'); return !t.includes('News ' + tag) && !c.includes('QA Committee'); }));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Test crashed:', e); process.exit(2); });
