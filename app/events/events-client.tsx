"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CloudinaryImage } from "@/components/cloudinary-image"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { events } from "./events-data"
import { DEFAULT_TIMEZONE, parseTimeToken, formatTimeForDisplay, formatDisplayDate, isoToZonedDate } from "./date-utils"

export function EventsClient() {
	return (
		<div className="flex-1 relative flex flex-col">
			<Navigation />
			<main className="relative z-20 flex-1">
				<DecorativeBirds images={[]} />
				<PageHeader
					title="Events"
					description="Upcoming birding trips and club events. Click an event for more info and to sign up!"
				/>
				<section className="py-12 px-4">
					<div className="container mx-auto max-w-6xl relative z-20">
						<div className="grid lg:grid-cols-4 gap-8">
							{/* Sidebar for future event navigation or info */}
							<aside className="lg:col-span-1">
								<div className="lg:sticky lg:top-24 space-y-6">
									<Card>
										<CardHeader>
											<CardTitle className="text-lg">
												Suggest an Event
											</CardTitle>
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
							{/* Main Events Content */}
							<div className="lg:col-span-3 grid md:grid-cols-2 gap-6">
								{events.map((event, idx) => {
									// Precise date/time logic: parse start and end times from the time string
									const now = new Date()

									// use shared parseTimeToken/formatTimeForDisplay from date-utils

									let status = 'Upcoming'
									const displayDate = formatDisplayDate(event.startDate, event.endDate)
									try {
										const start = event.startTime
											? parseTimeToken(event.startDate, event.startTime)
											: null
										const end = event.endTime
											? parseTimeToken(event.startDate, event.endTime)
											: null
										if (start && end) {
											if (now > end) status = 'Past'
											else if (now >= start && now <= end) status = 'Current'
											else status = 'Upcoming'
										} else {
											// Fallback to date-only logic if parsing fails
											const eventDate = isoToZonedDate(event.startDate, DEFAULT_TIMEZONE)
											if (
												eventDate.getUTCFullYear() === new Date().getUTCFullYear() &&
												eventDate.getUTCMonth() === new Date().getUTCMonth() &&
												eventDate.getUTCDate() === new Date().getUTCDate()
											) {
												status = 'Current'
											} else if (eventDate.getTime() < now.getTime()) {
												status = 'Past'
											}
										}
									} catch (e) {
										// on any error, fall back to a safe Upcoming
										status = 'Upcoming'
									}
									return (
										<Card
											key={idx}
											className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden pt-0"
										>
											<Link
												href={event.url}
												className="block relative h-48 overflow-hidden p-0 m-0"
											>
												<CloudinaryImage
													src={event.image}
													alt={event.title}
													fill
													className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
														status === 'Past' ? 'saturate-[0.3]' : ''
													}`}
												/>
												<Badge
													className="absolute top-4 right-4 shadow-lg font-semibold text-sm"
													style={{
														backgroundColor: '#36834C',
														color: 'white',
													}}
												>
													{status}
												</Badge>
											</Link>
											<CardHeader>
												<CardTitle className="font-display text-2xl">
													<Link
														href={event.url}
														className="hover:no-underline focus:no-underline"
													>
														{event.title}
													</Link>
												</CardTitle>
												<div className="flex items-center gap-2 text-muted-foreground">
													<MapPin className="w-4 h-4" />
													{event.location}
												</div>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="flex items-start gap-4 text-sm text-muted-foreground">
													<div className="flex gap-1">
														<Calendar className="w-4 h-4 mt-[0.0625rem] flex-shrink-0" />
														<span className="leading-tight whitespace-pre-line">{displayDate}</span>
													</div>
													<div className="flex gap-1">
														<Clock className="w-4 h-4 mt-[0.0625rem] flex-shrink-0" />
														<span className="leading-tight">{formatTimeForDisplay(event.startDate, event.startTime)} - {formatTimeForDisplay(event.startDate, event.endTime)}</span>
													</div>
												</div>
											</CardContent>
										</Card>
									)
								})}
							</div>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	)
}
