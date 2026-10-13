import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { claimDelivery, finishDelivery, getDelivery, groupMeRevision } from '@/lib/groupme-deliveries'
import { getSitePage, getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { renderGroupMeMessage } from '@/lib/groupme'

import { getGroupMeConfig, getGroupMeDestination, GROUPME_CONFIG_ERROR } from '@/lib/groupme-config'

export const runtime = 'nodejs'
type Context = { params: Promise<{ slug: string }> }

async function prepare(slug: string, includeHidden = false) {
  const event = await getEvent(slug, includeHidden)
  if (!event || !(await getSitePage('events', includeHidden))) return null
  const custom = await getSitePageSetting('events', `groupme_message:${event.slug}`)
  let text = typeof custom === 'string' ? custom : ''
  if (typeof custom !== 'string') {
    const saved = await getSitePageSetting('events', 'groupme_template')
    const template = typeof saved === 'string' ? saved : await getSitePageSetting('events', 'groupme_default_template')
    if (typeof template === 'string' && template.trim()) text = renderGroupMeMessage(template, event, process.env.GROUPME_SITE_URL || 'https://birdingatuva.org', true)
  }
  return { slug: event.slug, text, revision: groupMeRevision(event) }
}

export async function GET(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const config = getGroupMeConfig()
    const message = await prepare((await context.params).slug, true)
    if (!message) return NextResponse.json({ error: 'Publish the event and Events page before sending.' }, { status: 404 })
    return NextResponse.json({ ...message, delivery: await getDelivery(message.slug, message.revision), configured: config.configured, destination: await getGroupMeDestination(config).catch(() => 'GroupMe') }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to preview. Check that the saved template produces a valid message within 1,000 characters.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  let data
  try { data = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  if (typeof data?.text !== 'string' || !data.text.trim() || data.text.length > 1000) return NextResponse.json({ error: 'Enter a message within 1,000 characters.' }, { status: 400 })
  try {
    const event = await getEvent((await context.params).slug, true)
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    const saved = await updateSitePageSetting('events', `groupme_message:${event.slug}`, data.text)
    if (saved === null) throw new Error('Missing Events page')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save the event message.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  let data
  try { data = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const { accessToken, topicId, configured } = getGroupMeConfig()
  if (!configured) return NextResponse.json({ error: GROUPME_CONFIG_ERROR }, { status: 503 })
  let message
  try {
    message = await prepare((await context.params).slug)
    if (!message) return NextResponse.json({ error: 'Publish the event and Events page before sending.' }, { status: 404 })
    if (!message.text.trim() || message.text.length > 1000) return NextResponse.json({ error: 'Save a message within 1,000 characters before sending.' }, { status: 400 })
    // Never send arbitrary client-supplied text, or a message changed since preview.
    if (data?.text !== message.text || data?.revision !== message.revision) return NextResponse.json({ error: 'The event or message changed. Reload the page before sending.' }, { status: 409 })
    if (!(await claimDelivery(message.slug, message.revision))) {
      return NextResponse.json({ delivery: await getDelivery(message.slug, message.revision), alreadyClaimed: true })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to prepare the message. Check the template and run the GroupMe database setup.' }, { status: 500 })
  }
  try {
    const response = await fetch(`https://api.groupme.com/v3/groups/${topicId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Token': accessToken },
      body: JSON.stringify({ message: { source_guid: message.revision, text: message.text } }),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    })
    if (!response.ok) throw new Error('GroupMe did not confirm delivery.')
    await finishDelivery(message.slug, message.revision, 'sent')
    return NextResponse.json({ success: true, delivery: 'sent' })
  } catch {
    // An interrupted response can still mean delivery; never automatically retry.
    await finishDelivery(message.slug, message.revision, 'unconfirmed').catch(() => {})
    return NextResponse.json({ delivery: 'unconfirmed', error: 'Delivery could not be confirmed. Check GroupMe. Sending is locked for this version of the trip to prevent duplicates.' }, { status: 502 })
  }
}
