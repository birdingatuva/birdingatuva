import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { ImageGallery } from "@/components/image-gallery";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock, CircleHelp } from "lucide-react";
import Link from "next/link";
import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

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

      return line.replace(
        /(?<![\w@\[\]\)\/.])((?:www\.)?[a-z0-9-]+\.[a-z]{2,})/gi,
        "[$1](https://$1)",
      )
    })
    .join("\n")
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
              <Link href="/faq" className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-5 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CircleHelp className="h-7 w-7 shrink-0 text-primary" />
                <span className="font-display text-xl font-semibold leading-snug text-primary sm:text-2xl">New to birding at UVA? Read the FAQ to get started</span>
              </Link>
            )}
            <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden pt-0">
              {image ? (
                <div className="relative h-72 overflow-hidden p-0 m-0 bg-muted">
                  <CloudinaryImage
                    src={`https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${image}`}
                    alt={`${title} Image`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="relative h-32 bg-muted flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">No image</span>
                </div>
              )}
              <CardContent>
                <h2 className="font-display text-2xl font-bold mb-2">{title}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  {location}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{dateDisplay}</span>
                  </div>
                  {timeDisplay && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{timeDisplay}</span>
                    </div>
                  )}
                </div>
                <div className="mb-6 max-w-none text-foreground">
                  <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{normalizeLexicalMarkdown(bodyMarkdown)}</ReactMarkdown>
                </div>
                
                {/* Image Gallery Section */}
                {galleryImages.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-display text-xl font-bold mb-4 text-foreground">Gallery</h3>
                    <ImageGallery images={galleryImages} title={title} />
                  </div>
                )}
                
                {hasGoogleForm && signupUrl ? (
                  <div className="mb-6">
                    <div className="bg-white/90 rounded-xl shadow-md border border-gray-100 p-6">
                      <h3 className="font-display text-2xl font-bold mb-4">
                        <a 
                          href={signupUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline decoration-2 underline-offset-4 transition-colors"
                        >
                          Sign Up
                        </a>
                      </h3>
                      <iframe
                        src={signupUrl}
                        width="100%"
                        height="600"
                        title={`${title} Signup`}
                        className="rounded-lg border border-gray-200"
                        style={{ background: 'transparent', border: 'none' }}
                        allowFullScreen
                        loading="lazy"
                      >
                        Loading…
                      </iframe>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
