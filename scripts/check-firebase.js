// Checks that the server can reach Firestore (and Storage). Run from the project folder: node scripts/check-firebase.js
const { read, mutate, useFirebase } = require('../lib/store');
(async () => {
  console.log('Firebase credentials found:', useFirebase());
  if (!useFirebase()) return;
  try { const st = await read(); console.log('Firestore read OK. Registrations stored:', st.regs.length, '| members:', (st.members || []).length); }
  catch (e) { console.log('Firestore error:', e.code || '', String(e.message).slice(0, 300)); }
})();
