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
}

export default nextConfig
