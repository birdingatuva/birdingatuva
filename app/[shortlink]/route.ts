import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { normalizeShortlink, normalizeDestination } from '@/lib/shortlinks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
export async function GET(_request: Request, { params }: { params: Promise<{ shortlink: string }> }) {
  let slug: string
  try { slug = normalizeShortlink((await params).shortlink) }
  catch { return new NextResponse('Not found', { status: 404, headers }) }
  try {
    const result = await sql`SELECT destination FROM shortlinks WHERE slug = ${slug} LIMIT 1`
    if (!result.rows.length) return new NextResponse('Not found', { status: 404, headers })
    const destination = normalizeDestination(result.rows[0].destination)
    return new NextResponse(null, { status: 302, headers: { ...headers, Location: destination } })
  } catch { return new NextResponse('Shortlinks are temporarily unavailable.', { status: 503, headers }) }
}
