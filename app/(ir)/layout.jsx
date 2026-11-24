import Link from 'next/link';
import { Nav } from '@/components/Shell';
import { getPublic } from '@/lib/data';
import Footer from '@/components/Footer';

export const revalidate = 60;

// Department of International Relations: the front of the site. Events such as UOK MUN live under their own paths.
export default async function IrLayout({ children }) {
  const { ir, site } = await getPublic();
  const items = [['/', 'Home'], ['/#programmes', 'Programmes'], ['/#events', 'Events'], ...ir.pages.filter(p => p.nav).map(p => ['/' + p.slug, p.title]), ['/uokmun', 'UOK MUN']];
  return (
    <div className="irsite">
      <div className="topbar noprint"><b>{ir.uni}</b></div>
      <header><div className="bar">
        <Link className="brand" href="/"><img src="/uok-logo.png" alt="University of Kotli logo" />IR <b>Department</b></Link>
        <Nav items={items} />
      </div></header>
      <main>{children}</main>
      <Footer z={site} />
    </div>
  );
}
