import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const runtime = 'nodejs'

// Return a unique slug suggestion. Only increment if there is an exact base match.
// Ignore non-numeric hyphenated variants like base-other; only consider base-N where N is an integer.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const base = (searchParams.get('base') || '').trim().toLowerCase()
  if (!base) {
    return NextResponse.json({ error: 'Missing base slug' }, { status: 400 })
  }
  try {
    const { rows } = await sql`SELECT slug FROM events WHERE slug = ${base} OR slug LIKE ${base + '-%'};`
    let exactExists = false
    let maxNumericSuffix = 1
    for (const r of rows) {
      const s: string = (r as any).slug
      if (s === base) {
        exactExists = true
      } else if (s.startsWith(base + '-')) {
        const tail = s.substring((base + '-').length)
        if (/^\d+$/.test(tail)) {
          const n = parseInt(tail, 10)
          if (!Number.isNaN(n)) {
            maxNumericSuffix = Math.max(maxNumericSuffix, n)
          }
        }
      }
    }
    if (!exactExists) {
      // base not taken; just return base with isTaken false
      return NextResponse.json({ base, uniqueSlug: base, isTaken: false })
    }
    const unique = `${base}-${maxNumericSuffix + 1}`
    return NextResponse.json({ base, uniqueSlug: unique, isTaken: true })
  } catch (err) {
    console.error('[check-slug] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
