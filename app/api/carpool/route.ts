import { NextRequest, NextResponse } from 'next/server'
import { getSheetEmbed } from '@/lib/sheet-embed'
import { parseCarpoolCsv } from '@/lib/carpool-csv'

export async function GET(request: NextRequest) {
  const sheet = getSheetEmbed(request.nextUrl.searchParams.get('url') || '')
  if (!sheet?.csvUrl) return NextResponse.json({ error: 'A published Google Sheets URL is required.' }, { status: 400 })
  try {
    const response = await fetch(sheet.csvUrl, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
    if (!response.ok) throw new Error('Sheet unavailable')
    const text = await response.text()
    if (text.length > 1_000_000) throw new Error('Dashboard too large')
    return NextResponse.json({ data: parseCarpoolCsv(text) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'The dashboard is unavailable. Please check the source sheet or try again shortly.' }, { status: 502 })
  }
}
