import { redirect } from 'next/navigation';
import { getPublic } from '../../lib/data';
import { clogo } from '../../lib/defaults';

export const revalidate = 60;
export const metadata = { title: 'Committees | UOK MUN' };

export default async function Committees() {
  const { site: z, committees, counts, chairs } = await getPublic();
  if (!z.showCommittees) redirect('/');
  return (
    <>
      <h1 className="ph">Committees</h1>
      <div className="grid">
        {committees.map(c => {
          const f = counts.byC[c.id] || 0, logo = clogo(c);
          return (
            <div className="card cm rv" key={c.id}>
              <div className="cmh">
                {logo ? <img className="cl" src={logo} alt={c.name + ' logo'} width="68" height="68" loading="lazy" decoding="async" /> : <span className="em">{(c.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) || 'MUN'}</span>}
                <div><h3>{c.name}</h3><div className="mini">{c.full}</div></div>
              </div>
              {z.showAgendas && (c.a1 || c.a2) && <div className="ag">{c.a1 && <p><b>Agenda 1</b><br />{c.a1}</p>}{c.a2 && <p><b>Agenda 2</b><br />{c.a2}</p>}</div>}
              {c.note && <div className="notes">{c.note.split('|').map(t => t.trim()).filter(Boolean).map(t => <span className="pill" key={t}>{t}</span>)}</div>}
              {z.showChairs && chairs.some(h => h.committee === c.id) && <div className="chairs"><div className="mini">Chairs</div>{chairs.filter(h => h.committee === c.id).map(h => <div className="chair" key={h.id}>{h.photo ? <img src={h.photo} alt={h.name} width="42" height="42" loading="lazy" decoding="async" /> : <span className="av">{h.name.slice(0, 1)}</span>}<div><b>{h.name}</b><div className="mini">{h.role}</div></div></div>)}</div>}
              {z.showSeats && c.seats > 0 && <><span className="tag">{c.seats} seats</span><span className={'tag ' + (f >= c.seats ? 'bad' : 'ok')}>{Math.max(0, c.seats - f)} open</span></>}
              {c.chairs && <div className="mini" style={{ marginTop: 8 }}>Chairs: {c.chairs}</div>}
            </div>
          );
        })}
        {committees.length === 0 && <p>Committees will be published soon.</p>}
      </div>
    </>
  );
}
