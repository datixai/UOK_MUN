'use client';
import { useState } from 'react';

export default function RegisterForm({ note }) {
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [done, setDone] = useState('');
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setMsg(null);
    const d = Object.fromEntries(new FormData(ev.target));
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Registration failed');
      setDone(d.name);
    } catch (e) { setMsg(e.message); setBusy(false); }
  }
  if (done) return <div className="card" style={{ maxWidth: 520, margin: 'auto' }}><div className="msg"><b>Thank you, {done}.</b> Your registration is received. The team will contact you on your email or phone. You can check your status any time with the same email and phone.</div></div>;
  return (
    <div className="card" style={{ maxWidth: 520, margin: 'auto' }}>
      <form onSubmit={submit}>
        <label>Full name *</label><input name="name" required autoComplete="name" />
        <label>Email *</label><input type="email" name="email" required autoComplete="email" />
        <label>Phone / WhatsApp *</label><input name="phone" required autoComplete="tel" inputMode="tel" />
        <p className="mini">{note}</p>
        <button className="btn big" style={{ width: '100%' }} disabled={busy}>Submit registration</button>
      </form>
      {msg && <div className="msg">{msg}</div>}
    </div>
  );
}
