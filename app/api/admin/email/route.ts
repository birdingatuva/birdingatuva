import { NextRequest, NextResponse } from 'next/server'
import { secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { emailTemplateSchema, selectEmailTemplate } from '@/lib/email'
import { normalizeGroupMeTemplate } from '@/lib/groupme'

export const runtime = 'nodejs'
export const GET = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ template: selectEmailTemplate(await getSitePageSetting('events', 'email_template')) })
})
export const PUT = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = emailTemplateSchema.safeParse((await request.json()).template)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const template = { subject: normalizeGroupMeTemplate(parsed.data.subject), body: normalizeGroupMeTemplate(parsed.data.body) }
  const saved = await updateSitePageSetting('events', 'email_template', template)
  if (saved === null) return NextResponse.json({ error: 'The Events page must exist before saving email settings.' }, { status: 409 })
  return NextResponse.json({ template })
})
