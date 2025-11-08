import { sql } from '@vercel/postgres'

export interface DbEventRow {
  slug: string
  title: string
  start_date: unknown
  end_date: unknown
  start_time: string | null
  end_time: string | null
  location: string
  image_urls: string[] | string | null // jsonb array of public_ids (can be array or string depending on driver)
  body_markdown: string | null
  signup_url: string | null
  signup_embed_url: string | null
  has_google_form: boolean | null
}

export interface EventRecord {
  slug: string
  title: string
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  location: string
  bodyMarkdown: string
  signupUrl: string | null
  signupEmbedUrl: string | null
  hasGoogleForm: boolean
  imagePublicIds: string[]
}

function parseImagePublicIds(raw: string[] | string | null): string[] {
  if (!raw) return []
  
  // If it's already an array (jsonb returned as native array)
  if (Array.isArray(raw)) {
    return raw
      .filter(x => typeof x === 'string')
      .map((x: string) => x.trim())
      .filter(x => x.length > 0)
  }
  
  // If it's a string, try to parse as JSON first
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        return arr
          .filter(x => typeof x === 'string')
          .map((x: string) => x.trim())
          .filter(x => x.length > 0)
      }
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return raw
        .split(',')
        .map(x => x.trim())
        .filter(x => x.length > 0)
    }
  }
  
  return []
}

function normalizeDate(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') {
    // assume already YYYY-MM-DD or ISO; trim to date part
    return val.length > 10 ? val.slice(0, 10) : val
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  // fallback: JSON stringify then attempt parse
  try {
    const parsed = new Date(String(val))
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  } catch {}
  return ''
}

export async function listEvents(): Promise<EventRecord[]> {
  const { rows } = await sql`SELECT slug, title, start_date, end_date, start_time, end_time, location, image_urls, body_markdown, signup_url, signup_embed_url, has_google_form FROM events ORDER BY start_date DESC;`
  return rows.map(r => {
    const row = r as unknown as DbEventRow
    const startDate = normalizeDate(row.start_date)
    const endDateRaw = normalizeDate(row.end_date)
    return {
      slug: (row.slug || '').trim(),
      title: row.title,
      startDate,
      endDate: endDateRaw || null,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      bodyMarkdown: row.body_markdown || '',
      signupUrl: row.signup_url,
      signupEmbedUrl: row.signup_embed_url,
      hasGoogleForm: !!row.has_google_form,
      imagePublicIds: parseImagePublicIds(row.image_urls),
    }
  })
}

export async function getEvent(slug: string): Promise<EventRecord | null> {
  const s = (slug || '').trim()
  const { rows } = await sql`SELECT slug, title, start_date, end_date, start_time, end_time, location, image_urls, body_markdown, signup_url, signup_embed_url, has_google_form FROM events WHERE lower(trim(slug)) = lower(${s}) LIMIT 1;`
  if (rows.length === 0) return null
  const r = rows[0] as unknown as DbEventRow
  const startDate = normalizeDate(r.start_date)
  const endDateRaw = normalizeDate(r.end_date)
  return {
    slug: (r.slug || '').trim(),
    title: r.title,
    startDate,
    endDate: endDateRaw || null,
    startTime: r.start_time,
    endTime: r.end_time,
    location: r.location,
    bodyMarkdown: r.body_markdown || '',
    signupUrl: r.signup_url,
    signupEmbedUrl: r.signup_embed_url,
    hasGoogleForm: !!r.has_google_form,
    imagePublicIds: parseImagePublicIds(r.image_urls),
  }
}
