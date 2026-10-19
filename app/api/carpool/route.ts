import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { secureRoute, boundedBody } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { eventSlug } from '@/lib/input-validation'
import { getEvent } from '@/lib/events-db'
import { getSitePage } from '@/lib/pages-db'
import { getDashboardLink } from '@/lib/sheet-embed'
import { parseCarpoolRows } from '@/lib/carpool-data'
import { clientBucket, rateLimit } from '@/lib/rate-limit'

async function GETHandler(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('event') || ''
  if (!eventSlug.safeParse(slug).success) return NextResponse.json({ error: 'A valid event is required.' }, { status: 400 })
  const allowance = await rateLimit(`carpool:${clientBucket(request)}`, 120, 60)
  if (!allowance.allowed) return NextResponse.json({ error: 'Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(allowance.retryAfter) } })
  const admin = !!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))
  const [event, page] = await Promise.all([getEvent(slug, admin), getSitePage('events')])
  if (!event || !page) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  const sheet = getDashboardLink(event.dashboardUrl || '')
  if (!sheet) return NextResponse.json({ error: 'The dashboard link is unavailable.' }, { status: 422 })
  const key = process.env.GOOGLE_SHEETS_API_KEY
  if (!key) return NextResponse.json({ error: 'The dashboard connection is not configured.' }, { status: 503 })
  const cached = await sql`SELECT data FROM carpool_cache WHERE spreadsheet_id = ${sheet.spreadsheetId} AND expires_at > NOW()`
  if (cached.rows.length) return NextResponse.json({ data: cached.rows[0].data })
  // Shared across instances: at most one upstream request per sheet/window, including failures.
  for (const [bucket, limit, seconds] of [[`sheet:${sheet.spreadsheetId}`, 1, 15], ['sheets:global', 30, 60]] as const) {
    const result = await rateLimit(bucket, limit, seconds)
    if (!result.allowed) return NextResponse.json({ error: 'Dashboard refresh is pending. Please retry shortly.' }, { status: 429, headers: { 'Retry-After': String(result.retryAfter) } })
  }
  try {
    const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/${encodeURIComponent('Dashboard!A1:D1000')}`
    const response = await fetch(endpoint, { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error' })
    if ([400, 403, 404].includes(response.status)) return NextResponse.json({ error: 'The dashboard link is broken or the sheet is not publicly accessible.' }, { status: 422 })
    if (!response.ok) throw new Error('Sheet unavailable')
    const result = JSON.parse(new TextDecoder().decode(await boundedBody(response, 1024 * 1024)))
    if (!Array.isArray(result.values) || result.values.length > 1000) throw new Error('Invalid dashboard')
    const rows = result.values.map((row: unknown) => {
      if (!Array.isArray(row) || row.length > 4) throw new Error('Invalid row')
      return row.map(cell => {
        const value = String(cell ?? '').trim()
        if (value.length > 500) throw new Error('Invalid cell')
        return value
      })
    })
    const data = parseCarpoolRows(rows)
    await sql`INSERT INTO carpool_cache (spreadsheet_id, data, expires_at) VALUES (${sheet.spreadsheetId}, ${JSON.stringify(data)}::jsonb, NOW() + INTERVAL '15 seconds') ON CONFLICT (spreadsheet_id) DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at`
    await sql`DELETE FROM carpool_cache WHERE expires_at < NOW() - INTERVAL '1 day'`
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'The dashboard is unavailable. Please try again shortly.' }, { status: 502 })
  }
}
export const GET = secureRoute(GETHandler)
