import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { defaultBannerContent, isBannerContent } from '@/lib/banner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const [content, enabled] = await Promise.all([
    getSitePageSetting('home', 'banner'),
    getSitePageSetting('home', 'bannerEnabled'),
  ])
  return NextResponse.json({
    content: isBannerContent(content) ? content : defaultBannerContent,
    enabled: enabled === true,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('admin_jwt')?.value || ''
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  // Separate writes ensure visibility never saves a draft or overwrites content.
  if (body && typeof body.enabled === 'boolean' && body.content === undefined) {
    const setting = await updateSitePageSetting('home', 'bannerEnabled', body.enabled)
    if (setting === null) return NextResponse.json({ error: 'Home settings not found.' }, { status: 404 })
    return NextResponse.json({ enabled: setting })
  }
  if (body && body.enabled === undefined && isBannerContent(body.content)) {
    const { markdown, backgroundColor, textColor } = body.content
    const content = await updateSitePageSetting('home', 'banner', { markdown, backgroundColor, textColor })
    if (content === null) return NextResponse.json({ error: 'Home settings not found.' }, { status: 404 })
    return NextResponse.json({ content })
  }
  return NextResponse.json({ error: 'Provide banner text and valid hex colors, or a visibility setting.' }, { status: 400 })
}
