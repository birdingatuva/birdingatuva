/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Use custom loader with wsrv.nl to avoid Vercel's image optimization costs
    // (transformation, cache reads, cache writes)
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
  async headers() {
    return [
      // Aggressively cache public images (immutable content under /public/images)
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Ensure icon and static assets also leverage long-term caching
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
