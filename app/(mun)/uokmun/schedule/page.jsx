import { redirect } from 'next/navigation';
import { getPublic } from '@/lib/data';

export const revalidate = 60;
export const metadata = { title: 'Schedule | UOK MUN' };

export default async function Schedule() {
  const { site: z, schedule } = await getPublic();
  if (!z.showSchedule) redirect('/uokmun');
  const days = [...new Set(schedule.map(s => s.day))];
  return (
    <>
      <h1 className="ph">Schedule</h1>
      {days.map(d => (
        <div key={d}>
          <div className="dayh"><span>{d}</span></div>
          <div className="tlw">
            {schedule.filter(s => s.day === d).sort((a, b) => a.time.localeCompare(b.time)).map((s, i) => (
              <div className="ti rv" key={i}><div className="tc"><span className="tt">{s.time}</span><h3>{s.title}</h3>{s.desc && <p>{s.desc}</p>}{s.place && <div className="mini">Venue: {s.place}</div>}</div></div>
            ))}
          </div>
        </div>
      ))}
      {days.length === 0 && <p>The schedule will be published soon.</p>}
    </>
  );
}
