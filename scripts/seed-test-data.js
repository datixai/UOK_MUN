// Creates TEST data: one admin and test members (chair + 2 delegates per committee), all with password test123#
// Run from the project folder:  node scripts/seed-test-data.js     (add --remove to delete the test members again)
// WARNING: this writes into whatever database the project is connected to (Firebase when the key file is present).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['.env.local', '.env']) {
  try { fs.readFileSync(path.join(root, f), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1'); }); } catch (e) { /* none */ }
}
const { mutate, saveImage, useFirebase } = require('../lib/store');
const { makePw } = require('../lib/core');
const PASSWORD = 'test123#', ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'uokmun4@gmail.com').toLowerCase();
const people = JSON.parse(fs.readFileSync(path.join(__dirname, 'people.json'), 'utf8'));

(async () => {
  const { DEF } = await import('file:///' + path.join(root, 'lib', 'defaults.js').replace(/\\/g, '/'));
  if (process.argv.includes('--remove')) {
    await mutate(st => { st.members = (st.members || []).filter(m => !String(m.id).startsWith('T-')); });
    console.log('Test members removed.'); return;
  }
  const photos = {};
  for (const p of people) {
    const buf = fs.readFileSync(path.join(__dirname, 'avatars', p.slug + '.jpg'));
    let url = 'data:image/jpeg;base64,' + buf.toString('base64');
    if (useFirebase()) { try { url = await saveImage('test-' + p.slug + '.jpg', buf, 'image/jpeg'); } catch (e) { console.log('Storage upload failed for', p.slug, '(using inline image):', String(e.message).slice(0, 80)); } }
    photos[p.slug] = url;
  }
  await mutate(st => {
    st.site = { ...DEF.site, ...(st.site || {}) };
    st.info = { ...DEF.info, ...(st.info || {}) };
    st.committees = st.committees && st.committees.length ? st.committees : DEF.committees;
    st.schedule = st.schedule || DEF.schedule;
    st.news = st.news || [];
    st.admin = { email: ADMIN_EMAIL, ...makePw(PASSWORD) };
    const keep = (st.members || []).filter(m => !String(m.id).startsWith('T-'));
    st.members = keep.concat(people.map(p => ({
      id: 'T-' + p.slug, name: p.name, email: p.slug.replace('-', '.') + '@uokmun.test', phone: '', role: p.role, committee: p.committee,
      country: p.country, persona: p.persona, photo: photos[p.slug], source: 'Other',
      details: 'TEST ACCOUNT. Please read the background guide before the first session and prepare an opening speech of 60 seconds.',
      pw: makePw(PASSWORD)
    })));
  });
  console.log('Done. Admin:', ADMIN_EMAIL, '| members:', people.length, '| password for all: ' + PASSWORD);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
