import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64')
  const development = process.env.NODE_ENV !== 'production'
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://wsrv.nl",
    "font-src 'self' data:",
    `connect-src 'self' https://vitals.vercel-insights.com${development ? ' ws: wss:' : ''}`,
    'frame-src https://docs.google.com',
    "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'",
  ].join('; ')
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', policy)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
export const config = { matcher: ['/((?!api(?:/|$)|_next/|images/|favicon.ico|robots.txt|sitemap.xml).*)'] }
