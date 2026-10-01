
import type React from "react"
import type { Metadata } from "next"
import { Bebas_Neue, Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import AppShell from "@/components/AppShell"
import { cookies } from "next/headers"
import { Navigation } from "@/components/navigation"
import { verifyAdminToken } from "@/lib/auth"
import { listSitePages } from "@/lib/pages-db"


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
  metadataBase: new URL("https://birdingatuva.org"),
  title: {
    default: "Birding at UVA",
    template: "%s | Birding at UVA",
  },
  description: "Explore birds and nature with the Birding Club at the University of Virginia through local trips, education, conservation, and community.",
  icons: {
    icon: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`,
  },
  openGraph: {
    siteName: "Birding at UVA",
    type: "website",
    images: [`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/logo-transparent`],
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [cookieStore, pages] = await Promise.all([
    cookies(),
    listSitePages().catch(() => null),
  ])
  const token = cookieStore.get("admin_jwt")?.value
  const authorized = Boolean(token && verifyAdminToken(token))

  return (
    <html lang="en">
      <head>
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
            <Navigation
              initialAuthorized={authorized}
              initialVisiblePages={pages?.map((page) => page.slug) ?? null}
            />
            {children}
          </div>
  </AppShell>
      </body>
    </html>
  )
}
