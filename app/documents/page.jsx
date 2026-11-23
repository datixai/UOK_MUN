import { redirect } from 'next/navigation';
import { getPublic } from '../../lib/data';

export const revalidate = 60;
export const metadata = { title: 'Documents | UOK MUN' };

export default async function Documents() {
  const { site: z, docs } = await getPublic();
  if (!z.showDocuments) redirect('/');
  return (
    <>
      <h1 className="ph">Documents</h1>
      <div className="grid rv">
        {docs.map((d, i) => {
          const body = <><h3>{d.title}</h3>{d.kind && <div className="mini">{d.kind}</div>}{d.desc && <p>{d.desc}</p>}{d.url && <p><b>Open document</b></p>}</>;
          return d.url
            ? <a key={i} className="card ct" href={d.url} target="_blank" rel="noopener noreferrer">{body}</a>
            : <div key={i} className="card">{body}</div>;
        })}
      </div>
      {docs.length === 0 && <p>Documents such as the background guides and rules of procedure will be published here soon.</p>}
    </>
  );
}
