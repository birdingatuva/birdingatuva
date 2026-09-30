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

export async function POST(req: NextRequest) {
  console.log("=== API /api/events POST started ===");
  
  try {
    // Validate authorization from HttpOnly cookie
    const cookieToken = req.cookies.get('admin_jwt')?.value || ''
    const valid = cookieToken ? verifyAdminToken(cookieToken) : null
    console.log("Auth check - cookie present:", !!cookieToken, "jwt valid:", !!valid);
    if (!valid) {
      console.log("❌ Unauthorized");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const title = (formData.get('title') as string) || ''
  const baseSlugRaw = (formData.get('slug') as string) || ''
  const baseSlug = baseSlugRaw.trim().toLowerCase()
    const startDate = (formData.get('startDate') as string) || ''
    const endDateRaw = (formData.get('endDate') as string) || ''
    const startTimeRaw = (formData.get('startTime') as string) || ''
    const endTimeRaw = (formData.get('endTime') as string) || ''
    const location = (formData.get('location') as string) || ''
    const bodyMarkdown = (formData.get('bodyMarkdown') as string) || ''
    const signupUrlRaw = (formData.get('signupUrl') as string) || ''
  // signupEmbedUrl removed
  const dashboardUrl = ((formData.get('dashboardUrl') as string) || '').trim() || null
  const showFaqBanner = formData.get('showFaqBanner') === 'true'
  const hidden = formData.get('hidden') === 'true'

    // Normalize optional fields to null instead of empty strings for DB
    const endDate = endDateRaw && endDateRaw.trim() !== '' ? endDateRaw : null
    const startTime = startTimeRaw && startTimeRaw.trim() !== '' ? startTimeRaw : null
    const endTime = endTimeRaw && endTimeRaw.trim() !== '' ? endTimeRaw : null
    const signupUrl = signupUrlRaw && signupUrlRaw.trim() !== '' ? signupUrlRaw : null
  // signupEmbedUrl removed
    const imageFile = formData.get('image') as File | null
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

    console.log(`Processing event image for: ${slug}`)

    if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
      if (imageFile) {
        console.error('Cloudinary not configured, skipping image uploads.')
      }
    } else if (imageFile) {
      if (imageFile.size > MAX_IMAGE_SIZE) {
        console.warn(`Skipping event image: too large (${imageFile.size} bytes)`)
      } else {
        try {
          const arrayBuffer = await imageFile.arrayBuffer()
            .catch(err => { throw new Error('Failed to read image file: ' + (err as Error).message) })
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString('base64')
          console.log('Uploading event image to Cloudinary via SDK...')
          const uploadRes = await cloudinary.uploader.upload(`data:${imageFile.type};base64,${base64}`,
            {
              public_id: `${slug}-img`,
              asset_folder: `event-images/${slug}`,
              overwrite: true,
              resource_type: 'image',
              tags: [`event:${slug}`],
            }
          )
          if (uploadRes?.public_id) {
            imagePublicId = uploadRes.public_id
            console.log(`Uploaded event image -> public_id: ${imagePublicId}`)
          } else {
            console.error('Cloudinary upload returned no public_id', uploadRes)
          }
        } catch (err) {
          console.error('Error uploading event image:', err)
        }
      }
    }

  console.log(`Event image uploaded: ${Boolean(imagePublicId)}`)

    // Keep the existing JSON column format, but store at most one image.
    try {
      await sql`
        INSERT INTO events (slug, title, start_date, end_date, start_time, end_time, location, image_urls, body_markdown, signup_url, dashboard_url, show_faq_banner, hidden)
        VALUES (
          ${slug}, ${title}, ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${location}, ${JSON.stringify(imagePublicId ? [imagePublicId] : [])}, ${bodyMarkdown}, ${signupUrl}, ${dashboardUrl}, ${showFaqBanner}, ${hidden}
        )
      `
      console.log(`Successfully inserted event: ${slug}`)
      // Trigger on-demand revalidation only when database is updated
      revalidateEvents(slug)
      console.log("=== API /api/events POST completed successfully ===");
      return NextResponse.json({ success: true, slug, imagePublicId })
    } catch (error) {
      console.error('❌ Database insertion error:', error)
      return NextResponse.json({ error: `Failed to save event to database: ${error}` }, { status: 500 })
    }
  } catch (outerError) {
    console.error('❌ API route error:', outerError);
    return NextResponse.json({ 
      error: `Server error: ${outerError instanceof Error ? outerError.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}

// GET: list events. If admin=true and auth valid -> include hidden. Else public list.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isAdminRequested = searchParams.get('admin') === 'true'
    let events
    let isPrivate = false
    if (isAdminRequested) {
      const cookieToken = req.cookies.get('admin_jwt')?.value || ''
      const valid = cookieToken ? verifyAdminToken(cookieToken) : null
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
