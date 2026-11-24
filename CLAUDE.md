# UOK MUN conference platform (Datix AI)

Context file for Claude on any PC. Read this first. Update "Status", "Next steps" and the "Progress log" at the end of every work session.

## What the project is
Website of the Department of International Relations, University of Kotli (front page `/`, events, news, admin-made extra pages such as `/faculty`), with UOK MUN (University of Kotli Model United Nations) as one of its events under `/uokmun`. MUN views: public site (`/uokmun`, committees, schedule, register), member portal (`/uokmun/delegate`: delegates see their own committee, chairs see every committee they supervise, observers view the chairs and delegates of their assigned committees), and a private admin (`/uokmunadmin`) that controls everything visitors see, the members, committees, schedule, roll call, floor, scores and certificates. Stack: Next.js 14 (App Router), Firebase Firestore and Storage through the Admin SDK, deployed on Vercel, live at https://iruok.com. Repo: github.com/datixai/UOK_MUN (branch main).

## Status (2026-11-21)
- Done: all three views, admin Members tab, delegate portal with profile menu, WhatsApp float button (public pages only), caching of public pages, security hardening, two test suites, Crisis Cell and UNGA committee logos, test accounts, promo reel script in `marketing/reel/`.
- Done: promo reel `marketing/reel/UOKMUN-reel.mp4` (52.6 s, 1080x1920) built from a throw-away demo server with fictional data.
- Waiting on: Firebase variables uploaded to Vercel (`.env.vercel`, then Redeploy); Firebase Storage enabled in the console (pictures are stored inline until then).

## Key decisions
0. The department site owns `/`; UOK MUN lives under `/uokmun` (route groups `app/(ir)` and `app/(mun)`). Old links (`/committees`, `/delegate` and so on) redirect to `/uokmun/...` in `next.config.js`. Department content is state key `ir`, edited in Admin, Department site tab. Extra page addresses must not use reserved names (`RESERVED` in `lib/core.js`).
0b. Roles: Delegate (one committee, `committee`), Chair, Vice Chair, Rapporteur, Secretary (several committees, `committees` array plus `committee` = first), Observer (view only, `committees`). `scopeOf()` in core.js and Admin.jsx decides who sees what. Observers are never listed as chairs.
1. No public status lookup and no public chair names: chairs and delegates are visible only to the admin and to members of the same committee.
2. Admin login is email plus password; the owner email is fixed by `ADMIN_EMAIL`. Delegates are created by the admin, who sets each person's password in the Members tab (stored only as a hash); they sign in with email and password. There is no access code.
3. Public pages are pre-built and cached; saving in admin refreshes them at once (`revalidatePath`).
4. Tokens are signed and tied to the password hash, so a password change logs everyone out.
5. Data lives in one Firestore document (`uokmun/state`); a 4 second read cache keeps requests fast.

## Folder structure
```
app/            Next.js routes: (ir)/ department site (/, /[slug]), (mun)/ UOK MUN (/uokmun/..., /uokmunadmin), api/[route]
components/     Shell.jsx (nav, profile menu, WhatsApp button, countdown)
lib/            core.js (API, auth, input cleaning), store.js (file or Firestore), data.js, defaults.js
public/         logos, committee logos, flags
scripts/        tests, seed, Firebase check, logo and avatar makers
marketing/reel/ promo reel scripts (record.mjs, compose.py)
_legacy/        old single-file version (git-ignored)
```

## How to set up and run
- `npm install`, then `npm run dev` or `npm run build` and `npm start`. Open http://localhost:3000.
- Firebase: save the service-account key as `firebase-service-account.json` (git-ignored). Without it the app uses `data/data.json`.
- Vercel: run `node scripts/make-vercel-env.js`, upload the generated `.env.vercel` under Project, Settings, Environment Variables, then Redeploy.
- Tests: `node scripts/test-roles.js` (chairs, observers, department pages, redirects), `node scripts/test-all.js` against a throw-away file-mode server (see the file header), `node scripts/test-data-flow.js http://localhost:3000` (restores the database afterwards).

## Known problems / risks
- Firestore reads take 1 to 4 seconds from Pakistan on a cold server.
- Rate limits are per server instance (partial protection on Vercel).
- Test accounts (password `test123#`) exist in the real database: change the admin password and remove the test members before real use (`node scripts/seed-test-data.js --remove`).
- All data is one Firestore document (1 MB limit): enable Storage so photos are stored outside it.

## Next steps
1. Add the Vercel environment variables, redeploy, check the live site and admin.
2. Enable Firebase Storage.
3. Replace the test data with real committees, countries, chairs and delegates.
4. Change the admin password.

## Rules for this project
- No em or en dashes anywhere.
- Keep this project's files only in this folder.
- Never show real contact details, emails or credentials in the promo reel or any public asset.
- Git: commit as the local identity, no Claude attribution, ask before every push.

## Progress log
- 2026-11-24: replaced the Delegate Guide with the team's edited Word file (`docs/UOKMUN-Delegate-Guide.docx`, exported with Word to `public/docs/UOKMUN-Delegate-Guide.pdf`, same link on the Press Release page). Do not run `scripts/make-delegate-guide.py` again: it would overwrite the edited guide.
- 2026-11-24 (later): department cards centred, front page section headings editable in Admin; original footer restored everywhere (`components/Footer.jsx`, do not redesign it); optional profile picture on the registration form (resized in the browser, moves to the member on Add as delegate); picture uploads fall back to inline storage when Firebase Storage fails, which was why admin photos did not appear on the live site.
- 2026-11-24 (office PC): department of IR front page at `/` with events, news, programmes and admin-made pages; UOK MUN moved to `/uokmun` with redirects from old links; chairs can supervise several committees; new Observer role (view only); portal renamed Member portal; new test file `scripts/test-roles.js` (35 checks) and test-all (99 checks) pass on a throw-away server.
- 2026-11-23: removed the access-code activation; the admin sets each member's password (Generate, Set password, Remove access, Send login on WhatsApp); guide published as PDF (editable Word source in `docs/`).
- 2026-11-23: renamed the nav tab to Press Release (route /press-release, /documents redirects); added the Documents page (admin managed links, toggle) and the Awards section (Best Delegate, Outstanding Diplomacy, Special Mention); made the editable Guide to Delegate Preparation (`scripts/make-delegate-guide.py` writes `docs/UOKMUN-Delegate-Guide.docx` (editable), export to PDF as `public/docs/UOKMUN-Delegate-Guide.pdf`, dates and times marked To be announced).
- 2026-11-21: added this file; made the promo reel in `marketing/reel/` (`seed-demo.cjs` fills a file-mode demo DB, `record.mjs` records it with Playwright at 30 fps, `compose.py` renders; re-run order: seed, start demo server on port 3200, record, compose). Made the phone header compact (brand and login on one row), cleaned leftover QA test text from the real database.
- 2026-11-20: removed the status page and public chair names, added the Crisis Cell logo, hid visitor-only items for signed-in users, added a read cache.
- 2026-11-19: delegate portal, members, profile menu, WhatsApp button, caching, security hardening, tests, test accounts, Vercel env file.
- 2026-11-18: rewrote the site in Next.js with Firebase; flags, University of Kotli logo, UNGA committee.
