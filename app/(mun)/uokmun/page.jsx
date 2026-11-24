import Link from 'next/link';
import { getPublic } from '@/lib/data';
import { clogo, waLink, AWARDS } from '@/lib/defaults';
import { Countdown, Guest } from '@/components/Shell';

export const revalidate = 60;
const HOW = [['01', 'Register', 'Share your name, email and phone. It takes one minute.'], ['02', 'Get your seat', 'The team confirms you and allocates a committee and a country.'], ['03', 'Debate and lead', 'Speak, negotiate, draft resolutions and win your award.']];

export default async function Home() {
  const { site: z, info: I, committees, news, counts } = await getPublic();
  const vrows = [['Venue', I.venue], ['Date', I.date], ['Registration fee', I.fee], ['Contact', I.contact]].filter(x => x[1]);
  const logos = committees.filter(clogo);
  return (
    <>
      <div className="hero"><div className="glow" /><img src="/logo.png" alt="" width="150" height="150" fetchPriority="high" />
        <h1>UOK <b>MUN</b></h1><div className="host"><img src="/uok-logo.png" alt="University of Kotli official logo" width="34" height="34" /><span>Hosted by the University of Kotli, Azad Jammu and Kashmir</span></div><div className="tag2">{z.tagline}</div>
        <p>{I.about}</p>
        {z.showCountdown && I.date ? <Countdown date={I.date} /> : null}
        {z.regOpen && <Guest><Link className="btn big" href="/uokmun/register">{z.cta}</Link>{' '}</Guest>}
        {z.showCommittees && <Link className="btn alt big" href="/uokmun/committees" style={{ border: '1px solid var(--gold)' }}>View committees</Link>}
      </div>
      {z.showCommittees && logos.length > 0 && <div className="logos rv">{logos.map(c => <Link key={c.id} href="/uokmun/committees" title={c.full}><img src={clogo(c)} alt={c.name} width="86" height="86" loading="lazy" decoding="async" /><span>{c.name}</span></Link>)}</div>}
      {z.showStats && <div className="stats rv"><div className="stat"><b>{committees.length}</b>Committees</div><div className="stat"><b>{counts.total}</b>Registrations</div><div className="stat"><b>{counts.approved}</b>Confirmed delegates</div></div>}
      {z.showHow && <><h2 className="sec rv">How it works</h2><div className="grid rv">{HOW.map(([a, b, c]) => <div className="card step" key={a}><span>{a}</span><h3>{b}</h3><p>{c}</p></div>)}</div></>}
      {z.showAwards && <><h2 className="sec rv">Awards</h2><div className="grid rv">{AWARDS.map(([n, c, t]) => <div className="card step" key={c}><span>{c}</span><h3>{n}</h3><p>{t}</p></div>)}</div></>}
      {z.showNews && news.length > 0 && <><h2 className="sec rv">Announcements</h2><div className="grid rv">{[...news].reverse().map((x, i) => <div className="card" key={i}><h3>{x.title}</h3><div className="mini">{x.date}</div><p>{x.text}</p></div>)}</div></>}
      {z.showVenue && vrows.length > 0 && <><h2 className="sec rv">Venue and fee</h2><div className="card rv">{vrows.map(([a, b]) => <div key={a}><b>{a}:</b> {b}</div>)}</div></>}
      {z.showContact && (z.contacts || []).length > 0 && <><h2 className="sec rv">Need help?</h2><div className="grid rv">
        {z.contacts.filter(c => c.phone).map(c => <a key={c.phone} className="card ct" href={waLink(c.phone, 'Assalam o Alaikum, I have a question about UOK MUN.')} target="_blank" rel="noopener noreferrer"><h3>{c.name}</h3><div className="mini">{c.role}</div><p>WhatsApp: <b>{c.phone}</b></p></a>)}
        {z.email && <a className="card ct" href={'mailto:' + z.email}><h3>Email</h3><div className="mini">Write to the organisers</div><p><b>{z.email}</b></p></a>}</div></>}
      {z.regOpen && <Guest><div className="band rv"><h2>Ready to take the floor?</h2><Link className="btn big" href="/uokmun/register">{z.cta}</Link></div></Guest>}
    </>
  );
}
