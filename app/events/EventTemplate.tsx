import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { ImageGallery } from "@/components/image-gallery";
import { MapPin, Calendar, Clock, CircleHelp } from "lucide-react";
import Link from "next/link";
import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { getEventSheets } from "@/lib/sheet-embed";
import { SheetDashboard } from "@/components/sheet-dashboard";

function normalizeLexicalMarkdown(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*>\s*<!--lexical-blank-quote-->\s*$/.test(line)) return "> \u200B"
      if (/^\s*<!--lexical-literal-greater-than-->\s*$/.test(line)) return "\\>"

      const markerMatch = line.match(/^(\s*)(\d+\.|[-+*])(\s*)$/)
      if (markerMatch) {
        const marker = markerMatch[2].endsWith(".")
          ? `${markerMatch[2].slice(0, -1)}\\.`
          : `\\${markerMatch[2]}`
        return `${markerMatch[1]}${marker}${markerMatch[3]}`
      }

      return line
    })
    .join("\n")
}

type MarkdownNode = {
  type: string
  value?: string
  url?: string
  children?: MarkdownNode[]
}

const plainDomainPattern = /(?<![\w@.])((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?![\w-])/gi

function remarkLinkifyPlainDomains() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.type === "link" || node.type === "code" || node.type === "inlineCode") return
      if (!node.children) return

      const nextChildren: MarkdownNode[] = []
      for (const child of node.children) {
        if (child.type !== "text" || !child.value) {
          visit(child)
          nextChildren.push(child)
          continue
        }

        let lastIndex = 0
        for (const match of child.value.matchAll(plainDomainPattern)) {
          const matchIndex = match.index ?? 0
          const domain = match[1]
          if (matchIndex > lastIndex) nextChildren.push({ type: "text", value: child.value.slice(lastIndex, matchIndex) })
          nextChildren.push({
            type: "link",
            url: `https://${domain}`,
            children: [{ type: "text", value: domain }],
          })
          lastIndex = matchIndex + domain.length
        }
        if (lastIndex < child.value.length) nextChildren.push({ type: "text", value: child.value.slice(lastIndex) })
      }
      node.children = nextChildren
    }

    visit(tree)
  }
}

const markdownComponents: Components = {
  p: ({ node, ...props }) => <p {...props} className="mb-2" />,
  h1: ({ node, ...props }) => <h1 {...props} className="text-3xl font-bold" />,
  h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-semibold" />,
  h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-semibold" />,
  ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-6" />,
  ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-6 event-numbered-list" />,
  blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-muted-foreground/30 pl-4 italic" />,
  a: ({ node, ...props }) => <a {...props} className="text-blue-600 underline decoration-blue-600/50 underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" />,
  del: ({ node, ...props }) => <del {...props} className="line-through" />,
}

export interface EventTemplateProps {
  title: string;
  description: string;
  image: string;
  images?: string[]; // All images from the event
  location: string;
  dateDisplay: string;
  timeDisplay: string;
  bodyMarkdown: string;
  signupUrl: string;
  hasGoogleForm?: boolean;
  showFaqBanner?: boolean;
}

function getGoogleFormEmbedUrl(signupUrl: string): string {
  try {
    const url = new URL(signupUrl)
    const isGoogleForm = url.hostname === "forms.gle" ||
      (url.hostname === "docs.google.com" && url.pathname.includes("/forms/"))

    if (isGoogleForm) url.searchParams.set("embedded", "true")

    return url.toString()
  } catch {
    return signupUrl
  }
}

export default function EventTemplate({
  title,
  description,
  image,
  images = [],
  location,
  dateDisplay,
  timeDisplay,
  bodyMarkdown,
  signupUrl,
  hasGoogleForm = false,
  showFaqBanner = false,
}: EventTemplateProps) {
  // Gallery images are all images except the first one (header image)
  const galleryImages = images.length > 1 ? images.slice(1) : [];
  const dashboards = getEventSheets(bodyMarkdown);
  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva';
  
  return (
    <div className="min-h-screen relative bg-background">
      <Navigation />
      <main className="relative z-20">
        <DecorativeBirds images={[]} />
        <PageHeader 
          title={title}
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl relative z-20">
            {showFaqBanner && (
              <Link href="/faq" className="mb-10 flex items-center gap-4 border-y border-border py-5 text-foreground transition-colors hover:border-primary/50">
                <CircleHelp className="h-7 w-7 shrink-0 text-primary" />
                <span className="font-display text-xl font-semibold leading-snug text-primary sm:text-2xl">New to birding at UVA? Read the FAQ to get started</span>
              </Link>
            )}
            <article>
              {image ? (
                <div className="relative mb-8 h-72 overflow-hidden rounded-2xl bg-muted shadow-sm sm:h-96">
                  <CloudinaryImage
                    src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${image}`}
                    alt={`${title} Image`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative mb-8 flex h-32 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <span className="text-sm">No image</span>
                </div>
              )}
              <div className="px-1 sm:px-2">
                <h2 className="mb-3 font-display text-3xl font-bold text-primary sm:text-4xl">{title}</h2>
                <div className="mb-10 space-y-3 border-y border-primary/15 py-4 text-foreground">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <MapPin className="h-5 w-5 shrink-0 text-primary" />
                    <span className="font-medium leading-snug">{location}</span>
                  </div>
                  <div className="flex items-start gap-x-6">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Calendar className="h-5 w-5 shrink-0 text-primary" />
                      <span className="font-medium leading-snug">{dateDisplay}</span>
                    </div>
                    {timeDisplay && (
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Clock className="h-5 w-5 shrink-0 text-primary" />
                        <span className="font-medium leading-snug">{timeDisplay}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-10 max-w-none text-lg leading-relaxed text-foreground">
                  <ReactMarkdown
                    components={markdownComponents}
                    remarkPlugins={[remarkGfm, remarkLinkifyPlainDomains]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {normalizeLexicalMarkdown(bodyMarkdown)}
                  </ReactMarkdown>
                </div>
                
                {dashboards.map((dashboard) => (
                  <SheetDashboard key={dashboard.id} embedUrl={dashboard.embedUrl} csvUrl={dashboard.csvUrl} url={dashboard.url} title={title} />
                ))}

                {/* Image Gallery Section */}
                {galleryImages.length > 0 && (
                  <div className="mb-10 border-t border-border pt-8">
                    <h3 className="mb-4 font-display text-2xl font-bold text-primary">Gallery</h3>
                    <ImageGallery images={galleryImages} title={title} />
                  </div>
                )}
                
                {hasGoogleForm && signupUrl ? (
                  <section className="mt-8 border-t border-border pt-8">
                    <iframe
                      src={getGoogleFormEmbedUrl(signupUrl)}
                      title={`${title} Signup`}
                      className="block h-[1200px] w-full border-0 bg-transparent sm:h-[1000px]"
                      scrolling="no"
                      allowFullScreen
                      loading="lazy"
                    >
                      Loading…
                    </iframe>
                  </section>
                ) : null}
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
