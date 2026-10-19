import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from './auth'

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function trustedOrigin(request: NextRequest) {
  const configured = process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://birdingatuva.org' : request.nextUrl.origin)
  return request.headers.get('origin') === new URL(configured).origin
}
export async function boundedBody(request: Request | Response, limit: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new RequestError('Request is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) { await reader.cancel(); throw new RequestError('Request is too large.', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
// Every API export uses this boundary. Authenticate before buffering mutation bodies.
export function secureRoute<T extends unknown[]>(handler: (request: NextRequest, ...args: T) => Promise<Response>) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      const path = request.nextUrl.pathname
      if (mutation) {
        if (!['/api/validate-admin', '/api/logout'].includes(path) && !(await verifyAdminToken(request.cookies.get('admin_jwt')?.value || ''))) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
        }
        if (!trustedOrigin(request)) throw new RequestError('Request origin is not allowed.', 403)
        const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
        const multipart = type === 'multipart/form-data'
        const uploadsAllowed = path === '/api/events' || /^\/api\/events\/[^/]+$/.test(path) || path === '/api/pages/leadership/settings/leadership'
        if (path === '/api/events' && request.method === 'POST' && !multipart) throw new RequestError('Expected an event form.', 415)
        const emptyAllowed = request.method === 'DELETE' && /^\/api\/events\/[^/]+$/.test(path) || path === '/api/logout'
        if (!(type === 'application/json' || multipart && uploadsAllowed || !type && emptyAllowed)) throw new RequestError('Unsupported content type.', 415)
        const limit = multipart ? 26 * 1024 * 1024 : path === '/api/validate-admin' ? 1024 : 256 * 1024
        const bytes = await boundedBody(request, limit)
        if (type === 'application/json') {
          try {
            const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
          } catch { throw new RequestError('Expected a valid JSON object.') }
        }
        request = new NextRequest(request.url, { method: request.method, headers: request.headers, body: bytes.length ? new Blob([bytes as BlobPart]) : undefined })
        if (multipart) {
          let form: FormData
          try { form = await request.clone().formData() } catch { throw new RequestError('Invalid multipart form.') }
          const entries = Array.from(form.entries())
          if (entries.length > 100 || new Set(entries.map(([key]) => key)).size !== entries.length) throw new RequestError('Too many or duplicate form fields.')
          if (entries.filter(([, value]) => typeof value !== 'string').length > 5) throw new RequestError('Upload at most five images at a time.')
          if (entries.some(([, value]) => typeof value === 'string' && value.length > 200000)) throw new RequestError('Form field is too large.', 413)
        }
      }
      const response = await handler(request, ...args)
      // APIs never cache private responses at the CDN. Upstream caching is explicit in carpool.
      response.headers.set('Cache-Control', 'no-store')
      return response
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 503
      if (!(error instanceof RequestError)) console.error('API request failed:', error instanceof Error ? error.name : 'Unknown error')
      return NextResponse.json({ error: error instanceof RequestError ? error.message : 'Service temporarily unavailable.' }, { status, headers: { 'Cache-Control': 'no-store' } })
    }
  }
}
