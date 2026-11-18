# UOK_MUN

Conference platform for UOK MUN, University of Kotli Model United Nations. Developed by Datix AI.

Public site: Home, Committees, Schedule, Register, My status.
Private admin (not linked anywhere): `/uokmunadmin`, signed in with an admin email and password.
Admin: dashboard, registrations, allocation, roll call, floor (timer, motions, voting), scores and certificates, content (everything visitors see), data backup and CSV.

## Run locally
Needs Node 18 or newer.

```
npm install        (only needed for Firebase mode)
node server.js     (or double-click start.bat)
```
Open http://localhost:3000 and http://localhost:3000/uokmunadmin.
With no Firebase values in `.env.local`, data is saved in `data/data.json` with a daily copy in `data/backups`.

## Environment (`.env.local`)
Copy `.env.example` to `.env.local` and fill it. `.env.local` is never committed.

| Name | Purpose |
|---|---|
| FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY | Firebase service account. When all three are set, data is stored in Firestore (collection `uokmun`, document `state`). |
| AUTH_SECRET | Long random string that signs admin login tokens (required on Vercel). |
| ADMIN_EMAIL, ADMIN_PASSWORD | Admin account. If set, this account is used and nobody can create another. If empty, the first visit to `/uokmunadmin` creates it. |

## Firebase setup
1. Firebase console, create a project, then Build, Firestore Database, Create database (production mode).
2. Project settings, Service accounts, Generate new private key. From the downloaded JSON copy `project_id`, `client_email` and `private_key` into the three FIREBASE_* values.
3. Firestore rules can stay closed: the website never talks to Firestore directly, only this server does, with the service account.

## Deploy on Vercel
1. Push this repo to GitHub, import it in Vercel (framework preset: Other, no build command).
2. Add every name from `.env.local` under Project, Settings, Environment Variables (`.env.local` itself is not uploaded). For FIREBASE_PRIVATE_KEY paste the whole key with the `\n` characters.
3. Deploy. The static site is served from `public/` and the API runs as a serverless function (`api/[route].js`). Vercel has no writable disk, so Firebase is required there.

## Notes
- Opening `public/index.html` directly (no server) runs in local mode: data stays in that browser only.
- Delegate emails and phone numbers are never sent to public pages. My status needs email plus phone.
- Admin login, registration and status lookups are rate limited per server instance. The password is stored hashed (scrypt).
- All data is one Firestore document, which is plenty for a few thousand registrations. Move registrations to their own collection if you ever expect more.
