import { redirect } from 'next/navigation';
import { getPublic } from '../../lib/data';
import { clogo } from '../../lib/defaults';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Committees | UOK MUN' };

export default async function Committees() {
  const { site: z, committees, counts } = await getPublic();
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
                {logo ? <img className="cl" src={logo} alt={c.name + ' logo'} /> : <span className="em">{(c.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) || 'MUN'}</span>}
                <div><h3>{c.name}</h3><div className="mini">{c.full}</div></div>
              </div>
              {z.showAgendas && (c.a1 || c.a2) && <div className="ag">{c.a1 && <p><b>Agenda 1</b><br />{c.a1}</p>}{c.a2 && <p><b>Agenda 2</b><br />{c.a2}</p>}</div>}
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
