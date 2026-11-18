'use strict';
// Storage adapter: local JSON file (default) or Firebase Firestore (when FIREBASE_* env vars are set).
// Developed by Datix AI.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const useFirebase = () => !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/* ---------- Firebase ---------- */
let ref = null;
function fref() {
  if (ref) return ref;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
    }) });
  }
  ref = admin.firestore().collection('uokmun').doc('state');
  return ref;
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
      t.set(r, { json: JSON.stringify(st), updated: new Date().toISOString() });
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
module.exports = { read, mutate, secret, useFirebase, HttpError };
