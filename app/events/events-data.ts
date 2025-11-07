export const events = [
  {
    slug: "ohill-birding",
    title: "Ohill Birding",
    // ISO date strings for precise logic and future DB compatibility
    startDate: "2025-11-07",
    endDate: "2025-11-07",
    // store times in 24-hour HH:mm format for consistency
    startTime: "07:00",
    endTime: "09:15",
    location: "Meeting at Slaughter",
    image: "/images/local-trips/ohill.png",
    url: "/events/ohill-birding",
  },

].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

export function getEventBySlug(slug: string) {
  return events.find((e) => e.slug === slug) ?? null
}
