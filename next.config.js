/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",           // Next.js injects small inline scripts
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://storage.googleapis.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ');

module.exports = {
  experimental: { serverComponentsExternalPackages: ['firebase-admin'] },
  poweredByHeader: false,
  async redirects() { // the conference moved under /uokmun when the department site took the front page; old links keep working
    return [{ source: '/documents', destination: '/uokmun/press-release', permanent: true }, { source: '/uokmun/documents', destination: '/uokmun/press-release', permanent: true },
      ...['committees', 'schedule', 'register', 'press-release', 'delegate'].map(p => ({ source: '/' + p, destination: '/uokmun/' + p, permanent: true }))];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
    ] }];
  }
};
