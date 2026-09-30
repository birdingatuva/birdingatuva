"use client"

import { SafeImage } from "@/components/ui/safe-image"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export interface Leader {
  position: string
  name: string
  major: string
  year: string
  email: string
  bio: string
  image: string
  favoriteBird: string
}

interface LeadershipClientProps {
  birdImages: string[]
  leaders: Leader[]
}

export function LeadershipClient({ birdImages, leaders }: LeadershipClientProps) {
  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={birdImages} />
        <PageHeader title="LEADERSHIP"  />
        <section className="px-4 py-12 sm:px-6">
          <div className="container relative z-20 mx-auto max-w-5xl">
            <div className="divide-y divide-border">
              {leaders.map((leader, index) => (
                <article key={`${leader.name}-${index}`} aria-labelledby={`leader-name-${index}`} className="grid items-start gap-6 py-10 first:pt-0 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-10 sm:py-12 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
                  <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-muted">
                    <SafeImage src={leader.image || "/placeholder.svg"} alt={leader.name || leader.position} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 px-1 sm:py-2">
                    <p className="mb-2 text-xl font-semibold text-primary sm:text-2xl">{leader.position}</p>
                    <h2 id={`leader-name-${index}`} className="font-display text-4xl font-bold leading-tight text-primary sm:text-5xl">{leader.name}</h2>
                    {(leader.major || leader.year) && (
                      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:text-base">
                        {leader.major && <span>{leader.major}</span>}
                        {leader.major && leader.year && <span aria-hidden="true" className="h-4 w-px bg-primary/20" />}
                        {leader.year && <span>Class of {leader.year}</span>}
                      </p>
                    )}
                    {leader.bio && <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground sm:text-lg">{leader.bio}</p>}
                    {leader.favoriteBird && (
                      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                        Favorite bird <span className="ml-2 font-medium text-foreground">{leader.favoriteBird}</span>
                      </p>
                    )}
                    {leader.email && (
                      <a href={`mailto:${leader.email}`} className="mt-5 inline-flex max-w-full items-center gap-2.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="break-all">{leader.email}</span>
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <section aria-labelledby="join-leadership" className="mt-4 border-t border-border py-10 sm:py-12">
              <div className="max-w-2xl">
                <h2 id="join-leadership" className="mb-5 font-display text-3xl font-bold text-primary sm:text-4xl">JOIN OUR TEAM!</h2>
                <p className="mb-7 text-base leading-relaxed text-foreground sm:text-lg">Elections happen each spring, and all members are welcome to run for positions. We're always looking for passionate birders to help lead the club!</p>
                <Button size="lg" className="px-6" asChild>
                  <a href="mailto:birdingatuva@gmail.com">Contact Us About Leadership</a>
                </Button>
              </div>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
