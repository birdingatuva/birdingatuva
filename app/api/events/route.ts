import { MAX_IMAGE_COUNT, MAX_IMAGE_MB, MAX_IMAGE_SIZE } from '@/lib/constants'
import { verifyAdminToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'

// For Cloudinary upload
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

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
  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const location = formData.get('location') as string
  const bodyMarkdown = formData.get('bodyMarkdown') as string
  const signupUrl = formData.get('signupUrl') as string
  const signupEmbedUrl = formData.get('signupEmbedUrl') as string
  const hasGoogleForm = formData.get('hasGoogleForm') === 'true'
  // Handle multiple images
  const imageCount = Math.min(Number(formData.get('imageCount') || 0), MAX_IMAGE_COUNT)
  const imageUrls: string[] = []
  
  console.log(`Processing ${imageCount} images for event: ${slug}`)
  
  for (let i = 1; i <= imageCount; i++) {
    const imageFile = formData.get(`image${i}`) as File | null
    if (imageFile) {
      if (imageFile.size > MAX_IMAGE_SIZE) {
        console.log(`Skipping image${i}: too large (${imageFile.size} bytes)`)
        continue // skip files over max size
      }
      
      try {
        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        
        console.log(`Uploading image${i} to Cloudinary...`)
        
        // Build signed upload parameters for Cloudinary (requires API secret)
        const timestamp = Math.floor(Date.now() / 1000)
        const folder = `event-images/${slug}`
        const public_id = `${slug}-img${i}`
        const upload_preset = 'event-images'
        const paramsToSign: Record<string, string | number> = {
          folder,
          public_id,
          timestamp,
          upload_preset,
        }
        const signString = Object.keys(paramsToSign)
          .sort()
          .map(k => `${k}=${paramsToSign[k]}`)
          .join('&') + CLOUDINARY_API_SECRET
        const signature = crypto.createHash('sha1').update(signString).digest('hex')

        const form = new URLSearchParams()
        form.append('file', `data:${imageFile.type};base64,${base64}`)
        form.append('upload_preset', upload_preset)
        form.append('public_id', public_id)
        form.append('folder', folder)
        form.append('timestamp', String(timestamp))
        form.append('api_key', CLOUDINARY_API_KEY || '')
        form.append('signature', signature)

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        })

        const uploadJson = await uploadRes.json()
        
        if (uploadJson.secure_url) {
          imageUrls.push(uploadJson.secure_url)
          console.log(`Successfully uploaded image${i}: ${uploadJson.secure_url}`)
        } else {
          console.error(`Failed to upload image${i}:`, uploadJson)
        }
      } catch (error) {
        console.error(`Error uploading image${i}:`, error)
      }
    }
  }
  
  console.log(`Uploaded ${imageUrls.length} images total`)

  // Insert into database (store imageUrls as JSON array)
  try {
    await sql`
      INSERT INTO events (slug, title, start_date, end_date, start_time, end_time, location, image_urls, body_markdown, signup_url, signup_embed_url, has_google_form)
      VALUES (
        ${slug}, ${title}, ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${location}, ${JSON.stringify(imageUrls)}, ${bodyMarkdown}, ${signupUrl}, ${signupEmbedUrl}, ${hasGoogleForm}
      )
    `
    console.log(`Successfully inserted event: ${slug}`)
    console.log("=== API /api/events POST completed successfully ===");
    return NextResponse.json({ success: true })
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
