import { unstable_cache } from 'next/cache';
import { read } from './store';
import { DEF } from './defaults';
import { mPhoto, cLogo } from './core';

// Public data for server-rendered pages (never includes delegate details).
// Cached for a minute and refreshed at once when the admin saves, so visitors never wait for the database.
async function load() {
  let st = {};
  try { st = await Promise.race([read(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 8000))]); } catch (e) { st = {}; }
  const regs = st.regs || [], members = st.members || [], byC = {};
  members.forEach(m => { if (m.committee && m.role === 'Delegate') byC[m.committee] = (byC[m.committee] || 0) + 1; });
  const chairs = await Promise.all(members.filter(m => m.role && m.role !== 'Delegate' && m.committee).map(async m => ({ id: m.id, name: m.name, photo: await mPhoto(m), role: m.role, committee: m.committee })));
  return {
    site: { ...DEF.site, ...(st.site || {}) },
    info: { ...DEF.info, ...(st.info || {}) },
    committees: (st.committees || DEF.committees).map(c => ({ ...c, countries: '', logo: cLogo(c) })),
    schedule: st.schedule || DEF.schedule,
    news: st.news || [],
    chairs,
    counts: { total: regs.length, approved: regs.filter(r => r.status === 'approved').length, delegates: members.filter(m => m.role === 'Delegate').length, byC }
  };
}
export const getPublic = unstable_cache(load, ['uokmun-public-v2'], { tags: ['public'], revalidate: 60 });
