import { RequestError } from './api-security'
import { isLocalDevelopment } from './local-development'

export async function verifyLoginChallenge(token: unknown, hostname: string) {
  if (isLocalDevelopment(hostname)) return

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) throw new RequestError('Sign-in is temporarily unavailable.', 503)
  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw new RequestError('Please complete the security check.', 403)
  }

  let response: Response
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
  } catch {
    throw new RequestError('Security check is temporarily unavailable. Please try again.', 503)
  }
  if (!response.ok) throw new RequestError('Security check is temporarily unavailable.', 503)
  const result = await response.json()
  if (result.success !== true || result.action !== 'admin-login' || result.hostname !== hostname) {
    throw new RequestError('Security check failed. Please complete it again.', 403)
  }
}
