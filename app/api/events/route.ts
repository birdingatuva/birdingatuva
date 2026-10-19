import { randomUUID } from 'node:crypto'
import { eventCreate } from '@/lib/input-validation'
import { safeImage } from '@/lib/image-upload'
import { RequestError } from '@/lib/api-security'
import { secureRoute } from '@/lib/api-security'
import { MAX_IMAGE_SIZE } from '@/lib/constants'
import { verifyAdminToken } from '@/lib/auth'
import { listEvents, listAllEvents } from '@/lib/events-db'
import { revalidateEvents } from '@/lib/revalidate'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { v2 as cloudinary } from 'cloudinary'

// Explicitly ensure Node.js runtime (required for Cloudinary SDK & Buffer access)
export const runtime = 'nodejs'

// Cloudinary configuration (use server-side env vars, do not rely on NEXT_PUBLIC here)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  })
} else {
  console.warn('[events POST] Cloudinary env variables missing. Images will not be uploaded.', {
    CLOUDINARY_CLOUD_NAME: !!CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: !!CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: !!CLOUDINARY_API_SECRET,
  })
}

async function POSTHandler(req: NextRequest) {
  let uploadedImageId: string | undefined
  let committed = false
  console.log("=== API /api/events POST started ===");
  
  try {
    // Validate authorization from HttpOnly cookie
    const cookieToken = req.cookies.get('admin_jwt')?.value || ''
    const valid = cookieToken ? (await verifyAdminToken(cookieToken)) : null
    console.log("Auth check - cookie present:", !!cookieToken, "jwt valid:", !!valid);
    if (!valid) {
      console.log("❌ Unauthorized");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const raw = Object.fromEntries(Array.from(formData.entries()).filter(([key]) => key !== 'image'))
    for (const key of ['hidden', 'showFaqBanner']) {
      if (raw[key] !== undefined && raw[key] !== 'true' && raw[key] !== 'false') return NextResponse.json({ error: 'Invalid boolean field.' }, { status: 400 })
    }
    const parsed = eventCreate.safeParse({ ...raw, hidden: raw.hidden === 'true', showFaqBanner: raw.showFaqBanner === 'true' })
    if (!parsed.success) return NextResponse.json({ error: 'Invalid event fields.' }, { status: 400 })
    const { title, slug: baseSlug, startDate, location, bodyMarkdown = '', showFaqBanner = false, hidden = false } = parsed.data
    const endDate = parsed.data.endDate || null
    const startTime = parsed.data.startTime || null
    const endTime = parsed.data.endTime || null
    const signupUrl = parsed.data.signupUrl || null
    const dashboardUrl = parsed.data.dashboardUrl || null
    const imageFile = formData.get('image')
    if (typeof imageFile === 'string') return NextResponse.json({ error: 'Invalid image.' }, { status: 400 })
    const imageBuffer = imageFile ? await safeImage(imageFile) : null
    let imagePublicId = ''
    // Create a unique slug if taken: base, base-2, base-3, ...
    let slug = baseSlug
    try {
  const { rows } = await sql`SELECT slug FROM events WHERE lower(trim(slug)) = lower(${baseSlug}) OR lower(trim(slug)) LIKE lower(${baseSlug + '-%'});`
      let exactExists = false
      let maxNumericSuffix = 1
      for (const r of rows) {
        const s: string = (r as any).slug;
        if (s.trim().toLowerCase() === baseSlug) {
          exactExists = true
        } else if (s.trim().toLowerCase().startsWith(baseSlug + '-')) {
          const tail = s.substring((baseSlug + '-').length)
          if (/^\d+$/.test(tail)) {
            const n = parseInt(tail, 10)
            if (!Number.isNaN(n)) {
              maxNumericSuffix = Math.max(maxNumericSuffix, n)
            }
          }
        }
      }
      if (exactExists) {
        slug = `${baseSlug}-${maxNumericSuffix + 1}`
      } else {
        slug = baseSlug
      }
    } catch (e) {
      console.warn('Slug uniqueness check failed; proceeding with base slug', e)
      slug = baseSlug
    }

    if (imageBuffer) {
      if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) return NextResponse.json({ error: 'Image uploads are unavailable.' }, { status: 503 })
      const upload = await cloudinary.uploader.upload(`data:image/webp;base64,${imageBuffer.toString('base64')}`, {
        public_id: `event-${randomUUID()}`, asset_folder: `event-images/${slug}`, overwrite: false, resource_type: 'image', tags: [`event:${slug}`],
      })
      imagePublicId = upload.public_id
      uploadedImageId = imagePublicId
    }

    // Keep the existing JSON column format, but store at most one image.
    try {
      await sql`
        INSERT INTO events (slug, title, start_date, end_date, start_time, end_time, location, image_urls, body_markdown, signup_url, dashboard_url, show_faq_banner, hidden)
        VALUES (
          ${slug}, ${title}, ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${location}, ${JSON.stringify(imagePublicId ? [imagePublicId] : [])}, ${bodyMarkdown}, ${signupUrl}, ${dashboardUrl}, ${showFaqBanner}, ${hidden}
        )
      `
      committed = true
      console.log(`Successfully inserted event: ${slug}`)
      // Trigger on-demand revalidation only when database is updated
      revalidateEvents(slug)
      console.log("=== API /api/events POST completed successfully ===");
      return NextResponse.json({ success: true, slug, imagePublicId })
    } catch (error) {
      console.error('Database insertion error:', error)
      if (uploadedImageId) await cloudinary.uploader.destroy(uploadedImageId).catch(() => {})
      return NextResponse.json({ error: 'Unable to save event.' }, { status: 500 })
    }
  } catch (outerError) {
    if (uploadedImageId && !committed) await cloudinary.uploader.destroy(uploadedImageId).catch(() => {})
    if (outerError instanceof RequestError) throw outerError
    console.error('Event creation failed')
    return NextResponse.json({ error: 'Unable to save event.' }, { status: 500 })
  }
}

// GET: list events. If admin=true and auth valid -> include hidden. Else public list.
async function GETHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isAdminRequested = searchParams.get('admin') === 'true'
    let events
    let isPrivate = false
    if (isAdminRequested) {
      const cookieToken = req.cookies.get('admin_jwt')?.value || ''
      const valid = cookieToken ? (await verifyAdminToken(cookieToken)) : null
      if (valid) {
        events = await listAllEvents()
        isPrivate = true // do not cache private/admin view
      } else {
        // unauthorized admin request -> fall back to public list
        events = await listEvents()
      }
    } else {
      events = await listEvents()
    }
    // For public responses, instruct CDN to cache & allow stale while revalidate.
    // For private (admin) responses, disable caching.
    const headers: Record<string, string> = {
      // Vary on Cookie since auth depends on cookie presence; ensures CDN doesn't
      // serve cached public response to an authenticated admin (or vice versa).
      'Vary': 'Cookie'
    }
    if (isPrivate) {
      headers['Cache-Control'] = 'no-store'
    } else {
      headers['Cache-Control'] = 's-maxage=300, stale-while-revalidate=86400'
    }
    return NextResponse.json({ events }, { headers })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to list events' }, { status: 500 })
  }
}

export const POST = secureRoute(POSTHandler)

export const GET = secureRoute(GETHandler)
