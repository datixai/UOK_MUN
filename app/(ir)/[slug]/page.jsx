import { notFound } from 'next/navigation';
import { getPublic } from '@/lib/data';

export const revalidate = 60;

async function find(slug) { const { ir } = await getPublic(); return ir.pages.find(p => p.slug === slug); }
export async function generateMetadata({ params }) { const p = await find(params.slug); return { title: p ? p.title + ' | Department of International Relations' : 'Not found' }; }

// Pages the department adds in the admin (Department tab). Text format: a line starting with "## " is a heading,
// lines starting with "- " make a list, and a blank line starts a new paragraph.
export default async function IrPage({ params }) {
  const p = await find(params.slug);
  if (!p) notFound();
  const blocks = p.body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (
    <>
      <h1 className="ph">{p.title}</h1>
      <div className="card irpage">{blocks.map((b, i) => {
        if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>;
        const lines = b.split('\n');
        if (lines.every(l => l.trim().startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}</ul>;
        return <p key={i} style={{ whiteSpace: 'pre-line' }}>{b}</p>;
      })}</div>
    </>
  );
}
