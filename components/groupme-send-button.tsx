'use client'

import { useEffect, useRef, useState } from 'react'
import { CloudinaryImage } from '@/components/cloudinary-image'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function GroupMeSendButton({ slug, hidden }: { slug: string; hidden: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const [savedText, setSavedText] = useState('')
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState('')
  const [delivery, setDelivery] = useState<string | null>(null)
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    setText(null); setError(''); setDelivery(null); setBusy(true)
    fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load the GroupMe preview.')
        if (active) { setText(data.text); setSavedText(data.text); setConfigured(data.configured); setDestination(data.destination); setRevision(data.revision); setDelivery(data.delivery) }
      })
      .catch(error => { if (active) setError(error.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [slug])
  const dirty = text !== null && text !== savedText
  const invalid = text === null || !text.trim() || text.length > 1000
  async function saveMessage() {
    if (lock.current || busy || saving || invalid || !dirty) return
    lock.current = true; setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save the message.')
      setSavedText(text!); setStatus('Event message saved.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save the message.')
    } finally { lock.current = false; setSaving(false) }
  }
  async function sendMessage() {
    if (lock.current || busy || saving || hidden || !configured || dirty || invalid || delivery) return
    lock.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, revision }),
      })
      const data = await response.json()
      if (data.delivery) setDelivery(data.delivery)
      if (!response.ok) throw new Error(data.error || 'Unable to contact GroupMe.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to contact GroupMe.')
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="mt-3 space-y-3">
    <section aria-label="GroupMe message preview" className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center gap-3">
        <CloudinaryImage src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/groupme`} alt="GroupMe" width={36} height={36} className="h-9 w-9 object-contain" />
        <h3 className="font-semibold">Send to {destination || 'GroupMe'}</h3>
      </div>
      <p className="text-sm text-muted-foreground">This will post as the connected GroupMe account. Review the message below. Each version of a trip can only be sent once. Edit the trip to send an updated announcement.</p>
      {busy && text === null && <p role="status" className="text-sm text-muted-foreground">Loading message preview...</p>}
      {text !== null && <>
        <label htmlFor="event-groupme-message" className="text-sm font-medium">Event message</label>
        <Textarea id="event-groupme-message" value={text} disabled={busy || saving} rows={7} onChange={event => { setText(event.target.value); setStatus('') }} />
        {invalid && <p role="alert" className="text-sm text-destructive">Enter a message within 1,000 characters.</p>}
      </>}
      <p className="text-xs text-muted-foreground">{text?.length || 0}/1000 characters</p>
      {dirty && <p className="text-sm text-muted-foreground">Save your changes before sending.</p>}
      {hidden && <p className="text-sm text-muted-foreground">You can edit and save this message in preview. Publish this event before sending.</p>}
      {!configured && text !== null && <p className="text-sm text-muted-foreground">Connect GroupMe in admin settings before sending.</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy || saving || invalid || !dirty} onClick={saveMessage}>{saving ? 'Saving...' : 'Save message'}</Button>
        <Button type="button" disabled={busy || saving || hidden || !configured || dirty || invalid || !!delivery} className={delivery ? 'bg-muted text-muted-foreground disabled:opacity-100' : undefined} onClick={sendMessage}>{delivery === 'sent' ? 'Message sent' : delivery ? 'Sending locked' : busy && text !== null ? 'Sending...' : 'Send message now'}</Button>
      </div>
    </section>
    {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {delivery && <p role="status" className="text-sm text-muted-foreground">{delivery === 'sent' ? 'Edit the trip to send an updated announcement.' : 'A send has already been attempted. Check GroupMe; sending is locked to prevent duplicates.'}</p>}
  </div>
}
