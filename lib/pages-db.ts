import { sql } from '@vercel/postgres'

export interface SitePage {
  id: number
  slug: string
  name: string
  contentMarkdown: string
  published: boolean
}

export interface SitePageSetting {
  pageId: number
  settingKey: string
  settingValue: unknown
}

export async function listSitePages(includeUnpublished = false): Promise<SitePage[]> {
  const result = includeUnpublished
    ? await sql`SELECT id, slug, name, content_markdown, published FROM site_pages ORDER BY id`
    : await sql`SELECT id, slug, name, content_markdown, published FROM site_pages WHERE published = TRUE ORDER BY id`
  return result.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    contentMarkdown: String(row.content_markdown || ''),
    published: Boolean(row.published),
  }))
}

export async function updateSitePagePublished(slug: string, published: boolean): Promise<SitePage | null> {
  const result = await sql`
    UPDATE site_pages SET published = ${published}
    WHERE slug = ${slug}
    RETURNING id, slug, name, content_markdown, published
  `
  const row = result.rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    contentMarkdown: String(row.content_markdown || ''),
    published: Boolean(row.published),
  }
}

export async function getSitePageSetting(slug: string, settingKey: string): Promise<unknown> {
  const result = await sql`
    SELECT ps.setting_value
    FROM page_settings ps
    JOIN site_pages sp ON sp.id = ps.page_id
    WHERE sp.slug = ${slug} AND ps.setting_key = ${settingKey}
    LIMIT 1
  `
  return result.rows[0]?.setting_value ?? null
}

export async function updateSitePageSetting(slug: string, settingKey: string, settingValue: unknown): Promise<unknown> {
  const result = await sql`
    INSERT INTO page_settings (page_id, setting_key, setting_value)
    SELECT id, ${settingKey}, ${JSON.stringify(settingValue)}::jsonb
    FROM site_pages WHERE slug = ${slug}
    ON CONFLICT (page_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
    RETURNING setting_value
  `
  return result.rows[0]?.setting_value ?? null
}

export async function getSitePage(slug: string, includeUnpublished = false): Promise<SitePage | null> {
  const result = includeUnpublished
    ? await sql`SELECT id, slug, name, content_markdown, published FROM site_pages WHERE slug = ${slug} LIMIT 1`
    : await sql`SELECT id, slug, name, content_markdown, published FROM site_pages WHERE slug = ${slug} AND published = TRUE LIMIT 1`

  const row = result.rows[0] as {
    id: number
    slug: string
    name: string
    content_markdown: string | null
    published: boolean
  } | undefined

  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    contentMarkdown: row.content_markdown || '',
    published: row.published,
  }
}

export async function updateSitePageContent(slug: string, contentMarkdown: string): Promise<SitePage | null> {
  const result = await sql`
    UPDATE site_pages
    SET content_markdown = ${contentMarkdown}
    WHERE slug = ${slug}
    RETURNING id, slug, name, content_markdown, published
  `

  const row = result.rows[0] as {
    id: number
    slug: string
    name: string
    content_markdown: string | null
    published: boolean
  } | undefined

  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    contentMarkdown: row.content_markdown || '',
    published: row.published,
  }
}