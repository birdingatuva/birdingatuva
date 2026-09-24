/**
 * Custom image loader using wsrv.nl
 * This replaces Vercel's image optimization to avoid transformation, cache read, and cache write costs
 * 
 * Automatically detects the deployment URL from Vercel environment variables:
 * - Production: Uses VERCEL_PROJECT_PRODUCTION_URL or custom domain
 * - Preview/Development: Uses VERCEL_URL
 * - Local: Uses localhost:3000 or custom NEXT_PUBLIC_SITE_URL
 * 
 * Documentation: https://wsrv.nl/docs/
 */

interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}

function getDeploymentDomain(): string {
  // Priority order for domain detection:
  // 1. Custom site URL (if explicitly set)
  // 2. Vercel production URL (for production deployments)
  // 3. Vercel URL (for preview deployments)
  // 4. Fallback to production domain
  
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '')
  }
  
  // Vercel automatically sets these environment variables
  // VERCEL_PROJECT_PRODUCTION_URL: Your production domain (e.g., birdingatuva.org)
  // VERCEL_URL: The deployment URL (e.g., your-project-git-branch.vercel.app)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL
  }
  
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL
  }
  
  // Fallback for local development
  return 'localhost:3000'
}

export default function wsrvImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const domain = getDeploymentDomain()
  
  // For Cloudinary URLs, route through wsrv.nl for free optimization
  // This also works during local development because Cloudinary is publicly reachable.
  // Keeping this ahead of the localhost check ensures the requested width is applied.
  if (src.includes('cloudinary.com') || src.includes('res.cloudinary.com')) {
    // Extract just the URL without protocol
    const imageUrl = src.replace(/^https?:\/\//, '')
    return buildWsrvUrl(imageUrl, width, quality)
  }

  // All other external images are also publicly reachable from wsrv.nl.
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const imageUrl = src.replace(/^https?:\/\//, '')
    return buildWsrvUrl(imageUrl, width, quality)
  }

  // wsrv.nl cannot access files served only by the local development server.
  // Include the requested width in the local URL so each srcset candidate remains
  // distinct and the custom loader still honors Next.js's width contract.
  if (domain === 'localhost:3000' || domain.includes('localhost')) {
    return addWidthParam(src, width)
  }
  
  // For production/preview deployments with local images, use wsrv.nl
  let imageUrl: string
  
  if (src.startsWith('/')) {
    // For absolute paths, prepend the deployment domain
    imageUrl = `${domain}${src}`
  } else {
    // Relative path
    imageUrl = `${domain}/${src}`
  }
  
  return buildWsrvUrl(imageUrl, width, quality)
}

function addWidthParam(src: string, width: number): string {
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}w=${width}`
}

function buildWsrvUrl(imageUrl: string, width: number, quality?: number): string {
  // Build wsrv.nl URL with parameters
  const params = new URLSearchParams()
  
  // Set the image URL (must be URL encoded if it contains querystrings)
  params.set('url', imageUrl)
  
  // Set width
  params.set('w', width.toString())
  
  // Set quality (default to 80 if not specified)
  if (quality) {
    params.set('q', quality.toString())
  }
  
  // Add output format for better compression
  // wsrv.nl will automatically detect and use WebP if the browser supports it
  params.set('output', 'webp')
  
  // Add other optimizations
  params.set('il', '') // Progressive/interlaced images
  
  // Return the full wsrv.nl URL
  return `https://wsrv.nl/?${params.toString()}`
}
