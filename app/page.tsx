export const dynamic = 'force-static'
import Image from "next/image"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { HeroSlideshow } from "@/components/hero-slideshow"
import { CloudinaryImage } from "@/components/cloudinary-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Mail, Instagram, Clock, ExternalLink, Compass } from "lucide-react"
import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import { getSitePage } from "@/lib/pages-db"

export default async function HomePage() {
	if (!(await getSitePage("home"))) notFound()
	// Use Cloudinary images for hero slideshow - now using direct URLs
	// These will be processed by wsrv.nl instead of Cloudinary transformations
	const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'
	const heroImages = [
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_3169-CR3`,
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_3543-CR3`,
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_4304-CR3`,
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_5559-CR3`,
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_7988_DxO`,
		`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/hero-backgrounds/IMG_8170_DxO`,
	]

	const flyingDir = path.join(process.cwd(), "public/images/flying-birds")
	let birdImages: string[] = []
	try {
		birdImages = fs.readdirSync(flyingDir).filter((file) => {
			const ext = path.extname(file).toLowerCase()
			const filePath = path.join(flyingDir, file)
			const isFile = fs.statSync(filePath).isFile()
			return (
				isFile &&
				[".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext) &&
				!file.startsWith(".")
			)
		})
	} catch (e) {
		birdImages = []
	}

		return (
			<div className="min-h-screen relative bg-background" style={{background: 'var(--background)'}}>
			<Navigation />

			<main className="relative z-20 home-main">
				<DecorativeBirds images={birdImages} />
				<section className="relative min-h-[65vh] flex items-center justify-center overflow-hidden">
					<HeroSlideshow images={heroImages} />

					<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />

					<div className="relative z-20 text-center px-4 max-w-5xl mx-auto animate-fade-in-up">
						{/* Logo removed from hero area */}

						<h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-6 tracking-tight [text-shadow:_0_4px_20px_rgb(0_0_0_/_90%),_0_2px_8px_rgb(0_0_0_/_80%)]">
							BIRDING AT UVA
						</h1>
						<p className="text-2xl md:text-3xl text-white mb-4 font-light italic tracking-wide [text-shadow:_0_3px_12px_rgb(0_0_0_/_80%),_0_1px_4px_rgb(0_0_0_/_70%)]">
							Hoo's Watching Hoo?
						</p>
						<p className="text-lg md:text-xl text-white/95 mb-12 max-w-2xl mx-auto leading-relaxed [text-shadow:_0_3px_12px_rgb(0_0_0_/_80%),_0_1px_4px_rgb(0_0_0_/_70%)]">
							Join us in exploring the diverse birdlife of Central Virginia through
							education, conservation, and community
						</p>
						<div className="flex flex-wrap gap-4 justify-center">
							<Button
								size="lg"
								variant="secondary"
								className="text-lg px-8 py-6 shadow-2xl hover:scale-105 transition-transform"
								asChild
							>
								<Link href="#join">Join the Club</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="bg-white/10 text-white border-2 border-white hover:bg-white hover:text-white text-lg px-8 py-6 shadow-2xl hover:scale-105 transition-transform backdrop-blur-sm"
								asChild
							>
								<Link href="/events">View Events</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* About Section */}
				<section className="py-20 px-4">
					<div className="container mx-auto max-w-6xl relative z-20">
						<div className="grid md:grid-cols-2 gap-12 items-center">
							<div className="md:order-1 order-2 space-y-3">
								<div className="relative h-auto md:h-[400px] rounded-2xl overflow-hidden shadow-lg">
									<CloudinaryImage
										src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/home-page/about-us`}
										alt="Club members during bird banding activity"
										fill
										className="object-contain md:object-cover !relative !h-auto md:!absolute md:!h-full"
									/>
								</div>
								<p className="text-sm text-center text-muted-foreground italic">
									Club members after capturing birds in a mist net for banding and
									release
								</p>
							</div>

							<div className="md:order-2 order-1">
								<h2 className="font-display text-5xl md:text-6xl font-bold mb-6 text-primary">
									ABOUT US
								</h2>
								<p className="text-lg text-muted-foreground mb-6 leading-relaxed">
									We are dedicated to fostering appreciation for birds and their
									habitats through education, conservation, and community
									engagement.
								</p>

								<ul className="space-y-3">
									<li className="flex items-start gap-3">
										<div
											className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
											style={{ backgroundColor: "#36834C" }}
										/>
										<p className="text-base text-muted-foreground leading-relaxed">
											Promoting bird conservation and environmental stewardship
										</p>
									</li>
									<li className="flex items-start gap-3">
										<div
											className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
											style={{ backgroundColor: "#36834C" }}
										/>
										<p className="text-base text-muted-foreground leading-relaxed">
											Providing birding education and field experience opportunities
										</p>
									</li>
									<li className="flex items-start gap-3">
										<div
											className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
											style={{ backgroundColor: "#36834C" }}
										/>
										<p className="text-base text-muted-foreground leading-relaxed">
											Building a community of bird enthusiasts
										</p>
									</li>
									<li className="flex items-start gap-3">
										<div
											className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
											style={{ backgroundColor: "#36834C" }}
										/>
										<p className="text-base text-muted-foreground leading-relaxed">
											Organizing birding trips and educational events
										</p>
									</li>
								</ul>

								<p
									className="mt-8 text-lg font-semibold md:mb-0"
									style={{ color: "#36834C" }}
								>
									All experience levels welcome, from beginners to experienced
									birders!
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* How to Join & Dues Section - Lighter background */}
				<section id="join" className="py-20 px-4 scroll-mt-24">
					<div className="container mx-auto max-w-6xl relative z-20">
						<h2 className="font-display text-5xl md:text-6xl font-bold mb-4 text-center text-primary">
							HOW TO JOIN
						</h2>

						<div className="relative">
							{/* Connecting line */}
							<div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent to-accent opacity-20" />

							<div className="grid lg:grid-cols-3 gap-8 mb-12 relative">
								<Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-accent">
									<CardHeader>
										<div className="relative mx-auto mb-4">
											<div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/70 text-white flex items-center justify-center text-4xl font-bold mx-auto shadow-lg">
												1
											</div>
											<div className="absolute -inset-2 rounded-full bg-accent/20 z-0 animate-pulse" />
										</div>
										<CardTitle className="font-display text-3xl">
											JOIN OUR GROUPME
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											Connect with fellow birders and stay updated on all club
											activities, trip announcements, and bird sightings.
										</p>
										<Button
											variant="default"
										size="lg"
											className="w-full"
											asChild
										>
											<a
												href="https://groupme.com/join_group/109995890/QWsltHtC"
												target="_blank"
												rel="noopener noreferrer"
											>
												Join GroupMe
											</a>
										</Button>
									</CardContent>
								</Card>

								<Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-accent">
									<CardHeader>
										<div className="relative mx-auto mb-4">
											<div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/70 text-white flex items-center justify-center text-4xl font-bold mx-auto shadow-lg">
												2
											</div>
											<div
												className="absolute -inset-2 rounded-full bg-accent/20 -z-10 animate-pulse"
												style={{ animationDelay: "0.2s" }}
											/>
										</div>
										<CardTitle className="font-display text-3xl">
											FOLLOW US
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											See stunning photos from our trips, learn about upcoming
											events, and join our online community.
										</p>
										<Button
											variant="default"
											size="lg"
											className="w-full"
											asChild
										>
											<a
												href="https://instagram.com/birdingatuva"
												target="_blank"
												rel="noopener noreferrer"
											>
												@birdingatuva
											</a>
										</Button>
									</CardContent>
								</Card>

								<Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-accent">
									<CardHeader>
										<div className="relative mx-auto mb-4">
											<div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/70 text-white flex items-center justify-center text-4xl font-bold mx-auto shadow-lg">
												3
											</div>
											<div
												className="absolute -inset-2 rounded-full bg-accent/20 -z-10 animate-pulse"
												style={{ animationDelay: "0.4s" }}
											/>
										</div>
										<CardTitle className="font-display text-3xl">
											SUBSCRIBE TO OUR EMAIL LIST
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											Get important club updates, trip announcements, and reminders straight to your inbox.
										</p>
										<Button
											variant="default"
											size="lg"
											className="w-full"
											asChild
										>
											<a
												href="https://lists.virginia.edu/sympa/subscribe/birdingatuva"
												target="_blank"
												rel="noopener noreferrer"
											>
												Subscribe to Email List
											</a>
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>

						<Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/20 shadow-xl">
							<CardHeader>
								<CardTitle className="font-display text-4xl text-center">
									CLUB ACTIVITIES & DUES
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-2 gap-12">
									<div className="space-y-5">
										<h3 className="font-display text-2xl mb-6 text-accent">
											What We Offer
										</h3>
										<div className="flex items-start gap-3">
											<Calendar className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
											<p className="text-foreground">
												Monthly social events with food and fellow birders
											</p>
										</div>
										<div className="flex items-start gap-3">
											<Calendar className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
											<p className="text-foreground">
												Monthly educational meetings on topics such as bird ID and sustainable birding practices
											</p>
										</div>
										<div className="flex items-start gap-3">
											<MapPin className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
											<p className="text-foreground">
												Weekly local trips in the Charlottesville area
											</p>
										</div>
										<div className="flex items-start gap-3">
											<MapPin className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
											<p className="text-foreground">
												Long-distance trips to birding destinations beyond Charlottesville
											</p>
										</div>
									</div>
									<div className="space-y-5">
										<h3 className="font-display text-2xl mb-6 text-accent">
											Membership
										</h3>
										<div className="bg-background/70 p-8 rounded-xl border-2 border-accent/30 shadow-lg">
											<div className="text-center mb-6 pb-6 border-b border-accent/20">
												<p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
													Semester Dues
												</p>
												<p className="font-display font-bold text-5xl text-accent">
													$7
												</p>
											</div>
											<div className="space-y-3 text-sm">
												<div className="flex items-start gap-2">
													<span className="text-accent mt-0.5">✓</span>
													<p className="text-foreground">
														Access to all local trips and club activities
													</p>
												</div>
												<div className="flex items-start gap-2">
													<span className="text-accent mt-0.5">✓</span>
													<p className="text-foreground">
														Educational meetings and social events with food
													</p>
												</div>
												<p className="pt-4 text-xs text-muted-foreground italic">
													*Additional fees may apply for longer-distance trips to
													cover transportation costs
												</p>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* eBird Section - Lighter background */}
				<section className="py-20 px-4">
					<div className="container mx-auto max-w-4xl text-center relative z-20">
						<div className="flex justify-center mb-6">
							<CloudinaryImage
								src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/home-page/ebird`}
								alt="eBird Logo"
								width={200}
								height={80}
								className="object-contain"
							/>
						</div>
						<h2 className="font-display text-5xl md:text-6xl font-bold mb-6 text-primary">
							OUR eBIRD ACCOUNT
						</h2>
						<Card className="shadow-xl">
							<CardContent className="pt-6">
								<p className="text-lg text-muted-foreground mb-6 leading-relaxed">
									Track our sightings and see what the club has spotted! We use
									eBird to document our observations and contribute to citizen
									science.
								</p>
								<details className="mb-6 text-left rounded-md border border-border p-4">
									<summary className="cursor-pointer font-semibold text-primary">
										How do I share my eBird observations with the club account?
									</summary>
									<p className="mt-3 text-muted-foreground leading-relaxed">
										After you&apos;ve finished birding and submitted your checklist, click
										&quot;Add Observers&quot; on your checklist. When given the option to
										share, add &quot;Birding @UVA&quot; as a collaborator. After your
										checklist has been accepted, you will see it on the club eBird
										profile!
									</p>
								</details>
								<Button size="lg" asChild>
									<a
										href="https://ebird.org/profile/ODM4NzkyOQ"
										target="_blank"
										rel="noopener noreferrer"
									>
										Visit Our eBird Profile
									</a>
								</Button>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Contact Section - Darker background */}
				<section className="py-20 px-4">
					<div className="container mx-auto max-w-4xl relative z-20">
						<h2 className="font-display text-5xl md:text-6xl font-bold mb-12 text-center text-primary">
							GET IN TOUCH
						</h2>
						<div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
							<Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-full sm:w-72">
								<CardHeader>
									<Mail className="w-12 h-12 mx-auto mb-4 text-accent" />
									<CardTitle className="font-display text-xl">EMAIL</CardTitle>
								</CardHeader>
								<CardContent>
									<a
										href="mailto:birdingatuva@gmail.com"
										className="text-accent hover:underline break-all"
									>
										birdingatuva@gmail.com
									</a>
								</CardContent>
							</Card>

							<Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-full sm:w-72">
								<CardHeader>
									<Instagram className="w-12 h-12 mx-auto mb-4 text-accent" />
									<CardTitle className="font-display text-xl">
										INSTAGRAM
									</CardTitle>
								</CardHeader>
								<CardContent>
									<a
										href="https://instagram.com/birdingatuva"
										target="_blank"
										rel="noopener noreferrer"
										className="block text-accent hover:underline"
									>
										@birdingatuva
									</a>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
