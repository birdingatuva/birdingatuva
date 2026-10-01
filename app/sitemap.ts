import type { MetadataRoute } from "next"
import { listEvents } from "@/lib/events-db"
import { listSitePages } from "@/lib/pages-db"

export const dynamic = "force-dynamic"

const SITE_URL = "https://birdingatuva.org"

const pageSettings: Record<
  string,
  Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority">
> = {
  home: { changeFrequency: "daily", priority: 1 },
  events: { changeFrequency: "daily", priority: 0.9 },
  faq: { changeFrequency: "weekly", priority: 0.8 },
  leadership: { changeFrequency: "monthly", priority: 0.6 },
  links: { changeFrequency: "monthly", priority: 0.6 },
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, events] = await Promise.all([listSitePages(), listEvents()])
  const publishedSlugs = new Set(pages.map((page) => page.slug))

  const pageEntries = Object.entries(pageSettings)
    .filter(([slug]) => publishedSlugs.has(slug))
    .map(([slug, settings]) => ({
      url: slug === "home" ? `${SITE_URL}/` : `${SITE_URL}/${slug}`,
      ...settings,
    }))

  const eventEntries = publishedSlugs.has("events")
    ? events.map((event) => ({
        url: `${SITE_URL}/events/${encodeURIComponent(event.slug)}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    : []

  return [...pageEntries, ...eventEntries]
}
