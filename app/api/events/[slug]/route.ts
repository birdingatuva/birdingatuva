import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { verifyAdminToken } from '@/lib/auth'

// Runtime to ensure proper Node.js APIs
export const runtime = 'nodejs'

async function ensureAuth(req: NextRequest): Promise<boolean> {
  const cookieToken = req.cookies.get('admin_jwt')?.value || ''
  const valid = cookieToken ? verifyAdminToken(cookieToken) : null
  return !!valid
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    if (!(await ensureAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slug = (await params).slug.trim().toLowerCase()
    const data = await req.json()
    // Accept partial updates; build set clause dynamically.
    const fields: string[] = []
    const values: any[] = []
    function add(field: string, val: any) {
      fields.push(`${field} = $${fields.length + 1}`)
      values.push(val)
    }
    if (data.title !== undefined) add('title', data.title)
    if (data.startDate !== undefined) add('start_date', data.startDate)
    if (data.endDate !== undefined) add('end_date', data.endDate || null)
    if (data.startTime !== undefined) add('start_time', data.startTime || null)
    if (data.endTime !== undefined) add('end_time', data.endTime || null)
    if (data.location !== undefined) add('location', data.location)
    if (data.bodyMarkdown !== undefined) add('body_markdown', data.bodyMarkdown || '')
  if (data.signupUrl !== undefined) add('signup_url', data.signupUrl || null)
    if (data.hasGoogleForm !== undefined) add('has_google_form', !!data.hasGoogleForm)
    if (data.hidden !== undefined) add('hidden', !!data.hidden)
    if (data.imagePublicIds !== undefined) {
      // Replace entire image array when editing (optional future: merge?)
      add('image_urls', JSON.stringify(Array.isArray(data.imagePublicIds) ? data.imagePublicIds : []))
    }
    if (!fields.length) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 })
    }
    values.push(slug)
    const query = `UPDATE events SET ${fields.join(', ')} WHERE lower(trim(slug)) = lower(trim($${fields.length + 1})) RETURNING slug;`
    await sql.query(query, values)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PUT /api/events/[slug] error', e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// Delete event & associated Cloudinary assets
import { v2 as cloudinary } from 'cloudinary'
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    if (!(await ensureAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const slug = params.slug.trim().toLowerCase()

    // Fetch images to know what to delete
    const { rows } = await sql`SELECT image_urls FROM events WHERE lower(trim(slug)) = lower(${slug}) LIMIT 1;`
    if (!rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    let imagePublicIds: string[] = []
    const raw = (rows[0] as any).image_urls
    try {
      if (Array.isArray(raw)) imagePublicIds = raw.filter(x => typeof x === 'string')
      else if (typeof raw === 'string') {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) imagePublicIds = parsed.filter(x => typeof x === 'string')
      }
    } catch {}

    // Delete row first
    await sql`DELETE FROM events WHERE lower(trim(slug)) = lower(${slug});`

    // Attempt Cloudinary cleanup (ignore errors to avoid failing full delete)
    if (cloudinary.config().cloud_name && imagePublicIds.length) {
      try {
        await cloudinary.api.delete_resources(imagePublicIds)
      } catch (e) {
        console.warn('Cloudinary resource deletion failed', e)
      }
      // Delete folder (non-fatal if fails). asset_folder used earlier, we can attempt folder cleanup.
      try {
        await cloudinary.api.delete_folder(`event-images/${slug}`)
      } catch (e) {
        // ignore folder delete errors
      }
    }
    return NextResponse.json({ success: true, deletedImages: imagePublicIds.length })
  } catch (e) {
    console.error('DELETE /api/events/[slug] error', e)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
