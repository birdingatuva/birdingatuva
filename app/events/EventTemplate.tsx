import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { DecorativeBirds } from "@/components/decorative-birds";
import { PageHeader } from "@/components/page-header";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { ImageGallery } from "@/components/image-gallery";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
          description={description}
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl relative z-20">
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
                <div className="mb-6 text-muted-foreground prose prose-neutral prose-lg max-w-none [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-0 [&_strong]:font-bold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMarkdown}</ReactMarkdown>
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
