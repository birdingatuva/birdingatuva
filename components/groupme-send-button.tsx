'use client'

import { useEffect, useRef, useState } from 'react'
import { CloudinaryImage } from '@/components/cloudinary-image'
import { Button } from '@/components/ui/button'

export function GroupMeSendButton({ slug, hidden }: { slug: string; hidden: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState('')
  const [delivery, setDelivery] = useState<string | null>(null)
  const lock = useRef(false)
  useEffect(() => {
    if (hidden) return
    let active = true
    setText(null); setError(''); setDelivery(null); setBusy(true)
    fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load the GroupMe preview.')
        if (active) { setText(data.text); setDestination(data.destination); setRevision(data.revision); setDelivery(data.delivery) }
      })
      .catch(error => { if (active) setError(error.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [slug, hidden])
  async function sendMessage() {
    if (lock.current || busy || delivery || text === null) return
    lock.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, revision }),
      })
      const data = await response.json()
      setDelivery(data.delivery || 'unconfirmed')
      if (!response.ok) throw new Error(data.error || 'Unable to contact GroupMe.')
    } catch (error) {
      setDelivery(current => current || 'unconfirmed')
      setError(error instanceof Error ? error.message : 'Unable to contact GroupMe.')
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="mt-3 space-y-3">
    {hidden && <section aria-label="GroupMe announcement" className="flex items-center gap-3 rounded-md border border-border p-4">
      <CloudinaryImage src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/groupme`} alt="GroupMe" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
      <p className="text-sm text-muted-foreground">Publish this event before sending an announcement.</p>
    </section>}
    {!hidden && <section aria-label="GroupMe message preview" className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center gap-3">
        <CloudinaryImage src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/groupme`} alt="GroupMe" width={36} height={36} className="h-9 w-9 object-contain" />
        <h3 className="font-semibold">Send to {destination || 'GroupMe'}</h3>
      </div>
      <p className="text-sm text-muted-foreground">This will post as the connected GroupMe account. Review the message below. Each version of a trip can only be sent once. Edit the trip to send an updated announcement.</p>
      {busy && text === null && <p role="status" className="text-sm text-muted-foreground">Loading message preview...</p>}
      <pre className="whitespace-pre-wrap break-words font-sans text-sm">{text}</pre>
      <p className="text-xs text-muted-foreground">{text?.length || 0}/1000 characters</p>
      <div className="flex gap-3">
        <Button type="button" disabled={busy || text === null || !!delivery} className={delivery ? 'bg-muted text-muted-foreground disabled:opacity-100' : undefined} onClick={sendMessage}>{delivery === 'sent' ? 'Message sent' : delivery ? 'Sending locked' : busy && text !== null ? 'Sending...' : 'Send message now'}</Button>
      </div>
    </section>}
    {!hidden && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!hidden && delivery && <p role="status" className="text-sm text-muted-foreground">{delivery === 'sent' ? 'Edit the trip to send an updated announcement.' : 'A send has already been attempted. Check GroupMe; sending is locked to prevent duplicates.'}</p>}
  </div>
}
