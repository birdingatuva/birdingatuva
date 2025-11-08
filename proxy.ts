import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Only protect /admin and /api/events POST
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isApiEvents = request.nextUrl.pathname.startsWith('/api/events') && request.method === 'POST'

  if (isAdmin || isApiEvents) {
    // Simple HTTP Basic Auth for /admin page
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/events']
}
