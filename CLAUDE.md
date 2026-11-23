# UOK MUN conference platform (Datix AI)

Context file for Claude on any PC. Read this first. Update "Status", "Next steps" and the "Progress log" at the end of every work session.

## What the project is
Web app for UOK MUN (University of Kotli Model United Nations), built for the UOK MUN organising team. Three views: public site (home, committees, schedule, register), delegate and chair portal (`/delegate`, each person sees only their own committee), and a private admin (`/uokmunadmin`) that controls everything visitors see, the members, committees, schedule, roll call, floor, scores and certificates. Stack: Next.js 14 (App Router), Firebase Firestore and Storage through the Admin SDK, deployed on Vercel at https://uok-mun.vercel.app. Repo: github.com/datixai/UOK_MUN (branch main).

## Status (2026-11-21)
- Done: all three views, admin Members tab, delegate portal with profile menu, WhatsApp float button (public pages only), caching of public pages, security hardening, two test suites, Crisis Cell and UNGA committee logos, test accounts, promo reel script in `marketing/reel/`.
- Done: promo reel `marketing/reel/UOKMUN-reel.mp4` (52.6 s, 1080x1920) built from a throw-away demo server with fictional data.
- Waiting on: Firebase variables uploaded to Vercel (`.env.vercel`, then Redeploy); Firebase Storage enabled in the console (pictures are stored inline until then).

## Key decisions
1. No public status lookup and no public chair names: chairs and delegates are visible only to the admin and to members of the same committee.
2. Admin login is email plus password; the owner email is fixed by `ADMIN_EMAIL`. Delegates are created by the admin, activate with a one-time access code, then choose their own password.
3. Public pages are pre-built and cached; saving in admin refreshes them at once (`revalidatePath`).
4. Tokens are signed and tied to the password hash, so a password change logs everyone out.
5. Data lives in one Firestore document (`uokmun/state`); a 4 second read cache keeps requests fast.

## Folder structure
```
app/            Next.js routes (public pages, /delegate, /uokmunadmin, /api/[route])
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
- Tests: `node scripts/test-all.js` against a throw-away file-mode server (see the file header), `node scripts/test-data-flow.js http://localhost:3000` (restores the database afterwards).

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
- 2026-11-23: added the Documents page (admin managed links, toggle) and the Awards section (Best Delegate, Outstanding Diplomacy, Special Mention); made the editable Guide to Delegate Preparation (`scripts/make-delegate-guide.py` writes `public/docs/UOKMUN-Delegate-Guide.docx`, dates and times marked To be announced).
- 2026-11-21: added this file; made the promo reel in `marketing/reel/` (`seed-demo.cjs` fills a file-mode demo DB, `record.mjs` records it with Playwright at 30 fps, `compose.py` renders; re-run order: seed, start demo server on port 3200, record, compose). Made the phone header compact (brand and login on one row), cleaned leftover QA test text from the real database.
- 2026-11-20: removed the status page and public chair names, added the Crisis Cell logo, hid visitor-only items for signed-in users, added a read cache.
- 2026-11-19: delegate portal, members, profile menu, WhatsApp button, caching, security hardening, tests, test accounts, Vercel env file.
- 2026-11-18: rewrote the site in Next.js with Firebase; flags, University of Kotli logo, UNGA committee.
