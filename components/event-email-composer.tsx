'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Mail, ArrowUpRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CLUB_EMAIL } from '@/lib/email'

type Preview = { recipients: { name: string; email: string }[]; skipped: number; subject: string; body: string }

function Composer({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const attempt = useRef<{ payload: string; id: string } | null>(null)
  const lock = useRef(false)
  const id = useId()
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/events/${encodeURIComponent(slug)}/email-recipients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load recipients.')
      if (!controller.signal.aborted) { setPreview(data); setSubject(data.subject); setBody(data.body) }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [slug])
  async function sendEmail() {
    if (!preview || preview.skipped > 0 || lock.current || sent) return
    const fields = { subject, body, expectedEmails: preview.recipients.map(recipient => recipient.email) }
    const payload = JSON.stringify(fields)
    if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() }
    lock.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}/email-send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ ...fields, requestId: attempt.current.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to send the email.')
      if (data.sent !== true) throw new Error('No send confirmation received. Check the club Gmail Sent folder.')
      setSent(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send the email.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="space-y-4 border-t border-border p-4 sm:p-5">
    {!preview && !error && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading passengers…</p>}
    {preview && <>
      <p className="text-sm"><span className="text-muted-foreground">From</span> <strong>{CLUB_EMAIL}</strong></p>
      <details className="rounded-md bg-muted/40 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium">{preview.recipients.length} Bcc recipients <span className="ml-2 font-normal text-muted-foreground">Review emails</span></summary>
        <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">{preview.recipients.map(recipient => <li className="flex flex-wrap justify-between gap-x-4" key={recipient.email}><span>{recipient.name}</span><span className="break-all text-muted-foreground">{recipient.email}</span></li>)}</ul>
      </details>
      {preview.skipped > 0 && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">Sending blocked: {preview.skipped} passenger entries have missing or invalid emails, or unmatched or ambiguous names. Correct the private sheet, then reopen this composer.</p>}
      {!preview.recipients.length && <p className="text-sm text-muted-foreground">{preview.skipped === 0 ? 'No confirmed passengers yet. Recipients will appear here after passengers sign up.' : 'No recipients available. Review the passenger details above.'}</p>}
      {preview.recipients.length > 49 && <p role="alert" className="text-sm text-destructive">Each email supports at most 49 passengers.</p>}
      <div className="space-y-2">
        <label htmlFor={`${id}-subject`} className="block text-sm font-medium">Subject</label>
        <input id={`${id}-subject`} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={200} disabled={busy || sent} value={subject} onChange={event => setSubject(event.target.value)} />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-body`} className="block text-sm font-medium">Message</label>
        <Textarea id={`${id}-body`} rows={8} maxLength={4000} disabled={busy || sent} value={body} onChange={event => setBody(event.target.value)} />
      </div>
      <Button type="button" disabled={busy || sent || preview.skipped > 0 || !preview.recipients.length || preview.recipients.length > 49 || !subject.trim() || !body.trim()} onClick={sendEmail}><Mail aria-hidden="true" />{busy ? 'Sending…' : sent ? 'Email sent' : 'Send email'}<ArrowUpRight aria-hidden="true" /></Button>
      <p className="text-xs text-muted-foreground">Sends from the club account. Bcc keeps passenger addresses private.</p>
    </>}
    {sent && <p role="status" className="text-sm text-muted-foreground">Email sent from birdingatuva@gmail.com.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}

export function EventEmailComposer({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return <section className="mt-3 overflow-hidden rounded-lg border border-border bg-background" aria-label="Event email composer">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 p-4 text-left font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
      <Mail aria-hidden="true" className="h-5 w-5 text-primary" /><span className="flex-1">Compose email</span>
      <ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    <div id={panelId} hidden={!open}>{open && <Composer key={slug} slug={slug} />}</div>
  </section>
}
