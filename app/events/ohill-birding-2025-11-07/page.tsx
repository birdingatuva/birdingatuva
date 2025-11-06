import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";

export default function OhillBirdingEvent() {
  return (
    <div className="min-h-screen relative bg-background">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={[]} />
        <PageHeader 
          title="Ohill Birding"
          description="Friday Nov 7, 2025 | 7:00am - 9:15am | Meeting at Slaughter"
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl relative z-20">
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden pt-0">
              <div className="relative h-72 overflow-hidden p-0 m-0">
                <Image
                  src="/images/local-trips/ohill.png"
                  alt="Ohill Birding Event"
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
              <CardContent>
                <h2 className="font-display text-2xl font-bold mb-2">Ohill Birding</h2>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  Meeting at Slaughter
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Friday Nov 7, 2025</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>7:00am - 9:15am</span>
                  </div>
                </div>
                <div className="mb-6 text-muted-foreground">
                  <p>Join us for a morning of birding on Ohill! We'll meet at Slaughter and explore the trails, looking for fall migrants and resident birds. All experience levels are welcome. Bring binoculars if you have them, and dress for the weather. We look forward to seeing you there!</p>
                </div>
                <div className="mb-6">
                  <div className="bg-white/90 rounded-xl shadow-lg border border-blue-100 p-6">
                    <h3 className="font-display text-2xl font-bold text-blue-900 mb-4">Sign Up</h3>
                    <iframe
                      src="https://forms.gle/JG4onYKPjaUWLnX57"
                      width="100%"
                      height="600"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      title="Ohill Birding Signup"
                      className="rounded-lg border border-blue-200"
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
