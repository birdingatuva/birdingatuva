import { NextRequest, NextResponse } from 'next/server'
import { revokeAdminToken } from '@/lib/auth'
import { secureRoute } from '@/lib/api-security'
async function POSTHandler(request: NextRequest) {
  await revokeAdminToken(request.cookies.get('admin_jwt')?.value || '')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_jwt', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
export const POST = secureRoute(POSTHandler)
