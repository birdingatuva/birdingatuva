export const dynamic = 'force-static'
import fs from "fs"
import path from "path"
import { FAQClient } from "./faq-client"

export default function FAQPage() {
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

  return <FAQClient birdImages={birdImages} />
}
