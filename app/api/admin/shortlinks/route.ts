import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyAdminToken } from '@/lib/auth'
import { normalizeShortlink, normalizeDestination } from '@/lib/shortlinks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
function authorized(request: NextRequest) {
  const token = request.cookies.get('admin_jwt')?.value
  return !!token && !!verifyAdminToken(token)
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401)
  try {
    const result = await sql`SELECT slug, destination, created_at, locked FROM shortlinks ORDER BY created_at DESC, slug`
    return json({ links: result.rows })
  } catch { return json({ error: 'Unable to load shortlinks. Check that the shortlinks SQL migration has been run.' }, 500) }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401)
  let slug: string, destination: string
  try {
    const body = await request.json()
    slug = normalizeShortlink(body.slug)
    destination = normalizeDestination(body.destination)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid shortlink.' }, 400) }
  try {
    const page = await sql`SELECT id FROM site_pages WHERE lower(slug) = ${slug} LIMIT 1`
    if (page.rows.length) return json({ error: 'That name is reserved for a site page.' }, 409)
    const result = await sql`INSERT INTO shortlinks (slug, destination) VALUES (${slug}, ${destination}) ON CONFLICT (slug) DO NOTHING RETURNING slug, destination, created_at, locked`
    if (!result.rows.length) return json({ error: 'That shortlink already exists. Choose another name.' }, 409)
    return json({ link: result.rows[0] }, 201)
  } catch { return json({ error: 'Unable to save the shortlink. Check that the shortlinks SQL migration has been run.' }, 500) }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401)
  let slug: string
  try {
    const body = await request.json()
    slug = normalizeShortlink(body.slug)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid shortlink.' }, 400) }
  try {
    const result = await sql`DELETE FROM shortlinks WHERE slug = ${slug} AND locked = FALSE RETURNING slug`
    if (!result.rows.length) return json({ error: 'This shortlink is locked or no longer exists. Unlock it before deleting.' }, 409)
    return json({ deleted: true })
  } catch { return json({ error: 'Unable to delete the shortlink. Please try again.' }, 500) }
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401)
  let slug: string, locked: boolean
  try {
    const body = await request.json()
    slug = normalizeShortlink(body.slug)
    if (typeof body.locked !== 'boolean') return json({ error: 'locked must be true or false.' }, 400)
    locked = body.locked
  } catch { return json({ error: 'Invalid shortlink.' }, 400) }
  try {
    const result = await sql`UPDATE shortlinks SET locked = ${locked} WHERE slug = ${slug} RETURNING slug, destination, created_at, locked`
    if (!result.rows.length) return json({ error: 'Shortlink not found.' }, 404)
    return json({ link: result.rows[0] })
  } catch { return json({ error: 'Unable to update the lock. Check that the shortlink lock SQL migration has been run.' }, 500) }
}
