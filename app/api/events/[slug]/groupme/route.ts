import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { getEvent } from '@/lib/events-db'
import { claimDelivery, finishDelivery, getDelivery, groupMeRevision } from '@/lib/groupme-deliveries'
import { getSitePage, getSitePageSetting } from '@/lib/pages-db'
import { renderGroupMeMessage } from '@/lib/groupme'

import { getGroupMeConfig, getGroupMeDestination, GROUPME_CONFIG_ERROR } from '@/lib/groupme-config'

export const runtime = 'nodejs'
type Context = { params: Promise<{ slug: string }> }

async function prepare(slug: string) {
  const event = await getEvent(slug)
  if (!event || !(await getSitePage('events'))) return null
  const saved = await getSitePageSetting('events', 'groupme_template')
  const template = typeof saved === 'string' ? saved : await getSitePageSetting('events', 'groupme_default_template')
  if (typeof template !== 'string' || !template.trim()) throw new Error('Save a GroupMe template in Event Settings before sending.')
  const text = renderGroupMeMessage(template, event, process.env.GROUPME_SITE_URL || 'https://birdingatuva.org')
  return { slug: event.slug, text, revision: groupMeRevision(event) }
}

export async function GET(req: NextRequest, context: Context) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const config = getGroupMeConfig()
    if (!config.configured) return NextResponse.json({ error: GROUPME_CONFIG_ERROR }, { status: 503 })
    const message = await prepare((await context.params).slug)
    if (!message) return NextResponse.json({ error: 'Publish the event and Events page before sending.' }, { status: 404 })
    return NextResponse.json({ ...message, delivery: await getDelivery(message.slug, message.revision), destination: await getGroupMeDestination(config) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to preview. Check that the saved template produces a valid message within 1,000 characters.' }, { status: 500 })
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
    // Never send arbitrary client-supplied text, or a message changed since preview.
    if (data?.text !== message.text || data?.revision !== message.revision) return NextResponse.json({ error: 'The event or template changed. Close and reopen the preview.' }, { status: 409 })
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
