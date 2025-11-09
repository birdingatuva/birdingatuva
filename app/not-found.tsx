import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <DecorativeBirds images={[]} />
        <h1 className="font-display text-6xl font-bold mb-4 text-primary">404</h1>
        <h2 className="font-display text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="mb-6 text-muted-foreground max-w-md mx-auto whitespace-nowrap">
          Oops! The page you’re looking for doesn’t exist or has flown away.<br />
          Try heading back to the homepage or explore our latest events.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button variant="default" size="lg">Go Home</Button>
          </Link>
          <Link href="/events">
            <Button
              variant="outline"
              size="lg"
              className="text-foreground hover:text-foreground"
            >
              View Events
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
