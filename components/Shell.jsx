'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { waLink } from '../lib/defaults';
import Link2 from 'next/link';

// Who is signed in on this browser (delegate or chair, admin). Used to show each person only what is meant for them.
export function useAuth() {
  const [a, setA] = useState({ member: false, admin: false });
  useEffect(() => {
    const f = () => { try { setA({ member: !!sessionStorage.getItem('uokmun_m'), admin: !!sessionStorage.getItem('uokmun_t') }); } catch (e) { /* storage blocked */ } };
    f(); window.addEventListener('uokmun-auth', f);
    return () => window.removeEventListener('uokmun-auth', f);
  }, []);
  return a;
}
// Content for visitors only: hidden once someone is signed in as delegate, chair or admin.
export function Guest({ children }) {
  const a = useAuth();
  return a.member || a.admin ? null : children;
}

export function Nav({ items }) {
  const path = usePathname(), a = useAuth(), signedIn = a.member || a.admin;
  return <nav>{items.filter(([, , guestOnly]) => !(guestOnly && signedIn)).map(([p, t]) => <Link key={p} href={p} className={path === p ? 'on' : ''}>{t}</Link>)}</nav>;
}

// Fades sections in as they scroll into view (elements with class "rv").
export function RevealInit() {
  const path = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll('.rv:not(.in)');
    if (!window.IntersectionObserver) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: 0.08 });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [path]);
  return null;
}

export function Countdown({ date }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const d = new Date(date + 'T09:00');
    const tick = () => setLeft(Math.floor((d - new Date()) / 1000));
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [date]);
  if (left === null || left <= 0) return <div className="cd" />;
  let s = left;
  return <div className="cd">{[['Days', 86400], ['Hours', 3600], ['Min', 60], ['Sec', 1]].map(([l, k]) => { const v = Math.floor(s / k); s %= k; return <div key={l}><b>{v}</b>{l}</div>; })}</div>;
}

const WA_ICON = <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

// Floating WhatsApp button on the right side with the contact people.
export function WhatsApp({ contacts }) {
  const [open, setOpen] = useState(false), path = usePathname(), auth = useAuth();
  if (path.startsWith('/uokmun/delegate') || path.startsWith('/uokmunadmin') || auth.member || auth.admin) return null; // only for visitors on the public site
  const list = (contacts || []).filter(c => c.phone);
  if (!list.length) return null;
  const msg = 'Assalam o Alaikum, I have a question about UOK MUN.';
  return (
    <div className="wa noprint">
      {open && <div className="wa-pop">
        <div className="wa-h">Chat with the UOK MUN team</div>
        {list.map(c => <a key={c.phone} href={waLink(c.phone, msg)} target="_blank" rel="noopener noreferrer"><b>{c.name}</b><span>{c.role}</span><em>{c.phone}</em></a>)}
      </div>}
      <button className="wa-b" aria-label="Chat on WhatsApp" onClick={() => (list.length === 1 ? window.open(waLink(list[0].phone, msg), '_blank') : setOpen(o => !o))}>{WA_ICON}</button>
    </div>
  );
}

// Header profile: shows the signed-in delegate or chair (photo, name, role) with My committee and Log out.
export function ProfileMenu() {
  const [me, setMe] = useState(null), [admin, setAdmin] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      let t = '', a = '';
      try { t = sessionStorage.getItem('uokmun_m') || ''; a = sessionStorage.getItem('uokmun_t') || ''; } catch (e) {}
      if (alive) setAdmin(!!a);
      if (!t) { if (alive) setMe(null); return; }
      try {
        const r = await fetch('/api/whoami', { headers: { Authorization: 'Bearer ' + t } });
        if (!r.ok) throw new Error('x');
        if (alive) setMe(await r.json());
      } catch (e) { try { sessionStorage.removeItem('uokmun_m'); } catch (x) {} if (alive) setMe(null); window.dispatchEvent(new Event('uokmun-auth')); }
    }
    check();
    window.addEventListener('uokmun-auth', check);
    return () => { alive = false; window.removeEventListener('uokmun-auth', check); };
  }, []);
  const out = () => { try { sessionStorage.removeItem('uokmun_m'); sessionStorage.removeItem('uokmun_t'); } catch (e) {} setMe(null); setAdmin(false); setOpen(false); window.dispatchEvent(new Event('uokmun-auth')); if (location.pathname.startsWith('/uokmun/delegate') || location.pathname.startsWith('/uokmunadmin')) location.href = '/uokmun'; };
  if (!me && !admin) return <Link2 className="pm-login" href="/uokmun/delegate">Member login</Link2>;
  const name = me ? me.name : 'Admin';
  return (
    <div className="pm">
      <button className="pm-b" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Account menu">
        {me && me.photo ? <img src={me.photo} alt="" width="32" height="32" /> : <span className="av" style={{ width: 32, height: 32, fontSize: 15 }}>{name.slice(0, 1)}</span>}
        <span className="pm-n">{name.split(' ')[0]}</span>
      </button>
      {open && <div className="pm-menu" onClick={() => setOpen(false)}>
        <div className="pm-h"><b>{name}</b><span>{me ? [me.role, me.committee].filter(Boolean).join(' | ') : 'Administrator'}</span>{me && me.country && <span>{me.country}</span>}</div>
        {me && <Link2 href="/uokmun/delegate">My portal</Link2>}
        {admin && <Link2 href="/uokmunadmin">Admin panel</Link2>}
        <button onClick={out}>Log out</button>
      </div>}
    </div>
  );
}
