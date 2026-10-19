import sharp from 'sharp'
import { MAX_IMAGE_SIZE } from './constants'
import { RequestError } from './api-security'

// Decode and re-encode supported raster images; discard metadata and active formats.
export async function safeImage(file: File): Promise<Buffer> {
  if (!file.size || file.size > MAX_IMAGE_SIZE || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new RequestError('Choose a JPEG, PNG, or WebP image up to 5 MB.')
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const image = sharp(input, { limitInputPixels: 25_000_000, animated: false })
    const metadata = await image.metadata()
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
    if (metadata.format !== expected || !metadata.width || !metadata.height || (metadata.pages || 1) > 1) throw new Error('Unsupported image')
    return await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
  } catch { throw new RequestError('Unable to decode this image. Choose a valid raster image under 25 megapixels.') }
}
