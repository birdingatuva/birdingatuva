import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Only protect /api/events POST (not /admin page itself, that's protected client-side)
  const isApiEvents = request.nextUrl.pathname.startsWith('/api/events') && request.method === 'POST'

  if (isApiEvents) {
    // Simple HTTP Basic Auth for API
    const authHeader = request.headers.get('authorization')
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/events']
}
