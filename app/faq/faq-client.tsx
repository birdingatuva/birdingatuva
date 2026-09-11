"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"

interface FAQClientProps {
  birdImages: string[]
  contentMarkdown: string
}

export function FAQClient({ birdImages, contentMarkdown }: FAQClientProps) {
  return (
    <div className="min-h-screen relative">
      <Navigation />

      <main className="relative z-20">
        <DecorativeBirds images={birdImages} />
        <PageHeader 
          title="FAQ"
          description="We are so glad you are considering joining us on a weekly birding trip! Here's some important information that you need to know regarding these trips."
        />

        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl relative z-20">
            <div className="mx-auto max-w-4xl space-y-8">
              <Card>
                <CardContent className="prose prose-slate max-w-none py-8 dark:prose-invert">
                  {contentMarkdown ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="font-display text-3xl text-primary">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-display text-2xl text-primary">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-display text-xl text-primary">{children}</h3>,
                        p: ({ children }) => <p className="mb-8 leading-relaxed text-muted-foreground last:mb-0">{children}</p>,
                        hr: () => <hr className="my-4 border-0 border-t-4 border-gray-700" />,
                      }}
                    >
                      {contentMarkdown}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">FAQ content is not available right now.</p>
                  )}
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
