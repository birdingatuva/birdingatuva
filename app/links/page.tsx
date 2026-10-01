import { notFound } from "next/navigation"
import { getSitePage, getSitePageSetting } from "@/lib/pages-db"
import { Footer } from "@/components/footer"
import { PageHeader } from "@/components/page-header"
import { ArrowUpRight } from "lucide-react"

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
      <main className="relative z-20">
        <PageHeader title="Links" />
        <section className="px-4 py-12">
          <div className="container mx-auto max-w-3xl">
            <div className="divide-y divide-border border-y border-border">
              {links.filter((link) => link.enabled && link.url).map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 px-1 py-6 text-primary transition-colors hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:px-2 sm:py-8">
                  <span className="font-display text-xl font-semibold leading-snug sm:text-2xl">{link.label}</span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
