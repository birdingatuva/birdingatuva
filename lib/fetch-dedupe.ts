// Simple client-side fetch de-duplication to avoid issuing identical concurrent
// requests (e.g., rapid re-renders or focus re-fetches). This reduces redundant
// Edge Requests for the same resource.
//
// Usage:
// import { dedupeFetch } from '@/lib/fetch-dedupe'
// const data = await dedupeFetch('/api/events')
//
// Automatically cleans up resolved entries. Only handles GET requests.
const inflight = new Map<string, Promise<Response>>()

export async function dedupeFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    return fetch(input, init)
  }
  if (!inflight.has(input)) {
    const p = fetch(input, init).finally(() => {
      // Remove after settle to avoid memory growth
      inflight.delete(input)
    })
    inflight.set(input, p)
  }
  return inflight.get(input)!
}

// Convenience helper that returns JSON directly.
export async function dedupeJson<T = any>(input: string, init?: RequestInit): Promise<T> {
  const res = await dedupeFetch(input, init)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}