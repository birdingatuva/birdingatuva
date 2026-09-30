import { MAX_IMAGE_SIZE } from '@/lib/constants'
import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'node:crypto'
import { verifyAdminToken } from '@/lib/auth'
import { getSitePageSetting, updateSitePageSetting } from '@/lib/pages-db'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function isAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_jwt')?.value || ''
  return !!token && !!verifyAdminToken(token)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; key: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, key } = await params
  return NextResponse.json({ setting: await getSitePageSetting(slug, key) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string; key: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, key } = await params
  const uploadedIds: string[] = []
  let committed = false
  try {
    const multipart = request.headers.get('content-type')?.includes('multipart/form-data')
    const formData = multipart ? await request.formData() : null
    const body = formData ? { setting: JSON.parse(String(formData.get('setting') || 'null')) } : await request.json()
    if (body.setting === undefined) return NextResponse.json({ error: 'setting is required' }, { status: 400 })
    if (formData) {
      if (slug !== 'leadership' || key !== 'leadership' || !Array.isArray(body.setting)) {
        return NextResponse.json({ error: 'Invalid image upload request' }, { status: 400 })
      }
      const images = Array.from(formData.entries()).filter(([field]) => field.startsWith('image-'))
      for (const [field, image] of images) {
        const index = Number(field.slice(6))
        if (!Number.isInteger(index) || index < 0 || !body.setting[index] || typeof image === 'string' || !image.type.startsWith('image/') || !image.size || image.size > MAX_IMAGE_SIZE) {
          return NextResponse.json({ error: 'Please choose a valid image within the size limit.' }, { status: 400 })
        }
      }
      if (images.length) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        if (!cloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          return NextResponse.json({ error: 'Image uploads are unavailable.' }, { status: 503 })
        }
        cloudinary.config({ cloud_name: cloudName, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
        for (const [field, value] of images) {
          const image = value as File
          const uploaded = await cloudinary.uploader.upload(
            `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString('base64')}`,
            { public_id: `leadership-${randomUUID()}`, asset_folder: 'leadership', overwrite: false, resource_type: 'image' },
          )
          if (!uploaded.public_id) throw new Error('Image upload failed')
          uploadedIds.push(uploaded.public_id)
          if (!uploaded.secure_url) throw new Error('Image URL missing')
          body.setting[Number(field.slice(6))].image = uploaded.secure_url
        }
      }
    }
    const setting = await updateSitePageSetting(slug, key, body.setting)
    committed = true
    return NextResponse.json({ setting })
  } catch (error) {
    if (!committed) await Promise.allSettled(uploadedIds.map(id => cloudinary.uploader.destroy(id)))
    console.error('Page settings update failed', error)
    return NextResponse.json({ error: 'Unable to save page settings.' }, { status: 500 })
  }
}
