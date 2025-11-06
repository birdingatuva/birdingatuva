"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock } from "lucide-react"

const events = [
	{
		title: "Ohill Birding",
		date: "Friday Nov 7, 2025",
		time: "7:00am - 9:15am",
		location: "Meeting at Slaughter",
		image: "/images/local-trips/ohill.png", // Use home page image
		url: "/events/ohill-birding-2025-11-07", // Updated URL with correct date
		dateISO: "2025-11-07", // ISO for logic
	},
]

export function EventsClient() {
	return (
		<div className="min-h-screen relative">
			<Navigation />
			<main className="relative z-20">
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
											<p className="text-sm text-muted-foreground mb-4">
												Having an idea for a trip or event? Reach out to
												us!
											</p>
											<Link
												href="mailto:birdingatuva@gmail.com"
												className="block w-full"
											>
												<span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center">
													Contact Us
												</span>
											</Link>
										</CardContent>
									</Card>
								</div>
							</aside>
							{/* Main Events Content */}
							<div className="lg:col-span-3 grid md:grid-cols-2 gap-6">
								{events.map((event, idx) => {
									// Date logic
									const today = new Date()
									const eventDate = new Date(event.dateISO)
									let status = "Upcoming"
									if (
										eventDate.getFullYear() === today.getFullYear() &&
										eventDate.getMonth() === today.getMonth() &&
										eventDate.getDate() === today.getDate()
									) {
										status = "Current"
									} else if (eventDate < today) {
										status = "Past"
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
												<Image
													src={event.image}
													alt={event.title}
													fill
													className={`object-cover group-hover:scale-110 transition-transform duration-500${
														status === "Past"
															? " grayscale brightness-90"
															: ""
													}`}
													quality={85}
													sizes="(max-width: 768px) 100vw, 50vw"
													loading="lazy"
												/>
												<Badge
													className="absolute top-4 right-4 shadow-lg font-semibold text-sm"
													style={{
														backgroundColor:
															status === "Past"
																? "#888"
																: status === "Current"
																? "#36834C"
																: "#36834C",
														color: "white",
													}}
												>
													{status}
												</Badge>
											</Link>
											<CardHeader>
												<CardTitle className="font-display text-2xl">
													<Link
														href={event.url}
														className="hover:underline"
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
												<div className="flex items-center gap-4 text-sm text-muted-foreground">
													<div className="flex items-center gap-1">
														<Calendar className="w-4 h-4" />
														<span>{event.date}</span>
													</div>
													<div className="flex items-center gap-1">
														<Clock className="w-4 h-4" />
														<span>{event.time}</span>
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
