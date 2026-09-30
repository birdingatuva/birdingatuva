import { NextRequest, NextResponse } from 'next/server'
import { getDashboardLink } from '@/lib/sheet-embed'
import { parseCarpoolRows } from '@/lib/carpool-data'

export async function GET(request: NextRequest) {
  const sheet = getDashboardLink(request.nextUrl.searchParams.get('url') || '')
  if (!sheet) return NextResponse.json({ error: 'A Google Sheets dashboard URL is required.' }, { status: 400 })
  try {
    let data
    {
      const key = process.env.GOOGLE_SHEETS_API_KEY
      if (!key) return NextResponse.json({ error: 'The dashboard connection is not configured.' }, { status: 503 })
      // The carpool generator names every public dashboard tab "Dashboard".
      // Keep the key in a server-only header, never in a browser URL or response.
      const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/${encodeURIComponent('Dashboard!A:D')}`
      const response = await fetch(endpoint, {
        headers: { 'X-Goog-Api-Key': key },
        signal: AbortSignal.timeout(10000), cache: 'no-store',
      })
      if ([400, 403, 404].includes(response.status)) return NextResponse.json({ error: 'The dashboard link is broken or the sheet is not publicly accessible.' }, { status: 422 })
      if (!response.ok) throw new Error('Sheet unavailable')
      const result = await response.json()
      if (!Array.isArray(result.values)) throw new Error('Missing dashboard data')
      const rows = result.values.map((row: unknown) => {
        if (!Array.isArray(row)) throw new Error('Invalid dashboard data')
        return row.map(cell => String(cell ?? '').trim())
      })
      data = parseCarpoolRows(rows)
    }
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=15' } })
  } catch {
    return NextResponse.json({ error: 'The dashboard is unavailable. Please check the source sheet or try again shortly.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
