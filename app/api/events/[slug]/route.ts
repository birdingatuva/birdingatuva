import { eventSlug, eventUpdate } from '@/lib/input-validation'
import { safeImage } from '@/lib/image-upload'
import { RequestError } from '@/lib/api-security'
import { secureRoute } from '@/lib/api-security'
import { MAX_IMAGE_SIZE } from '@/lib/constants'
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateEvents } from '@/lib/revalidate'
import { sql } from '@vercel/postgres'
import { verifyAdminToken } from '@/lib/auth'

// Runtime to ensure proper Node.js APIs
export const runtime = 'nodejs'

async function ensureAuth(req: NextRequest): Promise<boolean> {
  const cookieToken = req.cookies.get('admin_jwt')?.value || ''
  const valid = cookieToken ? (await verifyAdminToken(cookieToken)) : null
  return !!valid
}

async function PUTHandler(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let uploadedImageId: string | undefined
  let imageCommitted = false
  try {
    if (!(await ensureAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slug = (await params).slug.trim().toLowerCase()
    if (!eventSlug.safeParse(slug).success) return NextResponse.json({ error: 'Invalid event slug.' }, { status: 400 })
    const multipart = req.headers.get('content-type')?.includes('multipart/form-data')
    const formData = multipart ? await req.formData() : null
    let raw
    try { raw = formData ? JSON.parse(String(formData.get('data') || '{}')) : await req.json() } catch { return NextResponse.json({ error: 'Invalid event data.' }, { status: 400 }) }
    const parsed = eventUpdate.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid event fields.' }, { status: 400 })
    const data = parsed.data
    const image = formData?.get('image')
    if (typeof image === 'string') return NextResponse.json({ error: 'Invalid image.' }, { status: 400 })
    if (image) {
      const safeBuffer = await safeImage(image)
      if (!image.type.startsWith('image/') || image.size === 0 || image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Please choose a valid image within the size limit.' }, { status: 400 })
      }
      if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
        return NextResponse.json({ error: 'Image uploads are unavailable.' }, { status: 503 })
      }
      // A unique asset keeps the saved image intact even if the database update fails.
      const uploaded = await cloudinary.uploader.upload(
        `data:image/webp;base64,${safeBuffer.toString('base64')}`,
        {
          public_id: `${slug}-img-${randomUUID()}`,
          asset_folder: `event-images/${slug}`,
          overwrite: false,
          resource_type: 'image',
          tags: [`event:${slug}`],
        },
      )
      uploadedImageId = uploaded.public_id
      if (!uploadedImageId) throw new Error('Image upload failed')

    }
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
    if (data.dashboardUrl !== undefined) add('dashboard_url', String(data.dashboardUrl || '').trim() || null)
    if (data.showFaqBanner !== undefined) add('show_faq_banner', !!data.showFaqBanner)
    if (data.hidden !== undefined) add('hidden', !!data.hidden)
    if (uploadedImageId) {
      add('image_urls', JSON.stringify([uploadedImageId]))
    }
    if (!fields.length) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 })
    }
    values.push(slug)
    const query = `UPDATE events SET ${fields.join(', ')} WHERE lower(trim(slug)) = lower(trim($${fields.length + 1})) RETURNING slug;`
    const result = await sql.query(query, values)
    if (!result.rows.length) throw new Error('Event not found')
    imageCommitted = true
    const updatedSlug = result.rows[0].slug
    // Trigger on-demand revalidation only when database is updated
    revalidateEvents(updatedSlug)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (uploadedImageId && !imageCommitted) {
      try { await cloudinary.uploader.destroy(uploadedImageId) } catch {}
    }
    if (e instanceof RequestError) throw e
    console.error('PUT /api/events/[slug] failed')
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

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await ensureAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const slug = (await params).slug.trim().toLowerCase()
    if (!eventSlug.safeParse(slug).success) return NextResponse.json({ error: 'Invalid event slug.' }, { status: 400 })

    // Delete the row atomically and return its image list. This also makes the
    // endpoint safe if a second DELETE request arrives while the first request
    // is still cleaning up Cloudinary assets.
    const deleteResult = await sql`
      DELETE FROM events
      WHERE lower(trim(slug)) = lower(${slug})
      RETURNING image_urls;
    `

    if (!deleteResult.rows.length) {
      return NextResponse.json({ success: true, alreadyDeleted: true, deletedImages: 0 })
    }

    let imagePublicId = ''
    const raw = (deleteResult.rows[0] as any).image_urls
    try {
      if (Array.isArray(raw)) imagePublicId = raw.find((image): image is string => typeof image === 'string' && image.trim().length > 0)?.trim() || ''
      else if (typeof raw === 'string') {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) imagePublicId = parsed.find((image): image is string => typeof image === 'string' && image.trim().length > 0)?.trim() || ''
        else if (typeof parsed === 'string') imagePublicId = parsed.trim()
      }
    } catch {}

    // Trigger on-demand revalidation only when the database row was actually deleted.
    revalidateEvents(slug)

    let deletedImages = 0
    // Attempt Cloudinary cleanup (ignore errors to avoid failing full delete)
    if (cloudinary.config().cloud_name && imagePublicId) {
      try {
        const asset = await cloudinary.api.resource(imagePublicId, { tags: true })
        if (Array.isArray(asset.tags) && asset.tags.includes(`event:${slug}`)) {
          const deleted = await cloudinary.uploader.destroy(imagePublicId)
          if (deleted.result === 'ok') deletedImages = 1
        }
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
    return NextResponse.json({ success: true, deletedImages })
  } catch (e) {
    console.error('DELETE /api/events/[slug] error', e)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}

export const PUT = secureRoute(PUTHandler)

export const DELETE = secureRoute(DELETEHandler)
