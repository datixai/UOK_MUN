// Vercel serverless function: every /api/* call lands here.
const { handle } = require('../lib/core');
module.exports = (req, res) => {
  const route = (req.query && req.query.route) || new URL(req.url, 'http://x').pathname.replace(/^\/api\//, '');
  return handle(req, res, String(route));
};
