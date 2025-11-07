import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import { getEventBySlug } from "./events-data";
import { formatDisplayDate, formatTimeForDisplay } from "./date-utils";
import { useRouter } from "next/router";

export default function EventPage() {
  const router = useRouter();
  const { slug } = router.query;
  const event = getEventBySlug(slug as string);

  if (!event) {
    return <div>Event not found</div>;
  }

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
                  src={event?.image ?? "/images/default-event.png"}
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
                  {event?.location ?? ""}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{event ? formatDisplayDate(event.startDate, event.endDate) : "Date TBD"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{event ? `${formatTimeForDisplay(event.startDate, event.startTime)} - ${formatTimeForDisplay(event.startDate, event.endTime)}` : "Time TBD"}</span>
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