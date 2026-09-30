"use client"

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BannerContent } from './banner-content'
import { defaultBannerContent, type BannerContent as Content } from '@/lib/banner'

export function AnnouncementBanner() {
  const [banner, setBanner] = useState({ content: defaultBannerContent, enabled: false })
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const visible = banner.enabled && !!banner.content.markdown.trim()

  useEffect(() => {
    let active = true
    let version = 0
    const refresh = async () => {
      const requestVersion = ++version
      try {
        const response = await fetch('/api/banner', { cache: 'no-store' })
        if (!response.ok) return
        const data: { content: Content; enabled: boolean } = await response.json()
        if (active && requestVersion === version) setBanner(data)
      } catch { /* Keep the last successfully loaded announcement. */ }
    }
    void refresh()
    window.addEventListener('banner-changed', refresh)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('banner-changed', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [pathname])

  useLayoutEffect(() => {
    const root = document.documentElement
    const measure = () => root.style.setProperty('--announcement-height', `${ref.current?.getBoundingClientRect().height ?? 0}px`)
    measure()
    const observer = new ResizeObserver(measure)
    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      root.style.setProperty('--announcement-height', '0px')
    }
  }, [visible])

  return <>
    {visible && <div ref={ref} role="region" aria-label="Site announcement" className="fixed inset-x-0 top-0 z-40 max-h-[50dvh] overflow-y-auto shadow-sm">
      <BannerContent content={banner.content} />
    </div>}
    <div aria-hidden="true" style={{ height: 'var(--announcement-height, 0px)' }} className="shrink-0" />
  </>
}
