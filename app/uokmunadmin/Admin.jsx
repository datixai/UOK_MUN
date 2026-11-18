'use client';
import { useEffect, useRef, useState } from 'react';
import { DEF, clogo } from '../../lib/defaults';

const TABS = [['dash', 'Dashboard'], ['regs', 'Registrations'], ['alloc', 'Allocation'], ['roll', 'Roll call'], ['floor', 'Floor'], ['score', 'Scores'], ['content', 'Content'], ['data', 'Data']];
const KEYS = ['site', 'info', 'committees', 'schedule', 'news', 'regs', 'attendance', 'scores', 'sessions'];
const CR = [['paper', 'Position paper'], ['speech', 'Speeches'], ['dip', 'Diplomacy'], ['lobby', 'Lobbying'], ['res', 'Resolution work']];
const AWARDS = ['Best Delegate', 'High Commendation', 'Special Mention', 'Best Position Paper', 'Participation'];
const TOGGLES = [['showCountdown', 'Countdown on home (needs an event date)'], ['showStats', 'Statistics on home'], ['showVenue', 'Venue, date and fee card on home'], ['showNews', 'Announcements on home'], ['showHow', 'How it works section on home'], ['showCommittees', 'Committees page'], ['showAgendas', 'Agendas inside committee cards'], ['showSeats', 'Seat numbers (only committees with seats above 0)'], ['showSchedule', 'Schedule page'], ['showStatus', 'My status page'], ['regOpen', 'Registration open']];

async function api(p, method, body, token) {
  const r = await fetch('/api/' + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}
const merge = d => ({ ...structuredClone(DEF), attendance: {}, scores: {}, sessions: {}, regs: [], ...d, site: { ...DEF.site, ...(d.site || {}) }, info: { ...DEF.info, ...(d.info || {}) } });
const cname = (S, id) => (S.committees.find(c => c.id === id) || {}).name || '';
const tagc = s => (s === 'approved' ? 'ok' : s === 'rejected' ? 'bad' : 'warn');

export default function Admin() {
  const [token, setToken] = useState(''), [S, setS] = useState(null), [tab, setTab] = useState('dash'), [sync, setSync] = useState(''), [toast, setToast] = useState('');
  const [adminSet, setAdminSet] = useState(true);
  const known = useRef(new Set()), timer = useRef(), tokRef = useRef(''), toastT = useRef();
  const say = m => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 2800); };

  useEffect(() => { api('public').then(p => setAdminSet(!!p.adminSet)).catch(() => {}); try { const t = sessionStorage.getItem('uokmun_t'); if (t) enter(t, true); } catch (e) {} }, []);
  async function enter(t, silent) {
    try { tokRef.current = t; const d = merge(await api('state', 'GET', null, t)); known.current = new Set(d.regs.map(x => x.id)); setS(d); setToken(t); try { sessionStorage.setItem('uokmun_t', t); } catch (e) {} if (!silent) say('Welcome, admin'); }
    catch (e) { tokRef.current = ''; try { sessionStorage.removeItem('uokmun_t'); } catch (x) {} }
  }
  async function push(st) {
    try {
      const o = {}; KEYS.forEach(k => { o[k] = st[k]; });
      const r = await api('state', 'PUT', { state: o, known: [...known.current] }, tokRef.current);
      const have = new Set(st.regs.map(x => x.id)), extra = r.regs.filter(x => !have.has(x.id));
      known.current = new Set([...st.regs, ...extra].map(x => x.id));
      if (extra.length) setS(s => ({ ...s, regs: [...s.regs, ...extra] }));
      setSync('Saved');
    } catch (e) { if (e.status === 401) { setToken(''); say('Session expired. Log in again.'); } else setSync('Save failed'); }
  }
  const upd = fn => { const n = structuredClone(S); fn(n); setS(n); clearTimeout(timer.current); setSync('Saving...'); timer.current = setTimeout(() => push(n), 500); };
  useEffect(() => { // pick up registrations made while the admin is working
    if (!token) return;
    const t = setInterval(async () => {
      try { const s = await api('state', 'GET', null, tokRef.current); setS(cur => { if (!cur) return cur; const have = new Set(cur.regs.map(x => x.id)), fresh = s.regs.filter(x => !have.has(x.id) && !known.current.has(x.id)); if (!fresh.length) return cur; fresh.forEach(x => known.current.add(x.id)); say(fresh.length + ' new registration' + (fresh.length > 1 ? 's' : '')); return { ...cur, regs: [...cur.regs, ...fresh] }; }); } catch (e) {}
    }, 20000);
    return () => clearInterval(t);
  }, [token]);

  if (!token || !S) return <Login first={!adminSet} onDone={enter} />;
  const P = { S, upd, say, tokenOf: () => tokRef.current };
  return (
    <>
      <div className="tabs noprint">
        {TABS.map(([k, t]) => <a key={k} href="#" className={tab === k ? 'on' : ''} onClick={e => { e.preventDefault(); setTab(k); }}>{t}</a>)}
        <a href="#" onClick={e => { e.preventDefault(); try { sessionStorage.removeItem('uokmun_t'); } catch (x) {} setToken(''); setS(null); }}>Log out</a>
        <span className="sync">{sync || 'Live server'}</span>
      </div>
      {tab === 'dash' && <Dash {...P} />}{tab === 'regs' && <Regs {...P} />}{tab === 'alloc' && <Alloc {...P} />}{tab === 'roll' && <Roll {...P} />}
      {tab === 'floor' && <Floor {...P} />}{tab === 'score' && <Score {...P} />}{tab === 'content' && <Content {...P} />}{tab === 'data' && <Data {...P} />}
      <div id="toast" className={toast ? 'show' : ''}>{toast}</div>
    </>
  );
}

function Login({ first, onDone }) {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function go(ev) {
    ev.preventDefault(); setBusy(true); setErr('');
    const f = ev.target;
    try { const r = await api(first ? 'setup' : 'login', 'POST', { email: f.em.value.trim().toLowerCase(), password: f.p.value }); await onDone(r.token); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="card" style={{ maxWidth: 420, margin: '30px auto' }}>
      <h2>{first ? 'Create the admin account' : 'Admin login'}</h2>
      <p className="mini">{first ? 'Use the owner email and choose a strong password (8 or more characters).' : 'Sign in with the admin email and password.'}</p>
      <form onSubmit={go}>
        <label>Email</label><input type="email" name="em" required autoFocus autoComplete="username" />
        <label>Password</label><input type="password" name="p" required minLength={first ? 8 : 1} autoComplete={first ? 'new-password' : 'current-password'} /><br /><br />
        <button className="btn" disabled={busy}>{first ? 'Create account' : 'Sign in'}</button>
      </form>
      {err && <div className="msg">{err}</div>}
    </div>
  );
}

function Dash({ S }) {
  const R = S.regs, ap = R.filter(r => r.status === 'approved');
  return (
    <>
      <div className="stats">
        {[['Registrations', R.length], ['Pending', R.filter(r => r.status === 'pending').length], ['Approved', ap.length], ['Paid', R.filter(r => r.paid).length], ['Allocated', ap.filter(r => r.committee).length]].map(([t, v]) => <div className="stat" key={t}><b>{v}</b>{t}</div>)}
      </div>
      <h3>Seats by committee</h3>
      <div className="tw"><table><thead><tr><th>Committee</th><th>Seats</th><th>Preferred (1st)</th><th>Approved</th><th>Allocated</th><th>Fill</th></tr></thead><tbody>
        {S.committees.map(c => { const al = ap.filter(r => r.committee === c.id).length; return <tr key={c.id}><td>{c.name}</td><td>{c.seats || 'not set'}</td><td>{R.filter(r => r.p1 === c.id).length}</td><td>{ap.filter(r => r.p1 === c.id).length}</td><td>{al}</td><td><div style={{ background: '#eef1fa', borderRadius: 6 }}><div style={{ width: (c.seats ? Math.min(100, al / c.seats * 100) : 0) + '%', background: 'var(--gold)', height: 10, borderRadius: 6 }} /></div></td></tr>; })}
      </tbody></table></div>
      <p className="mini">Data is saved on the server automatically. Download a backup from the Data tab now and then.</p>
    </>
  );
}

function Regs({ S, upd }) {
  const [q, setQ] = useState(''), [f, setF] = useState('');
  const L = S.regs.filter(r => (!f || r.status === f) && (!q || (r.name + r.uni + r.id + r.email + r.phone).toLowerCase().includes(q.toLowerCase())));
  const set = (id, fn) => upd(n => fn(n.regs.find(r => r.id === id)));
  return (
    <>
      <div className="row"><input placeholder="Search name, email, phone" value={q} onChange={e => setQ(e.target.value)} />
        <select value={f} onChange={e => setF(e.target.value)}><option value="">All statuses</option>{['pending', 'approved', 'rejected'].map(s => <option key={s}>{s}</option>)}</select></div><br />
      <div className="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Status</th><th>Paid</th><th></th></tr></thead><tbody>
        {L.map(r => <tr key={r.id}><td>{r.name}<div className="mini">{r.uni}</div></td><td>{r.email}</td><td>{r.phone}</td><td>{(r.created || '').slice(0, 10)}</td>
          <td><span className={'tag ' + tagc(r.status)}>{r.status}</span></td>
          <td><input type="checkbox" style={{ width: 'auto' }} checked={!!r.paid} onChange={e => set(r.id, x => { x.paid = e.target.checked; })} /></td>
          <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm ok" onClick={() => set(r.id, x => { x.status = 'approved'; })}>Approve</button> <button className="btn sm bad" onClick={() => set(r.id, x => { x.status = 'rejected'; })}>Reject</button> <button className="btn sm alt" onClick={() => { if (confirm('Delete ' + r.name + '?')) upd(n => { n.regs = n.regs.filter(x => x.id !== r.id); }); }}>Delete</button></td></tr>)}
        {!L.length && <tr><td colSpan={7}>No registrations.</td></tr>}
      </tbody></table></div>
    </>
  );
}

function Alloc({ S, upd }) {
  const auto = () => upd(n => {
    const cnt = {}; n.committees.forEach(c => { cnt[c.id] = n.regs.filter(r => r.committee === c.id).length; });
    n.regs.filter(r => r.status === 'approved' && !r.committee).sort((a, b) => (b.exp || 0) - (a.exp || 0)).forEach(r => {
      for (const p of [r.p1, r.p2, r.p3]) { const c = n.committees.find(x => x.id === p); if (c && (!c.seats || cnt[p] < c.seats)) { r.committee = p; cnt[p]++; return; } }
      const open = n.committees.filter(c => !c.seats || cnt[c.id] < c.seats).sort((a, b) => cnt[a.id] / (a.seats || 1e9) - cnt[b.id] / (b.seats || 1e9))[0]; // no preference: emptiest committee
      if (open) { r.committee = open.id; cnt[open.id]++; }
    });
    n.committees.forEach(c => {
      const list = c.countries.split('\n').map(x => x.trim()).filter(Boolean), used = new Set(n.regs.filter(r => r.committee === c.id && r.country).map(r => r.country)), free = list.filter(x => !used.has(x));
      n.regs.filter(r => r.committee === c.id && !r.country).forEach(r => { if (free.length) r.country = free.shift(); });
    });
  });
  const set = (id, fn) => upd(n => fn(n.regs.find(r => r.id === id)));
  return (
    <>
      <p>Approved delegates are placed in their preferred committee if they chose one, otherwise in the emptiest committee. Countries come from each committee's list (set in Content).</p>
      <button className="btn" onClick={auto}>Auto-allocate</button> <button className="btn alt" onClick={() => { if (confirm('Clear every allocation?')) upd(n => n.regs.forEach(r => { r.committee = ''; r.country = ''; })); }}>Clear all</button> <button className="btn alt" onClick={() => window.print()}>Print list</button>
      <div className="tw" style={{ marginTop: 12 }}><table><thead><tr><th>Name</th><th>Committee</th><th>Country / portfolio</th></tr></thead><tbody>
        {S.regs.filter(r => r.status === 'approved').map(r => <tr key={r.id}><td>{r.name}</td>
          <td><select value={r.committee} onChange={e => set(r.id, x => { x.committee = e.target.value; })}><option value="">Unassigned</option>{S.committees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
          <td><input defaultValue={r.country} onBlur={e => { if (e.target.value !== r.country) set(r.id, x => { x.country = e.target.value; }); }} /></td></tr>)}
        {!S.regs.some(r => r.status === 'approved') && <tr><td colSpan={3}>Approve registrations first.</td></tr>}
      </tbody></table></div>
    </>
  );
}

function CommitteePick({ S, v, set }) { return <select value={v} onChange={e => set(e.target.value)} style={{ maxWidth: 260 }}>{S.committees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>; }

function Roll({ S, upd }) {
  const [cid, setCid] = useState(S.committees[0] ? S.committees[0].id : ''), [sn, setSn] = useState('Session 1');
  const key = cid + '|' + sn, at = S.attendance[key] || {}, L = S.regs.filter(r => r.committee === cid && r.status === 'approved');
  const pr = L.filter(r => at[r.id] === 'P' || at[r.id] === 'PV').length, need = Math.floor(L.length / 3) + 1;
  return (
    <>
      <div className="row"><CommitteePick S={S} v={cid} set={setCid} /><select value={sn} onChange={e => setSn(e.target.value)}>{[1, 2, 3, 4, 5, 6].map(i => <option key={i}>{'Session ' + i}</option>)}</select></div>
      <div className="stats"><div className="stat"><b>{pr}/{L.length}</b>Present</div><div className="stat"><b>{need}</b>Quorum (one third plus one)</div><div className="stat"><b>{pr >= need ? 'Yes' : 'No'}</b>Quorum met</div></div>
      <div className="tw"><table><thead><tr><th>Country</th><th>Delegate</th><th>Attendance</th></tr></thead><tbody>
        {L.map(r => <tr key={r.id}><td>{r.country || '-'}</td><td>{r.name}</td><td>{[['P', 'Present'], ['PV', 'Present and voting'], ['A', 'Absent']].map(([v, t]) => <label key={v} style={{ display: 'inline', marginRight: 12, fontWeight: 400 }}><input type="radio" style={{ width: 'auto' }} name={'a' + r.id + key} checked={at[r.id] === v} onChange={() => upd(n => { (n.attendance[key] = n.attendance[key] || {})[r.id] = v; })} /> {t}</label>)}</td></tr>)}
        {!L.length && <tr><td colSpan={3}>No allocated delegates in this committee.</td></tr>}
      </tbody></table></div>
    </>
  );
}

const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function Floor({ S, upd }) {
  const [cid, setCid] = useState(S.committees[0] ? S.committees[0].id : ''), [left, setLeft] = useState(null), [run, setRun] = useState(false), [sp, setSp] = useState(''), [mt, setMt] = useState('');
  const ss = S.sessions[cid] || { speakers: [], motions: [], secs: 90 }, L = S.regs.filter(r => r.committee === cid && r.country);
  const shown = left === null ? ss.secs : left, put = fn => upd(n => { const x = n.sessions[cid] = n.sessions[cid] || { speakers: [], motions: [], secs: 90 }; fn(x); });
  useEffect(() => { if (!run) return; const t = setInterval(() => setLeft(l => { const v = (l === null ? ss.secs : l) - 1; if (v <= 0) { setRun(false); try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 660; o.start(); setTimeout(() => o.stop(), 500); } catch (e) {} return 0; } return v; }), 1000); return () => clearInterval(t); }, [run, ss.secs]);
  return (
    <>
      <CommitteePick S={S} v={cid} set={v => { setCid(v); setLeft(null); setRun(false); }} />
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card"><h3>Speakers list</h3>
          <div className={'timer' + (shown <= 10 ? ' low' : '')}>{fmt(shown)}</div>
          <div style={{ textAlign: 'center' }}><button className="btn sm" onClick={() => setRun(!run)}>Start / pause</button> <button className="btn sm alt" onClick={() => { setRun(false); setLeft(null); }}>Reset</button> Time (sec): <input type="number" value={ss.secs} onChange={e => { put(x => { x.secs = +e.target.value || 90; }); setLeft(null); }} style={{ width: 80, display: 'inline' }} /></div><br />
          <div className="row"><input list="cl" placeholder="Add country" value={sp} onChange={e => setSp(e.target.value)} /><datalist id="cl">{L.map(r => <option key={r.id} value={r.country} />)}</datalist><button className="btn sm" onClick={() => { if (sp.trim()) { put(x => x.speakers.push(sp.trim())); setSp(''); } }}>Add</button></div>
          <ol>{ss.speakers.map((s, i) => <li key={i} style={i === 0 ? { fontWeight: 700 } : null}>{s} <button className="btn sm alt" onClick={() => { put(x => x.speakers.splice(i, 1)); setLeft(null); }}>{i === 0 ? 'Done' : 'Remove'}</button></li>)}</ol></div>
        <div className="card"><h3>Motions and voting</h3>
          <div className="row"><input placeholder="Motion text" value={mt} onChange={e => setMt(e.target.value)} /><button className="btn sm" onClick={() => { if (mt.trim()) { put(x => x.motions.push({ text: mt.trim(), f: 0, a: 0, x: 0 })); setMt(''); } }}>Add motion</button></div>
          {ss.motions.map((m, i) => <div key={i} style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 8 }}><b>{m.text}</b><br />
            {[['f', 'For'], ['a', 'Against'], ['x', 'Abstain']].map(([k, t]) => <span key={k}>{t} <input type="number" min="0" value={m[k]} onChange={e => put(x => { x.motions[i][k] = +e.target.value || 0; })} style={{ width: 70, display: 'inline' }} /> </span>)}
            <span className={'tag ' + (m.f > m.a ? 'ok' : 'bad')}>{m.f + m.a + m.x ? (m.f > m.a ? 'Passed' : 'Failed') : 'Open'}</span> <button className="btn sm alt" onClick={() => put(x => x.motions.splice(i, 1))}>x</button></div>)}</div>
      </div>
    </>
  );
}

function certificate(S, r) {
  const aw = (S.scores[r.id] || {}).award || 'Participation', w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to print certificates.'); return; }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Certificate</title><style>@page{size:A4 landscape;margin:0}body{margin:0;font-family:Georgia,serif;text-align:center;color:#0F1E45}.b{margin:14mm;border:3mm solid #0F1E45;outline:1mm solid #C9A768;outline-offset:-5mm;height:calc(100vh - 28mm);padding:10mm;box-sizing:border-box;position:relative}img{height:34mm}h1{font-size:40px;margin:4mm 0;color:#A88445}h2{font-size:34px;margin:6mm 0;border-bottom:1px solid #C9A768;display:inline-block;padding:0 12mm}p{font-size:17px;margin:3mm 30mm}.f{position:absolute;bottom:7mm;left:0;right:0;font:13px Arial;color:#5B6678}</style><div class="b"><img src="${location.origin}/logo.png"><div>UNIVERSITY OF KOTLI MODEL UNITED NATIONS</div><h1>Certificate of ${esc(aw)}</h1><p>This is proudly presented to</p><h2>${esc(r.name)}</h2><p>for outstanding participation${r.committee ? ' as the delegate of <b>' + esc(r.country || '') + '</b> in the <b>' + esc(cname(S, r.committee)) + '</b> committee' : ''} at UOK MUN.</p><div class="f">UOK MUN | Department of International Relations, University of Kotli, AJK | Developed by Datix AI</div></div><script>onload=()=>setTimeout(print,400)<\/script>`);
  w.document.close();
}
function Score({ S, upd }) {
  const [cid, setCid] = useState(S.committees[0] ? S.committees[0].id : '');
  const tot = r => CR.reduce((a, [k]) => a + (+(S.scores[r.id] || {})[k] || 0), 0), L = S.regs.filter(r => r.committee === cid && r.status === 'approved').sort((a, b) => tot(b) - tot(a));
  const set = (id, fn) => upd(n => fn(n.scores[id] = n.scores[id] || {}));
  return (
    <>
      <CommitteePick S={S} v={cid} set={setCid} /><p className="mini">Score each criterion from 0 to 10. The ranking updates as you type.</p>
      <div className="tw"><table><thead><tr><th>#</th><th>Delegate</th><th>Country</th>{CR.map(c => <th key={c[0]}>{c[1]}</th>)}<th>Total</th><th>Award</th></tr></thead><tbody>
        {L.map((r, i) => <tr key={r.id}><td>{i + 1}</td><td>{r.name}</td><td>{r.country}</td>
          {CR.map(([k]) => <td key={k}><input type="number" min="0" max="10" style={{ width: 62 }} value={(S.scores[r.id] || {})[k] ?? ''} onChange={e => set(r.id, x => { x[k] = Math.max(0, Math.min(10, +e.target.value || 0)); })} /></td>)}
          <td><b>{tot(r)}</b></td>
          <td><select value={(S.scores[r.id] || {}).award || ''} onChange={e => set(r.id, x => { x.award = e.target.value; })}><option value="">-</option>{AWARDS.map(a => <option key={a}>{a}</option>)}</select> <button className="btn sm alt" onClick={() => certificate(S, r)}>Certificate</button></td></tr>)}
        {!L.length && <tr><td colSpan={10}>No delegates in this committee.</td></tr>}
      </tbody></table></div>
    </>
  );
}

function Content({ S, upd, say, tokenOf }) {
  const I = S.info, z = S.site;
  const setC = (i, k, v) => upd(n => { n.committees[i][k] = k === 'seats' ? +v || 0 : v; });
  const setS = (i, k, v) => upd(n => { n.schedule[i][k] = v; });
  const [nt, setNt] = useState(''), [nx, setNx] = useState('');
  function logo(i, file) {
    if (!file) return; const im = new Image();
    im.onload = async () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const m = Math.min(im.width, im.height); cv.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 256, 256);
      const dataUrl = cv.toDataURL('image/png'); let url = dataUrl;
      try { url = (await api('upload', 'POST', { name: 'logo-' + S.committees[i].id + '.png', dataUrl }, tokenOf())).url; } catch (e) { if (e.status !== 501) { say('Upload failed: ' + e.message); return; } }
      upd(n => { n.committees[i].logo = url; }); say(url === dataUrl ? 'Logo saved' : 'Logo saved in Firebase Storage');
    };
    im.src = URL.createObjectURL(file);
  }
  const T = (k, l) => <div><label>{l}</label><input value={z[k]} onChange={e => upd(n => { n.site[k] = e.target.value; })} /></div>;
  return (
    <>
      <h3>What visitors see</h3>
      <div className="card"><p className="mini">Everything on the public website is controlled here. Tick to show, untick to hide. Changes save automatically and go live at once.</p>
        <div className="row">{TOGGLES.map(([k, t]) => <label key={k} style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={!!z[k]} onChange={e => upd(n => { n.site[k] = e.target.checked; })} /> {t}</label>)}</div>
        <div className="row">{T('tagline', 'Home tagline')}{T('cta', 'Register button text')}{T('closedMsg', 'Message when registration is closed')}{T('regNote', 'Note under the registration form')}</div></div>
      <h3 style={{ marginTop: 20 }}>Event details</h3>
      <div className="card"><div className="row">
        <div><label>Event date</label><input type="date" value={I.date} onChange={e => upd(n => { n.info.date = e.target.value; })} /></div>
        {[['venue', 'Venue'], ['fee', 'Fee'], ['contact', 'Public contact (optional)']].map(([k, l]) => <div key={k}><label>{l}</label><input value={I[k]} onChange={e => upd(n => { n.info[k] = e.target.value; })} /></div>)}</div>
        <label>About text (home page)</label><textarea value={I.about} onChange={e => upd(n => { n.info.about = e.target.value; })} /></div>
      <h3 style={{ marginTop: 20 }}>Committees</h3>
      {S.committees.map((c, i) => <div className="card" style={{ marginBottom: 10 }} key={c.id}>
        <div className="row">{[['name', 'Short name'], ['full', 'Full name'], ['chairs', 'Chairs']].map(([k, l]) => <div key={k}><label>{l}</label><input value={c[k]} onChange={e => setC(i, k, e.target.value)} /></div>)}<div><label>Seats (0 = not decided)</label><input type="number" value={c.seats} onChange={e => setC(i, 'seats', e.target.value)} /></div></div>
        <label>Agenda 1</label><input value={c.a1} onChange={e => setC(i, 'a1', e.target.value)} /><label>Agenda 2</label><input value={c.a2} onChange={e => setC(i, 'a2', e.target.value)} />
        <label>Countries or portfolios (one per line, used by auto-allocate)</label><textarea value={c.countries} onChange={e => setC(i, 'countries', e.target.value)} />
        <label>Committee logo (square picture)</label>{clogo(c) && <img className="cl" src={clogo(c)} alt="" style={{ width: 56, height: 56, verticalAlign: 'middle' }} />} <input type="file" accept="image/*" style={{ width: 'auto' }} onChange={e => logo(i, e.target.files[0])} /> {c.logo && <button className="btn sm alt" onClick={() => upd(n => { delete n.committees[i].logo; })}>Use default</button>}<br /><br />
        <button className="btn sm bad" onClick={() => { if (confirm('Remove this committee?')) upd(n => { n.committees.splice(i, 1); }); }}>Remove committee</button></div>)}
      <button className="btn alt" onClick={() => upd(n => { n.committees.push({ id: 'c' + Date.now(), name: 'New', full: 'New committee', seats: 0, chairs: '', countries: '', a1: '', a2: '' }); })}>Add committee</button>
      <h3 style={{ marginTop: 20 }}>Schedule (shown as a timeline)</h3>
      <div className="tw"><table><thead><tr><th>Day</th><th>Time</th><th>Title</th><th>Description (optional)</th><th>Venue (optional)</th><th></th></tr></thead><tbody>
        {S.schedule.map((s, i) => <tr key={i}>{[['day', 90], ['time', 80], ['title', 0], ['desc', 0], ['place', 130]].map(([k, w]) => <td key={k}><input value={s[k] || ''} style={w ? { width: w } : null} onChange={e => setS(i, k, e.target.value)} /></td>)}<td><button className="btn sm bad" onClick={() => upd(n => { n.schedule.splice(i, 1); })}>Delete</button></td></tr>)}
      </tbody></table></div><br />
      <button className="btn alt" onClick={() => upd(n => { n.schedule.push({ day: 'Day 1', time: '09:00', title: 'New item' }); })}>Add schedule line</button>
      <h3 style={{ marginTop: 20 }}>Announcements</h3>
      <div className="card"><div className="row"><input placeholder="Title" value={nt} onChange={e => setNt(e.target.value)} /><input placeholder="Message" value={nx} onChange={e => setNx(e.target.value)} /><button className="btn" onClick={() => { if (nt) { upd(n => { n.news.push({ title: nt, text: nx, date: new Date().toDateString() }); }); setNt(''); setNx(''); } }}>Post</button></div>
        {S.news.map((n, i) => <p key={i}>{n.title} <button className="btn sm bad" onClick={() => upd(x => { x.news.splice(i, 1); })}>x</button></p>)}</div>
    </>
  );
}

function Data({ S, upd }) {
  const dl = (n, t, m) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: m })); a.download = n; a.click(); };
  return (
    <div className="card"><h3>Backup and export</h3>
      <p>Data is stored on the server. Download a backup after every working session. Restore puts a backup file back.</p>
      <button className="btn" onClick={() => { const o = {}; KEYS.forEach(k => { o[k] = S[k]; }); dl('uokmun_backup_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(o), 'application/json'); }}>Download backup (JSON)</button>{' '}
      <button className="btn alt" onClick={() => { const h = ['id', 'name', 'uni', 'email', 'phone', 'status', 'paid', 'committee', 'country', 'created']; dl('uokmun_registrations.csv', [h.join(',')].concat(S.regs.map(r => h.map(k => '"' + String(r[k] ?? '').replace(/"/g, '""') + '"').join(','))).join('\r\n'), 'text/csv'); }}>Registrations (CSV)</button>
      <p><label>Restore from backup</label><input type="file" accept=".json" onChange={e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.committees) throw 0; if (confirm('Replace current data with this backup?')) upd(n => { KEYS.forEach(k => { if (d[k] !== undefined) n[k] = d[k]; }); }); } catch (x) { alert('Not a valid backup file'); } }; rd.readAsText(f); }} /></p>
    </div>
  );
}
