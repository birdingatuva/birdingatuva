import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import { notFound } from "next/navigation"
import { getEvent } from "@/lib/events-db"
import { formatDisplayDate, formatTimeForDisplay } from "../date-utils"
import EventTemplate from "../EventTemplate"

export default async function OhillBirdingEvent() {
  const slug = "ohill-birding"
  const record = await getEvent(slug)
  if (!record) return notFound()

  const dateDisplay = formatDisplayDate(record.startDate, record.endDate ?? record.startDate)
  const timeDisplay = [
    formatTimeForDisplay(record.startDate, record.startTime || undefined),
    record.endTime ? formatTimeForDisplay(record.startDate, record.endTime || undefined) : null,
  ].filter(Boolean).join(" - ")

  const description = `${dateDisplay}${timeDisplay ? ` | ${timeDisplay}` : ''} | ${record.location}`
  const bodyMarkdown = record.bodyMarkdown || "Event details coming soon."
  const image = record.imagePublicIds[0] || ""

  return (
    <EventTemplate
      title={record.title}
      description={description}
      image={image}
      location={record.location}
      dateDisplay={dateDisplay}
      timeDisplay={timeDisplay}
      bodyMarkdown={bodyMarkdown}
      signupUrl={record.signupUrl || ''}
      signupEmbedUrl={record.signupEmbedUrl || undefined}
      hasGoogleForm={record.hasGoogleForm}
    />
  )
}
