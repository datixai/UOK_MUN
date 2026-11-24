import Link from 'next/link';
import { getPublic } from '@/lib/data';

export const revalidate = 60;
const Go = ({ href, className, children }) => href.startsWith('/') ? <Link className={className} href={href}>{children}</Link> : <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export default async function IrHome() {
  const { ir } = await getPublic();
  const events = ir.events.filter(e => e.title);
  const ends = /International Relations$/.test(ir.name), t = (k, d) => ir[k] || d;
  return (
    <>
      <div className="hero irhero"><div className="glow" /><img src="/uok-logo.png" alt="University of Kotli official logo" width="130" height="130" fetchPriority="high" />
        <div className="tag2">{ir.uni}</div>
        <h1>{ends ? <>{ir.name.replace(/International Relations$/, '')}<b>International Relations</b></> : ir.name}</h1>
        {ir.tagline && <p className="irtag">{ir.tagline}</p>}
        <div>{events.length > 0 && <a className="btn big" href="#events">Our events</a>} <a className="btn alt big" href="#about" style={{ border: '1px solid var(--gold)' }}>About the department</a></div>
      </div>
      <h2 className="sec rv" id="about">{t('tAbout', 'About the department')}</h2>
      <div className="grid rv"><div className="card"><p style={{ whiteSpace: 'pre-line' }}>{ir.about}</p></div>{ir.vision && <div className="card"><h3>{t('tVision', 'Our vision')}</h3><p style={{ whiteSpace: 'pre-line' }}>{ir.vision}</p></div>}</div>
      {ir.programmes.length > 0 && <><h2 className="sec rv" id="programmes">{t('tProg', 'Programmes')}</h2><div className="grid rv">{ir.programmes.map((p, i) => <div className="card step" key={i}><span>{String(i + 1).padStart(2, '0')}</span><h3>{p.name}</h3><p>{p.text}</p></div>)}</div></>}
      {events.length > 0 && <><h2 className="sec rv" id="events">{t('tEvents', 'Events')}</h2><div className="grid rv">{events.map((e, i) => {
        const inner = <>{e.image && <img className="irev-i" src={e.image} alt="" width="72" height="72" loading="lazy" />}<div><h3>{e.title}{e.live && <span className="tag ok" style={{ marginLeft: 8 }}>Open</span>}</h3>{e.date && <div className="mini">{e.date}</div>}<p>{e.text}</p>{e.link && <span className="irmore">Open {e.title}</span>}</div></>;
        return e.link ? <Go key={i} href={e.link} className="card irev">{inner}</Go> : <div key={i} className="card irev">{inner}</div>;
      })}</div></>}
      {ir.news.length > 0 && <><h2 className="sec rv">{t('tNews', 'News and notices')}</h2><div className="grid rv">{[...ir.news].reverse().map((x, i) => <div className="card" key={i}><h3>{x.title}</h3><div className="mini">{x.date}</div><p style={{ whiteSpace: 'pre-line' }}>{x.text}</p></div>)}</div></>}
      {(ir.email || ir.phone || ir.address) && <><h2 className="sec rv">{t('tContact', 'Contact')}</h2><div className="card rv">{ir.address && <div><b>Address:</b> {ir.address}</div>}{ir.email && <div><b>Email:</b> <a href={'mailto:' + ir.email}>{ir.email}</a></div>}{ir.phone && <div><b>Phone:</b> {ir.phone}</div>}</div></>}
    </>
  );
}
