/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverComponentsExternalPackages: ['firebase-admin'] },
  async rewrites() { return []; },
  poweredByHeader: false
};
