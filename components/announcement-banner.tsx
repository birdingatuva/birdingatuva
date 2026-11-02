"use client"

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BannerContent } from './banner-content'
import { defaultBannerContent, type BannerContent as Content } from '@/lib/banner'

export function AnnouncementBanner() {
  const [banner, setBanner] = useState({ content: defaultBannerContent, enabled: false })
  const ref = useRef<HTMLDivElement>(null)
  const visible = banner.enabled && !!banner.content.markdown.trim()

  useEffect(() => {
    const interval = 5 * 60 * 1000
    let nextRefresh = 0
    let pending: AbortController | undefined
    const refresh = async () => {
      if (document.hidden || pending || Date.now() < nextRefresh) return
      const controller = new AbortController()
      pending = controller
      nextRefresh = Date.now() + interval
      try {
        const response = await fetch('/api/banner', { signal: controller.signal })
        if (!response.ok) return
        const data: { content: Content; enabled: boolean } = await response.json()
        if (!controller.signal.aborted) setBanner(data)
      } catch { /* Keep the last successfully loaded announcement. */ }
      finally { if (pending === controller) pending = undefined }
    }
    const onEdit = (event: Event) => {
      pending?.abort()
      pending = undefined
      nextRefresh = Date.now() + interval
      setBanner((event as CustomEvent<{ content: Content; enabled: boolean }>).detail)
    }
    void refresh()
    window.addEventListener('banner-changed', onEdit)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => {
      pending?.abort()
      clearInterval(timer)
      window.removeEventListener('banner-changed', onEdit)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

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
