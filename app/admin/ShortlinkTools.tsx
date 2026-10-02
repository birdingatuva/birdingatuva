'use client'

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { LockKeyhole, LockKeyholeOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SHORTLINK_ORIGIN, type Shortlink } from '@/lib/shortlinks'
import { readShortlinkResponse } from '@/lib/shortlink-response'

const logoUrl = process.env.NEXT_PUBLIC_QR_LOGO_URL || `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/f_png/home-page/logo-transparent-white`

async function createQr(url: string): Promise<string> {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, url, { errorCorrectionLevel: 'H', margin: 4, width: 1024, color: { dark: '#000000', light: '#ffffff' } })
  const logo = new window.Image()
  logo.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    logo.onload = () => resolve()
    logo.onerror = () => reject(new Error('Unable to load the QR logo. Check the Cloudinary image URL and try again.'))
    logo.src = logoUrl
  })
  const ctx = canvas.getContext('2d')!
  const center = canvas.width / 2
  const diameter = canvas.width * 0.27
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(center, center, diameter / 2 + 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(center, center, diameter / 2, 0, Math.PI * 2)
  ctx.clip()
  const scale = diameter / Math.max(logo.naturalWidth, logo.naturalHeight)
  const width = logo.naturalWidth * scale, height = logo.naturalHeight * scale
  ctx.drawImage(logo, center - width / 2, center - height / 2, width, height)
  ctx.restore()
  return canvas.toDataURL('image/png')
}

export function ShortlinkTools() {
  const [links, setLinks] = useState<Shortlink[]>([])
  const [slug, setSlug] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locking, setLocking] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<{ x: number; y: number } | null>(null)
  const [copyFading, setCopyFading] = useState(false)
  const [qr, setQr] = useState<{ slug: string; image: string } | null>(null)

  const qrScrollPosition = useRef<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const position = qrScrollPosition.current
    if (position) {
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' })
      qrScrollPosition.current = null
    }
  }, [qr])

  async function loadLinks() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/shortlinks', { cache: 'no-store' })
      const data = await readShortlinkResponse(response)
      setLinks(data.links)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to load shortlinks.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadLinks() }, [])

  useEffect(() => {
    if (!copyFeedback) return
    setCopyFading(false)
    const fade = window.setTimeout(() => setCopyFading(true), 650)
    const timer = window.setTimeout(() => setCopyFeedback(null), 850)
    return () => { window.clearTimeout(fade); window.clearTimeout(timer) }
  }, [copyFeedback])

  async function copy(link: Shortlink, event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX
    const y = event.detail === 0 ? rect.top : event.clientY
    setCopyFeedback(null)
    try {
      await navigator.clipboard.writeText(`${SHORTLINK_ORIGIN}/${link.slug}`)
      setCopyFeedback({ x: Math.max(48, Math.min(x, window.innerWidth - 48)), y: Math.max(36, Math.min(y - 8, window.innerHeight - 8)) })
    } catch { setError('Unable to copy. Select and copy the shortlink above.') }
  }

  async function generate(link: Shortlink) {
    setGenerating(true)
    setError('')
    try {
      const image = await createQr(`${SHORTLINK_ORIGIN}/${link.slug}`)
      qrScrollPosition.current = { x: window.scrollX, y: window.scrollY }
      setQr({ slug: link.slug, image })
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to generate QR code.') }
    finally { setGenerating(false) }
  }

  async function save() {
    if (loading || saving || generating || deleting !== null || !destination.trim() || !slug.trim()) return
    setSaving(true)
    setError('')
    setCopyFeedback(null)
    try {
      const response = await fetch('/api/admin/shortlinks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, destination }),
      })
      const data = await readShortlinkResponse(response)
      setLinks(current => [data.link, ...current])
      setSlug('')
      setDestination('')
      await generate(data.link)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save shortlink.') }
    finally { setSaving(false) }
  }

  async function toggleLock(link: Shortlink) {
    setLocking(link.slug)
    setError('')
    try {
      const response = await fetch('/api/admin/shortlinks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: link.slug, locked: !link.locked }),
      })
      const data = await readShortlinkResponse(response)
      setLinks(current => current.map(item => item.slug === link.slug ? data.link : item))
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to update lock.') }
    finally { setLocking(null) }
  }

  async function remove(link: Shortlink) {
    if (link.locked || locking !== null) return
    setDeleting(link.slug)
    setError('')
    setCopyFeedback(null)
    try {
      const response = await fetch('/api/admin/shortlinks', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: link.slug }),
      })
      const data = await readShortlinkResponse(response)
      setLinks(current => current.filter(item => item.slug !== link.slug))
      setQr(current => current?.slug === link.slug ? null : current)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete shortlink.') }
    finally { setDeleting(null) }
  }

  return (
    <section style={{ overflowAnchor: 'none' }} className="mt-8 space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6" aria-labelledby="shortlinks-title">
      <div>
        <h3 id="shortlinks-title" className="font-display text-2xl text-primary">Shortlinks & QR codes</h3>
      </div>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save() }}>
        <div className="space-y-2">
          <label htmlFor="shortlink-destination" className="text-base font-semibold">Destination website</label>
          <Input id="shortlink-destination" type="text" inputMode="url" required maxLength={4096} placeholder="google.com or https://example.com" value={destination} onChange={event => setDestination(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label htmlFor="shortlink-slug" className="text-base font-semibold">Shortlink name</label>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm">birdingatuva.org/</span><Input id="shortlink-slug" className="w-full sm:w-64" required pattern="[A-Za-z0-9]{1,64}" maxLength={64} placeholder="xyz" value={slug} onChange={event => setSlug(event.target.value)} aria-describedby="shortlink-help" /></div>
          <p id="shortlink-help" className="text-xs text-muted-foreground">Letters and numbers only, up to 64 characters. Names are saved in lowercase. Existing site names such as events and leadership are reserved.</p>
        </div>
        <Button type="submit" disabled={loading || saving || deleting !== null || !destination.trim() || !slug.trim()} aria-disabled={generating || undefined}>{saving ? 'Saving…' : 'Create shortlink & QR code'}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {copyFeedback && createPortal(
        <div role="status" className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full rounded border border-primary/25 bg-card px-2 py-1 text-xs font-medium text-foreground shadow-lg transition-opacity duration-200" style={{ left: copyFeedback.x, top: copyFeedback.y, opacity: copyFading ? 0 : 1 }}>Link copied</div>,
        document.body,
      )}
      <div className="space-y-3">
        <h4 className="text-base font-semibold">Saved shortlinks</h4>
        {loading ? <p role="status">Loading shortlinks…</p> : !links.length ? <p className="text-sm text-muted-foreground">No shortlinks saved yet.</p> : links.map(link => (
          <div key={link.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1"><a className="break-all font-medium text-primary underline" href={`${SHORTLINK_ORIGIN}/${link.slug}`} target="_blank" rel="noreferrer">birdingatuva.org/{link.slug}</a><p className="mt-1 break-all text-sm text-muted-foreground">{link.destination}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={event => void copy(link, event)}>Copy shortlink</Button>
              <Button type="button" variant="outline" disabled={generating || saving || deleting !== null} onClick={() => void generate(link)}>Show QR code</Button>
              <Button type="button" variant="outline" size="icon" className="bg-white text-black hover:bg-gray-100 hover:text-black" disabled={locking !== null || deleting !== null} onClick={() => void toggleLock(link)} aria-label={`${link.locked ? 'Unlock' : 'Lock'} shortlink ${link.slug}`} title={link.locked ? 'Unlock shortlink' : 'Lock shortlink'} aria-pressed={link.locked} aria-busy={locking === link.slug}>
                {link.locked ? <LockKeyhole className="h-4 w-4 [&_rect]:fill-current" aria-hidden="true" /> : <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button type="button" variant="outline" size="icon" className="bg-white font-bold text-black hover:bg-gray-100 hover:text-black disabled:bg-gray-100 disabled:text-gray-400" disabled={link.locked || locking !== null || generating || saving || deleting !== null} onClick={() => void remove(link)} aria-label={`Delete shortlink ${link.slug}`} title={link.locked ? 'Unlock this shortlink to delete it' : 'Delete shortlink'} aria-busy={deleting === link.slug}><Trash2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /></Button>
            </div>
          </div>
        ))}
      </div>
      {qr && <div className="!mt-0 space-y-3 border-t border-border pt-4">
        <h4 className="break-all text-base font-semibold">QR code for {SHORTLINK_ORIGIN.replace(/^https?:\/\//, '')}/{qr.slug}</h4>
        <img src={qr.image} alt={`QR code linking to birdingatuva.org/${qr.slug}`} width={280} height={280} className="h-auto max-w-full rounded-md" />
        <a href={qr.image} download={`birdingatuva-${qr.slug}-qr.png`} className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Download QR code (PNG)</a>
        <p className="text-xs text-muted-foreground">Scan the downloaded code before printing or sharing.</p>
      </div>}
    </section>
  )
}
