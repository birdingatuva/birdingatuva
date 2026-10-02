import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { DEFAULT_GROUPME_TEMPLATE, validateGroupMeTemplate } from '@/lib/groupme'

export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const saved = await getSitePageSetting('events', 'groupme_template')
    return NextResponse.json({ template: typeof saved === 'string' ? saved : DEFAULT_GROUPME_TEMPLATE, configured: !!process.env.GROUPME_ACCESS_TOKEN?.trim() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load GroupMe settings.' }, { status: 500 })
  }
}
export async function PUT(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_jwt')?.value || '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  let data
  try { data = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const error = validateGroupMeTemplate(data?.template)
  if (error) return NextResponse.json({ error }, { status: 400 })
  try {
    const saved = await updateSitePageSetting('events', 'groupme_template', data.template)
    if (saved === null) throw new Error('Missing events page')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save GroupMe settings.' }, { status: 500 })
  }
}
