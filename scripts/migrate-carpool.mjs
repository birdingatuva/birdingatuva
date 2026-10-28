import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@vercel/postgres'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: process.env.CARPOOL_ENV_FILE || '.env.local', quiet: true })
const apply = process.argv.includes('--apply')
const cleanup = process.argv.includes('--cleanup')
if (cleanup && !apply) throw new Error('--cleanup requires --apply')
const endpoint = process.env.CARPOOL_APPS_SCRIPT_URL || ''
const secret = process.env.CARPOOL_API_SECRET || ''
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint) || secret.length < 32) throw new Error('Configure CARPOOL_APPS_SCRIPT_URL and CARPOOL_API_SECRET')
async function call(action, extra = {}) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra, apiKey: secret, timestamp: Date.now() }), signal: AbortSignal.timeout(60000) })
  const result = await response.json()
  if (!response.ok || result.status !== 'success') throw new Error('Apps Script migration action failed. Deploy the full-migration script first.')
  return result.data
}
const snapshot = z.object({ entries: z.array(z.tuple([z.string(), z.string()])), digest: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await call('exportLegacy'))
if (createHash('sha256').update(JSON.stringify(snapshot.entries)).digest('hex') !== snapshot.digest) throw new Error('Invalid snapshot digest')
const settings = Object.fromEntries(snapshot.entries)
const id = z.string().regex(/^[\w-]+$/)
const range = z.string().regex(/^([A-Z]+)[1-9]\d*:\1[1-9]\d*$/)
const sources = [], operations = []
for (const [key, value] of snapshot.entries) {
  if (key === 'YEAR_FOLDER_ID') id.parse(value)
  else if (key === 'PASSENGERS_NAME_RANGE') range.parse(value)
  else if (key.startsWith('CARPOOL_SOURCE_')) sources.push([id.parse(key.slice(15)), id.parse(value)])
  else if (/^CARPOOL_(REQUEST|EMAIL)_[a-f0-9]{64}$/.test(key)) {
    const record = JSON.parse(value)
    let result = null
    if (key.startsWith('CARPOOL_REQUEST_')) {
      if (!['pending', 'success'].includes(record.status)) throw new Error('Unsupported creation record; nothing imported')
      if (record.status === 'success') {
        z.object({ status: z.literal('success'), data: z.object({ formPublishedUrl: z.string().url(), dashboardUrl: z.string().url() }) }).parse(record)
        result = record
      }
    } else {
      if (!['pending', 'sent'].includes(record.status) || record.fingerprint !== key.slice(14)) throw new Error('Unsupported email record; nothing imported')
      if (record.status === 'sent') result = { sent: true, alreadySent: true }
    }
    operations.push([key, result ? 'complete' : 'pending', result])
  } else throw new Error('Unrecognized legacy key; nothing imported')
}
console.log(`Validated ${sources.length} mappings and ${operations.length} operation records. Secret values are not exported.`)
if (!apply) {
  console.log('Preview only. Run with --apply to migrate; add --cleanup to remove verified legacy properties after commit.')
  process.exit(0)
}
const client = createClient({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL })
await client.connect()
try {
  await client.query('BEGIN')
  await client.query(readFileSync(new URL('./carpool-full-migration.sql', import.meta.url), 'utf8'))
  const existing = await client.query('SELECT * FROM carpool_settings WHERE id = true FOR UPDATE')
  if (!existing.rows.length) {
    const folder = id.parse(settings.YEAR_FOLDER_ID)
    const passengerRange = range.parse(process.env.CARPOOL_PASSENGERS_NAME_RANGE || settings.PASSENGERS_NAME_RANGE)
    await client.query('INSERT INTO carpool_settings (id, year_folder_id, passengers_name_range) VALUES (true, $1, $2)', [folder, passengerRange])
  }
  if (existing.rows.length) {
    if (settings.YEAR_FOLDER_ID && existing.rows[0].year_folder_id !== settings.YEAR_FOLDER_ID) throw new Error('Year-folder settings conflict; reconcile legacy and Neon values before cleanup')
    const expectedRange = process.env.CARPOOL_PASSENGERS_NAME_RANGE || settings.PASSENGERS_NAME_RANGE
    if (expectedRange && existing.rows[0].passengers_name_range !== expectedRange) throw new Error('Passenger-range settings conflict; reconcile legacy and Neon values before cleanup')
  }
  for (const [dashboard, source] of sources) {
    await client.query('INSERT INTO carpool_sources (dashboard_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [dashboard, source])
    const check = await client.query('SELECT source_id FROM carpool_sources WHERE dashboard_id = $1', [dashboard])
    if (check.rows[0].source_id !== source) throw new Error('Mapping conflict; resolve in Neon before retrying migration')
  }
  for (const [key, status, result] of operations) {
    await client.query('INSERT INTO carpool_operations (operation_key, status, result, completed_at) VALUES ($1, $2, $3::jsonb, CASE WHEN $2 = \'complete\' THEN now() ELSE NULL END) ON CONFLICT DO NOTHING', [key, status, result ? JSON.stringify(result) : null])
    const check = await client.query('SELECT status, result = $2::jsonb AS matches FROM carpool_operations WHERE operation_key = $1', [key, result ? JSON.stringify(result) : null])
    if (status === 'complete' && (check.rows[0].status !== 'complete' || !check.rows[0].matches)) throw new Error('Operation conflict; pending state requires review')
  }
  await client.query('UPDATE carpool_settings SET migration_complete = true WHERE id = true')
  await client.query('COMMIT')
  console.log('Migration committed. Existing settings and operation records were preserved.')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally { await client.end() }
if (cleanup) {
  const result = await call('cleanupLegacy', { digest: snapshot.digest })
  console.log(`Removed ${result.removed} imported legacy properties. CARPOOL_API_SECRET was retained.`)
}
