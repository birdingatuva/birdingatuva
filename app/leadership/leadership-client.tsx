"use client"

import { SafeImage } from "@/components/ui/safe-image"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { useState } from "react"

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
  const [showNotification, setShowNotification] = useState(false)

  const copyEmail = () => {
    navigator.clipboard.writeText("birdingatuva@gmail.com")
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 2000)
  }

  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={birdImages} />
        <PageHeader title="LEADERSHIP"  />
        <section className="py-20 px-16">
          <div className="container mx-auto max-w-7xl relative z-20">
            <div className="grid gap-20 md:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader, index) => (
                <Card key={`${leader.name}-${index}`} className="h-full overflow-hidden border-2 pt-0 shadow-none">
                  <div className="relative h-64 overflow-hidden md:h-72 lg:h-80">
                    <SafeImage src={leader.image || "/placeholder.svg"} alt={leader.position || leader.name} fill className="object-cover" />
                  </div>
                  <div className="flex items-center justify-center bg-[#203A64] text-white">
                    <span className="w-full py-2 text-center font-display text-3xl font-bold text-white md:text-4xl">{leader.name}</span>
                  </div>
                  <CardHeader className="space-y-2 pt-3 text-center">
                    <div className="mb-1 text-lg font-extrabold" style={{ color: "#36834C" }}>{leader.position}</div>
                    <CardDescription className="text-base">{leader.major} <span className="mx-2 text-muted-foreground">|</span> {leader.year}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-4">
                    <p className="text-base leading-relaxed text-muted-foreground">{leader.bio}</p>
                    {leader.favoriteBird && <div className="mt-2 text-center"><span className="inline-block rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm font-semibold text-slate-800">Favorite bird: {leader.favoriteBird}</span></div>}
                    <div className="mt-auto">
                      <Button variant="outline" size="sm" className="group/btn w-full bg-transparent" asChild>
                        <a href={`mailto:${leader.email}`} className="flex items-center justify-center gap-2"><Mail className="h-4 w-4" /><span className="truncate text-xs">{leader.email}</span></a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-gradient-to-b from-muted to-background px-4 py-20">
          <div className="container relative z-20 mx-auto max-w-3xl">
            <Card className="border-2 border-accent/20 text-center shadow-xl">
              <CardHeader>
                <CardTitle className="mb-4 font-display text-4xl md:text-5xl">JOIN OUR TEAM!</CardTitle>
                <CardDescription className="text-base leading-relaxed">Elections happen each spring, and all members are welcome to run for positions. We're always looking for passionate birders to help lead the club!</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative inline-block">
                  <Button size="lg" onClick={copyEmail} className="px-8">Contact Us About Leadership</Button>
                  {showNotification && <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground shadow-lg">Email copied to clipboard!</div>}
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
