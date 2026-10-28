import { getCarpoolSettings, carpoolCallbackUrl } from '@/lib/carpool-settings'
import { saveCarpoolSource } from '@/lib/carpool-source'
import { getDashboardLink } from '@/lib/sheet-embed'
import { secureRoute } from '@/lib/api-security'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 120
const input = z.object({
  eventName: z.string().trim().min(1).max(200),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T00:00:00Z')
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }),
})
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
function googleUrl(value: unknown, kind: 'form' | 'sheet'): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname === 'docs.google.com' &&
      url.pathname.startsWith(kind === 'form' ? '/forms/d/' : '/spreadsheets/d/')
  } catch { return false }
}
async function POSTHandler(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get('admin_jwt')?.value || ''))) return reply({ error: 'Please log in as an admin.' }, 401)
  if (!req.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Expected JSON.' }, 415)
  const raw = await req.text()
  if (raw.length > 2048) return reply({ error: 'Request is too large.' }, 413)
  let data
  try { data = input.parse(JSON.parse(raw)) } catch { return reply({ error: 'Enter an event title and a valid start date.' }, 400) }
  const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
  const secret = process.env.CARPOOL_API_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) return reply({ error: 'The private carpool connection is not configured.' }, 503)
  try {
    const settings = await getCarpoolSettings()
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ...settings, callbackUrl: carpoolCallbackUrl(), apiKey: secret, timestamp: Date.now() }),
      redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(110000),
    })
    const result = await response.json()
    if (!response.ok || result.status !== 'success' || !googleUrl(result.data?.formPublishedUrl, 'form') || !googleUrl(result.data?.dashboardUrl, 'sheet')) {
      return reply({ error: 'Google could not complete this request. Check Apps Script executions and the event folder in Google Drive before creating another carpool.' }, 502)
    }
    const dashboard = getDashboardLink(result.data.dashboardUrl)
    if (dashboard && result.data.sourceId) await saveCarpoolSource(dashboard.spreadsheetId, result.data.sourceId)
    return reply({ signupUrl: result.data.formPublishedUrl, dashboardUrl: result.data.dashboardUrl })
  } catch {
    return reply({ error: 'No confirmation received from Google. Wait a minute, then retry with the same title and date to recover the links. Check the event folder in Google Drive if this continues.' }, 502)
  }
}

export const POST = secureRoute(POSTHandler)
