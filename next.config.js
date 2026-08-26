/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimasi image — whitelist domain TMDB
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
    ],
    // Format modern untuk performa lebih baik
    formats: ['image/avif', 'image/webp'],
  },

  // Kompresi Brotli/Gzip & SWC Minification
  compress: true,
  swcMinify: true,

  // Tree-shaking lucide-react agar bundle lebih kecil
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Header security untuk production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
