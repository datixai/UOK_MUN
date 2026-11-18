'use strict';
// Storage adapter: local JSON file (default) or Firebase Firestore (when FIREBASE_* env vars are set).
// Developed by Datix AI.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

// Credentials: a downloaded service-account JSON file (easiest locally) or the three FIREBASE_* env vars (Vercel).
let credCache;
function creds() {
  if (credCache !== undefined) return credCache;
  credCache = null;
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || path.join(process.cwd(), 'firebase-service-account.json');
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (j.project_id && j.client_email && j.private_key) credCache = { projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key };
  } catch (e) { /* no file */ }
  if (!credCache && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credCache = { projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.split('\\n').join(String.fromCharCode(10)).replace(/^"|"$/g, '') };
  }
  return credCache;
}
const useFirebase = () => !!creds();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/* ---------- Firebase ---------- */
let ref = null, adminSdk = null;
function sdk() {
  if (adminSdk) return adminSdk;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const c = creds();
    admin.initializeApp({ credential: admin.credential.cert(c), storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (c.projectId + '.firebasestorage.app') });
  }
  adminSdk = admin;
  return admin;
}
function fref() {
  if (!ref) ref = sdk().firestore().collection('uokmun').doc('state');
  return ref;
}
// Saves an image in Firebase Storage and returns a long-lived URL.
async function saveImage(name, buffer, contentType) {
  if (!useFirebase()) throw new HttpError(501, 'Firebase Storage is not connected.');
  const file = sdk().storage().bucket().file('uokmun/' + Date.now() + '-' + name.replace(/[^a-zA-Z0-9._-]/g, '_'));
  await file.save(buffer, { contentType, resumable: false });
  const [url] = await file.getSignedUrl({ action: 'read', expires: '2500-01-01' });
  return url;
}
const parse = snap => { const st = snap.exists ? JSON.parse(snap.data().json) : {}; st.regs = st.regs || []; return st; };

/* ---------- local file ---------- */
const DATA = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'data.json');
let mem = null;
function fileState() {
  if (mem) return mem;
  fs.mkdirSync(path.join(path.dirname(DATA), 'backups'), { recursive: true });
  try { mem = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { mem = {}; }
  mem.regs = mem.regs || [];
  return mem;
}
function persist() {
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(mem));
  fs.renameSync(tmp, DATA);
  const day = path.join(path.dirname(DATA), 'backups', new Date().toISOString().slice(0, 10) + '.json');
  if (!fs.existsSync(day)) fs.copyFileSync(DATA, day);
}

/* ---------- public API ---------- */
function guard() {
  if (process.env.VERCEL && !useFirebase()) throw new HttpError(500, 'Server storage is not configured. Set the FIREBASE_* environment variables on Vercel.');
}
async function read() {
  guard();
  return useFirebase() ? parse(await fref().get()) : fileState();
}
// fn(state) validates first, then mutates, and returns a result. Errors thrown by fn abort the write.
async function mutate(fn) {
  guard();
  if (useFirebase()) {
    const r = fref();
    return r.firestore.runTransaction(async t => {
      const st = parse(await t.get(r));
      const out = await fn(st);
      const json = JSON.stringify(st);
      if (json.length > 950000) throw new HttpError(413, 'The database record is full. Enable Firebase Storage so pictures are stored outside it, or remove old data.');
      t.set(r, { json, updated: new Date().toISOString() });
      return out;
    });
  }
  const st = fileState(), out = await fn(st);
  persist();
  return out;
}
async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (useFirebase()) throw new HttpError(500, 'AUTH_SECRET is not set.');
  const st = fileState();
  if (!st.secret) { st.secret = crypto.randomBytes(32).toString('hex'); persist(); }
  return st.secret;
}
module.exports = { read, mutate, secret, useFirebase, saveImage, HttpError };
