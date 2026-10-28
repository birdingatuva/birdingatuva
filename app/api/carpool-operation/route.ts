import { timingSafeEqual } from 'node:crypto'
import { sql } from '@vercel/postgres'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { boundedBody } from '@/lib/api-security'

export const runtime = 'nodejs'
const input = z.object({
  apiKey: z.string(), timestamp: z.number(), action: z.enum(['claim', 'complete']),
  operationKey: z.string().regex(/^CARPOOL_(REQUEST|EMAIL)_[a-f0-9]{64}$/),
  ownerToken: z.string().uuid(), result: z.record(z.unknown()).optional(),
}).strict()
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
// Machine-to-machine endpoint: shared-secret authentication replaces browser cookie/origin checks.
export async function POST(request: NextRequest) {
  try {
    const body = input.parse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 32768))))
    const secret = process.env.CARPOOL_API_SECRET || ''
    const expected = Buffer.from(secret), actual = Buffer.from(body.apiKey)
    if (secret.length < 32 || expected.length !== actual.length || !timingSafeEqual(expected, actual) || Math.abs(Date.now() - body.timestamp) > 300000) return reply({ error: 'Unauthorized' }, 401)
    const { rows: settings } = await sql`SELECT migration_complete FROM carpool_settings WHERE id = true`
    if (settings[0]?.migration_complete !== true) return reply({ error: 'Migration incomplete' }, 503)
    if (body.action === 'claim') {
      const inserted = await sql`INSERT INTO carpool_operations (operation_key, status, owner_token) VALUES (${body.operationKey}, 'pending', ${body.ownerToken}) ON CONFLICT DO NOTHING RETURNING operation_key`
      if (inserted.rowCount === 1) return reply({ run: true })
      const { rows } = await sql`SELECT status, result FROM carpool_operations WHERE operation_key = ${body.operationKey}`
      return reply(rows[0]?.status === 'complete' ? { run: false, result: rows[0].result } : { run: false, pending: true })
    }
    if (!body.result) return reply({ error: 'Result required' }, 400)
    const completed = await sql`UPDATE carpool_operations SET status = 'complete', result = ${JSON.stringify(body.result)}::jsonb, completed_at = now() WHERE operation_key = ${body.operationKey} AND owner_token = ${body.ownerToken} AND status = 'pending' RETURNING operation_key`
    if (completed.rowCount !== 1) return reply({ error: 'Operation could not be completed' }, 409)
    return reply({ completed: true })
  } catch { return reply({ error: 'Operation storage unavailable or invalid request' }, 503) }
}
