import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import Image from "next/image";

export default function OhillBirdingEvent() {
  return (
    <div className="min-h-screen relative bg-background">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={[]} />
        <PageHeader 
          title="Ohill Birding"
          description="Friday Nov 11, 2025 | 7:00am - 9:15am | Meeting at Slaughter"
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl relative z-20">
            <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-xl shadow-xl border-2 border-blue-900 p-8">
              <Image
                src="/images/local-trips/ohill.png"
                alt="Ohill Birding Event"
                width={800}
                height={400}
                className="rounded-lg mb-6 w-full h-64 object-cover border border-blue-900"
              />
              <h2 className="text-3xl font-bold text-blue-900 mb-4">Trip Details</h2>
              <div className="mb-6 text-lg text-blue-900 font-medium">
                <p>Join us for a morning of birding on Ohill! We'll meet at Slaughter and explore the trails, looking for fall migrants and resident birds. All experience levels are welcome. Bring binoculars if you have them, and dress for the weather. We look forward to seeing you there!</p>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 text-blue-900">Sign Up</h3>
                <iframe
                  src="https://forms.gle/JG4onYKPjaUWLnX57"
                  width="100%"
                  height="600"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  title="Ohill Birding Signup"
                  className="rounded-lg border border-blue-900"
                >
                  Loading…
                </iframe>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
