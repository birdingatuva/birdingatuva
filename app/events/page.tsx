export const revalidate = 300
import { EventsClient } from "./events-client"
import { listEvents } from "@/lib/events-db"

export default async function EventsPage() {
  const events = await listEvents()
  // Map to client-friendly minimal shape
  const clientEvents = events.map(e => ({
    slug: e.slug,
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    // Card image = first public_id or placeholder-like fallback
    imagePublicId: e.imagePublicIds[0] || '',
    url: `/events/${e.slug}`,
  }))
  return <EventsClient events={clientEvents} />
}
