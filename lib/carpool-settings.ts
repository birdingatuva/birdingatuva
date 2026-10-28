import 'server-only'
import { sql } from '@vercel/postgres'
import { z } from 'zod'
import { carpoolSettingsSchema } from '@/lib/carpool-settings-schema'

const settingsSchema = z.object({
  year_folder_id: z.string().regex(/^[\w-]+$/),
  passengers_name_range: z.string().regex(/^([A-Z]+)[1-9]\d*:\1[1-9]\d*$/),
  migration_complete: z.literal(true),
})
export async function getCarpoolSettings() {
  const { rows } = await sql`SELECT year_folder_id, passengers_name_range, migration_complete FROM carpool_settings WHERE id = true`
  const settings = settingsSchema.parse(rows[0])
  return carpoolSettingsSchema.parse({ yearFolderId: settings.year_folder_id, passengersNameRange: settings.passengers_name_range })
}
export function carpoolCallbackUrl() {
  const url = new URL(process.env.CARPOOL_CALLBACK_URL || '/api/carpool-operation', process.env.APP_ORIGIN)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Carpool callback requires a public HTTPS URL')
  return url.href
}
