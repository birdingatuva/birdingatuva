"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CloudinaryImage } from "@/components/cloudinary-image"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTimeForDisplay, formatDisplayDate, getEventStatus, type EventStatus } from "./date-utils"
import { useState } from "react"

export interface EventsClientEvent {
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
      <Navigation />
      <main className="relative z-20 flex-1">
        <DecorativeBirds images={[]} />
        <PageHeader
          title="Events"
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl relative z-20">
            <div className="mb-8 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="relative flex h-10 items-center">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="event-search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search all events, including past events" className="h-10 pl-9" />
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
              <div className="lg:col-span-3 grid md:grid-cols-2 gap-6">
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
                      <Card key={event.slug} className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden pt-0">
                        <Link href={event.url} className="block relative h-48 overflow-hidden p-0 m-0 bg-muted">
                          {event.imagePublicId ? (
                            <CloudinaryImage
                              src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${event.imagePublicId}`}
                              alt={event.title}
                              fill
                              className={`object-cover group-hover:scale-110 transition-transform duration-500 ${status === 'Past' ? 'saturate-[0.3]' : ''}`}
                            />
                          ) : (
                            <div className={`absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground ${status === 'Past' ? 'saturate-[0.3]' : ''}`}>
                              <span className="text-sm">No image</span>
                            </div>
                          )}
                          <Badge className="absolute top-4 right-4 shadow-lg font-semibold text-sm" style={{ backgroundColor: '#36834C', color: 'white' }}>
                            {status}
                          </Badge>
                        </Link>
                        <CardHeader>
                          <CardTitle className="font-display text-2xl">
                            <Link href={event.url} className="hover:no-underline focus:no-underline">
                              {event.title}
                            </Link>
                          </CardTitle>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
