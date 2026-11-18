'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Nav({ items }) {
  const path = usePathname();
  return <nav>{items.map(([p, t]) => <Link key={p} href={p} className={path === p ? 'on' : ''}>{t}</Link>)}</nav>;
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
