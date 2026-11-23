// Fills a THROW-AWAY demo database (file mode) with fictional example data for the promo reel.
// Never touches Firebase. Run: set DATA_FILE=<path> and FIREBASE_SERVICE_ACCOUNT_FILE=none, then: node seed-demo.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
process.env.FIREBASE_SERVICE_ACCOUNT_FILE = 'none';
const { mutate } = require(path.join(root, 'lib', 'store'));
const { makePw } = require(path.join(root, 'lib', 'core'));
const people = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'people.json'), 'utf8'));

(async () => {
  const { DEF } = await import('file:///' + path.join(root, 'lib', 'defaults.js').replace(/\\/g, '/'));
  const photo = slug => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'scripts', 'avatars', slug + '.jpg')).toString('base64');
  const bench = { 'hassan-mehmood': ['Government Bench', 'Prime Minister'], 'kamran-javed': ['Opposition Bench', 'Leader of the Opposition'] }; // roles, not real people
  const today = new Date().toDateString();
  const applicants = ['Sara Ahmed', 'Omar Farooq', 'Laiba Khan', 'Hamdan Ali', 'Noor Fatima', 'Ibrahim Qureshi', 'Areeba Tariq'];
  await mutate(st => {
    st.site = { ...DEF.site, email: '', contacts: [], showCountdown: false };
    st.info = { ...DEF.info, date: '', venue: '', fee: '', contact: '' };
    st.committees = DEF.committees.map(c => ({ ...c, seats: c.id === 'crisis' ? 0 : 30 }));
    st.schedule = [
      { day: 'Day 1', time: '09:00', title: 'Registration and opening ceremony', desc: 'Welcome, credentials and the opening session.', place: 'Main hall' },
      { day: 'Day 1', time: '11:00', title: 'Committee session I', desc: 'Opening statements and the speakers list.', place: 'Committee rooms' },
      { day: 'Day 2', time: '10:00', title: 'Committee session II and lobbying', desc: 'Moderated caucus, blocs and working papers.', place: 'Committee rooms' },
      { day: 'Day 3', time: '10:00', title: 'Final session, resolutions and voting', desc: 'Draft resolutions are debated and voted.', place: 'Committee rooms' },
      { day: 'Day 3', time: '15:00', title: 'Closing ceremony and awards', desc: 'Best delegate and special mentions.', place: 'Main hall' }
    ];
    st.news = [{ title: 'Registration is open', text: 'Pick your committee and join the conference.', date: today }, { title: 'Delegate portal is live', text: 'Delegates sign in to see their committee, country and fellow delegates.', date: today }];
    st.regs = applicants.map((n, i) => ({ id: 'UOK-' + String(i + 1).padStart(4, '0'), name: n, uni: '', dept: '', email: n.toLowerCase().replace(/\s/g, '.') + '@datixai.com', phone: '0300 0000000', role: '', p1: '', p2: '', p3: '', exp: 0, why: '', status: i === 0 ? 'approved' : 'pending', paid: i < 2, committee: '', country: '', created: new Date(Date.now() - i * 3600e3 * 7).toISOString() }));
    st.admin = { email: 'demo@datixai.com', ...makePw('demo-reel-1234') };
    st.members = people.map(p => ({
      id: 'D-' + p.slug, name: p.name, email: p.slug.replace('-', '.') + '@datixai.com', phone: '', role: p.role, committee: p.committee,
      country: bench[p.slug] ? bench[p.slug][0] : p.country, persona: bench[p.slug] ? bench[p.slug][1] : '', photo: photo(p.slug), source: 'WhatsApp',
      details: 'Read the background guide and prepare a 60 second opening speech.', code: '', pw: makePw('demo-delegate-1')
    }));
  });
  console.log('demo data written to', process.env.DATA_FILE);
})().catch(e => { console.error(e); process.exit(1); });
