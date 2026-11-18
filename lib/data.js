import { read } from './store';
import { DEF } from './defaults';

// Public data for server-rendered pages (never includes delegate details).
export async function getPublic() {
  let st = {};
  try { st = await read(); } catch (e) { st = {}; }
  const regs = st.regs || [], ap = regs.filter(r => r.status === 'approved'), byC = {};
  ap.forEach(r => { if (r.committee) byC[r.committee] = (byC[r.committee] || 0) + 1; });
  return {
    site: { ...DEF.site, ...(st.site || {}) },
    info: { ...DEF.info, ...(st.info || {}) },
    committees: (st.committees || DEF.committees).map(c => ({ ...c, countries: '' })),
    schedule: st.schedule || DEF.schedule,
    news: st.news || [],
    counts: { total: regs.length, approved: ap.length, byC }
  };
}
