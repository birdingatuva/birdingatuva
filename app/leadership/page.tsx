export const dynamic = 'force-dynamic'
import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import { getSitePage } from "@/lib/pages-db"
import { LeadershipClient } from "./leadership-client"

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

  return <LeadershipClient birdImages={birdImages} />
}
