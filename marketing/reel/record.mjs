// Records the demo site (fictional data, port 3200) as frame sequences at exactly 30 fps (frame-stepped, so scrolling is perfectly smooth).
// Usage: node record.mjs [clipName ...]      Output: work/clips/<name>/f0000.jpg ... and work/clips/<name>/meta.json (tap positions)
import { chromium } from 'playwright-core';
import fs from 'fs';

const BASE = 'http://localhost:3200', FPS = 30;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = async (p, b) => (await fetch(BASE + '/api/' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();

const adminToken = (await J('login', { email: 'demo@datixai.com', password: 'demo-reel-1234' })).token;
const memberToken = (await J('mlogin', { email: 'hamza.rauf@datixai.com', password: 'demo-delegate-1' })).token;

// make the public pages regenerate from the demo data (they were pre-built from the real site)
const st0 = await (await fetch(BASE + '/api/state', { headers: { Authorization: 'Bearer ' + adminToken } })).json();
await fetch(BASE + '/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken }, body: JSON.stringify({ state: { site: st0.site, committees: st0.committees }, known: [] }) });
await sleep(1500);

const CSS = '#toast{display:none!important} .wa{display:none!important} html{scroll-behavior:auto!important}';
const ease = x => { x = Math.max(0, Math.min(1, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// helpers that build timed actions
const typeText = (t0, text, gap = 0.085) => [...text].map((ch, k) => [t0 + k * gap, p => p.keyboard.type(ch)]);
const tap = (t, sel, opts = {}) => [t, async (p, ctx) => {
  const loc = opts.text ? p.locator(sel).filter({ hasText: opts.text }).first() : p.locator(sel).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const b = await loc.boundingBox({ timeout: 3000 }); if (!b) return;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  ctx.taps.push({ t: ctx.t, x, y });
  await p.mouse.click(x, y);
}];

const clips = {
  // 1. visitor explores home and committees (phone)
  explore: { vp: [390, 844], dsf: 2, dur: 8.4, url: '/', scroll: [[0, 0], [0.8, 0], [2.6, 520], [3.3, 520], [3.5, 0], [4.2, 0], [8.4, 1500]], acts: [tap(3.35, 'nav a[href="/committees"]')] },
  // 2. schedule timeline (phone)
  schedule: { vp: [390, 844], dsf: 2, dur: 5.6, url: '/schedule', scroll: [[0, 0], [0.7, 0], [5.6, 760]], acts: [] },
  // 3. registration form (phone)
  register: {
    vp: [390, 844], dsf: 2, dur: 7.4, url: '/register', scroll: [[0, 0], [7.4, 0]],
    acts: [tap(0.5, 'input[name=name]'), ...typeText(0.8, 'Sara Ahmed'), tap(2.0, 'input[name=email]'), ...typeText(2.3, 'sara.ahmed@datixai.com', 0.06),
      tap(4.0, 'input[name=phone]'), ...typeText(4.3, '0300 0000000', 0.07), tap(5.4, 'button.btn')]
  },
  // 4. organiser dashboard, approve, add member (laptop)
  admin: {
    vp: [960, 680], dsf: 1.5, dur: 12.4, url: '/uokmunadmin', admin: true, scroll: [[0, 0], [12.4, 0]],
    acts: [tap(3.3, '.tabs a', { text: 'Registrations' }), tap(5.2, 'button.btn.ok', { text: 'Approve' }),
      tap(6.6, '.tabs a', { text: 'Members' }), [7.6, p => p.evaluate(() => window.scrollTo(0, 520))], [8.6, p => p.evaluate(() => window.scrollTo(0, 0))],
      tap(9.0, 'button.btn', { text: 'Add member' }), ...typeText(10.0, 'Ayaan Malik', 0.1)]
  },
  // 5. organiser controls what visitors see (laptop)
  content: {
    vp: [960, 680], dsf: 1.5, dur: 7.2, url: '/uokmunadmin', admin: true, tab: 'Content', scroll: [[0, 0], [7.2, 0]],
    acts: [tap(1.2, 'label', { text: 'Announcements on home' }), tap(2.2, 'label', { text: 'How it works' }),
      tap(3.2, 'label', { text: 'Announcements on home' }), tap(4.2, 'label', { text: 'How it works' }), [5.0, p => p.evaluate(() => window.scrollTo(0, 420))]]
  },
  // 6. delegate portal (phone)
  delegate: { vp: [390, 844], dsf: 2, dur: 7.4, url: '/delegate', member: true, scroll: [[0, 0], [1.0, 0], [3.0, 560], [3.8, 560], [7.4, 1700]], acts: [] }
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const want = process.argv.slice(2);
for (const [name, c] of Object.entries(clips)) {
  if (want.length && !want.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: c.vp[0], height: c.vp[1] }, deviceScaleFactor: c.dsf });
  if (c.admin) await ctx.addInitScript(t => sessionStorage.setItem('uokmun_t', t), adminToken);
  if (c.member) await ctx.addInitScript(t => sessionStorage.setItem('uokmun_m', t), memberToken);
  const page = await ctx.newPage();
  await page.goto(BASE + c.url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: CSS + (c.member ? ' .tabs.noprint{display:none!important}' : '') });
  if (c.tab) { await page.locator('.tabs a', { hasText: c.tab }).first().click(); }
  await sleep(1800);                                   // let data load and reveal animations finish before frame 0
  const dir = `work/clips/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const N = Math.round(c.dur * FPS), acts = c.acts.flat ? c.acts.flat(1) : c.acts;
  const flat = []; for (const a of c.acts) { if (Array.isArray(a[0])) flat.push(...a); else flat.push(a); }
  flat.sort((a, b) => a[0] - b[0]);
  const state = { t: 0, taps: [] }; let ai = 0; const t00 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS; state.t = t;
    while (ai < flat.length && flat[ai][0] <= t) { await flat[ai][1](page, state).catch(e => console.log('act failed', name, flat[ai][0], String(e).slice(0, 80))); ai++; }
    let y = c.scroll[0][1];
    for (let k = 1; k < c.scroll.length; k++) { const [t0, y0] = c.scroll[k - 1], [t1, y1] = c.scroll[k]; if (t >= t0 && t <= t1) { y = y0 + (y1 - y0) * ease((t - t0) / (t1 - t0)); break; } if (t > t1) y = y1; }
    if (c.scroll.length > 2 || y > 0) await page.evaluate(v => window.scrollTo(0, v), y);
    fs.writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.jpg`, await page.screenshot({ type: 'jpeg', quality: 86 }));
  }
  fs.writeFileSync(`${dir}/meta.json`, JSON.stringify({ frames: N, fps: FPS, vp: c.vp, dsf: c.dsf, taps: state.taps }));
  console.log(name, N, 'frames in', ((Date.now() - t00) / 1000).toFixed(0), 's, taps', state.taps.length);
  await ctx.close();
}
await browser.close();
