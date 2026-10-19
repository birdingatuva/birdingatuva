import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { sql } from '@vercel/postgres'
import { getAuthSecret } from './auth'

export function clientBucket(request: Request): string {
  // Vercel overwrites this header. On other hosts ignore spoofable forwarding headers.
  const candidate = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : undefined
  const address = candidate && isIP(candidate) ? candidate : 'shared-origin'
  return createHmac('sha256', getAuthSecret()).update(address).digest('hex')
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const result = await sql`
    INSERT INTO security_rate_limits (key, hits, reset_at) VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN security_rate_limits.reset_at <= NOW() THEN 1 ELSE LEAST(security_rate_limits.hits + 1, ${limit + 1}) END,
      reset_at = CASE WHEN security_rate_limits.reset_at <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE security_rate_limits.reset_at END
    RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - NOW())))) AS retry_after
  `
  // Only expired counters are removed; repeated blocked attempts never extend the window.
  await sql`DELETE FROM security_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'`
  return { allowed: Number(result.rows[0].hits) <= limit, retryAfter: Number(result.rows[0].retry_after) }
}
