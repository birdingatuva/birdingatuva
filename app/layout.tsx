
import type React from "react"
import type { Metadata } from "next"
import { Bebas_Neue, Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import AppShell from "@/components/AppShell"


const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Birding at UVA",
  description: "Birding Club at the University of Virginia  - Join us for birding trips, education, and community",
  icons: {
    icon: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <title>Birding at UVA</title>
        <meta name="description" content="Birding Club at the University of Virginia - Join us for birding trips, education, and community" />
        <link rel="icon" href={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`} type="image/png" />
        <meta property="og:title" content="Birding at UVA" />
        <meta property="og:description" content="Birding Club at the University of Virginia - Join us for birding trips, education, and community" />
        <meta property="og:image" content={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`} />
        <meta property="og:url" content="https://birdingatuva.org" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Birding at UVA" />
        <meta name="twitter:description" content="Birding Club at the University of Virginia - Join us for birding trips, education, and community" />
        <meta name="twitter:image" content={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`} />
        <link rel="canonical" href="https://birdingatuva.org" />
        {/* Structured Data: Organization */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Birding at UVA",
          "url": "https://birdingatuva.org",
          "logo": `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`,
          "sameAs": [
            "https://instagram.com/birdingatuva",
            "https://linktr.ee/birdingatuva"
          ]
        }) }} />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} ${playfair.variable} font-sans antialiased bg-background`}>
        {/* AppShell is a client component that renders DevBanner and wraps the app */}
        <AppShell>
          <div className="min-h-screen flex flex-col">
            {/* Temporary banner for announcements. Comment out this section when the banner is not needed. */}
            <div className="bg-yellow-100 border-b border-yellow-300 py-4 text-center rounded-md shadow-md">
              <h2 className="text-2xl font-bold text-yellow-800">Birding Club Interest Meetings!</h2>
              <p className="text-yellow-700">Wed Nov 5, 6:30pm-7:30pm at Gibson 142</p>
              <p className="text-yellow-700">Tue Nov 11, 6:30pm-7:30pm at New Cabell 232</p>
            </div>
            {children}
          </div>
  </AppShell>
      </body>
    </html>
  )
}
