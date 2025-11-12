"use client"

import DevBanner from "@/components/DevBanner"

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevBanner />
      {children}
    </>
  )
}
