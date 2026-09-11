import { verifyAdminToken } from '@/lib/auth'
import { listSitePages, updateSitePagePublished } from '@/lib/pages-db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminRequested = new URL(request.url).searchParams.get('admin') === 'true'
  const isAdmin = !!request.cookies.get('admin_jwt')?.value && !!verifyAdminToken(request.cookies.get('admin_jwt')?.value || '')
  if (adminRequested && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const pages = await listSitePages(adminRequested)
    return NextResponse.json({ pages }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('admin_jwt')?.value || ''
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json() as { slug?: unknown; published?: unknown }
    if (typeof body.slug !== 'string' || typeof body.published !== 'boolean') {
      return NextResponse.json({ error: 'slug and published are required' }, { status: 400 })
    }
    if (body.slug === 'admin') return NextResponse.json({ error: 'Admin visibility is fixed' }, { status: 400 })
    const page = await updateSitePagePublished(body.slug, body.published)
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    return NextResponse.json({ page })
  } catch {
    return NextResponse.json({ error: 'Failed to update page visibility' }, { status: 500 })
  }
}