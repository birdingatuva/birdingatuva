"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"

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
          <div className="container mx-auto max-w-3xl relative z-20">
            <article className="prose max-w-none px-1 text-base leading-relaxed text-foreground dark:prose-invert sm:px-2 sm:text-lg prose-headings:font-display prose-headings:text-primary prose-a:text-primary prose-a:underline-offset-4 prose-strong:text-foreground">
                  {contentMarkdown ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="mb-5 mt-10 font-display text-3xl font-bold text-primary first:mt-0 sm:text-4xl">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-4 mt-10 font-display text-2xl font-bold text-primary first:mt-0 sm:text-3xl">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-3 mt-8 font-display text-xl font-semibold text-primary first:mt-0 sm:text-2xl">{children}</h3>,
                        p: ({ children }) => <p className="mb-6 leading-relaxed text-foreground last:mb-0">{children}</p>,
                        hr: () => <hr className="my-10 border-0 border-t border-border" />,
                      }}
                    >
                      {contentMarkdown}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">FAQ content is not available right now.</p>
                  )}
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
