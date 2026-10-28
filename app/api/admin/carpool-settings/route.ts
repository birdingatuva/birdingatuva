import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { secureRoute } from '@/lib/api-security'
import { verifyAdminToken } from '@/lib/auth'
import { carpoolSettingsSchema } from '@/lib/carpool-settings-schema'

export const runtime = 'nodejs'
const notReady = () => NextResponse.json({ error: 'Complete the carpool migration before changing these settings.' }, { status: 409 })
const values = (row: { year_folder_id: string; passengers_name_range: string }) => ({ yearFolderId: row.year_folder_id, passengersNameRange: row.passengers_name_range })

export const GET = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { rows } = await sql`SELECT year_folder_id, passengers_name_range FROM carpool_settings WHERE id = true AND migration_complete = true`
    if (!rows[0]) return notReady()
    return NextResponse.json(values(rows[0] as { year_folder_id: string; passengers_name_range: string }))
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') return notReady()
    throw error
  }
})

export const PUT = secureRoute(async (request: NextRequest) => {
  if (!(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = carpoolSettingsSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  try {
    const { rows } = await sql`UPDATE carpool_settings SET year_folder_id = ${parsed.data.yearFolderId}, passengers_name_range = ${parsed.data.passengersNameRange} WHERE id = true AND migration_complete = true RETURNING year_folder_id, passengers_name_range`
    if (!rows[0]) return notReady()
    return NextResponse.json(values(rows[0] as { year_folder_id: string; passengers_name_range: string }))
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') return notReady()
    throw error
  }
})
