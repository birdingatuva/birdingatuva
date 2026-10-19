import jwt from 'jsonwebtoken'
import { createHmac, randomUUID } from 'node:crypto'
import { sql } from '@vercel/postgres'

export const ADMIN_SESSION_EXP_SECONDS = 2 * 60 * 60
const ISSUER = 'birdingatuva-admin'
const AUDIENCE = 'birdingatuva-events'

export function getAuthSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('Configure a unique ADMIN_JWT_SECRET of at least 32 characters.')
  }
  return secret
}
function credentialVersion() {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) throw new Error('Admin credentials are not configured.')
  return createHmac('sha256', getAuthSecret()).update(hash).digest('hex')
}
export interface AdminTokenPayload {
  sub: string; jti: string; iat: number; exp: number; iss: string; aud: string
}
export async function signAdminToken(adminId: string, expSeconds = ADMIN_SESSION_EXP_SECONDS): Promise<string> {
  const secret = getAuthSecret()
  const id = randomUUID()
  const lifetime = Math.min(expSeconds, ADMIN_SESSION_EXP_SECONDS)
  if (!Number.isInteger(lifetime) || lifetime <= 0) throw new Error('Invalid session lifetime')
  const token = jwt.sign({ sub: adminId }, secret, { algorithm: 'HS256', expiresIn: lifetime, issuer: ISSUER, audience: AUDIENCE, jwtid: id })
  await sql`INSERT INTO admin_sessions (id, credential_version, expires_at) VALUES (${id}, ${credentialVersion()}, NOW() + ${lifetime} * INTERVAL '1 second')`
  // Expired rows have no authorization value. Bound storage without retaining raw tokens.
  await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`
  return token
}
export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  if (!token) return null
  let decoded: AdminTokenPayload
  try {
    const value = jwt.verify(token, getAuthSecret(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, maxAge: ADMIN_SESSION_EXP_SECONDS })
    if (typeof value === 'string' || typeof value.sub !== 'string' || typeof value.exp !== 'number' || typeof value.iat !== 'number' || typeof value.jti !== 'string' || !/^[0-9a-f-]{36}$/.test(value.jti)) return null
    decoded = value as AdminTokenPayload
  } catch { return null }
  const result = await sql`SELECT id FROM admin_sessions WHERE id = ${decoded.jti} AND credential_version = ${credentialVersion()} AND expires_at > NOW() LIMIT 1`
  return result.rows.length ? decoded : null
}
export async function revokeAdminToken(token: string) {
  const payload = await verifyAdminToken(token)
  if (payload) await sql`DELETE FROM admin_sessions WHERE id = ${payload.jti}`
}
