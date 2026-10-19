import { secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePage, updateSitePageContent } from '@/lib/pages-db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function GETHandler(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const request = _request
    const adminRequested = new URL(request.url).searchParams.get('admin') === 'true'
    const token = request.cookies.get('admin_jwt')?.value || ''
    const page = await getSitePage(slug, adminRequested && !!token && !!(await verifyAdminToken(token)))
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    return NextResponse.json({ page }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 })
  }
}

async function PUTHandler(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const token = request.cookies.get('admin_jwt')?.value || ''
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await params
    const body = await request.json() as { contentMarkdown?: unknown }
    if (!['faq'].includes(slug) || typeof body.contentMarkdown !== 'string' || body.contentMarkdown.length > 100000) {
      return NextResponse.json({ error: 'contentMarkdown must be a string' }, { status: 400 })
    }

    const page = await updateSitePageContent(slug, body.contentMarkdown)
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    return NextResponse.json({ page })
  } catch {
    return NextResponse.json({ error: 'Failed to save page' }, { status: 500 })
  }
}
export const GET = secureRoute(GETHandler)

export const PUT = secureRoute(PUTHandler)
