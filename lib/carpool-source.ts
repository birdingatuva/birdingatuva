import 'server-only'
import { sql } from '@vercel/postgres'
import { z } from 'zod'
import { boundedBody } from '@/lib/api-security'

const sourceSchema = z.object({ sourceId: z.string().regex(/^[\w-]+$/), available: z.literal(true) })

// Private mapping stays server-side and is never included in public event records.
export async function resolveCarpoolSource(dashboardId: string): Promise<string | null> {
  const { rows } = await sql`SELECT source_id FROM carpool_sources WHERE dashboard_id = ${dashboardId}`
  if (rows[0]) return sourceSchema.shape.sourceId.parse(rows[0].source_id)
  const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
  const secret = process.env.CARPOOL_API_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) throw new Error('Private carpool connection is not configured')
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resolveSource', dashboardId, apiKey: secret, timestamp: Date.now() }),
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  })
  const result = JSON.parse(new TextDecoder().decode(await boundedBody(response, 16384)))
  if (!response.ok || result.status !== 'success') throw new Error('Unable to resolve private spreadsheet')
  if (result.data?.available === false) return null
  const { sourceId } = sourceSchema.parse(result.data)
  await saveCarpoolSource(dashboardId, sourceId)
  return sourceId
}

export async function saveCarpoolSource(dashboardId: string, sourceId: string) {
  sourceSchema.shape.sourceId.parse(sourceId)
  sourceSchema.shape.sourceId.parse(dashboardId)
  await sql`INSERT INTO carpool_sources (dashboard_id, source_id) VALUES (${dashboardId}, ${sourceId}) ON CONFLICT (dashboard_id) DO NOTHING`
}
