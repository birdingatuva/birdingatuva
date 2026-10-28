import { getCarpoolSettings } from '@/lib/carpool-settings'
export const maxDuration = 60
import { resolveCarpoolSource } from '@/lib/carpool-source'
import { NextRequest, NextResponse } from 'next/server'
import { boundedBody, secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { getDashboardLink } from '@/lib/sheet-embed'
import { rateLimit } from '@/lib/rate-limit'
import { recipientLookupError, textRecipientsSchema } from '@/lib/text-recipients'

import { getSitePageSetting } from '@/lib/pages-db'
import { renderSmsMessage, selectSmsTemplate } from '@/lib/sms-template'

export const runtime = 'nodejs'

// POST keeps this explicit, same-origin, authenticated lookup out of prefetches.
export const POST = secureRoute(async (request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const admin = await verifyAdminToken(request.cookies.get('admin_jwt')?.value || '')
  if (!admin) return NextResponse.json({ error: 'Please log in as an admin.' }, { status: 401 })
  const allowance = await rateLimit(`text-recipients:${admin.jti}`, 10, 60)
  if (!allowance.allowed) return NextResponse.json({ error: 'Please wait before loading recipients again.' }, { status: 429 })
  const event = await getEvent((await context.params).slug, true)
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  const dashboard = getDashboardLink(event.dashboardUrl || '')
  if (!dashboard) return NextResponse.json({ error: 'This event needs a carpool dashboard.' }, { status: 422 })
  const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
  const secret = process.env.CARPOOL_API_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) {
    return NextResponse.json({ error: 'The private carpool connection is not configured.' }, { status: 503 })
  }
  let text: string
  try {
    const template = selectSmsTemplate(await getSitePageSetting('events', 'sms_template'))
    text = renderSmsMessage(template, event, process.env.APP_ORIGIN || 'https://birdingatuva.org')
  } catch {
    return NextResponse.json({ error: 'Unable to prepare the SMS message. Check the default SMS template in Event Settings; the completed message must fit within 1,000 characters.' }, { status: 422 })
  }
  try {
    const settings = await getCarpoolSettings()
    const sourceId = await resolveCarpoolSource(dashboard.spreadsheetId)
    if (!sourceId) return NextResponse.json({ error: 'Private responses are unavailable for this older event.' }, { status: 422 })
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'textRecipients', dashboardId: dashboard.spreadsheetId, sourceId, passengersNameRange: settings.passengersNameRange, apiKey: secret, timestamp: Date.now() }),
      cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20000),
    })
    const result = JSON.parse(new TextDecoder().decode(await boundedBody(response, 256 * 1024)))
    if (!response.ok || result.status !== 'success') {
      return NextResponse.json({ error: recipientLookupError(result.code) }, { status: 502 })
    }
    const data = textRecipientsSchema.parse(result.data)
    const recipients = data.recipients.filter((recipient, index, all) => all.findIndex(other => other.phone === recipient.phone) === index)
    return NextResponse.json({ recipients, skipped: data.skipped, text })
  } catch {
    return NextResponse.json({ error: 'Unable to load private recipients. Check the Apps Script deployment, passenger range, and event mapping.' }, { status: 502 })
  }
})
