import type React from "react"
import type { Metadata } from "next"
import { Bebas_Neue, Inter, Playfair_Display } from "next/font/google"
import "./globals.css"

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
    icon: "/images/club-logo.png",
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
        <link rel="icon" href="/images/club-logo.png" type="image/png" />
        <meta property="og:title" content="Birding at UVA" />
        <meta property="og:description" content="Birding Club at the University of Virginia - Join us for birding trips, education, and community" />
        <meta property="og:image" content="/images/club-logo.png" />
        <meta property="og:url" content="https://birdingatuva.org" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Birding at UVA" />
        <meta name="twitter:description" content="Birding Club at the University of Virginia - Join us for birding trips, education, and community" />
        <meta name="twitter:image" content="/images/club-logo.png" />
        <link rel="canonical" href="https://birdingatuva.org" />
        {/* Structured Data: Organization */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Birding at UVA",
          "url": "https://birdingatuva.org",
          "logo": "https://birdingatuva.org/images/club-logo.png",
          "sameAs": [
            "https://instagram.com/birdingatuva",
            "https://linktr.ee/birdingatuva"
          ]
        }) }} />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} ${playfair.variable} font-sans antialiased bg-background`}>
        <div className="min-h-screen flex flex-col">
          {/* Temporary banner for announcements. Comment out this section when the banner is not needed. */}
          <div className="bg-yellow-100 border-b border-yellow-300 py-4 text-center rounded-md shadow-md">
            <h2 className="text-2xl font-bold text-yellow-800">Birding Club Interest Meetings!</h2>
            <p className="text-yellow-700">Wed Nov 5, 6:30pm-7:30pm at Gibson 142</p>
            <p className="text-yellow-700">Tue Nov 11, 6:30pm-7:30pm at New Cabell 232</p>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}
