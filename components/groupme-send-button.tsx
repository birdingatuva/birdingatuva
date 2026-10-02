'use client'

import { useRef, useState } from 'react'
import { GROUPME_DESTINATION } from '@/lib/groupme'
import { Button } from '@/components/ui/button'

export function GroupMeSendButton({ slug, hidden }: { slug: string; hidden: boolean }) {
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const lock = useRef(false)
  async function act(send: boolean) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setStatus('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/groupme`, send ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      } : { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to contact GroupMe.')
      if (send) { setText(null); setStatus('Message sent to GroupMe.') }
      else setText(data.text)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to contact GroupMe.')
      if (send) setText(null)
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="mt-3 space-y-3">
    <Button type="button" variant="outline" disabled={busy || hidden || text !== null} onClick={() => act(false)}>{busy ? 'Please wait...' : 'Send GroupMe Message'}</Button>
    {hidden && <p className="text-sm text-muted-foreground">Publish this event before sending an announcement.</p>}
    {text !== null && <section aria-label="GroupMe message preview" className="space-y-3 rounded-md border border-border p-4">
      <h3 className="font-semibold">Send to {GROUPME_DESTINATION}</h3>
      <p className="text-sm text-muted-foreground">This will post as the connected GroupMe account. Review the message below. Sending again posts another announcement.</p>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm">{text}</pre>
      <p className="text-xs text-muted-foreground">{text.length}/1,000 characters</p>
      <div className="flex gap-3">
        <Button type="button" disabled={busy} onClick={() => act(true)}>{busy ? 'Sending...' : 'Send message now'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setText(null)}>Cancel</Button>
      </div>
    </section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </div>
}
