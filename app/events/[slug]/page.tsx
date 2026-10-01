export const dynamic = 'force-dynamic'
export const dynamicParams = true // Allow dynamic slug paths not in generateStaticParams
import { cookies } from "next/headers"
import { verifyAdminToken } from "@/lib/auth"
import { notFound } from "next/navigation"
import EventTemplate from "../EventTemplate"
import { getEvent, listEvents } from "@/lib/events-db"
import { getSitePage } from "@/lib/pages-db"
import { formatDisplayDate, formatTimeForDisplay } from "../date-utils"
import type { Metadata } from "next"

interface PageProps { 
  params: Promise<{ slug: string }> 
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug, true)

  if (!event) return {}

  const date = formatDisplayDate(event.startDate, event.endDate ?? event.startDate)
  const description = `${date} at ${event.location}. View details for ${event.title}, hosted by Birding at UVA.`
  const canonicalPath = `/events/${encodeURIComponent(event.slug)}`

  return {
    title: event.title,
    description,
    alternates: { canonical: canonicalPath },
    robots: event.hidden ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${event.title} | Birding at UVA`,
      description,
      url: canonicalPath,
      type: "article",
      images: event.imagePublicId ? [
        `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dev-birdingatuva"}/image/upload/${event.imagePublicId}`,
      ] : undefined,
    },
  }
}

// Generate static params for all existing events at build time
export async function generateStaticParams() {
  const events = await listEvents()
  return events.map((event) => ({
    slug: event.slug,
  }))
}

export default async function EventPage(props: PageProps) {
  if (!(await getSitePage("events"))) notFound()
  const params = await props.params
  const record = await getEvent(params.slug, true)
  if (!record) return notFound()
  const token = (await cookies()).get("admin_jwt")?.value
  const isAdmin = token ? !!verifyAdminToken(token) : false
  if (record.hidden && !isAdmin) notFound()

  const bodyMarkdown = record.bodyMarkdown || "Event details coming soon."
  const signupUrl = record.signupUrl || ""
  const dateDisplay = formatDisplayDate(record.startDate, record.endDate ?? record.startDate)
  const timeDisplay = [
    formatTimeForDisplay(record.startDate, record.startTime || undefined),
    record.endTime ? formatTimeForDisplay(record.startDate, record.endTime || undefined) : null,
  ].filter(Boolean).join(" - ")

  return (
    <EventTemplate
      preview={record.hidden}
      isAdmin={isAdmin}
      eventSlug={record.slug}
      title={record.title}
      description={`${dateDisplay}${timeDisplay ? ` | ${timeDisplay}` : ""} | ${record.location}`}
      image={record.imagePublicId}
      location={record.location}
      dateDisplay={dateDisplay}
      timeDisplay={timeDisplay}
      bodyMarkdown={bodyMarkdown}
      signupUrl={signupUrl}
      dashboardUrl={record.dashboardUrl || ""}
      showFaqBanner={record.showFaqBanner}
    />
  )
}
