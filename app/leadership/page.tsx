export const dynamic = 'force-dynamic'
import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import { getSitePage, getSitePageSetting } from "@/lib/pages-db"
import { LeadershipClient, type Leader } from "./leadership-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Club Leadership",
  description: "Meet the student leaders who organize Birding at UVA trips, programs, outreach, and club activities.",
  alternates: { canonical: "/leadership" },
  openGraph: {
    title: "Club Leadership | Birding at UVA",
    description: "Meet the student leaders behind Birding at UVA.",
    url: "/leadership",
  },
}

export default async function LeadershipPage() {
  if (!(await getSitePage("leadership"))) notFound()
  const flyingDir = path.join(process.cwd(), "public/images/flying-birds")
  let birdImages: string[] = []
  
  try {
    birdImages = fs.readdirSync(flyingDir).filter((file) => {
      const ext = path.extname(file).toLowerCase()
      const filePath = path.join(flyingDir, file)
      const isFile = fs.statSync(filePath).isFile()
      return (
        isFile &&
        [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext) &&
        !file.startsWith(".")
      )
    })
  } catch (e) {
    birdImages = []
  }

  const setting = await getSitePageSetting("leadership", "leadership")
  const leaders = Array.isArray(setting) ? setting as Leader[] : []
  return <LeadershipClient birdImages={birdImages} leaders={leaders} />
}
