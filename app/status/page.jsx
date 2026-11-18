'use client';
import { useState } from 'react';

export default function Status() {
  const [res, setRes] = useState(null), [err, setErr] = useState('');
  async function submit(ev) {
    ev.preventDefault(); setErr(''); setRes(null);
    const d = Object.fromEntries(new FormData(ev.target));
    const r = await fetch('/api/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const j = await r.json();
    if (!r.ok) setErr(j.error || 'No match.'); else setRes(j);
  }
  return (
    <>
      <h1 className="ph">Check my status</h1>
      <div className="card" style={{ maxWidth: 520, margin: 'auto' }}>
        <form onSubmit={submit}>
          <label>Email</label><input type="email" name="email" required />
          <label>Phone</label><input name="phone" required /><br /><br />
          <button className="btn big" style={{ width: '100%' }}>Check</button>
        </form>
        {err && <div className="msg">{err}</div>}
        {res && <div style={{ marginTop: 14 }}>
          <p><b>{res.name}</b></p>
          <p>Status: <span className={'tag ' + (res.status === 'approved' ? 'ok' : res.status === 'rejected' ? 'bad' : 'warn')}>{res.status === 'approved' ? 'confirmed' : res.status}</span> Payment: <span className={'tag ' + (res.paid ? 'ok' : 'warn')}>{res.paid ? 'received' : 'pending'}</span></p>
          {res.committee ? <p>Committee: <b>{res.committee}</b><br />Allocation: <b>{res.country || 'to be announced'}</b></p> : <p>Committee allocation is not published yet.</p>}
        </div>}
      </div>
    </>
  );
}
