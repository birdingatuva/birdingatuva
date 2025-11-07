import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import { getEventBySlug } from "../events-data"
import { formatDisplayDate, formatTimeForDisplay, parseTimeToken } from "../date-utils"

const slug = "ohill-birding"
const event = getEventBySlug(slug)

export default function OhillBirdingEvent() {
  return (
    <div className="min-h-screen relative bg-background">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={[]} />
        <PageHeader 
          title={event?.title ?? ""}
          description={event ? `${formatDisplayDate(event.startDate, event.endDate)} | ${formatTimeForDisplay(event.startDate, event.startTime)} - ${formatTimeForDisplay(event.startDate, event.endTime)} | ${event.location}` : ""}
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl relative z-20">
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden pt-0">
              <div className="relative h-72 overflow-hidden p-0 m-0">
                <Image
                  src={event?.image ?? "/images/local-trips/ohill.png"}
                  alt={`${event?.title ?? "Event"} Image`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
              <CardContent>
                <h2 className="font-display text-2xl font-bold mb-2">{event?.title ?? ""}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  {event?.location ? event.location : "Location TBD"}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{event ? formatDisplayDate(event.startDate, event.endDate) : "Friday Nov 7, 2025"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{event ? `${formatTimeForDisplay(event.startDate, event.startTime)} - ${formatTimeForDisplay(event.startDate, event.endTime)}` : "Time TBD"}</span>
                  </div>
                </div>
                <div className="mb-6 text-muted-foreground">
                  <p className="mb-4">Hello everyone! It was great seeing some of you at the interest meeting on Wednesday night! If you didn’t get a chance to come, stop by on Tuesday in New Cabell 232. Before then, though, we wanted to do some group birding!!</p>

                  <p className="mb-4">We will meet at 7:00 at the Slaughter Recreation Center and leave around 7:05 to start our bird walk. We should be back at the slaughter around 9:15.</p>

                  <p className="mb-4">On the walk, you can expect to see mostly resident species, which will allow new birders to learn about the species they are likely to encounter, and will give experienced birders a chance to brush up on some ID skills. This is a low-intensity trip, so we hope that everyone who can will attend.</p>

                  <p className="mb-4 font-semibold">Here are some recommendations of pre-trip actions:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Fill out the attendance form below</strong> (this is required)</li>
                    <li>Download the <strong>Merlin bird ID app</strong> on your phone, as well as the Virginia bird pack</li>
                    <li>Bring a full water bottle</li>
                    <li>Grab some binoculars, if you have them (if not, they’re definitely not needed)</li>
                    <li>Wear warm clothes!! It’s gonna be a chilly 42 degrees, so be sure to dress for the weather</li>
                  </ul>

                  <p className="mb-4">Hope to see you all there! If you have any questions, comments, or concerns, send a message on the GroupMe, DM one of the Execs, or send an email to <strong>birdingatuva@gmail.com</strong></p>
                </div>
                <div className="mb-6">
                  <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="font-display text-2xl font-bold text-black mb-4">
                      <a href="https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog" target="_blank" rel="noopener noreferrer">Sign Up</a>
                    </h3>
                    <iframe
                      src="https://docs.google.com/forms/d/e/1FAIpQLScb7WsWg5hrHRK5OwsLxtzQ4B9BXD3kh-8y1P9BiS6zKx4JQg/viewform?usp=dialog"
                      width="100%"
                      height="600"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      title="Ohill Birding Signup"
                      className="rounded-lg border border-gray-200"
                      style={{ background: 'transparent' }}
                    >
                      Loading…
                    </iframe>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
