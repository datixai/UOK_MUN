import Link from 'next/link';
import { getPublic } from '../lib/data';
import { clogo } from '../lib/defaults';
import { Countdown } from '../components/Shell';

export const dynamic = 'force-dynamic';
const HOW = [['01', 'Register', 'Share your name, email and phone. It takes one minute.'], ['02', 'Get your seat', 'The team confirms you and allocates a committee and a country.'], ['03', 'Debate and lead', 'Speak, negotiate, draft resolutions and win your award.']];

export default async function Home() {
  const { site: z, info: I, committees, news, counts } = await getPublic();
  const vrows = [['Venue', I.venue], ['Date', I.date], ['Registration fee', I.fee], ['Contact', I.contact]].filter(x => x[1]);
  const logos = committees.filter(clogo);
  return (
    <>
      <div className="hero"><div className="glow" /><img src="/logo.png" alt="" />
        <h1>UOK <b>MUN</b></h1><div className="tag2">{z.tagline}</div>
        <p>{I.about}</p>
        {z.showCountdown && I.date ? <Countdown date={I.date} /> : null}
        {z.regOpen && <Link className="btn big" href="/register">{z.cta}</Link>}{' '}
        {z.showCommittees && <Link className="btn alt big" href="/committees" style={{ border: '1px solid var(--gold)' }}>View committees</Link>}
      </div>
      {z.showCommittees && logos.length > 0 && <div className="logos rv">{logos.map(c => <Link key={c.id} href="/committees" title={c.full}><img src={clogo(c)} alt={c.name} /><span>{c.name}</span></Link>)}</div>}
      {z.showStats && <div className="stats rv"><div className="stat"><b>{committees.length}</b>Committees</div><div className="stat"><b>{counts.total}</b>Registrations</div><div className="stat"><b>{counts.approved}</b>Confirmed delegates</div></div>}
      {z.showHow && <><h2 className="sec rv">How it works</h2><div className="grid rv">{HOW.map(([a, b, c]) => <div className="card step" key={a}><span>{a}</span><h3>{b}</h3><p>{c}</p></div>)}</div></>}
      {z.showNews && news.length > 0 && <><h2 className="sec rv">Announcements</h2><div className="grid rv">{[...news].reverse().map((x, i) => <div className="card" key={i}><h3>{x.title}</h3><div className="mini">{x.date}</div><p>{x.text}</p></div>)}</div></>}
      {z.showVenue && vrows.length > 0 && <><h2 className="sec rv">Venue and fee</h2><div className="card rv">{vrows.map(([a, b]) => <div key={a}><b>{a}:</b> {b}</div>)}</div></>}
      {z.regOpen && <div className="band rv"><h2>Ready to take the floor?</h2><Link className="btn big" href="/register">{z.cta}</Link></div>}
    </>
  );
}
