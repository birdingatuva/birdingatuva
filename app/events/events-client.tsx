"use client"

import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import Link from "next/link"
import { CloudinaryImage } from "@/components/cloudinary-image"
import { MapPin, Search, LayoutList, List, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatTimeForDisplay, formatDisplayDate, getEventStatus } from "./date-utils"
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
  suggestEventUrl: string
}

type StatusFilter = "Current & Upcoming" | "Past" | "All"

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "Current & Upcoming", label: "Current & Upcoming" },
  { value: "Past", label: "Past" },
  { value: "All", label: "All" },
]

function parseDate(date: string) {
  const d = new Date(`${date.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function monthLabel(date: string) {
  const d = parseDate(date)
  return d ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Undated"
}

export function EventsClient({ events, suggestEventUrl }: EventsClientProps) {
  const [view, setView] = useState<"list" | "compact">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Current & Upcoming")

  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dev-birdingatuva"
  const query = searchQuery.trim().toLowerCase()

  const filteredEvents = events
    .filter(event => {
      const status = getEventStatus(event.startDate, event.endDate, event.startTime, event.endTime)
      const searchableText = [
        event.title,
        event.location,
        event.startDate,
        event.endDate || "",
        event.bodyMarkdown || "",
      ].join(" ").toLowerCase()
      const matchesSearch = !query || searchableText.includes(query)
      const matchesStatus =
        Boolean(query) ||
        statusFilter === "All" ||
        (statusFilter === "Current & Upcoming" && (status === "Current" || status === "Upcoming")) ||
        status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const order = a.startDate.localeCompare(b.startDate)
      return statusFilter === "Past" || statusFilter === "All" ? -order : order
    })

  const groups: { label: string; items: EventsClientEvent[] }[] = []
  for (const event of filteredEvents) {
    const label = monthLabel(event.startDate)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(event)
    else groups.push({ label, items: [event] })
  }

  const renderImage = (event: EventsClientEvent) =>
    event.imagePublicId ? (
      <CloudinaryImage
        src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${event.imagePublicId}`}
        alt=""
        fill
        className="object-cover"
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No image</div>
    )

  const renderTime = (event: EventsClientEvent) =>
    event.startTime ? (
      <span>
        Start <span className="font-semibold text-foreground">{formatTimeForDisplay(event.startDate, event.startTime ?? undefined)}</span>
        {event.endTime && (
          <>
            <span className="mx-2" aria-hidden>/</span>
            End <span className="font-semibold text-foreground">{formatTimeForDisplay(event.startDate, event.endTime ?? undefined)}</span>
          </>
        )}
      </span>
    ) : null

  const previewOutline = (event: EventsClientEvent) =>
    event.hidden ? (
      <div className="preview-outline pointer-events-none absolute -inset-x-3 -inset-y-px z-10 rounded-sm" role="status">
        <span className="sr-only">Preview mode — admins only</span>
      </div>
    ) : null

  return (
    <div className="flex-1 relative flex flex-col">
      <main className="relative z-20 flex-1">
        <DecorativeBirds images={[]} />
        <PageHeader title="Events" />

        <section className="px-4 pb-20 pt-10">
          <div className="container relative z-20 mx-auto max-w-5xl">
            {/* Toolbar */}
            <div className="flex flex-col gap-5 border-b border-border pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="event-search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search all events, including past ones"
                  aria-label="Search events"
                  className="h-14 rounded-lg border-2 border-input bg-card pl-12 pr-4 text-base shadow-sm transition-[color,box-shadow] focus:border-input focus:shadow-[0_2px_10px_rgba(0,0,0,0.18)] focus-visible:border-input focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1" role="group" aria-label="Filter by date">
                  {STATUS_TABS.map(tab => {
                    const active = !query && statusFilter === tab.value
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setStatusFilter(tab.value)
                          setSearchQuery("")
                        }}
                        className={`-mb-[17px] border-b-2 pb-4 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1" role="group" aria-label="Event view">
                    {([
                      { v: "list", label: "List view", Icon: LayoutList },
                      { v: "compact", label: "Compact view", Icon: List },
                    ] as const).map(({ v, label, Icon }) => (
                      <button
                        key={v}
                        type="button"
                        aria-label={label}
                        title={label}
                        aria-pressed={view === v}
                        onClick={() => setView(v)}
                        className={`rounded-md p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              {query
                ? `${filteredEvents.length} ${filteredEvents.length === 1 ? "result" : "results"} across all events`
                : `${filteredEvents.length} ${filteredEvents.length === 1 ? "event" : "events"}`}
            </p>

            {/* Events */}
            {filteredEvents.length === 0 ? (
              <div className="py-24">
                <h2 className="font-display text-4xl font-bold text-primary">No matching events</h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Try a different search, or switch to another date range or location.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                {groups.map(group => (
                  <section key={group.label} aria-label={group.label} className="mt-10 first:mt-4">
                    <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">{group.label}</h2>

                    {view === "list" ? (
                      <ul className="mt-3 divide-y divide-border border-t border-border">
                        {group.items.map(event => {
                          const start = parseDate(event.startDate)
                          const displayDate = formatDisplayDate(event.startDate, event.endDate ?? event.startDate)
                          return (
                            <li key={event.slug} className="relative">
                              {previewOutline(event)}
                              <Link
                                href={event.url}
                                aria-label={`View ${event.title}`}
                                className="group -mx-3 grid rounded-md px-3 transition-colors hover:bg-muted/40 grid-cols-[6rem_minmax(0,1fr)_5.5rem] items-center gap-x-4 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[10rem_minmax(0,1fr)_11rem] sm:gap-x-8"
                              >
                                <div className="text-center leading-none">
                                  <div className="text-sm font-semibold uppercase text-muted-foreground">
                                    {start ? start.toLocaleDateString("en-US", { weekday: "short" }) : ""}
                                  </div>
                                  <div className="mt-1.5 font-display text-5xl font-bold text-primary sm:text-6xl">
                                    {start ? start.getDate() : "–"}
                                  </div>
                                  <div className="mt-1.5 text-sm font-medium text-muted-foreground">
                                    {start ? start.toLocaleDateString("en-US", { month: "short" }) : ""}
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <h3 className="break-words font-display text-2xl font-bold leading-snug text-primary transition-colors group-hover:text-primary sm:text-3xl">
                                    {event.title}
                                  </h3>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-1 border-t border-border pt-2 text-base text-muted-foreground">
                                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                      {event.location}
                                    </span>
                                    {renderTime(event)}
                                  </div>
                                  {event.endDate && event.endDate !== event.startDate && (
                                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{displayDate}</p>
                                  )}
                                  <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-primary/70 transition-colors group-hover:text-primary">View details<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
                                </div>

                                <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted">
                                  {renderImage(event)}
                                </div>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <ul className="mt-3 divide-y divide-border border-t border-border">
                        {group.items.map(event => {
                          const start = parseDate(event.startDate)
                          const end = event.endDate ? parseDate(event.endDate) : null
                          const multiDay = Boolean(end && start && event.endDate !== event.startDate)
                          return (
                            <li key={event.slug} className="relative">
                              {previewOutline(event)}
                              <Link
                                href={event.url}
                                aria-label={`View ${event.title}`}
                                className="group -mx-3 grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-5 gap-y-0.5 rounded-md px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:grid-cols-[6.5rem_minmax(0,1fr)_11rem_17rem_1rem] md:gap-x-6"
                              >
                                <span className="font-display text-2xl font-bold text-primary">
                                  {start ? `${start.toLocaleDateString("en-US", { weekday: "short" })} ${start.getDate()}` : "–"}
                                  {multiDay && end ? `–${end.getDate()}` : ""}
                                </span>
                                <h3 className="break-words font-display text-xl font-bold leading-snug text-primary transition-colors group-hover:text-primary sm:text-2xl">
                                  {event.title}
                                </h3>
                                <span className="col-start-2 flex items-center gap-1.5 text-sm font-semibold text-foreground md:col-start-auto">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                  <span className="min-w-0 break-words">{event.location}</span>
                                </span>
                                <span className="col-start-2 text-sm text-muted-foreground md:col-start-auto">{renderTime(event)}</span>
                                <ChevronRight className="hidden h-4 w-4 self-center text-primary/70 transition-transform group-hover:translate-x-0.5 group-hover:text-primary md:block" aria-hidden />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}

            {/* Suggest an event */}
            <div className="mt-20 flex flex-col gap-4 border-t border-border pt-10 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-2xl font-bold text-primary">Have an idea for a trip or event?</h2>
                <p className="mt-2 text-muted-foreground">Tell us where you&apos;d like to go and we&apos;ll consider it for a future outing.</p>
              </div>
              {suggestEventUrl && (
                <a
                  href={suggestEventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Suggest an event
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
