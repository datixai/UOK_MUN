import './globals.css';
import Link from 'next/link';
import { Nav, RevealInit } from '../components/Shell';
import { getPublic } from '../lib/data';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'UOK MUN | University of Kotli Model United Nations',
  description: 'UOK MUN: the Model United Nations conference of the University of Kotli. Register, view committees and agendas, and track your allocation.',
  icons: { icon: '/logo.png' },
  openGraph: { title: 'UOK MUN | University of Kotli Model United Nations', images: ['/logo.png'] }
};
export const viewport = { themeColor: '#0F1E45' };

export default async function RootLayout({ children }) {
  const { site: z } = await getPublic();
  const items = [['/', 'Home'], z.showCommittees && ['/committees', 'Committees'], z.showSchedule && ['/schedule', 'Schedule'], z.showStatus && ['/status', 'My status']].filter(Boolean);
  return (
    <html lang="en">
      <body>
        <div className="topbar noprint"><b>Official platform</b> &nbsp;|&nbsp; University of Kotli, Azad Jammu and Kashmir &nbsp;|&nbsp; Department of International Relations</div>
        <header><div className="bar">
          <Link className="brand" href="/"><img src="/logo.png" alt="UOK MUN logo" />UOK <b>MUN</b></Link>
          <Nav items={items} />
        </div></header>
        <main>{children}</main>
        <footer>
          <div className="fw">
            <div><img src="/logo.png" alt="UOK MUN" /><br /><b style={{ margin: 0 }}>UOK MUN</b><span>University of Kotli Model United Nations. Diplomacy, debate and leadership for the next generation.</span></div>
            <div><b>Explore</b>{items.map(([p, t]) => <Link key={p} href={p}>{t}</Link>)}</div>
            <div><b>University of Kotli</b><span>Azad Jammu and Kashmir, Pakistan</span><span>Department of International Relations</span></div>
          </div>
          <div className="fb">UOK MUN &nbsp;|&nbsp; Developed by <a href="https://datixai.com" target="_blank" rel="noopener noreferrer">Datix AI</a></div>
        </footer>
        <RevealInit />
      </body>
    </html>
  );
}
