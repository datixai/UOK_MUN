# UOK_MUN

Conference platform for UOK MUN, University of Kotli Model United Nations. Built with Next.js 14 (App Router) and Firebase. Developed by Datix AI.

Public site: Home, Committees, Schedule, Register, My status.
Private admin (not linked anywhere): `/uokmunadmin`, signed in with the admin email and a password.
Admin: dashboard, registrations, allocation, roll call, floor (timer, motions, voting), scores and certificates, content (everything visitors see, committee logos, schedule, announcements), data backup and CSV.

## Run locally
```
npm install
npm run dev        (development)     or     npm run build  then  npm start
```
Open http://localhost:3000 and http://localhost:3000/uokmunadmin.
Without Firebase credentials the data is saved in `data/data.json` (daily copies in `data/backups`), so you can test offline.

## Admin account
`ADMIN_EMAIL` (in `.env.local`) is the owner email, `uokmun4@gmail.com`. The first time you open `/uokmunadmin`, only that email can create the account and you choose the password (8 or more characters). To fix the password in the environment instead, also set `ADMIN_PASSWORD`.

## Connect Firebase (database and pictures)
Project: `uokmun-4456c`. The website never talks to Firebase from the browser; only the server does, with a service account, so the rules stay closed (`firestore.rules`, `storage.rules`).
1. Firebase console, Build, Firestore Database, Create database (production mode). Build, Storage, Get started.
2. Project settings, Service accounts, Generate new private key. Save the downloaded file in this folder as `firebase-service-account.json` (it is git-ignored). Locally that is all.
3. Data then lives in Firestore (collection `uokmun`, document `state`) and uploaded pictures (committee logos) live in Firebase Storage. The startup line shows `Firebase` when the connection is active.

## Deploy on Vercel
1. Push the repo to GitHub, import it in Vercel (framework Next.js, defaults).
2. Add these under Project, Settings, Environment Variables (Vercel does not read `.env.local`): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (copy from the service-account JSON, keep the `\n` characters), `FIREBASE_STORAGE_BUCKET`, `AUTH_SECRET`, `ADMIN_EMAIL`, optionally `ADMIN_PASSWORD`.
3. Vercel has no writable disk, so Firebase is required there.

## Notes
- Delegate emails and phone numbers are never sent to public pages. My status needs email plus phone.
- Admin login and registration are rate limited per server instance. The admin password is stored hashed (scrypt).
- All data is one Firestore document, plenty for a few thousand registrations.
- `_legacy/` holds the previous single-file version and is not part of the app.
