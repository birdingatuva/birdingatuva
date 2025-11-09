"use client"

import Image from "next/image"
import { SafeImage } from "@/components/ui/safe-image"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { useState } from "react"

const executives = [
	{
		position: "President",
		name: "Brian Alewine",
		major: "Computer Science",
		year: "Class of 2026",
		email: "president@uvabirdclub.virginia.edu",
		bio: "Leading the club with passion for conservation and community building . Favorite bird: Peregrine Falcon.",
		image: "/images/exec-profiles/president.jpeg",
	},
	{
		position: "Vice President",
		name: "Jessica Lee",
		major: "Environmental Science",
		year: "Class of 2027",
		email: "vp@uvabirdclub.virginia.edu",
		bio: "Supporting club operations and coordinating with university partners. Favorite bird: Ruby-throated Hummingbird.",
		image: "/images/exec-profiles/vp.png",
	},
	{
		position: "Treasurer",
		name: "Ethan Brooks",
		major: "Economics",
		year: "Class of 2025",
		email: "treasurer@uvabirdclub.virginia.edu",
		bio: "Keeps the club's coffers balanced and snacks inventoried. Enjoys spreadsheets, strong coffee, and spotting orioles.",
		image: "/images/exec-profiles/treasurer.png",
	},
	{
		position: "Secretary",
		name: "Maya Singh",
		major: "Biology",
		year: "Class of 2026",
		email: "secretary@uvabirdclub.virginia.edu",
		bio: "Organizer extraordinaire and note-taking ninja. Loves field notebooks, warm tea, and sketching her favorite shorebirds.",
		image: "/images/exec-profiles/secretary.jpg",
	},
	{
		position: "Events Coordinator",
		name: "Olivia Park",
		major: "History",
		year: "Class of 2027",
		email: "events@uvabirdclub.virginia.edu",
		bio: "Plans unforgettable trips and playlists for dawn watches. Loves colorful scarves, group singalongs, and finding hidden birding spots.",
		image: "/images/exec-profiles/events-coordinator.jpg",
	},
	{
		position: "Outreach Director",
		name: "Daniel Ruiz",
		major: "Psychology",
		year: "Class of 2025",
		email: "outreach@uvabirdclub.virginia.edu",
		bio: "Builds bridges with the community and organizes outreach events. Enjoys storytelling, empanadas, and introducing kids to backyard birds.",
		image: "/images/exec-profiles/outreach-director.png",
	},
]

// Fun bios and favorite birds for each exec
function getFunBio(name: string) {
	switch (name) {
 		case "Brian Alewine":
 			return "Can identify birds by their calls and by their vibes. Once tried to teach a crow to code. Enjoys sunrise walks and spontaneous bird trivia challenges.";
 		case "Jessica Lee":
 			return "Thinks every bird deserves a theme song. Has a collection of bird-shaped mugs and can whistle like a chickadee. Loves hiking and making up bird puns.";
 		case "Alex Kim":
			return "Keeps a spreadsheet of every bird seen (and every snack eaten on trips). Known for impromptu dance moves when spotting a lifer. Enjoys puzzles and bird memes.";
		case "Priya Patel":
			return "Writes poetry inspired by birds and clouds. Can recite bird facts in three languages. Loves sketching birds and organizing surprise picnics.";
		case "Ethan Brooks":
			return "Keeps the club's coffers balanced and snacks inventoried. Enjoys spreadsheets, strong coffee, and spotting orioles.";
		case "Maya Singh":
			return "Organizer extraordinaire and note-taking ninja. Loves field notebooks, warm tea, and sketching her favorite shorebirds.";
		case "Olivia Park":
			return "Plans unforgettable trips and playlists for dawn watches. Loves colorful scarves, group singalongs, and finding hidden birding spots.";
		case "Daniel Ruiz":
			return "Builds bridges with the community and organizes outreach events. Enjoys storytelling, empanadas, and introducing kids to backyard birds.";
 		default:
 			return "Loves birds, adventure, and bringing people together!";
 	}
}

function getFavoriteBird(name: string) {
 	switch (name) {
 		case "Brian Alewine":
 			return "Peregrine Falcon";
 		case "Jessica Lee":
 			return "Ruby-throated Hummingbird";
		case "Alex Kim":
			return "American Goldfinch";
		case "Priya Patel":
			return "Great Blue Heron";
		case "Ethan Brooks":
			return "Baltimore Oriole";
		case "Maya Singh":
			return "Snowy Egret";
		case "Olivia Park":
			return "Cedar Waxwing";
		case "Daniel Ruiz":
			return "Northern Mockingbird";
 		default:
 			return "Northern Cardinal";
 	}
}

interface LeadershipClientProps {
	birdImages: string[]
}

export function LeadershipClient({ birdImages }: LeadershipClientProps) {
	const [showNotification, setShowNotification] = useState(false)

	const copyEmail = () => {
		navigator.clipboard.writeText("rpt2fx@virginia.edu")
		setShowNotification(true)
		setTimeout(() => setShowNotification(false), 2000)
	}

	return (
		<div className="min-h-screen relative">
			<Navigation />

			<main className="relative z-20">
				<DecorativeBirds images={birdImages} />
        <PageHeader 
          title="OUR LEADERSHIP"
          description="Meet the dedicated students leading the UVA Bird Club"
        />

				<section className="py-20 px-16">
					<div className="container mx-auto max-w-7xl relative z-20">
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-20">
							{executives.map((exec, index) => (
								<Card
									key={index}
									className="overflow-hidden border-2 pt-0 gap-0 shadow-none h-full"
								>
									<div className="relative h-64 md:h-72 lg:h-80 overflow-hidden">
										{/* Use SafeImage to avoid broken icon if file fails to load */}
										<SafeImage
											src={exec.image || "/placeholder.svg"}
											alt={exec.position}
											fill
											className="object-cover"
										/>
									</div>
									{/* Name bar sits directly below the image so it doesn't cover the photo */}
									<div className="bg-[#203A64] text-white flex items-center justify-center">
										<span className="text-white font-display text-3xl md:text-4xl font-bold w-full text-center py-2">{exec.name}</span>
									</div>
									<CardHeader className="space-y-2 text-center pt-3">
										<div className="text-lg font-extrabold mb-1" style={{ color: '#36834C' }}>
											{exec.position}
										</div>
										<CardDescription className="text-base">
											{exec.major} <span className="mx-2 text-muted-foreground">|</span> {exec.year}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4 flex flex-col flex-1">
										<p className="text-muted-foreground text-base leading-relaxed">
											{getFunBio(exec.name)}
										</p>
										<div className="text-center mt-2">
											<span className="inline-block bg-transparent border border-slate-200 text-slate-800 font-semibold px-3 py-1 rounded-md text-sm">Favorite bird: {getFavoriteBird(exec.name)}</span>
										</div>

										<div className="mt-auto">
											<Button
												variant="outline"
												size="sm"
												className="w-full group/btn bg-transparent"
												asChild
											>
												<a
													href={`mailto:${exec.email}`}
													className="flex items-center justify-center gap-2"
												>
													<Mail className="w-4 h-4" />
													<span className="text-xs truncate">
														{exec.email}
													</span>
												</a>
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				<section className="py-20 px-4 bg-gradient-to-b from-muted to-background">
					<div className="container mx-auto max-w-3xl relative z-20">
						<Card className="text-center shadow-xl border-2 border-accent/20">
							<CardHeader>
								<CardTitle className="font-display text-4xl md:text-5xl mb-4">
									JOIN OUR TEAM!
								</CardTitle>
								<CardDescription className="text-base leading-relaxed">
									Elections happen each spring, and all members are welcome to
									run for positions. We're always looking for passionate birders
									to help lead the club!
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="relative inline-block">
									<Button
										size="lg"
										onClick={copyEmail}
										className="px-8"
									>
										Contact Us About Leadership
									</Button>
									{showNotification && (
										<div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
											Email copied to clipboard!
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
