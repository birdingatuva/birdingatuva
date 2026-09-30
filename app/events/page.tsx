export const dynamic = 'force-dynamic'
import { notFound } from "next/navigation"
import { EventsClient } from "./events-client"
import { cookies } from "next/headers"
import { verifyAdminToken } from "@/lib/auth"
import { listAllEvents, listEvents } from "@/lib/events-db"
import { getSitePage } from "@/lib/pages-db"

export default async function EventsPage() {
  if (!(await getSitePage("events"))) notFound()
  const token = (await cookies()).get("admin_jwt")?.value
  const isAdmin = token ? !!verifyAdminToken(token) : false
  const events = await (isAdmin ? listAllEvents() : listEvents())
  // Map to client-friendly minimal shape
  const clientEvents = events.map(e => ({
    slug: e.slug,
    hidden: e.hidden,
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    bodyMarkdown: e.bodyMarkdown,
    imagePublicId: e.imagePublicId,
    url: `/events/${e.slug}`,
  }))
  return <EventsClient events={clientEvents} />
}
