export const dynamic = 'force-static'
export const revalidate = false
export const dynamicParams = true // Allow dynamic slug paths not in generateStaticParams
import { notFound } from "next/navigation"
import EventTemplate from "../EventTemplate"
import { getEvent, listEvents } from "@/lib/events-db"
import { formatDisplayDate, formatTimeForDisplay } from "../date-utils"

interface PageProps { 
  params: Promise<{ slug: string }> 
}

// Generate static params for all existing events at build time
export async function generateStaticParams() {
  const events = await listEvents()
  return events.map((event) => ({
    slug: event.slug,
  }))
}

export default async function EventPage(props: PageProps) {
  const params = await props.params
  const record = await getEvent(params.slug)
  if (!record) return notFound()

  const bodyMarkdown = record.bodyMarkdown || "Event details coming soon."
  const signupUrl = record.signupUrl || ""
  const dateDisplay = formatDisplayDate(record.startDate, record.endDate ?? record.startDate)
  const timeDisplay = [
    formatTimeForDisplay(record.startDate, record.startTime || undefined),
    record.endTime ? formatTimeForDisplay(record.startDate, record.endTime || undefined) : null,
  ].filter(Boolean).join(" - ")

  // Use first image public id (if any) for hero image
  const image = record.imagePublicIds[0] || ""

  return (
    <EventTemplate
      title={record.title}
      description={`${dateDisplay}${timeDisplay ? ` | ${timeDisplay}` : ""} | ${record.location}`}
      image={image}
      images={record.imagePublicIds}
      location={record.location}
      dateDisplay={dateDisplay}
      timeDisplay={timeDisplay}
      bodyMarkdown={bodyMarkdown}
      signupUrl={signupUrl}
      hasGoogleForm={record.hasGoogleForm}
    />
  )
}
