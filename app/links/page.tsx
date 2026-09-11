import { notFound } from "next/navigation"
import { getSitePage, getSitePageSetting } from "@/lib/pages-db"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"

interface LinkSetting {
  label: string
  url: string
  enabled: boolean
}

export const dynamic = "force-dynamic"

export default async function LinksPage() {
  const page = await getSitePage("links")
  if (!page) notFound()
  const settings = await getSitePageSetting("links", "links")
  const links = Array.isArray(settings) ? settings as LinkSetting[] : []

  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="relative z-20">
        <PageHeader title="Links" />
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-3xl">
            <Card>
              <CardContent className="space-y-3 py-8">
                {links.filter((link) => link.enabled && link.url).map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="block rounded-md border border-border px-4 py-3 text-center font-medium text-primary transition-colors hover:bg-muted">
                    {link.label}
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}