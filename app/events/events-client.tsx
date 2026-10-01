"use client"

import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CloudinaryImage } from "@/components/cloudinary-image"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, Search, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTimeForDisplay, formatDisplayDate, getEventStatus, type EventStatus } from "./date-utils"
import { useState } from "react"

export interface EventsClientEvent {
  hidden?: boolean
  slug: string
  title: string
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  location: string
  bodyMarkdown: string
  imagePublicId: string
  url: string
}

export interface EventsClientProps {
  events: EventsClientEvent[]
}

export function EventsClient({ events }: EventsClientProps) {
  const [view, setView] = useState<"card" | "list">("card")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"Upcoming" | "Current" | "Past" | "All">("Upcoming")
  const [locationFilter, setLocationFilter] = useState("All locations")

  const locations = Array.from(new Set(events.map(event => event.location).filter(Boolean))).sort()
  const filteredEvents = events.filter(event => {
    const status = getEventStatus(event.startDate, event.endDate, event.startTime, event.endTime)
    const query = searchQuery.trim().toLowerCase()
    const searchableText = [
      event.title,
      event.location,
      event.startDate,
      event.endDate || "",
      event.bodyMarkdown || "",
    ].join(" ").toLowerCase()
    const matchesSearch = !query || searchableText.includes(query)
    const matchesStatus = Boolean(query) || statusFilter === "All" || status === statusFilter || (statusFilter === "Upcoming" && status === "Current")
    const matchesLocation = locationFilter === "All locations" || event.location === locationFilter
    return matchesSearch && matchesStatus && matchesLocation
  })

  return (
    <div className="flex-1 relative flex flex-col">
      <main className="relative z-20 flex-1">
        <DecorativeBirds images={[]} />
        <PageHeader
          title="Events"
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl relative z-20">
            <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative flex h-10 min-w-0 flex-1 items-center">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="event-search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search all events, including past events" className="h-10 pl-9" />
                </div>
                <div className="flex shrink-0 gap-1" role="group" aria-label="Event view">
                  <Button type="button" size="icon" variant={view === "card" ? "default" : "outline"} aria-label="Card view" title="Card view" aria-pressed={view === "card"} onClick={() => setView("card")}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant={view === "list" ? "default" : "outline"} aria-label="List view" title="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="sm:w-48">
                <select id="event-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="Upcoming">Upcoming & current</option>
                  <option value="Current">Current</option>
                  <option value="Past">Past</option>
                  <option value="All">All events</option>
                </select>
              </div>
            </div>
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="lg:sticky lg:top-24 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Suggest an Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 -mt-2">
                        Having an idea for a trip or event? Fill out the form below!
                      </p>
                      <Button asChild className="w-full">
                        <a
                          href="https://forms.gle/1uCJLQB51k8ZsZUt7"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Suggest an Event
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </aside>
              {/* Events Grid */}
              <div className={`lg:col-span-3 grid content-start gap-6 ${view === "card" ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                    <h1 className="font-display text-5xl font-bold mb-4 text-primary">No Matching Events</h1>
                    <p className="text-lg mb-6 text-muted-foreground max-w-md mx-auto">Try a different search or filter.</p>
                  </div>
                ) : (
                  filteredEvents.map(event => {
                    const status: EventStatus = getEventStatus(event.startDate, event.endDate, event.startTime, event.endTime)
                    const displayDate = formatDisplayDate(event.startDate, event.endDate ?? event.startDate)
                    
                    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'
                    
                    return (
                      <Link
                        key={event.slug}
                        href={event.url}
                        aria-label={`View ${event.title}`}
                        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Card className={`relative h-full overflow-hidden transition-shadow hover:shadow-md ${view === "list" ? "grid grid-cols-[6rem_minmax(0,1fr)] gap-x-0 gap-y-3 py-0 sm:grid-cols-[10rem_minmax(0,1fr)]" : "pt-0"}`}>
                        <div className={`relative overflow-hidden p-0 m-0 bg-muted ${view === "list" ? "row-span-2 h-full min-h-36" : "h-48"}`}>

                          {event.imagePublicId ? (
                            <CloudinaryImage
                              src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${event.imagePublicId}`}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                              <span className="text-sm">No image</span>
                            </div>
                          )}
                          <Badge className={`absolute shadow-lg font-semibold ${view === "list" ? "top-2 right-2 text-xs" : "top-4 right-4 text-sm"}`} style={{ backgroundColor: '#36834C', color: 'white' }}>
                            {status}
                          </Badge>
                        </div>
                        {event.hidden && (
                          <div className="preview-outline pointer-events-none absolute -inset-px z-10 rounded-[inherit]" role="status">
                            <span className="sr-only">Preview mode — admins only</span>
                          </div>
                        )}
                        <CardHeader className={view === "list" ? "min-w-0 px-4 pt-4" : undefined}>
                          <CardTitle className="break-words font-display text-2xl">
                            {event.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </CardHeader>
                        <CardContent className={view === "list" ? "min-w-0 space-y-4 px-4 pb-4" : "space-y-4"}>
                          <div className="flex items-start justify-between text-sm text-muted-foreground">
                            <div className="flex gap-1 pr-2 max-w-[70%]">
                              <Calendar className="w-4 h-4 mt-[0.0625rem] flex-shrink-0" />
                              <span className="leading-tight whitespace-pre-line">{displayDate}</span>
                            </div>
                            {event.startTime && (
                              <div className="flex gap-1 text-right">
                                <Clock className="w-4 h-4 mt-[0.0625rem] flex-shrink-0" />
                                <span className="leading-tight">
                                  {formatTimeForDisplay(event.startDate, event.startTime ?? undefined)}
                                  {event.endTime ? ` - ${formatTimeForDisplay(event.startDate, event.endTime ?? undefined)}` : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        </Card>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
