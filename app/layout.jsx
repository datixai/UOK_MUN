import './globals.css';
import Link from 'next/link';
import { Nav, RevealInit, WhatsApp, ProfileMenu } from '../components/Shell';
import { waLink } from '../lib/defaults';
import { getPublic } from '../lib/data';

export const revalidate = 60;
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://uok-mun.vercel.app'),
  title: 'UOK MUN | University of Kotli Model United Nations',
  description: 'UOK MUN: the Model United Nations conference of the University of Kotli. Register, view committees and agendas, and track your allocation.',
  icons: { icon: '/logo.png' },
  openGraph: { title: 'UOK MUN | University of Kotli Model United Nations', images: ['/logo.png'] }
};
export const viewport = { themeColor: '#0F1E45' };

export default async function RootLayout({ children }) {
  const { site: z } = await getPublic();
  const items = [['/', 'Home'], z.showCommittees && ['/committees', 'Committees'], z.showSchedule && ['/schedule', 'Schedule'], z.showDocuments && ['/documents', 'Documents']].filter(Boolean);
  return (
    <html lang="en">
      <body>
        <div className="topbar noprint"><b>Official platform</b> <span className="tb-x">&nbsp;|&nbsp; University of Kotli, Azad Jammu and Kashmir &nbsp;|&nbsp; Department of International Relations</span></div>
        <header><div className="bar">
          <Link className="brand" href="/"><img src="/logo.png" alt="UOK MUN logo" />UOK <b>MUN</b></Link>
          <Nav items={items} />
          <ProfileMenu />
        </div></header>
        <main>{children}</main>
        <footer>
          <div className="fw">
            <div><img src="/logo.png" alt="UOK MUN" /><br /><b style={{ margin: 0 }}>UOK MUN</b><span>University of Kotli Model United Nations. Diplomacy, debate and leadership for the next generation.</span></div>
            <div><b>Explore</b>{items.map(([p, t]) => <Link key={p} href={p}>{t}</Link>)}<Link href="/delegate">Delegate portal</Link></div>
            <div><b>Contact</b>{z.email && <a href={'mailto:' + z.email}>{z.email}</a>}{(z.contacts || []).filter(c => c.phone).map(c => <a key={c.phone} href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">{c.name}: {c.phone}<small>{c.role}</small></a>)}</div>
            <div><img className="uokl" src="/uok-logo.png" alt="University of Kotli official logo" width="70" height="70" loading="lazy" /><b>University of Kotli</b><span>Azad Jammu and Kashmir, Pakistan</span><span>Department of International Relations</span><ul className="flags" aria-label="Flags">{[['/flags/ajk.jpg', 'Flag of Azad Jammu and Kashmir', 'Azad Jammu Kashmir'], ['/flags/pakistan.svg', 'Flag of Pakistan', 'Pakistan']].map(([src, alt, label]) => <li key={label}><img src={src} alt={alt} width="30" height="20" loading="lazy" />{label}</li>)}</ul></div>
          </div>
          <div className="fb">UOK MUN &nbsp;|&nbsp; Developed by <a href="https://datixai.com" target="_blank" rel="noopener noreferrer">Datix AI</a></div>
        </footer>
        <WhatsApp contacts={z.contacts} />
        <RevealInit />
      </body>
    </html>
  );
}
