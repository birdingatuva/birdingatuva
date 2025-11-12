import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('admin_jwt')?.value || ''
  const payload = cookie ? verifyAdminToken(cookie) : null
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie' } })
  }
  return NextResponse.json({ authenticated: true, exp: payload.exp }, { headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie' } })
}
