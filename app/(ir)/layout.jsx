import Link from 'next/link';
import { Nav } from '@/components/Shell';
import { getPublic } from '@/lib/data';

export const revalidate = 60;

// Department of International Relations: the front of the site. Events such as UOK MUN live under their own paths.
export default async function IrLayout({ children }) {
  const { ir } = await getPublic();
  const items = [['/', 'Home'], ['/#programmes', 'Programmes'], ['/#events', 'Events'], ...ir.pages.filter(p => p.nav).map(p => ['/' + p.slug, p.title]), ['/uokmun', 'UOK MUN']];
  return (
    <div className="irsite">
      <div className="topbar noprint"><b>{ir.uni}</b></div>
      <header><div className="bar">
        <Link className="brand" href="/"><img src="/uok-logo.png" alt="University of Kotli logo" />IR <b>Department</b></Link>
        <Nav items={items} />
      </div></header>
      <main>{children}</main>
      <footer>
        <div className="fw">
          <div><img src="/uok-logo.png" alt="University of Kotli" /><br /><b style={{ margin: 0 }}>{ir.name}</b><span>{ir.uni}</span></div>
          <div><b>Explore</b>{items.map(([p, t]) => <Link key={p} href={p}>{t}</Link>)}</div>
          <div><b>Contact</b>{ir.email && <a href={'mailto:' + ir.email}>{ir.email}</a>}{ir.phone && <span>{ir.phone}</span>}{ir.address && <span>{ir.address}</span>}</div>
        </div>
        <div className="fb">{ir.name}, University of Kotli &nbsp;|&nbsp; Developed by <a href="https://datixai.com" target="_blank" rel="noopener noreferrer">Datix AI</a></div>
      </footer>
    </div>
  );
}
