import Link from 'next/link';
import { waLink } from '@/lib/defaults';

// The site footer, unchanged from the original UOK MUN design, shared by the department pages and UOK MUN.
export const munItems = z => [['/uokmun', 'Home'], z.showCommittees && ['/uokmun/committees', 'Committees'], z.showSchedule && ['/uokmun/schedule', 'Schedule'], z.showDocuments && ['/uokmun/press-release', 'Press Release']].filter(Boolean);

export default function Footer({ z }) {
  const items = munItems(z);
  return (
    <footer>
      <div className="fw">
        <div><img src="/logo.png" alt="UOK MUN" /><br /><b style={{ margin: 0 }}>UOK MUN</b><span>University of Kotli Model United Nations. Diplomacy, debate and leadership for the next generation.</span></div>
        <div><b>Explore</b>{items.map(([p, t]) => <Link key={p} href={p}>{t}</Link>)}<Link href="/uokmun/delegate">Delegate portal</Link></div>
        <div><b>Contact</b>{z.email && <a href={'mailto:' + z.email}>{z.email}</a>}{(z.contacts || []).filter(c => c.phone).map(c => <a key={c.phone} href={waLink(c.phone)} target="_blank" rel="noopener noreferrer">{c.name}: {c.phone}<small>{c.role}</small></a>)}</div>
        <div><img className="uokl" src="/uok-logo.png" alt="University of Kotli official logo" width="70" height="70" loading="lazy" /><b>University of Kotli</b><span>Azad Jammu and Kashmir, Pakistan</span><span>Department of International Relations</span><ul className="flags" aria-label="Flags">{[['/flags/ajk.jpg', 'Flag of Azad Jammu and Kashmir', 'Azad Jammu Kashmir'], ['/flags/pakistan.svg', 'Flag of Pakistan', 'Pakistan']].map(([src, alt, label]) => <li key={label}><img src={src} alt={alt} width="30" height="20" loading="lazy" />{label}</li>)}</ul></div>
      </div>
      <div className="fb">UOK MUN &nbsp;|&nbsp; Developed by <a href="https://datixai.com" target="_blank" rel="noopener noreferrer">Datix AI</a></div>
    </footer>
  );
}
