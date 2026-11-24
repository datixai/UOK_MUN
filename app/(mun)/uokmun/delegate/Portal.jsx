'use client';
import { useEffect, useState } from 'react';
import { clogo, waLink, byTime, timeLabel } from '@/lib/defaults';

async function api(p, method, body, token) {
  const r = await fetch('/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}
const Face = ({ m, big }) => m.photo ? <img className={big ? 'big' : 'av'} src={m.photo} alt={m.name} /> : <span className={'av' + (big ? ' big' : '')}>{(m.name || '?').slice(0, 1)}</span>;

export default function Portal() {
  const [token, setToken] = useState(''), [data, setData] = useState(null), [mode, setMode] = useState('login'), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  async function load(t) {
    try { setData(await api('me', 'GET', null, t)); setToken(t); try { sessionStorage.setItem('uokmun_m', t); } catch (e) {} window.dispatchEvent(new Event('uokmun-auth')); return true; }
    catch (e) { try { sessionStorage.removeItem('uokmun_m'); } catch (x) {} return false; }
  }
  useEffect(() => { try { const t = sessionStorage.getItem('uokmun_m'); if (t) load(t); } catch (e) {} }, []);

  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setErr('');
    const f = ev.target, body = { email: f.em.value.trim().toLowerCase(), password: f.p.value };
    try { const r = await api('mlogin', 'POST', body); await load(r.token); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const logout = () => { try { sessionStorage.removeItem('uokmun_m'); } catch (e) {} setToken(''); setData(null); window.dispatchEvent(new Event('uokmun-auth')); };

  if (!token || !data) return (
    <>
      <h1 className="ph">Member portal</h1>
      <div className="card" style={{ maxWidth: 460, margin: 'auto' }}>
        <p className="mini">Delegates, chairs and observers: sign in with the email and password the organisers gave you.</p>
        <form onSubmit={submit}>
          <label>Email</label><input type="email" name="em" required autoComplete="username" />
          <label>Password</label><input type="password" name="p" required autoComplete="current-password" /><br /><br />
          <button className="btn big" style={{ width: '100%' }} disabled={busy}>Sign in</button>
        </form>
        {err && <div className="msg">{err}</div>}
        <p className="mini" style={{ marginTop: 12 }}>Only people added by the organisers can sign in. If you are registered but cannot sign in, contact the registration team on WhatsApp.</p>
      </div>
    </>
  );

  const { me, schedule, site } = data, kind = data.kind || 'delegate';
  const groups = data.groups || (data.committee ? [{ committee: data.committee, chairs: data.chairs, delegates: data.delegates }] : []);
  const days = [...new Set(schedule.map(s => s.day))];
  return (
    <>
      <div className="tabs noprint"><span style={{ alignSelf: 'center' }}>Signed in as <b>{me.email}</b></span><a href="#" onClick={e => { e.preventDefault(); logout(); }}>Log out</a></div>
      <div className="card"><div className="pcard">
        <Face m={me} big />
        <div><h1 style={{ margin: 0 }}>{me.name}</h1>
          <div style={{ margin: '6px 0' }}><span className="tag ok">{me.role}</span>{groups.map(g => <span className="tag" key={g.committee.id}>{g.committee.name}</span>)}</div>
          {me.country && <div><b>Representing:</b> {me.country}</div>}
          {me.persona && <div><b>Personality:</b> {me.persona}</div>}
          {me.details && <p className="mini" style={{ whiteSpace: 'pre-line' }}>{me.details}</p>}
          {kind === 'observer' && <p className="mini">You are an observer: you can view the chairs and delegates of the committees below.</p>}
          {kind === 'chair' && groups.length > 1 && <p className="mini">You supervise {groups.length} committees.</p>}
        </div></div></div>

      {!groups.length ? <div className="msg">{kind === 'delegate' ? 'You are registered, but the organisers have not placed you in a committee yet. Check again soon.' : 'The organisers have not assigned any committee to you yet. Check again soon.'}</div> : groups.map(({ committee: c, chairs, delegates }) => <div key={c.id}>
        <h2 className="sec">{kind === 'delegate' ? 'Your committee' : c.name}</h2>
        <div className="card cm"><div className="cmh">{clogo(c) ? <img className="cl" src={clogo(c)} alt="" /> : <span className="em">{c.name.slice(0, 3).toUpperCase()}</span>}<div><h3>{c.name}</h3><div className="mini">{c.full}</div></div></div>
          {(c.a1 || c.a2) && <div className="ag">{c.a1 && <p><b>Agenda 1</b><br />{c.a1}</p>}{c.a2 && <p><b>Agenda 2</b><br />{c.a2}</p>}</div>}
          {c.note && <div className="notes">{c.note.split('|').map(t => t.trim()).filter(Boolean).map(t => <span className="pill" key={t}>{t}</span>)}</div>}<div style={{ height: 14 }} /></div>

        {chairs.length > 0 && <><h3 style={{ marginTop: 16 }}>Chairs</h3><div className="grid">{chairs.map(h => <div className={'card mem' + (h.id === me.id ? ' me' : '')} key={h.id} style={h.id === me.id ? { borderColor: 'var(--gold)' } : null}><Face m={h} /><div><b>{h.name}</b>{h.id === me.id && <span className="tag ok" style={{ marginLeft: 6 }}>you</span>}<div className="mini">{h.role}</div></div></div>)}</div></>}

        <h3 style={{ marginTop: 16 }}>Delegates in {c.name} ({delegates.length})</h3>
        <div className="grid">{delegates.map(d => <div className={'card mem' + (d.id === me.id ? ' me' : '')} key={d.id} style={d.id === me.id ? { borderColor: 'var(--gold)' } : null}><Face m={d} />
          <div><b>{d.name}</b>{d.id === me.id && <span className="tag ok" style={{ marginLeft: 6 }}>you</span>}<div className="mini">{d.country || 'Country to be announced'}</div>{d.persona && <div className="mini">as {d.persona}</div>}</div></div>)}
          {delegates.length === 0 && <p>No delegates have been added yet.</p>}</div>
      </div>)}

      {days.length > 0 && <><h2 className="sec">Schedule</h2>{days.map(d => <div key={d}><div className="dayh"><span>{d}</span></div><div className="tlw">{byTime(schedule.filter(s => s.day === d)).map((s, i) => <div className="ti" key={i}><div className="tc"><span className="tt">{timeLabel(s.time)}</span><h3>{s.title}</h3>{s.desc && <p>{s.desc}</p>}{s.place && <div className="mini">Venue: {s.place}</div>}</div></div>)}</div></div>)}</>}

      {(site.contacts || []).length > 0 && <><h2 className="sec">Need help?</h2><div className="grid">{site.contacts.filter(x => x.phone).map(x => <a key={x.phone} className="card ct" href={waLink(x.phone, 'Assalam o Alaikum, I am a member at UOK MUN (' + me.role + ').')} target="_blank" rel="noopener noreferrer"><h3>{x.name}</h3><div className="mini">{x.role}</div><p>WhatsApp: <b>{x.phone}</b></p></a>)}</div></>}
    </>
  );
}
