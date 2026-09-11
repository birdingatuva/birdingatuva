import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function isAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_jwt')?.value || ''
  return !!token && !!verifyAdminToken(token)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; key: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, key } = await params
  return NextResponse.json({ setting: await getSitePageSetting(slug, key) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string; key: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, key } = await params
  const body = await request.json() as { setting?: unknown }
  if (body.setting === undefined) return NextResponse.json({ error: 'setting is required' }, { status: 400 })
  const setting = await updateSitePageSetting(slug, key, body.setting)
  return NextResponse.json({ setting })
}