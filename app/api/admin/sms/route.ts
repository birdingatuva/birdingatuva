import { NextRequest, NextResponse } from 'next/server'
import { secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { normalizeSmsTemplate, selectSmsTemplate, validateSmsTemplate } from '@/lib/sms-template'

export const runtime = 'nodejs'
export const GET = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const saved = await getSitePageSetting('events', 'sms_template')
  return NextResponse.json({ template: normalizeSmsTemplate(selectSmsTemplate(saved)) })
})
export const PUT = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await request.json()
  const error = validateSmsTemplate(data?.template)
  if (error) return NextResponse.json({ error }, { status: 400 })
  const template = normalizeSmsTemplate(data.template)
  const saved = await updateSitePageSetting('events', 'sms_template', template)
  if (saved === null) return NextResponse.json({ error: 'The Events page must exist before saving SMS settings.' }, { status: 409 })
  return NextResponse.json({ template })
})
