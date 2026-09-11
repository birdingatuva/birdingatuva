export const dynamic = 'force-dynamic'
import fs from "fs"
import path from "path"
import { notFound } from "next/navigation"
import { getSitePage } from "@/lib/pages-db"
import { FAQClient } from "./faq-client"

export default async function FAQPage() {
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

  const faqPage = await getSitePage("faq")
  if (!faqPage) notFound()

  return <FAQClient birdImages={birdImages} contentMarkdown={faqPage.contentMarkdown} />
}
