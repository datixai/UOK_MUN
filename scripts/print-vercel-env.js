// Prints the environment variables to paste into Vercel (Project, Settings, Environment Variables).
// Run on your own computer only: node scripts/print-vercel-env.js   (the output contains your private key, do not share it)
const fs = require('fs'), path = require('path');
const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
const crypto = require('crypto');
console.log('Add these in Vercel, Project, Settings, Environment Variables (Production, Preview and Development), then Redeploy:\n');
console.log('FIREBASE_PROJECT_ID=' + j.project_id);
console.log('FIREBASE_CLIENT_EMAIL=' + j.client_email);
console.log('FIREBASE_PRIVATE_KEY=' + JSON.stringify(j.private_key));
console.log('FIREBASE_STORAGE_BUCKET=' + j.project_id + '.firebasestorage.app');
console.log('AUTH_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('ADMIN_EMAIL=uokmun4@gmail.com');
console.log('\n(Leave ADMIN_PASSWORD out to choose the password yourself at /uokmunadmin, or set it here to fix it.)');
