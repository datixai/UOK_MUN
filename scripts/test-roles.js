// Tests for chairs over several committees, observers, the department front page, extra pages and old-link redirects.
// Run against a TEST server with a temporary data file (see the header of test-all.js), never the live database:
//   node scripts/test-roles.js http://localhost:3100
const BASE = process.argv[2] || 'http://localhost:3100';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const call = async (path, method = 'GET', body, tok) => {
  const r = await fetch(BASE + '/api/' + path, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* not json */ }
  return { s: r.status, j };
};
const html = async p => { const r = await fetch(BASE + p, { redirect: 'manual' }); return { s: r.status, t: await r.text(), loc: r.headers.get('location') || '' }; };
const PW = 'rolesTest#2026';
const m = (id, role, extra) => ({ id, name: 'Roles ' + id, email: id.toLowerCase() + '@roles.test', phone: '', role, committee: '', country: '', persona: '', details: '', photo: '', source: 'Other', setPw: PW, ...extra });
const until = async (fn, n = 20) => { for (let i = 0; i < n; i++) { if (await fn()) return true; await new Promise(r => setTimeout(r, 500)); } return false; };

(async () => {
  // admin login (creates the account on a fresh test server)
  let a = await call('login', 'POST', { email: 'uokmun4@gmail.com', password: 'adminTest#2026' });
  if (a.s !== 200) a = await call('setup', 'POST', { email: 'uokmun4@gmail.com', password: 'adminTest#2026' });
  const AT = a.j.token; ok('admin login', !!AT, a);
  const st = (await call('state', 'GET', null, AT)).j;
  const keep = (st.members || []).map(({ hasAccount, ...x }) => x);

  const add = [
    m('RD1', 'Delegate', { committee: 'unsc', country: 'France' }), m('RD2', 'Delegate', { committee: 'oic', country: 'Turkey' }), m('RD3', 'Delegate', { committee: 'pna' }),
    m('RC1', 'Chair', { committee: 'unsc', committees: ['unsc', 'oic'] }), m('RC2', 'Vice Chair', { committee: 'pna' }), m('RC3', 'Secretary', { committees: ['oic'] }),
    m('RO1', 'Observer', { committees: ['unsc'] }), m('RO2', 'Observer', { committees: [] })
  ];
  const ir = { name: 'Department of International Relations', uni: 'University of Kotli', tagline: 'Roles tag', about: 'About roles test', vision: '', email: '', phone: '', address: '', programmes: [], events: [{ title: 'Roles Event', date: '', text: 'x', link: '/uokmun', image: '', live: true }, { title: 'Bad link', link: 'javascript:alert(1)' }], news: [],
    pages: [{ slug: 'faculty', title: 'Faculty Roles', body: '## Heading\n\n- one\n- two\n\nPara <script>alert(1)</script>', nav: true }, { slug: 'uokmun', title: 'Hijack', body: 'x' }, { slug: 'api', title: 'Hijack2', body: 'x' }] };
  const committees = st.committees && st.committees.length ? st.committees : ['unsc', 'oic', 'pna'].map(id => ({ id, name: id.toUpperCase(), full: id, seats: 0, chairs: '', countries: '', a1: '', a2: '' })); // a fresh test database has no saved committees
  const put = await call('state', 'PUT', { state: { members: [...keep, ...add], ir, committees } }, AT);
  ok('save members and department', put.s === 200, put);
  const saved = (await call('state', 'GET', null, AT)).j;
  ok('reserved page addresses are refused', saved.ir.pages.length === 1 && saved.ir.pages[0].slug === 'faculty', saved.ir.pages);
  ok('unsafe event link is cleared', saved.ir.events[1].link === '', saved.ir.events[1]);
  ok('old roles become ADC', saved.members.find(x => x.id === 'RC2').role === 'ADC' && saved.members.find(x => x.id === 'RC3').role === 'ADC');
  ok('chair keeps several committees', JSON.stringify(saved.members.find(x => x.id === 'RC1').committees) === '["unsc","oic"]');

  const login = async id => (await call('mlogin', 'POST', { email: id.toLowerCase() + '@roles.test', password: PW })).j.token;
  const [D1, C1, C2, O1, O2] = [await login('RD1'), await login('RC1'), await login('RC2'), await login('RO1'), await login('RO2')];
  ok('all role logins work', D1 && C1 && C2 && O1 && O2);

  const d1 = (await call('me', 'GET', null, D1)).j;
  ok('delegate kind', d1.kind === 'delegate');
  ok('delegate sees only own committee', d1.groups.length === 1 && d1.groups[0].committee.id === 'unsc', d1.groups.map(g => g.committee.id));
  ok('delegate sees the multi-committee chair', d1.groups[0].chairs.some(c => c.id === 'RC1'));
  ok('delegate does not see observers', !JSON.stringify(d1).includes('RO1'));
  ok('old fields still sent', d1.committee && d1.committee.id === 'unsc' && Array.isArray(d1.delegates));

  const c1 = (await call('me', 'GET', null, C1)).j;
  ok('chair kind', c1.kind === 'chair');
  ok('chair sees both committees', c1.groups.map(g => g.committee.id).join() === 'unsc,oic', c1.groups.map(g => g.committee.id));
  ok('chair sees delegates of both', c1.groups[0].delegates.some(d => d.id === 'RD1') && c1.groups[1].delegates.some(d => d.id === 'RD2'));
  ok('chair does not see other committees', !JSON.stringify(c1).includes('RD3'));
  ok('chair never gets delegate emails', !JSON.stringify(c1.groups).includes('@roles.test'));

  const c2 = (await call('me', 'GET', null, C2)).j;
  ok('older chair with one committee still works', c2.groups.length === 1 && c2.groups[0].committee.id === 'pna' && c2.groups[0].delegates.some(d => d.id === 'RD3'));

  const o1 = (await call('me', 'GET', null, O1)).j;
  ok('observer kind', o1.kind === 'observer');
  ok('observer sees chairs and delegates of assigned committee', o1.groups.length === 1 && o1.groups[0].chairs.some(c => c.id === 'RC1') && o1.groups[0].delegates.some(d => d.id === 'RD1'));
  ok('observer is not listed as chair', !o1.groups[0].chairs.some(c => c.id === 'RO1'));
  ok('observer with no committees sees none', (await call('me', 'GET', null, O2)).j.groups.length === 0);
  ok('observer cannot read admin state', (await call('state', 'GET', null, O1)).s === 401);
  ok('observer cannot save', (await call('state', 'PUT', { state: { members: [] } }, O1)).s === 401);
  ok('whoami lists chair committees', (await call('whoami', 'GET', null, C1)).j.committee === 'UNSC, OIC');

  // registration picture
  const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  ok('register with picture', (await call('register', 'POST', { name: 'Pic Person', email: 'pic@roles.test', phone: '03001234567', photo: px })).s === 200);
  ok('register refuses a non-picture', (await call('register', 'POST', { name: 'Bad Pic', email: 'badpic@roles.test', phone: '03001234567', photo: 'https://evil.example/x.png' })).s === 400);
  const regs = (await call('state', 'GET', null, AT)).j.regs;
  ok('admin sees the registration picture', (regs.find(r => r.email === 'pic@roles.test') || {}).photo === px);
  ok('upload without Storage falls back (501)', (await call('upload', 'POST', { name: 'x.png', dataUrl: px }, AT)).s === 501);

  // pages
  ok('department home shows', await until(async () => { const h = await html('/'); return h.s === 200 && h.t.includes('Roles tag') && h.t.includes('Roles Event'); }));
  const f = await html('/faculty');
  ok('extra page renders', f.s === 200 && f.t.includes('Faculty Roles') && f.t.includes('<li>one</li>'), f.s);
  ok('extra page escapes text', !f.t.includes('<script>alert(1)'));
  ok('unknown page is 404', (await html('/no-such-page')).s === 404);
  ok('UOK MUN home works', (await html('/uokmun')).s === 200);
  for (const p of ['committees', 'schedule', 'register', 'press-release', 'delegate']) { const r = await html('/' + p); ok('old link /' + p + ' redirects', r.s === 308 && r.loc.endsWith('/uokmun/' + p), [r.s, r.loc]); }
  ok('old /documents redirects', (await html('/documents')).loc.endsWith('/uokmun/press-release'));

  // clean up
  await call('state', 'PUT', { state: { members: keep, ...(st.committees ? { committees: st.committees } : {}), ir: st.ir || { name: '', uni: '', programmes: [], events: [], news: [], pages: [] } } }, AT);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
