import { secureRoute } from '@/lib/api-security'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { validateGroupMeTemplate } from '@/lib/groupme'

import { getGroupMeConfig, getGroupMeDestination } from '@/lib/groupme-config'

export const runtime = 'nodejs'
async function GETHandler(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const config = getGroupMeConfig()
    const { configured } = config
    const destination = await getGroupMeDestination(config)
    const saved = await getSitePageSetting('events', 'groupme_template')
    const defaultTemplate = await getSitePageSetting('events', 'groupme_default_template')
    return NextResponse.json({ template: typeof saved === 'string' ? saved : typeof defaultTemplate === 'string' ? defaultTemplate : '', configured, destination }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load GroupMe settings.' }, { status: 500 })
  }
}
async function PUTHandler(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let data
  try { data = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  if (data?.target !== undefined && data.target !== 'template' && data.target !== 'default') return NextResponse.json({ error: 'Invalid template target.' }, { status: 400 })
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

export const GET = secureRoute(GETHandler)

export const PUT = secureRoute(PUTHandler)
