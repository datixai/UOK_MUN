import { cache } from 'react';
import { read } from './store';
import { DEF } from './defaults';
import { cLogo } from './core';

// Public data for server-rendered pages (never includes delegate details).
// The finished pages are cached (see revalidate in each page) and refreshed at once when the admin saves, so visitors never wait for the database.
async function load() {
  let st = {};
  try { st = await Promise.race([read(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 8000))]); } catch (e) { st = {}; }
  const regs = st.regs || [], members = st.members || [], byC = {};
  members.forEach(m => { if (m.committee && m.role === 'Delegate') byC[m.committee] = (byC[m.committee] || 0) + 1; });
  return {
    site: { ...DEF.site, ...(st.site || {}) },
    info: { ...DEF.info, ...(st.info || {}) },
    committees: (st.committees || DEF.committees).map(c => ({ ...c, countries: '', logo: cLogo(c) })),
    schedule: st.schedule || DEF.schedule,
    news: st.news || [],
    docs: st.docs || DEF.docs,
    counts: { total: regs.length, approved: regs.filter(r => r.status === 'approved').length, delegates: members.filter(m => m.role === 'Delegate').length, byC }
  };
}
export const getPublic = cache(load); // one read per page render; the page itself is cached and refreshed by the admin save (revalidatePath)
