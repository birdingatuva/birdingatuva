"use client"

import { AnnouncementBanner } from "@/components/announcement-banner"
import DevBanner from "@/components/DevBanner"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevBanner />
      <AnnouncementBanner />
      {children}
    </>
  )
}
