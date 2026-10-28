import { getCarpoolSettings, carpoolCallbackUrl } from '@/lib/carpool-settings'
export const maxDuration = 60
import { resolveCarpoolSource } from '@/lib/carpool-source'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { boundedBody, secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { getDashboardLink } from '@/lib/sheet-embed'
import { rateLimit } from '@/lib/rate-limit'
import { emailAddressSchema } from '@/lib/email'
import { recipientLookupError } from '@/lib/text-recipients'

export const runtime = 'nodejs'
const input = z.object({
  requestId: z.string().uuid(), subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value)),
  body: z.string().trim().min(1).max(4000), expectedEmails: z.array(emailAddressSchema).min(1).max(49),
}).strict()
export const POST = secureRoute(async (request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const admin = await verifyAdminToken(request.cookies.get('admin_jwt')?.value || '')
  if (!admin) return NextResponse.json({ error: 'Please log in as an admin.' }, { status: 401 })
  if (!(await rateLimit(`email-send:${admin.jti}`, 5, 60)).allowed) return NextResponse.json({ error: 'Please wait before sending another email.' }, { status: 429 })
  const parsed = input.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Use a subject within 200 characters, a message within 4,000, and at most 49 recipients.' }, { status: 400 })
  const event = await getEvent((await context.params).slug, true)
  const dashboard = getDashboardLink(event?.dashboardUrl || '')
  if (!event || !dashboard) return NextResponse.json({ error: 'The event or its dashboard is unavailable.' }, { status: 404 })
  const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
  const secret = process.env.CARPOOL_API_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) return NextResponse.json({ error: 'The private carpool connection is not configured.' }, { status: 503 })
  try {
    const settings = await getCarpoolSettings()
    const sourceId = await resolveCarpoolSource(dashboard.spreadsheetId)
    if (!sourceId) return NextResponse.json({ error: 'Private responses are unavailable for this older event.' }, { status: 422 })
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed.data, action: 'sendEventEmail', dashboardId: dashboard.spreadsheetId, sourceId, passengersNameRange: settings.passengersNameRange, callbackUrl: carpoolCallbackUrl(), apiKey: secret, timestamp: Date.now() }),
      cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20000),
    })
    const result = JSON.parse(new TextDecoder().decode(await boundedBody(response, 16384)))
    if (!response.ok || result.status !== 'success') return NextResponse.json({ error: recipientLookupError(result.code) }, { status: 502 })
    if (result.data?.sent !== true) throw new Error('Missing send confirmation')
    return NextResponse.json({ sent: true, alreadySent: result.data.alreadySent === true })
  } catch {
    return NextResponse.json({ error: 'No send confirmation received. Check the club Gmail Sent folder. Retrying the same message will not send a duplicate.' }, { status: 502 })
  }
})
