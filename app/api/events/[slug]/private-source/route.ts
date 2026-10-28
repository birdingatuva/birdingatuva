export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { getDashboardLink } from '@/lib/sheet-embed'
import { resolveCarpoolSource } from '@/lib/carpool-source'
import { rateLimit } from '@/lib/rate-limit'

export const POST = secureRoute(async (request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const admin = await verifyAdminToken(request.cookies.get('admin_jwt')?.value || '')
  if (!admin) return NextResponse.json({ error: 'Please log in as an admin.' }, { status: 401 })
  if (!(await rateLimit(`private-source:${admin.jti}`, 30, 60)).allowed) return NextResponse.json({ error: 'Please try again shortly.' }, { status: 429 })
  const event = await getEvent((await context.params).slug, true)
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  const dashboard = getDashboardLink(event.dashboardUrl || '')
  if (!dashboard) return NextResponse.json({ available: false })
  try {
    return NextResponse.json({ available: !!(await resolveCarpoolSource(dashboard.spreadsheetId)) })
  } catch {
    return NextResponse.json({ error: 'Could not check private responses. Please reload to retry.' }, { status: 502 })
  }
})
