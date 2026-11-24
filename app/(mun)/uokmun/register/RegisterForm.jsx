'use client';
import { useState } from 'react';

export default function RegisterForm({ note }) {
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [done, setDone] = useState(''), [photo, setPhoto] = useState('');
  function pick(file) { // shrinks the picture in the browser to a small square (about 10 KB) before sending
    if (!file) { setPhoto(''); return; }
    if (!/^image\//.test(file.type)) { setMsg('Please choose a picture file.'); return; }
    const im = new Image();
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = 160; const m = Math.min(im.width, im.height); cv.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 160, 160); setPhoto(cv.toDataURL('image/jpeg', 0.72)); URL.revokeObjectURL(im.src); };
    im.onerror = () => setMsg('This picture could not be read. Try a JPG or PNG.');
    im.src = URL.createObjectURL(file);
  }
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setMsg(null);
    const d = Object.fromEntries(new FormData(ev.target)); delete d.pic; if (photo) d.photo = photo;
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Registration failed');
      setDone(d.name);
    } catch (e) { setMsg(e.message); setBusy(false); }
  }
  if (done) return <div className="card" style={{ maxWidth: 520, margin: 'auto' }}><div className="msg"><b>Thank you, {done}.</b> Your registration is received. The team will contact you on your email or phone. If you are accepted, you will be added to a committee and given a login for the delegate portal.</div></div>;
  return (
    <div className="card" style={{ maxWidth: 520, margin: 'auto' }}>
      <form onSubmit={submit}>
        <label>Full name *</label><input name="name" required autoComplete="name" />
        <label>Email *</label><input type="email" name="email" required autoComplete="email" />
        <label>Phone / WhatsApp *</label><input name="phone" required autoComplete="tel" inputMode="tel" />
        <label>Profile picture (optional, shown on your delegate profile)</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{photo && <img className="av" src={photo} alt="Your picture" style={{ width: 56, height: 56 }} />}<input type="file" name="pic" accept="image/*" onChange={e => pick(e.target.files[0])} /></div>
        <p className="mini">{note}</p>
        <button className="btn big" style={{ width: '100%' }} disabled={busy}>Submit registration</button>
      </form>
      {msg && <div className="msg">{msg}</div>}
    </div>
  );
}
