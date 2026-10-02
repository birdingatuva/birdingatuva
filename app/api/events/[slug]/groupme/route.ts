import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { getSitePage, getSitePageSetting } from '@/lib/pages-db'
import { DEFAULT_GROUPME_TEMPLATE, renderGroupMeMessage, GROUPME_TOPIC_ID } from '@/lib/groupme'

export const runtime = 'nodejs'
type Context = { params: Promise<{ slug: string }> }

async function prepare(slug: string) {
  const event = await getEvent(slug)
  if (!event || !(await getSitePage('events'))) return null
  const saved = await getSitePageSetting('events', 'groupme_template')
  const text = renderGroupMeMessage(typeof saved === 'string' ? saved : DEFAULT_GROUPME_TEMPLATE, event, process.env.GROUPME_SITE_URL || 'https://birdingatuva.org')
  return { slug: event.slug, text }
}

export async function GET(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    if (!process.env.GROUPME_ACCESS_TOKEN?.trim()) return NextResponse.json({ error: 'Set GROUPME_ACCESS_TOKEN on the server before sending.' }, { status: 503 })
    const message = await prepare((await context.params).slug)
    if (!message) return NextResponse.json({ error: 'Publish the event and Events page before sending.' }, { status: 404 })
    return NextResponse.json(message, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to preview. Check that the saved template produces a valid message within 1,000 characters.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  let data
  try { data = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const accessToken = process.env.GROUPME_ACCESS_TOKEN?.trim()
  if (!accessToken) return NextResponse.json({ error: 'Set GROUPME_ACCESS_TOKEN on the server before sending.' }, { status: 503 })
  let message
  try {
    message = await prepare((await context.params).slug)
    if (!message) return NextResponse.json({ error: 'Publish the event and Events page before sending.' }, { status: 404 })
    // Never send arbitrary client-supplied text, or a message changed since preview.
    if (data?.text !== message.text) return NextResponse.json({ error: 'The event or template changed. Close and reopen the preview.' }, { status: 409 })
    const claim = await sql`
      INSERT INTO groupme_send_attempts (event_slug, attempted_at) VALUES (${message.slug}, NOW())
      ON CONFLICT (event_slug) DO UPDATE SET attempted_at = NOW()
      WHERE groupme_send_attempts.attempted_at < NOW() - INTERVAL '60 seconds'
      RETURNING event_slug
    `
    if (!claim.rows.length) return NextResponse.json({ error: 'A send was attempted recently. Check GroupMe and wait a minute before sending again.' }, { status: 429 })
  } catch {
    return NextResponse.json({ error: 'Unable to prepare the message. Check the template and run the GroupMe database setup.' }, { status: 500 })
  }
  try {
    const response = await fetch(`https://api.groupme.com/v3/groups/${GROUPME_TOPIC_ID}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Token': accessToken },
      body: JSON.stringify({ message: { source_guid: randomUUID(), text: message.text } }),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    })
    if (!response.ok) return NextResponse.json({ error: `GroupMe returned an error (${response.status}). Check the group before retrying; verify your account can post in the Announcements topic.` }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch {
    // An interrupted response can still mean delivery; never automatically retry.
    return NextResponse.json({ error: 'Delivery could not be confirmed. Check GroupMe before trying again to avoid a duplicate.' }, { status: 502 })
  }
}
