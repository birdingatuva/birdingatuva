export const maxDuration = 60
import { resolveCarpoolSource } from '@/lib/carpool-source'
import { NextRequest, NextResponse } from 'next/server'
import { boundedBody, secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { getDashboardLink } from '@/lib/sheet-embed'
import { rateLimit } from '@/lib/rate-limit'
import { adminResponsesSchema } from '@/lib/admin-responses'

export const runtime = 'nodejs'

export const POST = secureRoute(async (request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const admin = await verifyAdminToken(request.cookies.get('admin_jwt')?.value || '')
  if (!admin) return NextResponse.json({ error: 'Please log in as an admin.' }, { status: 401 })
  if (!(await rateLimit(`admin-responses:${admin.jti}`, 10, 60)).allowed) {
    return NextResponse.json({ error: 'Please wait before refreshing again.' }, { status: 429 })
  }
  const event = await getEvent((await context.params).slug, true)
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  const dashboard = getDashboardLink(event.dashboardUrl || '')
  if (!dashboard) return NextResponse.json({ error: 'This event needs a valid carpool dashboard.' }, { status: 422 })
  const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
  const secret = process.env.CARPOOL_API_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) {
    return NextResponse.json({ error: 'The private carpool connection is not configured.' }, { status: 503 })
  }
  try {
    const sourceId = await resolveCarpoolSource(dashboard.spreadsheetId)
    if (!sourceId) return NextResponse.json({ error: 'Private responses are unavailable for this older event.' }, { status: 422 })
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminResponses', dashboardId: dashboard.spreadsheetId, sourceId, passengersNameRange: process.env.CARPOOL_PASSENGERS_NAME_RANGE, apiKey: secret, timestamp: Date.now() }),
      cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20000),
    })
    const result = JSON.parse(new TextDecoder().decode(await boundedBody(response, 512 * 1024)))
    if (!response.ok || result.status !== 'success') throw new Error('Lookup failed')
    return NextResponse.json(adminResponsesSchema.parse(result.data))
  } catch {
    return NextResponse.json({ error: 'Unable to load private responses. Check the Apps Script deployment, source mapping, and response sheet headers.' }, { status: 502 })
  }
})
