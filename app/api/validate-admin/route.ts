import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { ADMIN_SESSION_EXP_SECONDS, signAdminToken } from '@/lib/auth'
import { secureRoute } from '@/lib/api-security'
import { verifyLoginChallenge } from '@/lib/turnstile'

async function POSTHandler(req: NextRequest) {
  const { password, turnstileToken } = await req.json()
  if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return NextResponse.json({ error: 'Enter a password of at most 72 UTF-8 bytes.' }, { status: 400 })
  }
  await verifyLoginChallenge(turnstileToken, req.nextUrl.hostname)
  const hash = Buffer.from(process.env.ADMIN_PASSWORD_HASH || '', 'base64').toString('utf8')
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(hash)) throw new Error('Admin credentials are not configured')
  if (!(await bcrypt.compare(password, hash))) return NextResponse.json({ error: 'Invalid password.' }, { status: 401 })
  const token = await signAdminToken('admin')
  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_EXP_SECONDS })
  return response
}
export const POST = secureRoute(POSTHandler)
