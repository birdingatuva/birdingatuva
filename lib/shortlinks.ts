export const SHORTLINK_ORIGIN = 'https://birdingatuva.org'
export const RESERVED_SHORTLINKS = new Set(['home', 'events', 'leadership', 'links', 'faq', 'admin', 'api', 'images', 'robots', 'sitemap', 'favicon', 'manifest', 'index'])
export interface Shortlink { slug: string; destination: string; created_at: string; locked: boolean }

export function normalizeShortlink(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9]{1,64}$/.test(value)) {
    throw new Error('Use 1–64 letters and numbers only for the shortlink.')
  }
  const slug = value.toLowerCase()
  if (RESERVED_SHORTLINKS.has(slug)) throw new Error('That name is reserved for a site page.')
  return slug
}

export function normalizeDestination(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('Enter a valid http:// or https:// destination.')
  const input = value.trim()
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`
  if (!input || /\s/.test(input) || input.startsWith('/')) throw new Error('Enter a valid website address.')
  let url: URL
  try { url = new URL(candidate) } catch { throw new Error('Enter a valid website address, such as google.com.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS link without embedded credentials.')
  if (url.href.length > 4096) throw new Error('The destination URL is too long.')
  // Avoid direct and indirect loops between our shortlinks.
  if (['birdingatuva.org', 'www.birdingatuva.org'].includes(url.hostname.toLowerCase()) && /^\/[a-z0-9]+\/?$/i.test(url.pathname)) {
    const path = url.pathname.replaceAll('/', '').toLowerCase()
    if (!RESERVED_SHORTLINKS.has(path)) throw new Error('Use the final destination instead of another Birding at UVA shortlink.')
  }
  return url.href
}
